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

## The Solution

PayKit is a three-layer system:

1. **Smart Contract (Anchor/Rust)** — On-chain registry of AI agents with enforced spending limits, payment tracking, and ownership control. Deployed on Solana for sub-second finality and near-zero fees.

2. **SDK (Node.js/TypeScript)** — A simple, developer-friendly library that any application can integrate in minutes. Register agents, record payments, query balances — all in a few lines of code.

3. **Dashboard (Next.js)** — A real-time interface to monitor agents, visualize payment flows, and demonstrate the protocol in action.

---

## Architecture

paykit/
├── programs/
│   └── paykit/
│       └── src/
│           └── lib.rs          ← Anchor smart contract
├── sdk/
│   └── src/
│       ├── index.js            ← PayKit SDK
│       └── test.js             ← SDK integration test
├── frontend/
│   └── app/
│       ├── page.tsx            ← Dashboard UI
│       ├── layout.tsx          ← App layout
│       └── globals.css         ← Global styles
├── Anchor.toml                 ← Anchor configuration
└── README.md

---

## Smart Contract

The PayKit program lives on Solana and exposes four instructions:

| Instruction | Description |
|---|---|
| `register_agent` | Creates an on-chain agent account with a name and spend limit |
| `record_payment` | Logs a payment made by an agent, enforcing the spend limit |
| `update_spend_limit` | Allows the owner to adjust the agent's budget |
| `deactivate_agent` | Permanently disables an agent |

Each agent account stores:
- `owner` — the wallet that controls the agent
- `name` — unique identifier (max 32 chars)
- `spend_limit` — maximum spend in lamports
- `total_spent` — cumulative spend tracked on-chain
- `payment_count` — number of payments recorded
- `is_active` — active/inactive status

All state transitions emit on-chain events (`AgentRegistered`, `PaymentRecorded`) that can be indexed and consumed by any application.

**Program ID:** `F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF`  
**Network:** Solana Devnet  
**Framework:** Anchor 0.31.1

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

// Fetch agent state
const agent = await client.fetchAgent("my-agent");
console.log(agent.totalSpent);    // lamports spent
console.log(agent.paymentCount);  // number of payments
console.log(agent.isActive);      // true/false
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana Devnet |
| Smart Contracts | Rust + Anchor 0.31.1 |
| SDK | Node.js / JavaScript |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Wallet | @solana/web3.js |
| Package Manager | npm / yarn |

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

### Environment
```bash
# Verify Solana config
solana config get

# Set to Devnet
solana config set --url devnet

# Check balance
solana balance
```

---

## Roadmap

### Week 1 — Foundation ✅
- [x] Smart contract with agent registry and payment tracking
- [x] SDK with full CRUD operations
- [x] Next.js dashboard with real-time agent monitoring
- [x] Deployed and verified on Solana Devnet

### Week 2 — Integration
- [ ] Phantom wallet connection in dashboard
- [ ] USDC token transfers between agents
- [ ] Payment history with on-chain event indexing
- [ ] SDK TypeScript types and documentation

### Week 3 — Polish
- [ ] Agent-to-agent payment demo
- [ ] API key system for SDK authentication
- [ ] Public SDK package on npm
- [ ] Hackathon demo video and pitch deck

---

## Vision

PayKit is not a product. It is a protocol.

The autonomous AI economy is coming. Agents will hire other agents, pay for compute, purchase data, and settle contracts — all without human approval. Solana is the only blockchain fast enough and cheap enough to be the settlement layer for this economy.

PayKit is the standard for how that happens.

The developer who integrates PayKit today is building on the infrastructure of tomorrow's AI economy.

---

## Built By

**Ricardo** — [@usainbluntmx](https://github.com/usainbluntmx)  
Solana Certified Developer · Full-Stack & Blockchain Engineer  
[Zero Two Labs](https://github.com/usainbluntmx) — Building open-source Web3 infrastructure

---

## License

MIT © 2026 Zero Two Labs