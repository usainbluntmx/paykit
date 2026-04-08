use anchor_lang::prelude::*;

declare_id!("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");

#[program]
pub mod paykit {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spend_limit: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, PaykitError::NameTooLong);
        require!(spend_limit > 0, PaykitError::InvalidSpendLimit);

        let agent = &mut ctx.accounts.agent;
        agent.owner = ctx.accounts.owner.key();
        agent.name = name;
        agent.spend_limit = spend_limit;
        agent.total_spent = 0;
        agent.payment_count = 0;
        agent.is_active = true;
        agent.bump = ctx.bumps.agent;

        emit!(AgentRegistered {
            owner: agent.owner,
            name: agent.name.clone(),
            spend_limit: agent.spend_limit,
        });

        Ok(())
    }

    pub fn record_payment(
        ctx: Context<RecordPayment>,
        amount: u64,
        recipient: Pubkey,
        memo: String,
    ) -> Result<()> {
        require!(memo.len() <= 64, PaykitError::MemoTooLong);

        let agent = &mut ctx.accounts.agent;

        require!(agent.is_active, PaykitError::AgentInactive);
        require!(amount > 0, PaykitError::InvalidAmount);
        require!(
            agent.total_spent.checked_add(amount).unwrap() <= agent.spend_limit,
            PaykitError::SpendLimitExceeded
        );

        agent.total_spent = agent.total_spent.checked_add(amount).unwrap();
        agent.payment_count = agent.payment_count.checked_add(1).unwrap();

        emit!(PaymentRecorded {
            agent: agent.key(),
            owner: agent.owner,
            recipient,
            amount,
            memo,
            payment_count: agent.payment_count,
        });

        Ok(())
    }

    pub fn update_spend_limit(
        ctx: Context<UpdateAgent>,
        new_limit: u64,
    ) -> Result<()> {
        require!(new_limit > 0, PaykitError::InvalidSpendLimit);

        let agent = &mut ctx.accounts.agent;
        agent.spend_limit = new_limit;

        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<UpdateAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.is_active = false;

        Ok(())
    }

    pub fn agent_to_agent_payment(
    ctx: Context<AgentToAgentPayment>,
    amount: u64,
    service: String,
) -> Result<()> {
    require!(service.len() <= 64, PaykitError::MemoTooLong);
    require!(amount > 0, PaykitError::InvalidAmount);

    let sender = &mut ctx.accounts.sender_agent;
    let receiver = &mut ctx.accounts.receiver_agent;

    require!(sender.is_active, PaykitError::AgentInactive);
    require!(receiver.is_active, PaykitError::AgentInactive);
    require!(
        sender.total_spent.checked_add(amount).unwrap() <= sender.spend_limit,
        PaykitError::SpendLimitExceeded
    );

    sender.total_spent = sender.total_spent.checked_add(amount).unwrap();
    sender.payment_count = sender.payment_count.checked_add(1).unwrap();
    receiver.payment_count = receiver.payment_count.checked_add(1).unwrap();

    emit!(AgentPaymentSent {
        sender: sender.key(),
        receiver: receiver.key(),
        amount,
        service: service.clone(),
    });

    Ok(())
}
}

#[account]
pub struct AgentAccount {
    pub owner: Pubkey,
    pub name: String,
    pub spend_limit: u64,
    pub total_spent: u64,
    pub payment_count: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl AgentAccount {
    pub const LEN: usize = 8    // discriminator
        + 32                    // owner
        + 4 + 32               // name (string prefix + max 32 chars)
        + 8                    // spend_limit
        + 8                    // total_spent
        + 8                    // payment_count
        + 1                    // is_active
        + 1;                   // bump
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = AgentAccount::LEN,
        seeds = [b"agent", owner.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub agent: Account<'info, AgentAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPayment<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.owner.as_ref(), agent.name.as_bytes()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, AgentAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.owner.as_ref(), agent.name.as_bytes()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, AgentAccount>,

    pub owner: Signer<'info>,
}

#[event]
pub struct AgentRegistered {
    pub owner: Pubkey,
    pub name: String,
    pub spend_limit: u64,
}

#[event]
pub struct PaymentRecorded {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub memo: String,
    pub payment_count: u64,
}

#[derive(Accounts)]
pub struct AgentToAgentPayment<'info> {
    #[account(
        mut,
        seeds = [b"agent", sender_agent.owner.as_ref(), sender_agent.name.as_bytes()],
        bump = sender_agent.bump,
        has_one = owner
    )]
    pub sender_agent: Account<'info, AgentAccount>,

    #[account(
        mut,
        seeds = [b"agent", receiver_agent.owner.as_ref(), receiver_agent.name.as_bytes()],
        bump = receiver_agent.bump,
    )]
    pub receiver_agent: Account<'info, AgentAccount>,

    pub owner: Signer<'info>,
}

#[event]
pub struct AgentPaymentSent {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub service: String,
}

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
}