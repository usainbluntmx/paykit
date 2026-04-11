"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
    id: string;
    title: string;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const sections: Section[] = [
    { id: "overview", title: "Overview" },
    { id: "installation", title: "Installation" },
    { id: "quickstart", title: "Quickstart" },
    { id: "register-agent", title: "registerAgent" },
    { id: "record-payment", title: "recordPayment" },
    { id: "agent-to-agent", title: "agentToAgentPayment" },
    { id: "update-spend-limit", title: "updateSpendLimit" },
    { id: "deactivate-agent", title: "deactivateAgent" },
    { id: "fetch-agent", title: "fetchAgent" },
    { id: "fetch-all-agents", title: "fetchAllAgents" },
    { id: "payment-history", title: "getPaymentHistory" },
    { id: "errors", title: "Error Codes" },
    { id: "contract", title: "Smart Contract" },
    { id: "architecture", title: "Architecture" },
];

// ─── Code Block ───────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{ position: "relative", marginBottom: "24px" }}>
            <button
                onClick={copy}
                style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "transparent",
                    border: "1px solid rgba(0,255,136,0.2)",
                    color: copied ? "#00ff88" : "#6aaa80",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "2px",
                    cursor: "pointer",
                    letterSpacing: "0.1em",
                    transition: "all 0.2s",
                }}
            >
                {copied ? "COPIED" : "COPY"}
            </button>
            <pre style={{
                background: "#060a08",
                border: "1px solid rgba(0,255,136,0.12)",
                borderRadius: "4px",
                padding: "20px",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "13px",
                lineHeight: 1.8,
                color: "#c8f0d8",
                overflowX: "auto",
                whiteSpace: "pre",
            }}>
                {children}
            </pre>
        </div>
    );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ text, color = "#00ff88" }: { text: string; color?: string }) {
    return (
        <span style={{
            display: "inline-block",
            fontSize: "11px",
            color,
            border: `1px solid ${color}40`,
            background: `${color}10`,
            padding: "2px 8px",
            borderRadius: "2px",
            fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.1em",
            marginRight: "8px",
        }}>
            {text}
        </span>
    );
}

// ─── Param Row ────────────────────────────────────────────────────────────────

function Param({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "160px 120px 1fr",
            gap: "16px",
            padding: "12px 0",
            borderBottom: "1px solid rgba(0,255,136,0.06)",
            fontSize: "14px",
            alignItems: "start",
        }}>
            <span style={{ color: "#00ff88", fontFamily: "'Share Tech Mono', monospace" }}>{name}</span>
            <span style={{ color: "#ffb800", fontFamily: "'Share Tech Mono', monospace" }}>{type}</span>
            <span style={{ color: "#9aeab0" }}>{desc} {required && <span style={{ color: "#ff3c5a", fontSize: "12px" }}>required</span>}</span>
        </div>
    );
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({ id, children }: { id: string; children: string }) {
    return (
        <h2 id={id} style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "16px",
            color: "#00ff88",
            letterSpacing: "0.15em",
            marginBottom: "16px",
            marginTop: "48px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(0,255,136,0.1)",
        }}>
            {children}
        </h2>
    );
}

function SubTitle({ children }: { children: string }) {
    return (
        <h3 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "12px",
            color: "#6aaa80",
            letterSpacing: "0.2em",
            marginBottom: "12px",
            marginTop: "24px",
        }}>
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

// ─── Main Docs Page ───────────────────────────────────────────────────────────

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
            <div style={{
                position: "sticky",
                top: 0,
                height: "100vh",
                overflowY: "auto",
                borderRight: "1px solid rgba(0,255,136,0.08)",
                padding: "32px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
            }}>
                <div style={{ marginBottom: "24px" }}>
                    <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: 900, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>PAYKIT</span>
                    </button>
                    <div style={{ fontSize: "11px", color: "#6aaa80", letterSpacing: "0.15em" }}>SDK DOCUMENTATION</div>
                </div>

                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        style={{
                            background: activeSection === s.id ? "rgba(0,255,136,0.08)" : "transparent",
                            border: "none",
                            borderLeft: `2px solid ${activeSection === s.id ? "#00ff88" : "transparent"}`,
                            color: activeSection === s.id ? "#00ff88" : "#6aaa80",
                            fontFamily: "'Share Tech Mono', monospace",
                            fontSize: "13px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            textAlign: "left",
                            letterSpacing: "0.05em",
                            transition: "all 0.15s",
                            borderRadius: "0 3px 3px 0",
                        }}
                    >
                        {s.title}
                    </button>
                ))}

                <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(0,255,136,0.06)" }}>
                    <button onClick={() => router.push("/dashboard")} style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", padding: "8px 12px", borderRadius: "3px", cursor: "pointer", width: "100%", letterSpacing: "0.1em" }}>
                        LIVE DEMO →
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "48px 56px", overflowY: "auto", maxHeight: "100vh" }}>

                {/* Overview */}
                <div id="overview">
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#6aaa80", letterSpacing: "0.2em", marginBottom: "12px" }}>// REFERENCE</div>
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: "28px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.05em", textShadow: "0 0 20px rgba(0,255,136,0.3)", marginBottom: "20px" }}>
                        PayKit SDK
                    </h1>
                    <P>
                        PayKit is an open-source SDK for registering autonomous AI agents on Solana, enforcing spend limits, and recording payment history immutably onchain. It is the payment infrastructure layer for the autonomous AI economy.
                    </P>
                    <P>
                        The SDK wraps the PayKit Anchor program deployed on Solana Devnet and exposes a simple JavaScript/TypeScript API that any developer can integrate in minutes.
                    </P>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "24px", marginBottom: "8px" }}>
                        {[
                            { label: "PROGRAM ID", value: "F27DrerUQGnk...", full: "F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF" },
                            { label: "NETWORK", value: "Solana Devnet" },
                            { label: "FRAMEWORK", value: "Anchor 0.31.1" },
                        ].map(item => (
                            <div key={item.label} style={{ padding: "14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: "3px" }}>
                                <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.15em", marginBottom: "6px", fontFamily: "'Orbitron', monospace" }}>{item.label}</div>
                                <div
                                    style={{ fontSize: "13px", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", cursor: item.full ? "pointer" : "default" }}
                                    onClick={() => item.full && navigator.clipboard.writeText(item.full)}
                                    title={item.full ? "Click to copy" : undefined}
                                >
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Installation */}
                <SectionTitle id="installation">INSTALLATION</SectionTitle>
                <P>Install the PayKit SDK via npm or yarn:</P>
                <Code>{`npm install @paykit/sdk`}</Code>
                <P>Or with yarn:</P>
                <Code>{`yarn add @paykit/sdk`}</Code>
                <P>The SDK requires Node.js 18+ and a Solana keypair file to sign transactions.</P>

                {/* Quickstart */}
                <SectionTitle id="quickstart">QUICKSTART</SectionTitle>
                <P>Get up and running in under 5 minutes:</P>
                <Code>{`const { createClient } = require("@paykit/sdk");

// 1. Create a client with your keypair
const client = createClient("/path/to/keypair.json", "devnet");

// 2. Register an AI agent with a 1 SOL spend limit
const { agentPDA, tx } = await client.registerAgent(
  "my-agent",
  1_000_000_000 // 1 SOL in lamports
);
console.log("Agent registered:", agentPDA.toBase58());

// 3. Record a payment made by the agent
await client.recordPayment(
  "my-agent",
  1_000_000, // 0.001 SOL
  recipientPublicKey,
  "API call payment"
);

// 4. Agent pays another agent autonomously
await client.agentToAgentPayment(
  "my-agent",         // sender
  "other-agent",      // receiver
  250_000,            // 0.00025 SOL
  "Data analysis service"
);

// 5. Fetch agent state
const agent = await client.fetchAgent("my-agent");
console.log("Total spent:", agent.totalSpent.toString());
console.log("Payment count:", agent.paymentCount.toString());`}</Code>

                {/* registerAgent */}
                <SectionTitle id="register-agent">registerAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                </div>
                <P>Registers a new AI agent onchain. Creates a PDA (Program Derived Address) account that stores the agent's identity, spend limit, and payment history. Each agent is uniquely identified by the combination of its owner wallet and name.</P>
                <Code>{`const { tx, agentPDA } = await client.registerAgent(name, spendLimitLamports);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="name" type="string" required desc="Unique identifier for the agent. Maximum 32 characters. Used to derive the agent's PDA address." />
                <Param name="spendLimitLamports" type="number" required desc="Maximum total spend allowed for this agent, in lamports. 1 SOL = 1,000,000,000 lamports. Cannot be exceeded by the contract." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  tx: string,       // Transaction signature
  agentPDA: PublicKey  // Onchain address of the agent account
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// Register an agent with a 5 SOL spend limit
const { tx, agentPDA } = await client.registerAgent(
  "trading-agent-01",
  5_000_000_000
);

console.log("TX:", tx);
console.log("Agent PDA:", agentPDA.toBase58());`}</Code>

                {/* recordPayment */}
                <SectionTitle id="record-payment">recordPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="enforces spend limit" color="#ff3c5a" />
                </div>
                <P>Records a payment made by an agent onchain. Increments the agent's total_spent counter and payment_count. The contract enforces that total_spent never exceeds spend_limit. Also enforces a daily limit of 10% of the total spend limit.</P>
                <Code>{`const { tx } = await client.recordPayment(agentName, amountLamports, recipient, memo);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent making the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="recipient" type="PublicKey" required desc="Public key of the payment recipient." />
                <Param name="memo" type="string" required desc="Payment description. Maximum 64 characters." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  tx: string  // Transaction signature
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const { tx } = await client.recordPayment(
  "trading-agent-01",
  500_000,                          // 0.0005 SOL
  new PublicKey("recipient..."),
  "OpenAI API call - GPT-4"
);`}</Code>

                {/* agentToAgentPayment */}
                <SectionTitle id="agent-to-agent">agentToAgentPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="enforces spend limit" color="#ff3c5a" />
                </div>
                <P>Records a direct payment from one registered agent to another. Both agents must be registered and active. The sender's spend limit and daily limit are enforced. The receiver's payment_count is incremented.</P>
                <Code>{`const { tx } = await client.agentToAgentPayment(senderName, receiverName, amountLamports, service);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="senderName" type="string" required desc="Name of the agent sending the payment." />
                <Param name="receiverName" type="string" required desc="Name of the agent receiving the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="service" type="string" required desc="Description of the service being paid for. Maximum 64 characters." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  tx: string  // Transaction signature
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// agent-alpha pays agent-beta for a data analysis task
const { tx } = await client.agentToAgentPayment(
  "agent-alpha",
  "agent-beta",
  250_000,
  "Market data analysis - Q4 2026"
);`}</Code>

                {/* updateSpendLimit */}
                <SectionTitle id="update-spend-limit">updateSpendLimit</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="owner only" color="#6aaa80" />
                </div>
                <P>Updates the spend limit of an existing agent. Only the owner wallet can call this. The new limit must be greater than zero. Does not reset total_spent or daily_spent.</P>
                <Code>{`const { tx } = await client.updateSpendLimit(agentName, newLimitLamports);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to update." />
                <Param name="newLimitLamports" type="number" required desc="New spend limit in lamports. Must be greater than zero." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// Increase the spend limit to 10 SOL
await client.updateSpendLimit("trading-agent-01", 10_000_000_000);`}</Code>

                {/* deactivateAgent */}
                <SectionTitle id="deactivate-agent">deactivateAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="irreversible" color="#ff3c5a" />
                    <Badge text="owner only" color="#6aaa80" />
                </div>
                <P>Permanently deactivates an agent. Once deactivated, the agent cannot make or receive payments. This action is irreversible — there is no reactivate instruction. The agent account remains onchain as an immutable audit record.</P>
                <Code>{`const { tx } = await client.deactivateAgent(agentName);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to deactivate." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.deactivateAgent("trading-agent-01");`}</Code>

                {/* fetchAgent */}
                <SectionTitle id="fetch-agent">fetchAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Fetches the current state of a single agent account from Solana. Does not require the caller to be the agent's owner — any public key can be inspected.</P>
                <Code>{`const agent = await client.fetchAgent(agentName, ownerPubkey?);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to fetch." />
                <Param name="ownerPubkey" type="PublicKey" desc="Owner of the agent. Defaults to the client's wallet public key if not provided." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  pda: PublicKey,         // Onchain address of the agent account
  owner: PublicKey,       // Wallet that controls the agent
  name: string,           // Agent identifier
  spendLimit: BN,         // Maximum spend in lamports
  totalSpent: BN,         // Cumulative spend in lamports
  paymentCount: BN,       // Number of payments recorded
  isActive: boolean,      // Active/inactive status
  lastPaymentAt: BN,      // Unix timestamp of last payment
  dailySpent: BN,         // Amount spent today in lamports
  dailyResetAt: BN        // Unix timestamp of last daily reset
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const agent = await client.fetchAgent("trading-agent-01");

console.log("Name:", agent.name);
console.log("Spend limit:", agent.spendLimit.toString(), "lamports");
console.log("Total spent:", agent.totalSpent.toString(), "lamports");
console.log("Active:", agent.isActive);

// Check remaining budget
const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
console.log("Remaining:", remaining / 1e9, "SOL");`}</Code>

                {/* fetchAllAgents */}
                <SectionTitle id="fetch-all-agents">fetchAllAgents</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Fetches all agent accounts owned by the current wallet. Uses a memcmp filter on the owner field to efficiently query only the relevant accounts.</P>
                <Code>{`const agents = await client.fetchAllAgents();`}</Code>
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`Array<{
  pda: PublicKey,
  owner: PublicKey,
  name: string,
  spendLimit: BN,
  totalSpent: BN,
  paymentCount: BN,
  isActive: boolean,
  lastPaymentAt: BN,
  dailySpent: BN,
  dailyResetAt: BN
}>`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const agents = await client.fetchAllAgents();

for (const agent of agents) {
  console.log(\`\${agent.name}: \${agent.totalSpent.toString()} lamports spent\`);
}`}</Code>

                {/* getPaymentHistory */}
                <SectionTitle id="payment-history">getPaymentHistory</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                    <Badge text="indexes onchain events" color="#ffb800" />
                </div>
                <P>Fetches recent transaction history from the PayKit program by reading onchain transaction logs. Identifies and categorizes each transaction by instruction type.</P>
                <Code>{`const history = await client.getPaymentHistory(limit?);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="limit" type="number" desc="Number of recent transactions to fetch. Defaults to 50." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`Array<{
  type: "agent_to_agent" | "record_payment" | "register_agent",
  time: string,   // ISO 8601 timestamp
  tx: string      // Transaction signature
}>`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const history = await client.getPaymentHistory(10);

for (const entry of history) {
  console.log(\`[\${entry.type}] \${entry.time} — \${entry.tx}\`);
}

// Output:
// [agent_to_agent] 2026-04-10T15:54:35.000Z — q3CmRZpGd6SiGDK5...
// [register_agent] 2026-04-10T15:54:34.000Z — 3Pi6qd5mUb8c1nwk...`}</Code>

                {/* Error Codes */}
                <SectionTitle id="errors">ERROR CODES</SectionTitle>
                <P>The PayKit smart contract returns structured error codes when a transaction fails. All errors are thrown as AnchorError and can be caught and handled in your application.</P>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {[
                        { code: "NameTooLong", num: "6000", desc: "Agent name exceeds 32 characters." },
                        { code: "InvalidSpendLimit", num: "6001", desc: "Spend limit must be greater than zero." },
                        { code: "InvalidAmount", num: "6002", desc: "Payment amount must be greater than zero." },
                        { code: "SpendLimitExceeded", num: "6003", desc: "The payment would cause the agent to exceed its total spend limit." },
                        { code: "AgentInactive", num: "6004", desc: "The agent has been deactivated and cannot make or receive payments." },
                        { code: "MemoTooLong", num: "6005", desc: "Memo or service description exceeds 64 characters." },
                        { code: "DailyLimitExceeded", num: "6006", desc: "The payment would exceed the agent's daily spend limit (10% of total spend limit per 24 hours)." },
                    ].map(err => (
                        <div key={err.code} style={{ display: "grid", gridTemplateColumns: "200px 80px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
                            <span style={{ color: "#ff3c5a", fontFamily: "'Share Tech Mono', monospace" }}>{err.code}</span>
                            <span style={{ color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>{err.num}</span>
                            <span style={{ color: "#9aeab0" }}>{err.desc}</span>
                        </div>
                    ))}
                </div>
                <SubTitle>// HANDLING ERRORS</SubTitle>
                <Code>{`try {
  await client.recordPayment("my-agent", 1_000_000, recipient, "payment");
} catch (e) {
  if (e.message.includes("SpendLimitExceeded")) {
    console.log("Agent has reached its spend limit");
  } else if (e.message.includes("DailyLimitExceeded")) {
    console.log("Agent has reached its daily limit — resets in 24h");
  } else if (e.message.includes("AgentInactive")) {
    console.log("Agent is deactivated");
  }
}`}</Code>

                {/* Smart Contract */}
                <SectionTitle id="contract">SMART CONTRACT</SectionTitle>
                <P>The PayKit program is written in Rust using the Anchor framework and deployed on Solana Devnet. The source code is fully open-source.</P>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                    {[
                        { label: "PROGRAM ID", value: "F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF" },
                        { label: "NETWORK", value: "Solana Devnet" },
                        { label: "FRAMEWORK", value: "Anchor 0.31.1" },
                        { label: "LANGUAGE", value: "Rust 1.94.1" },
                    ].map(item => (
                        <div key={item.label} style={{ padding: "14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px" }}>
                            <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.15em", marginBottom: "6px", fontFamily: "'Orbitron', monospace" }}>{item.label}</div>
                            <div style={{ fontSize: "13px", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", wordBreak: "break-all" }}>{item.value}</div>
                        </div>
                    ))}
                </div>
                <SubTitle>// INSTRUCTIONS</SubTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {[
                        { name: "register_agent", desc: "Creates a new agent PDA account with name, owner, and spend limit." },
                        { name: "record_payment", desc: "Logs a payment against an agent's budget. Enforces spend and daily limits." },
                        { name: "agent_to_agent_payment", desc: "Records a direct payment between two registered agents." },
                        { name: "update_spend_limit", desc: "Updates the spend limit of an existing agent. Owner only." },
                        { name: "deactivate_agent", desc: "Permanently disables an agent. Irreversible." },
                    ].map(ix => (
                        <div key={ix.name} style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
                            <span style={{ color: "#00ff88", fontFamily: "'Share Tech Mono', monospace" }}>{ix.name}</span>
                            <span style={{ color: "#9aeab0" }}>{ix.desc}</span>
                        </div>
                    ))}
                </div>
                <SubTitle>// AGENT ACCOUNT SCHEMA</SubTitle>
                <Code>{`pub struct AgentAccount {
  pub owner: Pubkey,          // Wallet that controls the agent
  pub name: String,           // Unique identifier (max 32 chars)
  pub spend_limit: u64,       // Maximum spend in lamports
  pub total_spent: u64,       // Cumulative spend in lamports
  pub payment_count: u64,     // Number of payments recorded
  pub is_active: bool,        // Active/inactive status
  pub bump: u8,               // PDA bump seed
  pub last_payment_at: i64,   // Unix timestamp of last payment
  pub daily_spent: u64,       // Amount spent today
  pub daily_reset_at: i64,    // Unix timestamp of last daily reset
}`}</Code>

                {/* Architecture */}
                <SectionTitle id="architecture">ARCHITECTURE</SectionTitle>
                <P>PayKit is structured as three independent layers that can be used together or separately:</P>
                <Code>{`┌─────────────────────────────────────────────┐
│              AI Agent / Application          │
├─────────────────────────────────────────────┤
│           PayKit SDK (Node.js)               │
│  registerAgent · recordPayment · A2A         │
├─────────────────────────────────────────────┤
│        PayKit Program (Solana/Anchor)        │
│  PDAs · Spend Limits · Events · Rate Limits  │
├─────────────────────────────────────────────┤
│              Solana Blockchain               │
│        ~400ms finality · $0.00025/tx         │
└─────────────────────────────────────────────┘`}</Code>
                <SubTitle>// PDA DERIVATION</SubTitle>
                <P>Each agent account is a Program Derived Address (PDA) derived from the program ID, the string "agent", the owner's public key, and the agent name. This ensures each agent has a deterministic, unique address that can be computed without querying the blockchain:</P>
                <Code>{`const [agentPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("agent"),
    ownerPublicKey.toBuffer(),
    Buffer.from(agentName),
  ],
  PROGRAM_ID
);`}</Code>
                <SubTitle>// RATE LIMITING</SubTitle>
                <P>The PayKit contract enforces two layers of spend control at the protocol level. These cannot be bypassed by the SDK or any application built on top of PayKit:</P>
                <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "24px" }}>
                    {[
                        { rule: "Total spend limit", desc: "The agent can never spend more than spend_limit in total across its entire lifetime." },
                        { rule: "Daily spend limit", desc: "The agent can spend at most 10% of its total spend limit per 24-hour period. Resets automatically." },
                    ].map(item => (
                        <div key={item.rule} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px" }}>
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
                        <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", cursor: "pointer" }}>DASHBOARD</button>
                        <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer" style={{ color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", textDecoration: "none" }}>GITHUB</a>
                    </div>
                </div>

            </div>
        </div>
    );
}