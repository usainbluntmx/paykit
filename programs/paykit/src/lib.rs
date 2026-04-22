use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");

// ─── Capability Bits ──────────────────────────────────────────────────────────

pub const CAP_PAY_AGENTS:      u16 = 1 << 0;  // bit 0
pub const CAP_HIRE_BASIC:      u16 = 1 << 1;  // bit 1
pub const CAP_HIRE_STANDARD:   u16 = 1 << 2;  // bit 2
pub const CAP_HIRE_PREMIUM:    u16 = 1 << 3;  // bit 3
pub const CAP_TRANSFER_SOL:    u16 = 1 << 4;  // bit 4
pub const CAP_TRANSFER_SPL:    u16 = 1 << 5;  // bit 5
pub const CAP_BATCH_PAY:       u16 = 1 << 6;  // bit 6
pub const CAP_CUSTOM_1:        u16 = 1 << 8;  // bit 8  — custom slot 1
pub const CAP_CUSTOM_2:        u16 = 1 << 9;  // bit 9  — custom slot 2
pub const CAP_CUSTOM_3:        u16 = 1 << 10; // bit 10 — custom slot 3
pub const CAP_CUSTOM_4:        u16 = 1 << 11; // bit 11 — custom slot 4
pub const CAP_CUSTOM_5:        u16 = 1 << 12; // bit 12 — custom slot 5
pub const CAP_CUSTOM_6:        u16 = 1 << 13; // bit 13 — custom slot 6
pub const CAP_CUSTOM_7:        u16 = 1 << 14; // bit 14 — custom slot 7
pub const CAP_CUSTOM_8:        u16 = 1 << 15; // bit 15 — custom slot 8

pub const CAP_ALL_DEFAULT: u16 =
    CAP_PAY_AGENTS | CAP_HIRE_BASIC | CAP_HIRE_STANDARD |
    CAP_HIRE_PREMIUM | CAP_TRANSFER_SOL | CAP_TRANSFER_SPL | CAP_BATCH_PAY;

// ─── Category IDs ─────────────────────────────────────────────────────────────

pub const CAT_NONE:      u8 = 0;
pub const CAT_COMPUTE:   u8 = 1;
pub const CAT_DATA:      u8 = 2;
pub const CAT_STORAGE:   u8 = 3;
pub const CAT_INFERENCE: u8 = 4;
pub const CAT_RESEARCH:  u8 = 5;
pub const CAT_CONTENT:   u8 = 6;
// IDs 7 reserved, 8–255 custom

#[program]
pub mod paykit {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        spend_limit: u64,
        daily_limit_bps: u16,
        funding_lamports: u64,
        capabilities: u16,
        tier: u8,
    ) -> Result<()> {
        require!(name.len() <= 32, PaykitError::NameTooLong);
        require!(spend_limit > 0, PaykitError::InvalidSpendLimit);
        require!(daily_limit_bps >= 1 && daily_limit_bps <= 10000, PaykitError::InvalidDailyLimit);
        require!(tier <= 2, PaykitError::InvalidTier);

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
        agent.capabilities = capabilities;
        agent.tier = tier;
        agent.category_limits = [(0u8, 0u64); 8];
        agent.custom_capability_names = [[0u8; 16]; 8];

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
            capabilities: agent.capabilities,
            tier: agent.tier,
        });

        Ok(())
    }

    pub fn record_payment(
        ctx: Context<AgentSigns>,
        amount: u64,
        recipient: Pubkey,
        memo: String,
        category_id: u8,
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

        // Daily limit
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

        // Category limit check
        if category_id != CAT_NONE {
            let cat_limit = agent.get_category_limit(category_id);
            if cat_limit > 0 {
                require!(amount <= cat_limit, PaykitError::CategoryLimitExceeded);
            }
        }

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
            category_id,
            payment_count: agent.payment_count,
            total_spent: agent.total_spent,
        });

        Ok(())
    }

    pub fn agent_to_agent_payment(
        ctx: Context<AgentToAgentSigns>,
        amount: u64,
        service: String,
        category_id: u8,
    ) -> Result<()> {
        require!(service.len() <= 64, PaykitError::MemoTooLong);
        require!(amount > 0, PaykitError::InvalidAmount);

        let sender = &mut ctx.accounts.sender_agent;
        let receiver = &ctx.accounts.receiver_agent;

        require!(sender.is_active, PaykitError::AgentInactive);
        require!(receiver.is_active, PaykitError::AgentInactive);

        // Capability checks
        require!(
            sender.capabilities & CAP_PAY_AGENTS != 0,
            PaykitError::CapabilityDenied
        );
        match receiver.tier {
            0 => require!(sender.capabilities & CAP_HIRE_BASIC != 0, PaykitError::TierNotAllowed),
            1 => require!(sender.capabilities & CAP_HIRE_STANDARD != 0, PaykitError::TierNotAllowed),
            2 => require!(sender.capabilities & CAP_HIRE_PREMIUM != 0, PaykitError::TierNotAllowed),
            _ => return Err(PaykitError::InvalidTier.into()),
        }

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(now < sender.expires_at, PaykitError::AgentExpired);
        require!(now < receiver.expires_at, PaykitError::AgentExpired);
        require!(
            sender.total_spent.checked_add(amount).unwrap() <= sender.spend_limit,
            PaykitError::SpendLimitExceeded
        );

        // Daily limit
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

        // Category limit check
        if category_id != CAT_NONE {
            let cat_limit = sender.get_category_limit(category_id);
            if cat_limit > 0 {
                require!(amount <= cat_limit, PaykitError::CategoryLimitExceeded);
            }
        }

        sender.last_payment_at = now;
        sender.daily_spent = sender.daily_spent.checked_add(amount).unwrap();
        sender.total_spent = sender.total_spent.checked_add(amount).unwrap();
        sender.payment_count = sender.payment_count.checked_add(1).unwrap();

        let receiver = &mut ctx.accounts.receiver_agent;
        receiver.payment_count = receiver.payment_count.checked_add(1).unwrap();

        emit!(AgentPaymentSent {
            sender: ctx.accounts.sender_agent.key(),
            sender_name: ctx.accounts.sender_agent.name.clone(),
            receiver: ctx.accounts.receiver_agent.key(),
            receiver_name: ctx.accounts.receiver_agent.name.clone(),
            amount,
            service,
            category_id,
            sender_total_spent: ctx.accounts.sender_agent.total_spent,
        });

        Ok(())
    }

    pub fn set_capabilities(
        ctx: Context<OwnerSigns>,
        capabilities: u16,
    ) -> Result<()> {
        ctx.accounts.agent.capabilities = capabilities;
        emit!(CapabilitiesUpdated {
            agent: ctx.accounts.agent.key(),
            agent_name: ctx.accounts.agent.name.clone(),
            capabilities,
        });
        Ok(())
    }

    pub fn set_tier(
        ctx: Context<OwnerSigns>,
        tier: u8,
    ) -> Result<()> {
        require!(tier <= 2, PaykitError::InvalidTier);
        ctx.accounts.agent.tier = tier;
        Ok(())
    }

    pub fn set_category_limit(
        ctx: Context<OwnerSigns>,
        category_id: u8,
        limit: u64,
        custom_name: Option<String>,
    ) -> Result<()> {
        require!(category_id != CAT_NONE, PaykitError::InvalidCategory);
        let agent = &mut ctx.accounts.agent;

        // Find existing slot or empty slot
        let mut slot: Option<usize> = None;
        for (i, &(id, _)) in agent.category_limits.iter().enumerate() {
            if id == category_id { slot = Some(i); break; }
        }
        if slot.is_none() {
            for (i, &(id, _)) in agent.category_limits.iter().enumerate() {
                if id == 0 { slot = Some(i); break; }
            }
        }
        require!(slot.is_some(), PaykitError::CategorySlotsFull);
        let i = slot.unwrap();

        agent.category_limits[i] = (category_id, limit);

        // Store custom name if category_id >= 8 (custom category)
        if category_id >= 8 {
            if let Some(name) = custom_name {
                let custom_idx = (category_id - 8) as usize;
                if custom_idx < 8 {
                    let mut name_bytes = [0u8; 16];
                    let bytes = name.as_bytes();
                    let len = bytes.len().min(16);
                    name_bytes[..len].copy_from_slice(&bytes[..len]);
                    agent.custom_capability_names[custom_idx] = name_bytes;
                }
            }
        }

        Ok(())
    }

    pub fn set_custom_capability(
        ctx: Context<OwnerSigns>,
        slot: u8,
        name: String,
        enabled: bool,
    ) -> Result<()> {
        require!(slot < 8, PaykitError::InvalidCapabilitySlot);
        let agent = &mut ctx.accounts.agent;

        // Store name in custom_capability_names
        let mut name_bytes = [0u8; 16];
        let bytes = name.as_bytes();
        let len = bytes.len().min(16);
        name_bytes[..len].copy_from_slice(&bytes[..len]);
        agent.custom_capability_names[slot as usize] = name_bytes;

        // Toggle the corresponding custom capability bit (bits 8-15)
        let bit: u16 = 1 << (8 + slot);
        if enabled {
            agent.capabilities |= bit;
        } else {
            agent.capabilities &= !bit;
        }

        Ok(())
    }

    pub fn update_spend_limit(ctx: Context<OwnerSigns>, new_limit: u64) -> Result<()> {
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

    pub fn renew_agent(ctx: Context<OwnerSigns>, extension_seconds: i64) -> Result<()> {
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

    pub fn close_agent(ctx: Context<CloseAgent>) -> Result<()> {
    emit!(AgentClosed {
        agent: ctx.accounts.agent.key(),
        agent_name: ctx.accounts.agent.name.clone(),
        owner: ctx.accounts.agent.owner,
    });
    Ok(())
}
}

// ─── Account Struct ───────────────────────────────────────────────────────────

#[account]
pub struct AgentAccount {
    pub agent_key: Pubkey,                    // Agent's own keypair
    pub owner: Pubkey,                        // Developer wallet
    pub name: String,                         // max 32 chars
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
    pub capabilities: u16,                    // bitmask
    pub tier: u8,                             // 0=basic, 1=standard, 2=premium
    pub category_limits: [(u8, u64); 8],      // (category_id, max_lamports)
    pub custom_capability_names: [[u8; 16]; 8], // names for custom cap bits 8-15
}

impl AgentAccount {
    pub const LEN: usize = 8      // discriminator
        + 32                      // agent_key
        + 32                      // owner
        + 4 + 32                  // name
        + 8                       // spend_limit
        + 8                       // total_spent
        + 8                       // payment_count
        + 1                       // is_active
        + 1                       // bump
        + 8                       // last_payment_at
        + 8                       // daily_spent
        + 8                       // daily_reset_at
        + 8                       // expires_at
        + 2                       // daily_limit_bps
        + 2                       // capabilities
        + 1                       // tier
        + (1 + 8) * 8             // category_limits: 8 × (u8 + u64)
        + 16 * 8;                 // custom_capability_names: 8 × [u8; 16]

    pub fn get_category_limit(&self, category_id: u8) -> u64 {
        for &(id, limit) in &self.category_limits {
            if id == category_id { return limit; }
        }
        0
    }
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

    /// CHECK: Agent's own keypair — PDA seed and funding target
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

#[derive(Accounts)]
pub struct CloseAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent.agent_key.as_ref(), agent.name.as_bytes()],
        bump = agent.bump,
        has_one = owner,
        close = owner
    )]
    pub agent: Account<'info, AgentAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
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
    pub capabilities: u16,
    pub tier: u8,
}

#[event]
pub struct PaymentRecorded {
    pub agent: Pubkey,
    pub agent_name: String,
    pub owner: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub memo: String,
    pub category_id: u8,
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
    pub category_id: u8,
    pub sender_total_spent: u64,
}

#[event]
pub struct CapabilitiesUpdated {
    pub agent: Pubkey,
    pub agent_name: String,
    pub capabilities: u16,
}

#[event]
pub struct AgentClosed {
    pub agent: Pubkey,
    pub agent_name: String,
    pub owner: Pubkey,
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
    #[msg("Agent does not have the required capability")]
    CapabilityDenied,
    #[msg("Agent cannot hire agents of this tier")]
    TierNotAllowed,
    #[msg("Invalid tier — must be 0, 1, or 2")]
    InvalidTier,
    #[msg("Category limit exceeded for this payment")]
    CategoryLimitExceeded,
    #[msg("Invalid category ID")]
    InvalidCategory,
    #[msg("All category slots are in use")]
    CategorySlotsFull,
    #[msg("Invalid capability slot — must be 0-7")]
    InvalidCapabilitySlot,
}