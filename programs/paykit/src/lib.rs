use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");

#[program]
pub mod paykit {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spend_limit: u64,
        daily_limit_bps: u16,
        funding_lamports: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, PaykitError::NameTooLong);
        require!(spend_limit > 0, PaykitError::InvalidSpendLimit);
        require!(daily_limit_bps >= 1 && daily_limit_bps <= 10000, PaykitError::InvalidDailyLimit);

        let clock = Clock::get()?;
        let agent = &mut ctx.accounts.agent;

        agent.agent_key = ctx.accounts.agent_signer.key();
        agent.owner = ctx.accounts.owner.key();
        agent.name = name;
        agent.spend_limit = spend_limit;
        agent.total_spent = 0;
        agent.payment_count = 0;
        agent.is_active = true;
        agent.bump = ctx.bumps.agent;
        agent.last_payment_at = 0;
        agent.daily_spent = 0;
        agent.daily_reset_at = 0;
        agent.expires_at = clock.unix_timestamp + 31_536_000;
        agent.daily_limit_bps = daily_limit_bps;

        // Fund the agent's wallet if requested
        if funding_lamports > 0 {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.agent_signer.to_account_info(),
                },
            );
            system_program::transfer(cpi_ctx, funding_lamports)?;
        }

        emit!(AgentRegistered {
            agent_key: agent.agent_key,
            owner: agent.owner,
            name: agent.name.clone(),
            spend_limit: agent.spend_limit,
            daily_limit_bps: agent.daily_limit_bps,
            expires_at: agent.expires_at,
        });

        Ok(())
    }

    pub fn record_payment(
        ctx: Context<AgentSigns>,
        amount: u64,
        recipient: Pubkey,
        memo: String,
    ) -> Result<()> {
        require!(memo.len() <= 64, PaykitError::MemoTooLong);
        require!(amount > 0, PaykitError::InvalidAmount);

        let agent = &mut ctx.accounts.agent;

        require!(agent.is_active, PaykitError::AgentInactive);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(now < agent.expires_at, PaykitError::AgentExpired);
        require!(
            agent.total_spent.checked_add(amount).unwrap() <= agent.spend_limit,
            PaykitError::SpendLimitExceeded
        );

        let one_day: i64 = 86_400;
        if now - agent.daily_reset_at > one_day {
            agent.daily_spent = 0;
            agent.daily_reset_at = now;
        }

        let daily_limit = agent.spend_limit * agent.daily_limit_bps as u64 / 10000;
        require!(
            agent.daily_spent.checked_add(amount).unwrap() <= daily_limit,
            PaykitError::DailyLimitExceeded
        );

        agent.last_payment_at = now;
        agent.daily_spent = agent.daily_spent.checked_add(amount).unwrap();
        agent.total_spent = agent.total_spent.checked_add(amount).unwrap();
        agent.payment_count = agent.payment_count.checked_add(1).unwrap();

        emit!(PaymentRecorded {
            agent: agent.key(),
            agent_name: agent.name.clone(),
            owner: agent.owner,
            recipient,
            amount,
            memo,
            payment_count: agent.payment_count,
            total_spent: agent.total_spent,
        });

        Ok(())
    }

    pub fn agent_to_agent_payment(
        ctx: Context<AgentToAgentSigns>,
        amount: u64,
        service: String,
    ) -> Result<()> {
        require!(service.len() <= 64, PaykitError::MemoTooLong);
        require!(amount > 0, PaykitError::InvalidAmount);

        let sender = &mut ctx.accounts.sender_agent;
        let receiver = &mut ctx.accounts.receiver_agent;

        require!(sender.is_active, PaykitError::AgentInactive);
        require!(receiver.is_active, PaykitError::AgentInactive);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(now < sender.expires_at, PaykitError::AgentExpired);
        require!(now < receiver.expires_at, PaykitError::AgentExpired);
        require!(
            sender.total_spent.checked_add(amount).unwrap() <= sender.spend_limit,
            PaykitError::SpendLimitExceeded
        );

        let one_day: i64 = 86_400;
        if now - sender.daily_reset_at > one_day {
            sender.daily_spent = 0;
            sender.daily_reset_at = now;
        }

        let daily_limit = sender.spend_limit * sender.daily_limit_bps as u64 / 10000;
        require!(
            sender.daily_spent.checked_add(amount).unwrap() <= daily_limit,
            PaykitError::DailyLimitExceeded
        );

        sender.last_payment_at = now;
        sender.daily_spent = sender.daily_spent.checked_add(amount).unwrap();
        sender.total_spent = sender.total_spent.checked_add(amount).unwrap();
        sender.payment_count = sender.payment_count.checked_add(1).unwrap();
        receiver.payment_count = receiver.payment_count.checked_add(1).unwrap();

        emit!(AgentPaymentSent {
            sender: sender.key(),
            sender_name: sender.name.clone(),
            receiver: receiver.key(),
            receiver_name: receiver.name.clone(),
            amount,
            service: service.clone(),
            sender_total_spent: sender.total_spent,
        });

        Ok(())
    }

    pub fn update_spend_limit(
        ctx: Context<OwnerSigns>,
        new_limit: u64,
    ) -> Result<()> {
        require!(new_limit > 0, PaykitError::InvalidSpendLimit);
        ctx.accounts.agent.spend_limit = new_limit;
        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<OwnerSigns>) -> Result<()> {
        ctx.accounts.agent.is_active = false;
        Ok(())
    }

    pub fn reactivate_agent(ctx: Context<OwnerSigns>) -> Result<()> {
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < ctx.accounts.agent.expires_at,
            PaykitError::AgentExpired
        );
        ctx.accounts.agent.is_active = true;
        Ok(())
    }

    pub fn renew_agent(
        ctx: Context<OwnerSigns>,
        extension_seconds: i64,
    ) -> Result<()> {
        require!(extension_seconds > 0, PaykitError::InvalidSpendLimit);
        let clock = Clock::get()?;
        let agent = &mut ctx.accounts.agent;
        if clock.unix_timestamp >= agent.expires_at {
            agent.expires_at = clock.unix_timestamp + extension_seconds;
        } else {
            agent.expires_at += extension_seconds;
        }
        Ok(())
    }
}

// ─── Account Structs ──────────────────────────────────────────────────────────

#[account]
pub struct AgentAccount {
    pub agent_key: Pubkey,      // Agent's own keypair (signs payments)
    pub owner: Pubkey,          // Developer wallet (admin operations)
    pub name: String,
    pub spend_limit: u64,
    pub total_spent: u64,
    pub payment_count: u64,
    pub is_active: bool,
    pub bump: u8,
    pub last_payment_at: i64,
    pub daily_spent: u64,
    pub daily_reset_at: i64,
    pub expires_at: i64,
    pub daily_limit_bps: u16,
}

impl AgentAccount {
    pub const LEN: usize = 8    // discriminator
        + 32                    // agent_key
        + 32                    // owner
        + 4 + 32               // name
        + 8                    // spend_limit
        + 8                    // total_spent
        + 8                    // payment_count
        + 1                    // is_active
        + 1                    // bump
        + 8                    // last_payment_at
        + 8                    // daily_spent
        + 8                    // daily_reset_at
        + 8                    // expires_at
        + 2;                   // daily_limit_bps
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = AgentAccount::LEN,
        seeds = [b"agent", agent_signer.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub agent: Account<'info, AgentAccount>,

    /// CHECK: Agent's own keypair — used as PDA seed and funding target
    #[account(mut)]
    pub agent_signer: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AgentSigns<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.agent_key.as_ref(), agent.name.as_bytes()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, AgentAccount>,

    /// The agent's own keypair must sign
    pub agent_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct AgentToAgentSigns<'info> {
    #[account(
        mut,
        seeds = [b"agent", sender_agent.agent_key.as_ref(), sender_agent.name.as_bytes()],
        bump = sender_agent.bump,
    )]
    pub sender_agent: Account<'info, AgentAccount>,

    #[account(
        mut,
        seeds = [b"agent", receiver_agent.agent_key.as_ref(), receiver_agent.name.as_bytes()],
        bump = receiver_agent.bump,
    )]
    pub receiver_agent: Account<'info, AgentAccount>,

    /// The sender agent's own keypair must sign
    pub agent_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct OwnerSigns<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.agent_key.as_ref(), agent.name.as_bytes()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, AgentAccount>,

    pub owner: Signer<'info>,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct AgentRegistered {
    pub agent_key: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub spend_limit: u64,
    pub daily_limit_bps: u16,
    pub expires_at: i64,
}

#[event]
pub struct PaymentRecorded {
    pub agent: Pubkey,
    pub agent_name: String,
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub memo: String,
    pub payment_count: u64,
    pub total_spent: u64,
}

#[event]
pub struct AgentPaymentSent {
    pub sender: Pubkey,
    pub sender_name: String,
    pub receiver: Pubkey,
    pub receiver_name: String,
    pub amount: u64,
    pub service: String,
    pub sender_total_spent: u64,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum PaykitError {
    #[msg("Agent name must be 32 characters or less")]
    NameTooLong,
    #[msg("Spend limit must be greater than zero")]
    InvalidSpendLimit,
    #[msg("Payment amount must be greater than zero")]
    InvalidAmount,
    #[msg("Agent has exceeded its spend limit")]
    SpendLimitExceeded,
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Memo must be 64 characters or less")]
    MemoTooLong,
    #[msg("Agent has exceeded its daily spend limit")]
    DailyLimitExceeded,
    #[msg("Agent has expired")]
    AgentExpired,
    #[msg("Daily limit must be between 1 and 10000 basis points")]
    InvalidDailyLimit,
}