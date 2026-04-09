# ⚡ PayKit

> The payments SDK for autonomous AI agents on Solana.

PayKit is open-source infrastructure that enables AI agents to autonomously send, receive, and track payments on Solana — without human intervention, without banks, and without permission.

Built for the **Solana Frontier Hackathon 2026** by [Zero Two Labs](https://github.com/usainbluntmx).

---

## The Problem

AI agents are becoming autonomous. They browse the web, write code, manage tasks, and make decisions on behalf of humans. But they still can't pay for anything.

Today, if an AI agent needs to:
- Pay for an API call
- Compensate another agent for a service
- Manage a spending budget autonomously

...it has to ask a human. Every time.

This is the bottleneck of the autonomous AI economy. There is no standard protocol for agents to transact with each other — no wallets, no spending limits, no verifiable payment history.

**PayKit solves this.**

---

## How It Works

Developer registers an AI agent → Agent gets an on-chain identity + spend limit
Agent executes a task → Payment recorded on Solana in ~400ms
Agent pays another agent → Agent-to-agent transaction confirmed immutably
Anyone can audit → Full payment history indexed from on-chain events

---

## Architecture

paykit/
├── programs/
│   └── paykit/
│       └── src/
│           └── lib.rs          ← Anchor smart contract (Rust)
├── sdk/
│   └── src/
│       ├── index.js            ← PayKit SDK (Node.js)
│       └── test.js             ← SDK integration test
├── frontend/
│   └── app/
│       ├── page.tsx            ← Dashboard UI
│       ├── layout.tsx          ← App layout
│       ├── providers.tsx       ← Wallet providers
│       └── globals.css         ← Global styles
├── Anchor.toml                 ← Anchor configuration
└── README.md

---

## Smart Contract

**Program ID:** `F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF`
**Network:** Solana Devnet
**Framework:** Anchor 0.31.1

The PayKit program exposes five instructions:

| Instruction | Description |
|---|---|
| `register_agent` | Creates an on-chain agent account with a name and spend limit |
| `record_payment` | Logs a payment made by an agent against its spend limit |
| `agent_to_agent_payment` | Records a direct payment between two registered agents |
| `update_spend_limit` | Allows the owner to adjust the agent's budget |
| `deactivate_agent` | Permanently disables an agent |

Each agent account stores:

| Field | Type | Description |
|---|---|---|
| `owner` | Pubkey | Wallet that controls the agent |
| `name` | String | Unique identifier (max 32 chars) |
| `spend_limit` | u64 | Maximum spend in lamports |
| `total_spent` | u64 | Cumulative spend tracked on-chain |
| `payment_count` | u64 | Number of payments recorded |
| `is_active` | bool | Active/inactive status |
| `bump` | u8 | PDA bump seed |

All state transitions emit on-chain events (`AgentRegistered`, `PaymentRecorded`, `AgentPaymentSent`) that are indexed and displayed in the dashboard in real time.

---

## SDK

### Installation

```bash
npm install @paykit/sdk
```

### Usage

```javascript
const { createClient } = require("@paykit/sdk");

// Initialize client
const client = createClient("/path/to/keypair.json", "devnet");

// Register an AI agent with a 1 SOL spend limit
const { agentPDA } = await client.registerAgent("my-agent", 1_000_000_000);

// Record a payment made by the agent
await client.recordPayment(
  "my-agent",
  1_000_000,              // 0.001 SOL in lamports
  recipientPublicKey,
  "Payment for API call"
);

// Agent-to-agent payment
await client.agentToAgentPayment(
  "agent-alpha",          // sender
  "agent-beta",           // receiver  
  500_000,               // 0.0005 SOL
  "Image generation service"
);

// Fetch agent state
const agent = await client.fetchAgent("my-agent");
console.log(agent.totalSpent);    // lamports spent
console.log(agent.paymentCount);  // number of payments
console.log(agent.isActive);      // true/false

// Fetch all agents owned by wallet
const agents = await client.fetchAllAgents();
```

---

## Dashboard

The PayKit dashboard is a real-time interface built with Next.js that allows developers to:

- **Connect** their Phantom wallet
- **Register** AI agents with custom spend limits
- **Execute** agent-to-agent payments onchain
- **Monitor** all agents and their payment activity
- **Audit** the complete payment history indexed from on-chain events

The dashboard demonstrates the full protocol in action and serves as a reference implementation for any developer integrating PayKit.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana Devnet |
| Smart Contracts | Rust + Anchor 0.31.1 |
| SDK | Node.js / JavaScript |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Wallet | Phantom via @solana/wallet-adapter |
| Fonts | Orbitron + Share Tech Mono |

---

## How PayKit Differs from Alternatives

### vs x402 (Coinbase)
x402 handles payment for HTTP requests on Base/EVM. PayKit gives agents a persistent on-chain identity with enforced spend limits and immutable payment history on Solana — 50x cheaper and 30x faster than EVM.

### vs Ethereum AI Agent EIPs (ERC-7715, ERC-7579)
Ethereum's AI agent standards delegate permissions from human wallets to agents. PayKit treats agents as first-class economic entities with their own identity, budget, and history — no human wallet required per transaction.

### Why Solana
- ~400ms transaction finality
- ~$0.00025 per transaction
- Throughput to handle thousands of agent micropayments per second

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

# Test the SDK
cd sdk
npm install
node src/test.js

# Run the frontend
cd ../frontend
npm install
npm run dev
```

### Solana Config

```bash
solana config set --url devnet
solana balance
```

---

## Roadmap

### Week 1 — Foundation ✅
- [x] Smart contract with agent registry and payment tracking
- [x] Agent-to-agent payment instruction
- [x] SDK with full CRUD operations
- [x] Deployed and verified on Solana Devnet

### Week 2 — Integration ✅
- [x] Next.js dashboard with retro-futuristic UI
- [x] Phantom wallet connection
- [x] Real-time agent monitoring
- [x] On-chain payment history indexer
- [x] Agent-to-agent demo

### Week 3 — Polish 🔄
- [ ] USDC token transfers between agents
- [ ] TypeScript types for SDK
- [ ] npm package publication
- [ ] Demo video
- [ ] Pitch deck

---

## Vision

PayKit is not a product. It is a protocol.

The autonomous AI economy is coming. Agents will hire other agents, pay for compute, purchase data, and settle contracts — all without human approval. Solana is the only blockchain fast enough and cheap enough to be the settlement layer for this economy.

PayKit is the standard for how that happens.

---

## Built By

**Ricardo** — [@usainbluntmx](https://github.com/usainbluntmx)
Solana Certified Developer · Full-Stack & Blockchain Engineer
[Zero Two Labs](https://github.com/usainbluntmx) — Building open-source Web3 infrastructure

---

## License

MIT © 2026 Zero Two Labs