"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Sections ─────────────────────────────────────────────────────────────────

const sections = [
  { id: "overview",            title: "Overview" },
  { id: "camino-b",            title: "Agent-Native Architecture" },
  { id: "installation",        title: "Installation" },
  { id: "quickstart",          title: "Quickstart" },
  { id: "create-agent",        title: "createAutonomousAgent" },
  { id: "record-payment",      title: "recordPayment" },
  { id: "agent-to-agent",      title: "agentToAgentPayment" },
  { id: "batch-payment",       title: "batchPayment" },
  { id: "transfer-sol",        title: "transferSOL" },
  { id: "transfer-tokens",     title: "transferUSDC / transferSPL" },
  { id: "capabilities",        title: "Capabilities System" },
  { id: "tiers",               title: "Tier System" },
  { id: "categories",          title: "Category Limits" },
  { id: "balances",            title: "Balances & History" },
  { id: "monitoring",          title: "watchAgent / Webhooks" },
  { id: "lifecycle",           title: "Agent Lifecycle" },
  { id: "browser-wallet",      title: "Browser Wallet" },
  { id: "cli",                 title: "CLI Wizard" },
  { id: "sidecar",             title: "HTTP Sidecar" },
  { id: "errors",              title: "Error Codes" },
  { id: "langchain",           title: "LangChain" },
  { id: "crewai",              title: "CrewAI" },
  { id: "contract",            title: "Smart Contract" },
  { id: "architecture",        title: "Architecture" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ position: "relative", marginBottom: "24px" }}>
      <button onClick={copy} style={{ position: "absolute", top: "10px", right: "10px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: copied ? "#00ff88" : "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "3px 8px", borderRadius: "2px", cursor: "pointer", letterSpacing: "0.1em", transition: "all 0.2s" }}>
        {copied ? "COPIED" : "COPY"}
      </button>
      <pre style={{ background: "#060a08", border: "1px solid rgba(0,255,136,0.12)", borderRadius: "4px", padding: "20px", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", lineHeight: 1.8, color: "#c8f0d8", overflowX: "auto", whiteSpace: "pre" }}>
        {children}
      </pre>
    </div>
  );
}

function Badge({ text, color = "#00ff88" }: { text: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: "11px", color, border: `1px solid ${color}40`, background: `${color}10`, padding: "2px 8px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em", marginRight: "8px" }}>
      {text}
    </span>
  );
}

function Param({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 120px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
      <span style={{ color: "#00ff88", fontFamily: "'Share Tech Mono', monospace" }}>{name}</span>
      <span style={{ color: "#ffb800", fontFamily: "'Share Tech Mono', monospace" }}>{type}</span>
      <span style={{ color: "#9aeab0" }}>{desc} {required && <span style={{ color: "#ff3c5a", fontSize: "12px" }}>required</span>}</span>
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} style={{ fontFamily: "'Orbitron', monospace", fontSize: "16px", color: "#00ff88", letterSpacing: "0.15em", marginBottom: "16px", marginTop: "48px", paddingTop: "16px", borderTop: "1px solid rgba(0,255,136,0.1)" }}>
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: string }) {
  return (
    <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: "12px", color: "#6aaa80", letterSpacing: "0.2em", marginBottom: "12px", marginTop: "24px" }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "15px", color: "#9aeab0", lineHeight: 1.8, marginBottom: "16px" }}>
      {children}
    </p>
  );
}

function Callout({ type = "info", children }: { type?: "info" | "warning" | "danger"; children: React.ReactNode }) {
  const colors = { info: "#00ff88", warning: "#ffb800", danger: "#ff3c5a" };
  const color = colors[type];
  return (
    <div style={{ padding: "14px 18px", background: `${color}08`, border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: "3px", marginBottom: "20px", fontSize: "14px", color: "#9aeab0", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: "24px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(0,255,136,0.2)" }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "10px 14px", color: "#00ff88", textAlign: "left", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(0,255,136,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(0,255,136,0.01)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: j === 0 ? "#c8f0d8" : "#9aeab0", verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Docs() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", maxWidth: "1200px", margin: "0 auto" }}>

      {/* Sidebar */}
      <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", borderRight: "1px solid rgba(0,255,136,0.08)", padding: "32px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ marginBottom: "24px" }}>
          <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: "4px" }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: 900, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>PAYKIT</span>
          </button>
          <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.15em" }}>SDK DOCS · OPEN BETA</div>
        </div>
        {sections.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)} style={{ background: activeSection === s.id ? "rgba(0,255,136,0.08)" : "transparent", border: "none", borderLeft: `2px solid ${activeSection === s.id ? "#00ff88" : "transparent"}`, color: activeSection === s.id ? "#00ff88" : "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", padding: "7px 12px", cursor: "pointer", textAlign: "left", letterSpacing: "0.05em", transition: "all 0.15s", borderRadius: "0 3px 3px 0" }}>
            {s.title}
          </button>
        ))}
        <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(0,255,136,0.06)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => router.push("/demo")} style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", padding: "8px 12px", borderRadius: "3px", cursor: "pointer", letterSpacing: "0.1em" }}>
            LIVE DEMO →
          </button>
          <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "1px solid rgba(0,255,136,0.1)", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", padding: "8px 12px", borderRadius: "3px", cursor: "pointer", letterSpacing: "0.1em" }}>
            DASHBOARD
          </button>
          <button onClick={() => router.push("/network")} style={{ background: "transparent", border: "1px solid rgba(0,255,136,0.1)", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", padding: "8px 12px", borderRadius: "3px", cursor: "pointer", letterSpacing: "0.1em" }}>
            NETWORK
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "48px 56px", overflowY: "auto", maxHeight: "100vh" }}>

        {/* Overview */}
        <div id="overview">
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#6aaa80", letterSpacing: "0.2em", marginBottom: "12px" }}>// SDK REFERENCE</div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: "28px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.05em", textShadow: "0 0 20px rgba(0,255,136,0.3)", marginBottom: "20px" }}>PayKit SDK</h1>
          <P>PayKit is an accountability layer for autonomous AI agents on Solana. Agents get their own keypair, their own wallet, and enforced spend limits — all at the protocol level. Agents sign their own transactions. The owner wallet is never involved in individual payments.</P>
          <P>PayKit is <strong style={{ color: "#c8f0d8" }}>not a payment processor</strong>. It records accountability onchain with immutable events, enforced budgets, granular capabilities, tier-based hiring, and category limits.</P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "24px" }}>
            {[
              { label: "PROGRAM ID", value: "F27DrerUQGnk..." },
              { label: "NETWORK", value: "Solana Devnet" },
              { label: "VERSION", value: "AGENT-NATIVE · DEVNET" },
            ].map(item => (
              <div key={item.label} style={{ padding: "14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: "3px" }}>
                <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.15em", marginBottom: "6px", fontFamily: "'Orbitron', monospace" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent-Native Architecture */}
        <SectionTitle id="camino-b">CAMINO B ARCHITECTURE</SectionTitle>
        <P>PayKit takes an agent-native approach — the key architectural difference from every other agent payment system:</P>
        <Code>{`// Other SDKs:
// Owner wallet signs every payment → agents have no real autonomy

// PayKit (agent-native):
// Each agent has its own Solana keypair
// Agent signs its own record_payment and agentToAgentPayment transactions
// Owner wallet only signs: register_agent, set_capabilities, set_tier, renew_agent, close_agent

// PDA derived from the agent's own keypair:
[b"agent", agent_keypair.pubkey, agent_name]`}</Code>
        <Callout type="info">
          <strong style={{ color: "#00ff88" }}>What this means in practice:</strong> When you call <code style={{ color: "#c8f0d8" }}>createAutonomousAgent</code>, the SDK generates a Solana keypair and saves it to <code style={{ color: "#c8f0d8" }}>~/.paykit/agents/&lt;name&gt;.json</code>. Every subsequent payment is signed by that keypair — your Phantom wallet is not touched.
        </Callout>

        {/* Installation */}
        <SectionTitle id="installation">INSTALLATION</SectionTitle>
        <Code>{`npm install @paykit/sdk`}</Code>
        <P>Requires Node.js 18+. For browser usage, see the <strong style={{ color: "#c8f0d8" }}>Browser Wallet</strong> section.</P>

        {/* Quickstart */}
        <SectionTitle id="quickstart">QUICKSTART</SectionTitle>
        <Code>{`const { createClient, CAP_ALL_DEFAULT, CATEGORIES } = require("@paykit/sdk");

const client = createClient("/path/to/owner-keypair.json", "devnet");

// 1. Create an autonomous agent — generates keypair, registers onchain, funds wallet
const { agentPDA, agentPublicKey } = await client.createAutonomousAgent(
    "my-agent",
    1_000_000_000,   // 1 SOL spend limit
    1000,            // 10% daily limit (BPS)
    50_000_000,      // fund with 0.05 SOL for TX fees
    CAP_ALL_DEFAULT, // all 7 capabilities enabled
    1                // tier: standard
);
// Keypair saved to ~/.paykit/agents/my-agent.json

// 2. Agent records a payment autonomously — no owner needed
await client.recordPayment("my-agent", 1_000_000, recipientPubkey, "API call", CATEGORIES.COMPUTE);

// 3. Agent pays another agent — contract verifies capabilities + tier
await client.agentToAgentPayment("my-agent", "executor", 250_000, "analysis task", CATEGORIES.INFERENCE);

// 4. Transfer SOL between agent wallets — agent signs
await client.transferSOL("my-agent", "other-agent", 0.001, "service fee");

// 5. Close agent and recover rent when done
const { rentRecovered } = await client.closeAgent("my-agent");
// rentRecovered: "~0.003 SOL"`}</Code>

        {/* createAutonomousAgent */}
        <SectionTitle id="create-agent">createAutonomousAgent</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="generates keypair" color="#6aaa80" /></div>
        <P>The primary way to create an agent in PayKit. Generates a Solana keypair, saves it locally, registers the agent onchain, and funds the agent wallet — all in one operation. The owner wallet signs this registration once; the agent signs all subsequent payments.</P>
        <Code>{`const result = await client.createAutonomousAgent(
    name,               // string — agent identifier (max 32 chars)
    spendLimitLamports, // number — total spend limit
    dailyLimitBps,      // number — daily limit (1000 = 10%, 10000 = 100%)
    fundingLamports,    // number — SOL to send to agent wallet for TX fees
    capabilities,       // number — bitmask (use CAP_ALL_DEFAULT for all enabled)
    tier                // number — 0=basic, 1=standard, 2=premium
);
// result: { tx, agentPDA, agentPublicKey, keypairPath, capabilities, tier }`}</Code>
        <SubTitle>// PARAMETERS</SubTitle>
        <Param name="name" type="string" required desc="Unique agent identifier. Max 32 chars." />
        <Param name="spendLimitLamports" type="number" required desc="Maximum total spend in lamports. 1 SOL = 1,000,000,000." />
        <Param name="dailyLimitBps" type="number" required desc="Daily limit in basis points. 1000 = 10%, 500 = 5%, 10000 = 100%. Range: 1–10000." />
        <Param name="fundingLamports" type="number" required desc="SOL to transfer to the agent wallet to cover transaction fees. Recommended minimum: 50,000,000 (0.05 SOL)." />
        <Param name="capabilities" type="number" required desc="Capability bitmask. Use CAP_ALL_DEFAULT (127) to enable all 7 predefined capabilities." />
        <Param name="tier" type="number" required desc="Agent tier. 0=basic, 1=standard, 2=premium. Determines who can hire this agent." />
        <SubTitle>// KEYPAIR STORAGE</SubTitle>
        <Code>{`// Keypair is saved automatically to:
~/.paykit/agents/<n>.json

// You can load it manually if needed:
const { loadAgentKeypair, agentKeypairExists } = require("@paykit/sdk");
const keypair = loadAgentKeypair("my-agent");
const exists  = agentKeypairExists("my-agent"); // → boolean

// List all local agents:
const agents = client.listLocalAgents();
// [{ name, publicKey, keypairPath }]`}</Code>

        {/* recordPayment */}
        <SectionTitle id="record-payment">recordPayment</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="agent signs" color="#00ff88" /></div>
        <P>Records an accountability entry onchain. The agent signs with its own keypair — the owner wallet is not involved. Enforces total spend limit, daily BPS limit, and category limit (if set). This is the core accountability primitive: it does not move funds, it records that a payment occurred.</P>
        <Code>{`const { tx } = await client.recordPayment(
    agentName,       // string — name of the signing agent
    amountLamports,  // number — payment amount
    recipientPubkey, // PublicKey — who received the payment
    memo,            // string — description (max 64 chars)
    categoryId       // number — CATEGORIES.COMPUTE, .DATA, .INFERENCE, etc.
);`}</Code>
        <SubTitle>// EXAMPLE</SubTitle>
        <Code>{`const { PublicKey } = require("@solana/web3.js");
const { CATEGORIES } = require("@paykit/sdk");

await client.recordPayment(
    "my-agent",
    500_000,   // 0.0005 SOL
    new PublicKey("EerXs1w5RzSpcmT2..."),
    "OpenAI GPT-4o API call",
    CATEGORIES.INFERENCE
);`}</Code>

        {/* agentToAgentPayment */}
        <SectionTitle id="agent-to-agent">agentToAgentPayment</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="agent signs" color="#00ff88" /><Badge text="verifies capabilities + tier" color="#6aaa80" /></div>
        <P>Records a direct payment from one registered agent to another. The sender agent signs with its own keypair. The contract verifies three things before executing: the sender has <code style={{ color: "#ffb800" }}>CAN_PAY_AGENTS</code>, the sender has the capability to hire the receiver's tier, and the sender has sufficient budget. If any check fails, the transaction reverts.</P>
        <Code>{`const { tx } = await client.agentToAgentPayment(
    senderName,     // string — sender agent (must have keypair locally)
    receiverName,   // string — receiver agent (must be registered onchain)
    amountLamports, // number
    service,        // string — service description (max 64 chars)
    categoryId      // number — CATEGORIES.COMPUTE, .DATA, .INFERENCE, etc.
);`}</Code>
        <SubTitle>// EXAMPLE</SubTitle>
        <Code>{`await client.agentToAgentPayment(
    "orchestrator",
    "executor",
    250_000,
    "Market data analysis for Q2 2026",
    CATEGORIES.DATA
);`}</Code>

        {/* batchPayment */}
        <SectionTitle id="batch-payment">batchPayment</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="agent signs" color="#00ff88" /><Badge text="atomic" color="#6aaa80" /><Badge text="max 5" color="#ffb800" /></div>
        <P>Sends up to 5 agent-to-agent payments in a single Solana transaction. All payments succeed or all fail atomically. The sender agent signs the entire batch with its own keypair. This is the key primitive for orchestrator patterns — one agent delegates work and pays multiple specialized agents in one shot.</P>
        <Callout type="info">
          <strong style={{ color: "#00ff88" }}>Why batch?</strong> Instead of 5 separate transactions (5× fees, 5× latency), batchPayment packs all payments into one transaction. ~$0.000025 total vs ~$0.00025 individually. Each payment still enforces the sender's spend limit and daily BPS.
        </Callout>
        <Code>{`const { tx, count } = await client.batchPayment(
    senderName,  // string — sender agent
    payments     // array of up to 5 payment objects
);

// Each payment object:
// { receiverName: string, amountLamports: number, service: string, categoryId?: number }`}</Code>
        <SubTitle>// EXAMPLE</SubTitle>
        <Code>{`const { tx, count } = await client.batchPayment("orchestrator", [
    { receiverName: "agent-researcher", amountLamports: 100_000, service: "Web research",       categoryId: CATEGORIES.RESEARCH },
    { receiverName: "agent-writer",     amountLamports: 150_000, service: "Content generation", categoryId: CATEGORIES.CONTENT },
    { receiverName: "agent-reviewer",   amountLamports: 50_000,  service: "Quality review",     categoryId: CATEGORIES.DATA },
]);
console.log(\`\${count} payments in 1 TX: \${tx}\`);`}</Code>

        {/* transferSOL */}
        <SectionTitle id="transfer-sol">transferSOL</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="agent signs" color="#00ff88" /></div>
        <P>Transfers SOL directly between two agent wallets. The sender agent signs with its own keypair. Also records the payment onchain via <code style={{ color: "#ffb800" }}>record_payment</code> for accountability — both the SOL transfer and the accountability record happen in the same transaction.</P>
        <Code>{`const { tx } = await client.transferSOL(
    fromAgentName,  // string — sender agent (must have keypair locally)
    toAgentName,    // string — receiver agent (must have keypair locally)
    amountSOL,      // number — amount in SOL (e.g. 0.001)
    memo            // string — transfer description
);`}</Code>
        <SubTitle>// EXAMPLE</SubTitle>
        <Code>{`const { tx } = await client.transferSOL("my-agent", "executor", 0.001, "Service fee payment");

// Check SOL balance of any agent wallet
const { sol, lamports } = await client.getSOLBalance("my-agent");
console.log(\`Agent wallet: \${sol.toFixed(6)} SOL\`);`}</Code>

        {/* transferUSDC / transferSPL */}
        <SectionTitle id="transfer-tokens">transferUSDC / transferSPL</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="agent signs" color="#00ff88" /></div>
        <P>Transfers SPL tokens between agent wallets. The sender agent signs with its own keypair. If the receiver's associated token account doesn't exist, it's created automatically. The transfer is recorded onchain for accountability in the same transaction.</P>
        <Code>{`// Transfer USDC (devnet mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
const { tx } = await client.transferUSDC(fromAgentName, toAgentName, amountUSDC, memo);

// Transfer any SPL token
const { tx } = await client.transferSPL(
    fromAgentName,
    toAgentName,
    amount,      // human-readable (e.g. 1.5)
    mintPubkey,  // PublicKey of the token mint
    decimals,    // token decimals (6 for USDC, 9 for most others)
    memo
);

// Check token balance
const { ui, raw } = await client.getTokenBalance("my-agent", usdcMintPubkey, 6);
console.log(\`Agent USDC balance: \${ui}\`);`}</Code>

        {/* Capabilities */}
        <SectionTitle id="capabilities">CAPABILITIES SYSTEM</SectionTitle>
        <P>Capabilities are stored as a <code style={{ color: "#ffb800" }}>u16</code> bitmask in the agent's onchain account. The contract checks them before every payment — they cannot be bypassed at the application layer. The owner sets capabilities; the agent cannot grant itself permissions.</P>
        <Table
          headers={["Bit", "Constant", "Description"]}
          rows={[
            ["0", "CAN_PAY_AGENTS", "Can pay other registered agents"],
            ["1", "CAN_HIRE_BASIC", "Can hire tier-0 (basic) agents"],
            ["2", "CAN_HIRE_STANDARD", "Can hire tier-1 (standard) agents"],
            ["3", "CAN_HIRE_PREMIUM", "Can hire tier-2 (premium) agents"],
            ["4", "CAN_TRANSFER_SOL", "Can transfer SOL between agent wallets"],
            ["5", "CAN_TRANSFER_SPL", "Can transfer SPL tokens (USDC, etc.)"],
            ["6", "CAN_BATCH_PAY", "Can send up to 5 payments in one TX"],
            ["8–15", "Custom slots", "Owner-defined capabilities (setCustomCapability)"],
          ]}
        />
        <Code>{`const { CAPABILITIES, CAP_ALL_DEFAULT } = require("@paykit/sdk");

// CAP_ALL_DEFAULT = bits 0-6 all set = 0b01111111 = 127

// Set capabilities (owner only)
await client.setCapabilities("my-agent", CAPABILITIES.CAN_PAY_AGENTS | CAPABILITIES.CAN_TRANSFER_SOL);

// Define a custom capability in slot 0 (bit 8)
await client.setCustomCapability("my-agent", 0, "can-access-market-data", true);

// Decode a capabilities bitmask to a readable object
const decoded = client.decodeCapabilities(agent.capabilities);
// {
//   canPayAgents: true, canHireBasic: true, canHireStandard: true,
//   canHirePremium: true, canTransferSOL: true, canTransferSPL: true,
//   canBatchPay: true, custom: { slot1: false, ... }, raw: 127
// }`}</Code>

        {/* Tiers */}
        <SectionTitle id="tiers">TIER SYSTEM</SectionTitle>
        <P>Every agent has a tier that determines who can hire it. The contract verifies tier compatibility before every agent-to-agent payment — a sender without the matching capability cannot hire that receiver, regardless of what the application layer tries to do.</P>
        <Table
          headers={["Tier", "Value", "Can be hired by"]}
          rows={[
            ["BASIC", "0", "Any agent with CAN_HIRE_BASIC"],
            ["STANDARD", "1", "Agents with CAN_HIRE_STANDARD"],
            ["PREMIUM", "2", "Agents with CAN_HIRE_PREMIUM only"],
          ]}
        />
        <Code>{`// Set tier (owner only)
await client.setTier("my-agent", 1); // standard

// An agent with CAN_HIRE_BASIC cannot hire a PREMIUM agent
// The contract returns TierNotAllowed if the check fails`}</Code>

        {/* Categories */}
        <SectionTitle id="categories">CATEGORY LIMITS</SectionTitle>
        <P>Category limits let the owner restrict how much an agent can spend per payment in a specific category. For example, an agent might have a 1 SOL total spend limit but only 0.1 SOL per inference payment. The contract enforces this per payment, not per day.</P>
        <Table
          headers={["ID", "Name", "ID", "Name"]}
          rows={[
            ["0", "none (no limit applied)", "4", "inference"],
            ["1", "compute", "5", "research"],
            ["2", "data", "6", "content"],
            ["3", "storage", "8–255", "custom (owner-defined)"],
          ]}
        />
        <Code>{`const { CATEGORIES } = require("@paykit/sdk");

// Set a category limit (owner only)
// Agent can spend at most 0.5 SOL per single inference payment
await client.setCategoryLimit("my-agent", CATEGORIES.INFERENCE, 500_000_000);

// Set a custom category with a name
await client.setCategoryLimit("my-agent", 8, 100_000_000, "my-custom-category");

// Use in payments
await client.recordPayment("my-agent", 250_000, recipient, "GPT-4 call", CATEGORIES.INFERENCE);
await client.agentToAgentPayment("sender", "executor", 200_000, "analysis", CATEGORIES.DATA);`}</Code>

        {/* Balances & History */}
        <SectionTitle id="balances">BALANCES & HISTORY</SectionTitle>
        <Code>{`// SOL balance of an agent's wallet
const { sol, lamports } = await client.getSOLBalance("my-agent");

// SPL token balance (USDC or any token)
const { ui, raw } = await client.getTokenBalance("my-agent", mintPubkey, decimals);

// Fetch single agent account from onchain
const agent = await client.fetchAgent("my-agent");
// agent.spendLimit, agent.totalSpent, agent.paymentCount, agent.capabilities, agent.tier...

// Fetch all current-version agents owned by wallet
const agents = await client.fetchAllAgents();

// Transaction history for a specific agent (from onchain logs)
const history = await client.getAgentHistory("my-agent", 20);
// [{ type: "record_payment" | "agent_to_agent" | "register_agent", agentName, agentPDA, time, tx }]

// Program-wide transaction history
const allHistory = await client.getPaymentHistory(50);

// Check expiry status
const expiry = await client.checkAgentExpiry("my-agent");
// { expired: boolean, expiresAt: Date, daysRemaining: number }`}</Code>

        {/* Monitoring */}
        <SectionTitle id="monitoring">watchAgent / createWebhook</SectionTitle>
        <SubTitle>// watchAgent — polling, no external service</SubTitle>
        <P>Polls the agent's PDA at a configurable interval. Best for development, testing, or short-lived processes. Returns a stop function.</P>
        <Code>{`const stop = client.watchAgent(
    "my-agent",
    (err, entry) => {
        if (err) { console.error(err.code); return; }
        console.log("New TX:", entry.type, entry.tx);
    },
    5000  // poll every 5 seconds (default)
);

// Stop watching
stop();`}</Code>
        <SubTitle>// createWebhook — Helius, production</SubTitle>
        <P>Registers a persistent webhook via Helius that POSTs to your endpoint on every agent transaction. Works even when your process isn't running. Free tier: 3 webhooks, 1M notifications/month.</P>
        <Callout type="warning">
          <strong style={{ color: "#ffb800" }}>Requires a Helius API key.</strong> Get one at helius.dev. Free tier is sufficient for development and most production use cases.
        </Callout>
        <Code>{`const { webhookId, agentPDA } = await client.createWebhook(
    "my-agent",
    "https://your-api.com/webhook/paykit",
    process.env.HELIUS_API_KEY,
    "devnet"  // or "mainnet-beta"
);

// Your endpoint receives POST requests:
// { type: "TRANSFER", accountData: [...], transaction: { ... } }

// Delete when no longer needed
await client.deleteWebhook(webhookId, process.env.HELIUS_API_KEY);`}</Code>

        {/* Lifecycle */}
        <SectionTitle id="lifecycle">AGENT LIFECYCLE</SectionTitle>
        <P>All lifecycle operations are owner-signed — the agent keypair is not required for these. Agents can be deactivated and reactivated without losing their onchain history. When an agent is no longer needed, <code style={{ color: "#ffb800" }}>closeAgent</code> recovers the rent.</P>
        <Code>{`// Deactivate — agent cannot transact, but history is preserved
await client.deactivateAgent("my-agent");

// Reactivate — agent must not be expired
await client.reactivateAgent("my-agent");

// Renew expiration
await client.renewAgent("my-agent", 31_536_000); // +365 days
await client.renewAgent("my-agent", 15_768_000); // +6 months

// Update spend limit
await client.updateSpendLimit("my-agent", 2_000_000_000); // 2 SOL

// Estimate fee before executing
const { feeSOL } = await client.estimateFee("my-agent", 250_000, "record");
console.log(\`Fee: \${feeSOL} SOL\`); // ~0.000005000 SOL

// Close agent and recover rent (~0.003 SOL)
// Owner signs — local keypair file is also removed automatically
const { tx, rentRecovered } = await client.closeAgent("my-agent");
console.log(\`Rent recovered: \${rentRecovered}\`); // ~0.003 SOL`}</Code>
        <Callout type="info">
          <strong style={{ color: "#00ff88" }}>Full lifecycle:</strong> create → activate → transact → deactivate → reactivate → renew → close. Each state is enforced at the contract level — a deactivated agent cannot send or receive payments.
        </Callout>

        {/* Browser Wallet */}
        <SectionTitle id="browser-wallet">BROWSER WALLET SUPPORT</SectionTitle>
        <div style={{ marginBottom: "16px" }}><Badge text="Phantom" /><Badge text="Backpack" color="#ffb800" /><Badge text="Solflare" color="#6aaa80" /></div>
        <P>For browser-based applications, use <code style={{ color: "#ffb800" }}>createClientFromWallet</code> instead of <code style={{ color: "#ffb800" }}>createClient</code>. No keypair file needed. Agent keypairs are stored in <code style={{ color: "#ffb800" }}>localStorage</code> instead of the filesystem.</P>
        <Callout type="info">
          <strong style={{ color: "#00ff88" }}>Two constructors:</strong> Use <code style={{ color: "#c8f0d8" }}>createClient</code> for Node.js (LangChain, backend services, scripts). Use <code style={{ color: "#c8f0d8" }}>createClientFromWallet</code> for browser apps with wallet adapters.
        </Callout>
        <Code>{`import { createClientFromWallet } from "@paykit/sdk";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

function MyApp() {
    const wallet = useWallet();
    const { connection } = useConnection();

    async function deployAgent() {
        const client = createClientFromWallet(wallet, connection);

        const { agentPDA } = await client.createAutonomousAgent(
            "my-browser-agent",
            1_000_000_000,
            1000,
            50_000_000
        );
        // Agent keypair stored in localStorage["paykit_agents"]
    }
}`}</Code>

        {/* CLI */}
        <SectionTitle id="cli">CLI WIZARD</SectionTitle>
        <P>The PayKit CLI provides an interactive terminal wizard for creating and inspecting agents without writing code. Install from the SDK root:</P>
        <Code>{`# Make executable
chmod +x sdk/src/cli.js

# Interactive agent creation wizard
# Guides you through: name, spend limit, funding, tier, capabilities, category limits
node sdk/src/cli.js agent create my-agent

# List all local agents with onchain status
node sdk/src/cli.js agent list

# Inspect a specific agent (full onchain state + capabilities + history)
node sdk/src/cli.js agent inspect my-agent`}</Code>
        <SubTitle>// EXAMPLE: paykit agent create</SubTitle>
        <Code>{`$ node sdk/src/cli.js agent create trading-agent

  ⚡ PAYKIT CLI

  Agent name: trading-agent
  Spend limit: 5 SOL
  Daily limit BPS: 2000 (20%)
  Fund wallet: 0.05 SOL

  AGENT TIER
  [0] basic   [1] standard   [2] premium
  Tier [0/1/2]: 1

  CAPABILITIES — all enabled by default
  [1] CAN_PAY_AGENTS    ✓ enabled
  [2] CAN_HIRE_BASIC    ✓ enabled
  ...
  Keep all defaults? [Y/n]: n
  Toggle: 3,4  (disables HIRE_STANDARD and HIRE_PREMIUM)

  CATEGORIES — spending limits per category
  Set category limits? [y/N]: y
  inference limit in SOL: 0.5

  ✓ Deploying agent...
  ✓ TX: 3Gjtj...
  ✓ Agent trading-agent deployed — tier STANDARD`}</Code>

        {/* Sidecar */}
        <SectionTitle id="sidecar">HTTP SIDECAR</SectionTitle>
        <P>The PayKit sidecar exposes the full SDK as a REST API. This enables agents written in Python, Go, Ruby, or any other language to use PayKit without a Node.js runtime.</P>
        <Code>{`# Start the sidecar (default port 3333)
node sdk/src/server.js

# Custom port and keypair
node sdk/src/server.js 4000 /path/to/keypair.json devnet

# Or use the npm script
cd sdk && npm run server`}</Code>
        <SubTitle>// KEY ENDPOINTS</SubTitle>
        <Table
          headers={["Method", "Endpoint", "Description"]}
          rows={[
            ["POST", "/agent/create", "Create autonomous agent"],
            ["GET", "/agent/:name", "Fetch agent state + capabilities + balance"],
            ["GET", "/agents", "All agents for owner wallet"],
            ["GET", "/agents/local", "Local agents with keypairs"],
            ["POST", "/pay", "Record payment"],
            ["POST", "/pay/agent-to-agent", "A2A payment"],
            ["POST", "/pay/batch", "Batch payment (up to 5)"],
            ["POST", "/pay/sol", "SOL transfer between agents"],
            ["POST", "/pay/usdc", "USDC transfer between agents"],
            ["POST", "/pay/spl", "Any SPL token transfer"],
            ["GET", "/balance/:name/sol", "Agent SOL wallet balance"],
            ["GET", "/balance/:name/usdc", "Agent USDC balance"],
            ["GET", "/history/:name", "Agent transaction history"],
            ["POST", "/agent/:name/capabilities", "Update capabilities bitmask"],
            ["POST", "/agent/:name/tier", "Update tier"],
            ["POST", "/agent/:name/category-limit", "Set category spending limit"],
            ["POST", "/agent/:name/deactivate", "Deactivate agent"],
            ["POST", "/agent/:name/reactivate", "Reactivate agent"],
            ["POST", "/agent/:name/renew", "Renew expiration"],
            ["DELETE", "/agent/:name", "Close agent and recover rent"],
            ["GET", "/health", "Server status"],
            ["GET", "/capabilities", "Constants reference"],
          ]}
        />
        <SubTitle>// PYTHON EXAMPLE</SubTitle>
        <Code>{`import requests

PAYKIT = "http://localhost:3333"

# Create an agent
res = requests.post(f"{PAYKIT}/agent/create", json={
    "name": "python-agent",
    "spendLimitSOL": 1.0,
    "dailyLimitBps": 1000,
    "fundingSOL": 0.05,
    "tier": 0
})
print(res.json()["agentPDA"])

# Pay another agent
res = requests.post(f"{PAYKIT}/pay/agent-to-agent", json={
    "sender": "python-agent",
    "receiver": "executor-agent",
    "amountSOL": 0.0005,
    "service": "Data analysis",
    "categoryId": 2  # data
})
print(f"TX: {res.json()['tx']}")`}</Code>

        {/* Errors */}
        <SectionTitle id="errors">ERROR CODES</SectionTitle>
        <P>PayKit throws structured <code style={{ color: "#ffb800" }}>PayKitError</code> instances with a <code style={{ color: "#ffb800" }}>code</code> field. All contract errors, network errors, and SDK validation errors are mapped to named codes.</P>
        <Table
          headers={["Code", "Source", "Description"]}
          rows={[
            ["NameTooLong", "contract", "Agent name exceeds 32 characters"],
            ["InvalidSpendLimit", "contract", "Spend limit must be greater than zero"],
            ["InvalidAmount", "contract", "Payment amount must be greater than zero"],
            ["SpendLimitExceeded", "contract", "Payment exceeds agent's total spend limit"],
            ["AgentInactive", "contract", "Agent is deactivated — use reactivateAgent"],
            ["MemoTooLong", "contract", "Memo or service description exceeds 64 characters"],
            ["DailyLimitExceeded", "contract", "Payment exceeds agent's daily BPS limit"],
            ["AgentExpired", "contract", "Agent has expired — use renewAgent"],
            ["InvalidDailyLimit", "contract", "dailyLimitBps must be 1–10000"],
            ["CapabilityDenied", "contract", "Agent missing required capability"],
            ["TierNotAllowed", "contract", "Sender cannot hire receiver's tier"],
            ["InvalidTier", "contract", "Tier must be 0, 1, or 2"],
            ["CategoryLimitExceeded", "contract", "Payment exceeds category limit"],
            ["InvalidCategory", "contract", "Invalid category ID"],
            ["CategorySlotsFull", "contract", "All 8 category slots are in use"],
            ["InvalidCapabilitySlot", "contract", "Capability slot must be 0–7"],
            ["BlockhashExpired", "network", "TX blockhash expired — retry"],
            ["InsufficientFunds", "network", "Not enough SOL for TX fees"],
            ["AccountNotFound", "network", "Agent account not found"],
            ["LegacyAgent", "sdk", "Agent created with older contract version"],
            ["WalletNotConnected", "sdk", "Browser wallet not connected"],
          ]}
        />
        <Code>{`const { PayKitError } = require("@paykit/sdk/errors");

try {
    await client.agentToAgentPayment("sender", "executor", 250_000, "task", CATEGORIES.INFERENCE);
} catch (e) {
    if (e instanceof PayKitError) {
        switch (e.code) {
            case "SpendLimitExceeded":
                console.log("Agent hit its total budget");
                break;
            case "DailyLimitExceeded":
                console.log("Daily BPS limit hit — resets in 24h");
                break;
            case "CapabilityDenied":
                console.log("Agent is missing CAN_PAY_AGENTS capability");
                break;
            case "TierNotAllowed":
                console.log("Sender cannot hire this receiver tier");
                break;
            case "CategoryLimitExceeded":
                console.log("Payment exceeds the category limit");
                break;
            case "AgentExpired":
                await client.renewAgent("sender", 31_536_000);
                break;
            case "AgentInactive":
                await client.reactivateAgent("sender");
                break;
        }
    }
}`}</Code>

        {/* LangChain */}
        <SectionTitle id="langchain">LANGCHAIN INTEGRATION</SectionTitle>
        <P>Register PayKit methods as LangChain tools. Your agent calls them autonomously to manage budgets, pay for services, and maintain accountability.</P>
        <Code>{`npm install langchain @langchain/openai @paykit/sdk`}</Code>
        <Code>{`const { createClient, CATEGORIES } = require("@paykit/sdk");
const { DynamicStructuredTool } = require("langchain/tools");
const { z } = require("zod");

const paykit = createClient("/path/to/keypair.json", "devnet");

const payAgentTool = new DynamicStructuredTool({
    name: "pay_agent",
    description: "Pay another AI agent for a completed service using PayKit.",
    schema: z.object({
        senderAgent:   z.string().describe("Name of the paying agent"),
        receiverAgent: z.string().describe("Name of the agent being paid"),
        amountSOL:     z.number().describe("Amount in SOL"),
        service:       z.string().describe("Service description"),
        category:      z.enum(["compute","data","storage","inference","research","content"]),
    }),
    func: async ({ senderAgent, receiverAgent, amountSOL, service, category }) => {
        const { tx } = await paykit.agentToAgentPayment(
            senderAgent, receiverAgent,
            Math.floor(amountSOL * 1_000_000_000),
            service,
            CATEGORIES[category.toUpperCase()]
        );
        return \`Payment confirmed onchain. TX: \${tx}\`;
    },
});

const checkBudgetTool = new DynamicStructuredTool({
    name: "check_budget",
    description: "Check an agent's remaining budget and status before making payments.",
    schema: z.object({ agentName: z.string() }),
    func: async ({ agentName }) => {
        const agent   = await paykit.fetchAgent(agentName);
        const expiry  = await paykit.checkAgentExpiry(agentName);
        const balance = await paykit.getSOLBalance(agentName);
        const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
        return JSON.stringify({
            remainingSOL: (remaining / 1e9).toFixed(4),
            walletSOL: balance.sol.toFixed(6),
            dailyLimitBps: agent.dailyLimitBps,
            daysUntilExpiry: expiry.daysRemaining,
            isActive: agent.isActive,
        });
    },
});`}</Code>

        {/* CrewAI */}
        <SectionTitle id="crewai">CREWAI INTEGRATION</SectionTitle>
        <P>Run the PayKit sidecar alongside your CrewAI Python process. Python tools call the sidecar via HTTP.</P>
        <Code>{`# terminal 1 — start the PayKit sidecar
node sdk/src/server.js`}</Code>
        <Code>{`# terminal 2 — your CrewAI agent
pip install crewai requests`}</Code>
        <Code>{`import requests
from crewai.tools import BaseTool

PAYKIT = "http://localhost:3333"

class PayAgentTool(BaseTool):
    name: str = "pay_agent"
    description: str = "Pay another agent for a completed service via PayKit on Solana."

    def _run(self, sender: str, receiver: str, amount_sol: float, service: str, category: str) -> str:
        cat_map = {"compute":1,"data":2,"storage":3,"inference":4,"research":5,"content":6}
        res = requests.post(f"{PAYKIT}/pay/agent-to-agent", json={
            "sender": sender, "receiver": receiver,
            "amountSOL": amount_sol, "service": service,
            "categoryId": cat_map.get(category, 0),
        })
        return f"Payment confirmed. TX: {res.json()['tx']}"

class CheckBudgetTool(BaseTool):
    name: str = "check_budget"
    description: str = "Check remaining budget before making any payment."

    def _run(self, agent_name: str) -> str:
        data = requests.get(f"{PAYKIT}/agent/{agent_name}").json()
        spent = int(data["totalSpent"]) / 1e9
        limit = int(data["spendLimit"]) / 1e9
        return (
            f"Agent: {agent_name} | "
            f"Remaining: {limit - spent:.4f} SOL | "
            f"Wallet: {data['solBalance']:.6f} SOL | "
            f"Tier: {data['tier']} | "
            f"Days until expiry: {data['daysRemaining']}"
        )`}</Code>

        {/* Smart Contract */}
        <SectionTitle id="contract">SMART CONTRACT</SectionTitle>
        <P>The PayKit program is written in Rust using Anchor and deployed on Solana Devnet. All 13 instructions emit rich onchain events with agent names, amounts, categories, and timestamps.</P>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "PROGRAM ID", value: "F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF" },
            { label: "NETWORK", value: "Solana Devnet" },
            { label: "FRAMEWORK", value: "Anchor 0.31.1" },
            { label: "ACCOUNT SIZE", value: "371 bytes" },
          ].map(item => (
            <div key={item.label} style={{ padding: "14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px" }}>
              <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.15em", marginBottom: "6px", fontFamily: "'Orbitron', monospace" }}>{item.label}</div>
              <div style={{ fontSize: "13px", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", wordBreak: "break-all" }}>{item.value}</div>
            </div>
          ))}
        </div>
        <SubTitle>// INSTRUCTIONS</SubTitle>
        <Table
          headers={["Instruction", "Signer", "Description"]}
          rows={[
            ["register_agent", "owner", "Creates agent PDA with keypair, spend limit, BPS, capabilities, tier, funding"],
            ["record_payment", "agent_key", "Logs a payment. Enforces spend limit, daily BPS, and category limit"],
            ["agent_to_agent_payment", "agent_key", "Payment between agents. Verifies capabilities and tier compatibility"],
            ["set_capabilities", "owner", "Updates the capabilities bitmask"],
            ["set_tier", "owner", "Updates the agent tier (0=basic, 1=standard, 2=premium)"],
            ["set_category_limit", "owner", "Sets max spend per payment category"],
            ["set_custom_capability", "owner", "Defines a custom capability in bits 8–15"],
            ["update_spend_limit", "owner", "Updates the total spend limit"],
            ["deactivate_agent", "owner", "Disables agent. Reversible"],
            ["reactivate_agent", "owner", "Re-enables a deactivated agent"],
            ["renew_agent", "owner", "Extends expiration by specified seconds"],
            ["close_agent", "owner", "Closes PDA and recovers rent (~0.003 SOL)"],
          ]}
        />
        <SubTitle>// ACCOUNT SCHEMA</SubTitle>
        <Code>{`pub struct AgentAccount {
    pub agent_key: Pubkey,                    // Agent's own keypair (signs payments)
    pub owner: Pubkey,                        // Developer wallet (admin operations)
    pub name: String,                         // Unique identifier (max 32 chars)
    pub spend_limit: u64,                     // Maximum total spend in lamports
    pub total_spent: u64,                     // Cumulative spend in lamports
    pub payment_count: u64,                   // Number of payments recorded
    pub is_active: bool,                      // Active/inactive status
    pub bump: u8,                             // PDA bump seed
    pub last_payment_at: i64,                 // Unix timestamp of last payment
    pub daily_spent: u64,                     // Amount spent today in lamports
    pub daily_reset_at: i64,                  // Unix timestamp of last daily reset
    pub expires_at: i64,                      // Unix timestamp of expiration
    pub daily_limit_bps: u16,                 // Daily limit in BPS (1–10000)
    pub capabilities: u16,                    // Permission bitmask (bits 0–15)
    pub tier: u8,                             // 0=basic, 1=standard, 2=premium
    pub category_limits: [(u8, u64); 8],      // (category_id, max_lamports) × 8
    pub custom_capability_names: [[u8; 16]; 8], // Names for custom cap bits 8–15
}
// Account size: 371 bytes
// dataSize filter used in fetchAllAgents to exclude legacy agents`}</Code>

        {/* Architecture */}
        <SectionTitle id="architecture">ARCHITECTURE</SectionTitle>
        <P>PayKit is three independent layers that can be used together or separately:</P>
        <Code>{`┌──────────────────────────────────────────────────────────────────┐
│   AI Agent / LangChain / CrewAI / Browser App / Any Language     │
├──────────────────────────────────────────────────────────────────┤
│                       PayKit SDK (Node.js)                        │
│  createAutonomousAgent · recordPayment · agentToAgentPayment      │
│  batchPayment · transferSOL · transferUSDC · transferSPL          │
│  setCapabilities · setTier · setCategoryLimit · decodeCapabilities│
│  getAgentHistory · watchAgent · createWebhook · closeAgent        │
│  CLI wizard · HTTP sidecar (24 endpoints, any language)           │
├──────────────────────────────────────────────────────────────────┤
│                 PayKit Program (Solana / Anchor)                   │
│  13 instructions · Capabilities bitmask · Tier system             │
│  Category limits · BPS rate limiting · Expiration                 │
│  Rich onchain events · 371-byte account · agent-native design    │
├──────────────────────────────────────────────────────────────────┤
│                       Solana Blockchain                            │
│              ~400ms finality · ~$0.00025/tx                       │
└──────────────────────────────────────────────────────────────────┘`}</Code>
        <SubTitle>// PDA DERIVATION — CAMINO B</SubTitle>
        <Code>{`// PDA is derived from the agent's own keypair, not the owner
const [agentPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), agentKeypair.publicKey.toBuffer(), Buffer.from(agentName)],
  PROGRAM_ID
);

// This means:
// 1. Agent identity is cryptographically tied to its keypair
// 2. The agent can sign its own transactions using that keypair
// 3. The owner's wallet is not needed for individual payments`}</Code>
        <SubTitle>// RATE LIMITING</SubTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "24px" }}>
          {[
            { rule: "Total spend limit", desc: "Agent can never exceed spend_limit across its lifetime. Protocol-enforced — cannot be bypassed." },
            { rule: "Daily BPS limit", desc: "Configurable per agent in basis points. 1000 BPS = 10%, 500 BPS = 5%. Resets every 24 hours automatically." },
            { rule: "Category limit", desc: "Per-payment limit for each category. If set, a single payment cannot exceed this amount for that category." },
            { rule: "Expiration", desc: "Agents expire after 365 days by default. Expired agents cannot transact. Renewable by the owner." },
            { rule: "Capabilities", desc: "Contract verifies bitmask permissions before every payment. Owner sets them; agent cannot override." },
            { rule: "Tier", desc: "Contract verifies sender can hire receiver's tier before every A2A payment." },
          ].map(item => (
            <div key={item.rule} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px" }}>
              <span style={{ color: "#ffb800", fontFamily: "'Share Tech Mono', monospace" }}>{item.rule}</span>
              <span style={{ color: "#9aeab0" }}>{item.desc}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "64px", paddingTop: "24px", borderTop: "1px solid rgba(0,255,136,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#6aaa80" }}>PAYKIT · ZERO TWO LABS · 2026</span>
          <div style={{ display: "flex", gap: "16px" }}>
            <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", cursor: "pointer" }}>HOME</button>
            <button onClick={() => router.push("/demo")} style={{ background: "transparent", border: "none", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", cursor: "pointer" }}>DEMO</button>
            <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", cursor: "pointer" }}>DASHBOARD</button>
            <button onClick={() => router.push("/network")} style={{ background: "transparent", border: "none", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", cursor: "pointer" }}>NETWORK</button>
            <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer" style={{ color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", textDecoration: "none" }}>GITHUB</a>
          </div>
        </div>

      </div>
    </div>
  );
}
