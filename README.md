# ⚡ PayKit

> The accountability layer for autonomous AI agent payments on Solana.

PayKit is open-source infrastructure that gives AI agents an on-chain identity, enforced spend limits, verifiable payment history, and automatic expiration — without human intervention, without banks, and without permission.

Built for the **Solana Frontier Hackathon 2026** by [Zero Two Labs](https://github.com/usainbluntmx).

**Live:** https://paykit-sigma.vercel.app  
**Docs:** https://paykit-sigma.vercel.app/docs  
**Dashboard:** https://paykit-sigma.vercel.app/dashboard

---

## What Problem Does PayKit Solve?

AI agents are becoming autonomous. They browse the web, write code, manage tasks, and make decisions on behalf of humans. But when it comes to money — they still can't pay for anything without asking a human first.

Today, if an AI agent needs to pay for an API call, compensate another agent for a service, or manage a spending budget autonomously — it has to interrupt a human every single time.

**There is no standard protocol for agents to transact with each other.** No on-chain identity. No enforced spend limits. No verifiable payment history. No accountability.

PayKit solves this.

---

## What PayKit Actually Does

PayKit is **not** a payment processor. It is an **accountability layer**.

When a developer integrates PayKit, their AI agents get:

1. **An on-chain identity** — Each agent is a unique PDA (Program Derived Address) on Solana, tied to its owner's wallet. This identity is permanent, verifiable, and cannot be faked.

2. **Enforced spend limits** — The smart contract enforces that an agent can never spend more than its authorized budget, ever. Not 1 lamport more. This cannot be bypassed from the SDK or any application built on top of PayKit.

3. **Daily rate limiting** — Agents are limited to spending 10% of their total budget per 24-hour period. This resets automatically and is enforced at the protocol level.

4. **Automatic expiration** — Agents expire after 365 days by default. Expired agents cannot make or receive payments. They can be renewed by their owner.

5. **Immutable payment history** — Every payment is recorded on Solana and indexed by the dashboard in real time. Anyone can audit any agent's history with just a PDA address.

6. **Agent-to-agent payments** — Agents can pay other agents directly, with the same spend limits and rate limiting applied automatically.

---

## What PayKit Is Not (Yet)

PayKit today is not a full autonomous payment system where agents hold their own funds. In the current version (Camino A), agents are tied to their owner's wallet — the owner signs transactions, and the agent's PDA stores the accountability data.

The roadmap includes **Camino B**: agents with their own keypairs, their own token accounts, and the ability to hold and transfer USDC fully autonomously without the owner's involvement in each transaction. This is the future — and Solana is the only chain with the throughput and cost to make it viable at scale.

---

## Why Solana?

AI agents need to process thousands of micropayments per day — API calls, data purchases, service fees between agents. This requires:

- **~400ms transaction finality** — Fast enough for real-time agent workflows
- **~$0.00025 per transaction** — Cheap enough for micropayments at scale
- **65,000+ TPS capacity** — Enough throughput for a global agent economy

Ethereum cannot do this. The gas fees alone would make agent micropayments economically unviable.

---

## How It Works

Developer registers an AI agent
→ Agent gets an on-chain PDA with spend limit and expiration
→ Agent's identity is permanent and verifiable by anyone
Agent executes a task
→ Payment recorded on Solana in ~400ms
→ Spend limit enforced by the contract — cannot be exceeded
→ Daily limit (10% of total) auto-resets every 24 hours
Agent pays another agent
→ Agent-to-agent transaction confirmed immutably
→ Both agents' counters updated atomically
→ Event emitted on-chain for indexing
Anyone audits
→ Full payment history indexed from on-chain events
→ Any agent inspectable by PDA address — no permission needed

---

## Architecture

paykit/
├── programs/paykit/src/lib.rs  ← Anchor smart contract (Rust)
├── sdk/
│   ├── src/index.js            ← PayKit SDK (Node.js)
│   ├── src/types.ts            ← TypeScript types
│   ├── src/test.js             ← Integration test
│   └── src/tests/              ← Jest unit tests
└── frontend/
└── app/
├── page.tsx             ← Landing page (/)
├── dashboard/page.tsx   ← Live demo (/dashboard)
└── docs/page.tsx        ← Documentation (/docs)

---

## Smart Contract

**Program ID:** `F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF`  
**Network:** Solana Devnet  
**Framework:** Anchor 0.31.1

### Instructions

| Instruction | Description |
|---|---|
| `register_agent` | Creates an on-chain agent PDA with name, spend limit, and 365-day expiration |
| `record_payment` | Logs a payment against an agent's budget. Enforces spend and daily limits |
| `agent_to_agent_payment` | Records a direct payment between two registered agents |
| `update_spend_limit` | Updates the agent's total budget. Owner only |
| `deactivate_agent` | Permanently disables an agent. Irreversible |
| `renew_agent` | Extends an agent's expiration by a specified number of seconds |

### Agent Account Schema

```rust
pub struct AgentAccount {
    pub owner: Pubkey,          // Wallet that controls the agent
    pub name: String,           // Unique identifier (max 32 chars)
    pub spend_limit: u64,       // Maximum total spend in lamports
    pub total_spent: u64,       // Cumulative spend in lamports
    pub payment_count: u64,     // Number of payments recorded
    pub is_active: bool,        // Active/inactive status
    pub bump: u8,               // PDA bump seed
    pub last_payment_at: i64,   // Unix timestamp of last payment
    pub daily_spent: u64,       // Amount spent today in lamports
    pub daily_reset_at: i64,    // Unix timestamp of last daily reset
    pub expires_at: i64,        // Unix timestamp of expiration
}
```

### Error Codes

| Code | Description |
|---|---|
| `NameTooLong` | Agent name exceeds 32 characters |
| `InvalidSpendLimit` | Spend limit must be greater than zero |
| `InvalidAmount` | Payment amount must be greater than zero |
| `SpendLimitExceeded` | Payment would exceed the agent's total spend limit |
| `AgentInactive` | Agent has been deactivated |
| `MemoTooLong` | Memo or service description exceeds 64 characters |
| `DailyLimitExceeded` | Payment would exceed the agent's daily limit (10% of total per 24h) |
| `AgentExpired` | Agent has expired and must be renewed |

---

## SDK

### Installation

```bash
npm install @paykit/sdk
```

### Quickstart

```javascript
const { createClient } = require("@paykit/sdk");

// Initialize with your keypair
const client = createClient("/path/to/keypair.json", "devnet");

// Register an AI agent with a 1 SOL spend limit
const { agentPDA } = await client.registerAgent("my-agent", 1_000_000_000);

// Record a payment made by the agent
await client.recordPayment(
  "my-agent",
  1_000_000,              // 0.001 SOL in lamports
  recipientPublicKey,
  "OpenAI API call"
);

// Agent pays another agent autonomously
await client.agentToAgentPayment(
  "agent-alpha",
  "agent-beta",
  250_000,
  "Data analysis service"
);

// Check agent expiry
const expiry = await client.checkAgentExpiry("my-agent");
console.log(expiry.daysRemaining); // days until expiration
console.log(expiry.expired);       // boolean

// Renew agent for another year
await client.renewAgent("my-agent", 31_536_000);

// Fetch all agents owned by wallet
const agents = await client.fetchAllAgents();

// Get payment history from on-chain events
const history = await client.getPaymentHistory(10);

// Estimate fee before executing
const { feeSOL } = await client.estimateFee("my-agent", 250_000, "record");
```

### Mainnet Support

```javascript
// Connect to mainnet with custom RPC
const client = createClient(
  "/path/to/keypair.json",
  "mainnet-beta",
  "https://your-rpc-endpoint.com"
);
```

---

## Autonomous Agent Demo

PayKit includes a working demo of a fully autonomous AI agent that uses the Anthropic API to make decisions and execute payments on Solana without human intervention:

```bash
cd sdk
ANTHROPIC_API_KEY=your-key node src/agent-demo.js
```

The demo runs an orchestrator agent that:
1. Checks its own balance onchain
2. Delegates a task to an executor agent
3. Pays the executor agent autonomously via PayKit
4. Verifies the payment on Solana
5. Retrieves the full payment history

---

## How PayKit Compares

### vs x402 (Coinbase)
x402 handles HTTP payment requests on Base/EVM. PayKit provides on-chain agent identity with enforced budgets and immutable history on Solana — 50x cheaper and 30x faster per transaction. They are complementary layers: x402 handles the HTTP protocol, PayKit handles the accountability.

### vs Ethereum AI Agent EIPs (ERC-7715, ERC-7579)
Ethereum's standards delegate permissions from human wallets to agents. PayKit treats agents as first-class economic entities with their own identity, budget, daily limits, and expiration — enforced at the protocol level, not the application level.

### Why Not Ethereum?
At $0.00025 per transaction vs $0.50–5.00 on Ethereum, an agent making 1,000 micropayments per day costs $0.25 on Solana vs $500–5,000 on Ethereum. The math makes autonomous agent economies only viable on Solana.

---

## Local Development

### Prerequisites

- Rust 1.94.1
- Solana CLI 3.1.12
- Anchor CLI 0.31.1
- Node.js 18+
- Yarn 1.22+

### Setup

```bash
# Clone the repository
git clone https://github.com/usainbluntmx/paykit.git
cd paykit

# Build the smart contract
cargo update toml_datetime@1.1.1 --precise 0.6.8 2>/dev/null
anchor build

# Deploy to Devnet
anchor deploy

# Copy IDL to frontend
cp target/idl/paykit.json frontend/public/idl/paykit.json

# Test the SDK
cd sdk && npm install && node src/test.js

# Run Jest unit tests
npm test

# Run the frontend
cd ../frontend && npm install && npm run dev
```

---

## Roadmap

### ✅ Completed
- Smart contract with 6 instructions, rate limiting, expiration, and renewal
- SDK with full CRUD, TypeScript types, Jest tests, and fee estimation
- Dashboard with Phantom wallet, real-time agent monitoring, and activity chart
- USDC transfers with automatic token account creation for new wallets
- On-chain payment history indexer with filters and pagination
- Audit mode — inspect any agent by PDA address
- Autonomous AI agent demo with Anthropic API
- Landing page, dashboard, and full documentation

### 🔄 In Progress
- npm package publication
- Video demo for Colosseum submission

### 📋 Roadmap
- **Camino B**: Agents with their own keypairs and token accounts for fully autonomous USDC transfers
- Native SPL token support in the smart contract
- Multi-sig for high-value agent accounts
- LangChain and CrewAI integration guides
- Mainnet deployment

---

## Vision

PayKit is infrastructure, not a product.

The autonomous AI economy is coming. Agents will hire other agents, pay for compute, purchase data, and settle contracts — all without human approval. The question is not whether this will happen, but who will build the accountability layer that makes it trustworthy.

PayKit is that layer. Open-source. On Solana. Built for the agents of tomorrow.

---

## Built By

**Richi XBT** — [@usainbluntmx](https://github.com/usainbluntmx)  
Solana Certified Developer · Full-Stack & Blockchain Engineer  
[Zero Two Labs](https://github.com/usainbluntmx) — Building open-source Web3 infrastructure

---

## License

MIT © 2026 Zero Two Labs