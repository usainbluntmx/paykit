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
    { id: "batch-payment", title: "batchPayment" },
    { id: "update-spend-limit", title: "updateSpendLimit" },
    { id: "deactivate-agent", title: "deactivateAgent" },
    { id: "renew-agent", title: "renewAgent" },
    { id: "check-expiry", title: "checkAgentExpiry" },
    { id: "estimate-fee", title: "estimateFee" },
    { id: "fetch-agent", title: "fetchAgent" },
    { id: "fetch-all-agents", title: "fetchAllAgents" },
    { id: "payment-history", title: "getPaymentHistory" },
    { id: "errors", title: "Error Codes" },
    { id: "legacy-migration", title: "Legacy Migration" },
    { id: "langchain", title: "LangChain Integration" },
    { id: "crewai", title: "CrewAI Integration" },
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

// ─── Callout ──────────────────────────────────────────────────────────────────

function Callout({ type = "info", children }: { type?: "info" | "warning" | "danger"; children: React.ReactNode }) {
    const colors = {
        info: "#00ff88",
        warning: "#ffb800",
        danger: "#ff3c5a",
    };
    const color = colors[type];
    return (
        <div style={{
            padding: "14px 18px",
            background: `${color}08`,
            border: `1px solid ${color}30`,
            borderLeft: `3px solid ${color}`,
            borderRadius: "3px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#9aeab0",
            lineHeight: 1.7,
        }}>
            {children}
        </div>
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
                        PayKit is an open-source SDK for registering autonomous AI agents on Solana, enforcing spend limits, and recording payment history immutably onchain. It is the accountability infrastructure layer for the autonomous AI economy.
                    </P>
                    <P>
                        PayKit is <strong style={{ color: "#c8f0d8" }}>not a payment processor</strong>. It is an accountability layer. The SDK wraps the PayKit Anchor program deployed on Solana Devnet and exposes a simple JavaScript/TypeScript API that any developer can integrate in minutes.
                    </P>
                    <Callout type="info">
                        <strong style={{ color: "#00ff88" }}>Current version (Camino A):</strong> Agents are tied to their owner's wallet — the owner signs transactions, and the agent's PDA stores the accountability data. Camino B (agents with their own keypairs and token accounts) is on the roadmap.
                    </Callout>

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
  "my-agent",
  "other-agent",
  250_000,
  "Data analysis service"
);

// 5. Fetch agent state
const agent = await client.fetchAgent("my-agent");
console.log("Total spent:", agent.totalSpent.toString());
console.log("Days remaining:", (await client.checkAgentExpiry("my-agent")).daysRemaining);`}</Code>

                {/* registerAgent */}
                <SectionTitle id="register-agent">registerAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                </div>
                <P>Registers a new AI agent onchain. Creates a PDA (Program Derived Address) account that stores the agent's identity, spend limit, payment history, and expiration date. Each agent is uniquely identified by the combination of its owner wallet and name. Agents expire after 365 days by default and can be renewed with renewAgent.</P>
                <Code>{`const { tx, agentPDA } = await client.registerAgent(name, spendLimitLamports);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="name" type="string" required desc="Unique identifier for the agent. Maximum 32 characters. Used to derive the agent's PDA address." />
                <Param name="spendLimitLamports" type="number" required desc="Maximum total spend allowed for this agent, in lamports. 1 SOL = 1,000,000,000 lamports. Cannot be exceeded by the contract." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  tx: string,          // Transaction signature
  agentPDA: PublicKey  // Onchain address of the agent account
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const { tx, agentPDA } = await client.registerAgent(
  "trading-agent-01",
  5_000_000_000  // 5 SOL
);
console.log("Agent PDA:", agentPDA.toBase58());`}</Code>

                {/* recordPayment */}
                <SectionTitle id="record-payment">recordPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="enforces spend limit" color="#ff3c5a" />
                </div>
                <P>Records a payment made by an agent onchain. Increments the agent's total_spent counter and payment_count. The contract enforces that total_spent never exceeds spend_limit, and that the agent does not exceed 10% of its total budget in any 24-hour period.</P>
                <Code>{`const { tx } = await client.recordPayment(agentName, amountLamports, recipient, memo);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent making the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="recipient" type="PublicKey" required desc="Public key of the payment recipient." />
                <Param name="memo" type="string" required desc="Payment description. Maximum 64 characters." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{ tx: string }`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.recordPayment(
  "trading-agent-01",
  500_000,
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
                <P>Records a direct payment from one registered agent to another. Both agents must be registered, active, and not expired. The sender's spend limit and daily limit are enforced by the contract. The receiver's payment_count is incremented atomically.</P>
                <Code>{`const { tx } = await client.agentToAgentPayment(senderName, receiverName, amountLamports, service);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="senderName" type="string" required desc="Name of the agent sending the payment." />
                <Param name="receiverName" type="string" required desc="Name of the agent receiving the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="service" type="string" required desc="Description of the service being paid for. Maximum 64 characters." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.agentToAgentPayment(
  "agent-alpha",
  "agent-beta",
  250_000,
  "Market data analysis - Q4 2026"
);`}</Code>

                {/* batchPayment */}
                <SectionTitle id="batch-payment">batchPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="atomic" color="#00ff88" />
                    <Badge text="max 5 payments" color="#ffb800" />
                </div>
                <P>Sends payments from one agent to multiple agents in a single Solana transaction. All payments succeed or all fail atomically — there is no partial execution. This is the key primitive for orchestrator patterns where one agent delegates work and pays multiple specialized agents.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Use case:</strong> An orchestrator agent receives a complex task, breaks it into subtasks, assigns them to specialized agents, and pays all of them in a single atomic transaction once the work is complete.
                </Callout>
                <Code>{`const { tx, count } = await client.batchPayment(senderName, payments);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="senderName" type="string" required desc="Name of the agent sending all payments." />
                <Param name="payments" type="array" required desc="Array of payment objects. Maximum 5 items." />
                <SubTitle>// PAYMENT OBJECT</SubTitle>
                <Param name="receiverName" type="string" required desc="Name of the receiving agent." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="service" type="string" required desc="Service description. Maximum 64 characters." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  tx: string,   // Transaction signature
  count: number // Number of payments executed
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// Orchestrator pays 3 specialized agents in 1 transaction
const { tx, count } = await client.batchPayment("orchestrator", [
  { receiverName: "agent-researcher", amountLamports: 100_000, service: "Web research" },
  { receiverName: "agent-writer",     amountLamports: 150_000, service: "Content generation" },
  { receiverName: "agent-reviewer",   amountLamports: 50_000,  service: "Quality review" },
]);
console.log(\`\${count} payments confirmed in TX: \${tx}\`);`}</Code>

                {/* updateSpendLimit */}
                <SectionTitle id="update-spend-limit">updateSpendLimit</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="owner only" color="#6aaa80" />
                </div>
                <P>Updates the spend limit of an existing agent. Only the owner wallet can call this. Does not reset total_spent or daily_spent.</P>
                <Code>{`await client.updateSpendLimit(agentName, newLimitLamports);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to update." />
                <Param name="newLimitLamports" type="number" required desc="New spend limit in lamports. Must be greater than zero." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.updateSpendLimit("trading-agent-01", 10_000_000_000); // 10 SOL`}</Code>

                {/* deactivateAgent */}
                <SectionTitle id="deactivate-agent">deactivateAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="irreversible" color="#ff3c5a" />
                    <Badge text="owner only" color="#6aaa80" />
                </div>
                <P>Permanently deactivates an agent. Once deactivated, the agent cannot make or receive payments. This action is irreversible. The agent account remains onchain as an immutable audit record.</P>
                <Code>{`await client.deactivateAgent(agentName);`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.deactivateAgent("trading-agent-01");`}</Code>

                {/* renewAgent */}
                <SectionTitle id="renew-agent">renewAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="onchain" color="#ffb800" />
                    <Badge text="owner only" color="#6aaa80" />
                </div>
                <P>Extends an agent's expiration date. If the agent is already expired, the extension starts from the current time. If the agent is still active, the extension is added to the current expiration date. Only agents created with the current contract version support renewal — legacy agents (created before the expires_at field was added) cannot be renewed.</P>
                <Code>{`const { tx } = await client.renewAgent(agentName, extensionSeconds);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to renew." />
                <Param name="extensionSeconds" type="number" required desc="Number of seconds to extend. 31_536_000 = 1 year." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// Renew for 1 year
await client.renewAgent("my-agent", 31_536_000);

// Renew for 6 months
await client.renewAgent("my-agent", 15_768_000);`}</Code>

                {/* checkAgentExpiry */}
                <SectionTitle id="check-expiry">checkAgentExpiry</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Returns the expiration status of an agent. Useful for checking before executing a payment, or for building renewal UIs.</P>
                <Code>{`const expiry = await client.checkAgentExpiry(agentName, ownerPubkey?);`}</Code>
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  expired: boolean,      // true if agent has expired
  expiresAt: Date,       // JavaScript Date object of expiration
  daysRemaining: number  // 0 if expired, otherwise days until expiration
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const expiry = await client.checkAgentExpiry("my-agent");

if (expiry.expired) {
  console.log("Agent has expired — renewing...");
  await client.renewAgent("my-agent", 31_536_000);
} else {
  console.log(\`Agent expires in \${expiry.daysRemaining} days\`);
}`}</Code>

                {/* estimateFee */}
                <SectionTitle id="estimate-fee">estimateFee</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Estimates the Solana network fee for a payment transaction before executing it. Useful for agents that need to account for gas costs in their budget calculations.</P>
                <Code>{`const { fee, feeSOL } = await client.estimateFee(agentName, amountLamports, type);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent that would execute the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="type" type="string" desc='"record" or "agent_to_agent". Defaults to "record".' />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  fee: number,    // Fee in lamports
  feeSOL: string  // Fee in SOL (formatted string)
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const { fee, feeSOL } = await client.estimateFee("my-agent", 1_000_000, "record");
console.log(\`Estimated fee: \${feeSOL} SOL\`); // ~0.000005000 SOL`}</Code>

                {/* fetchAgent */}
                <SectionTitle id="fetch-agent">fetchAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Fetches the current state of a single agent account from Solana. Any public key can be inspected — this call does not require the caller to be the agent's owner.</P>
                <Code>{`const agent = await client.fetchAgent(agentName, ownerPubkey?);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to fetch." />
                <Param name="ownerPubkey" type="PublicKey" desc="Owner of the agent. Defaults to the client's wallet if not provided." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  owner: PublicKey,
  name: string,
  spendLimit: BN,
  totalSpent: BN,
  paymentCount: BN,
  isActive: boolean,
  lastPaymentAt: BN,
  dailySpent: BN,
  dailyResetAt: BN,
  expiresAt: BN
}`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const agent = await client.fetchAgent("my-agent");

const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
console.log("Remaining budget:", remaining / 1e9, "SOL");
console.log("Active:", agent.isActive);`}</Code>

                {/* fetchAllAgents */}
                <SectionTitle id="fetch-all-agents">fetchAllAgents</SectionTitle>
                <div style={{ marginBottom: "16px" }}>
                    <Badge text="async" />
                    <Badge text="read only" color="#6aaa80" />
                </div>
                <P>Fetches all agent accounts owned by the current wallet using a memcmp filter on the owner field.</P>
                <Code>{`const agents = await client.fetchAllAgents();`}</Code>
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
                <P>Fetches recent transaction history from the PayKit program by reading onchain transaction logs. Categorizes each transaction by instruction type.</P>
                <Code>{`const history = await client.getPaymentHistory(limit?);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="limit" type="number" desc="Number of recent transactions to fetch. Defaults to 50." />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`Array<{
  type: "agent_to_agent" | "record_payment" | "register_agent",
  time: string,  // ISO 8601 timestamp
  tx: string     // Transaction signature
}>`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const history = await client.getPaymentHistory(10);
for (const entry of history) {
  console.log(\`[\${entry.type}] \${entry.time} — \${entry.tx}\`);
}`}</Code>

                {/* Error Codes */}
                <SectionTitle id="errors">ERROR CODES</SectionTitle>
                <P>The PayKit smart contract returns structured error codes when a transaction fails. All errors are thrown as AnchorError.</P>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {[
                        { code: "NameTooLong", num: "6000", desc: "Agent name exceeds 32 characters." },
                        { code: "InvalidSpendLimit", num: "6001", desc: "Spend limit must be greater than zero." },
                        { code: "InvalidAmount", num: "6002", desc: "Payment amount must be greater than zero." },
                        { code: "SpendLimitExceeded", num: "6003", desc: "The payment would cause the agent to exceed its total spend limit." },
                        { code: "AgentInactive", num: "6004", desc: "The agent has been deactivated and cannot make or receive payments." },
                        { code: "MemoTooLong", num: "6005", desc: "Memo or service description exceeds 64 characters." },
                        { code: "DailyLimitExceeded", num: "6006", desc: "The payment would exceed the agent's daily spend limit (10% of total per 24 hours)." },
                        { code: "AgentExpired", num: "6007", desc: "The agent has expired. Use renewAgent to extend its expiration." },
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
  } else if (e.message.includes("AgentExpired")) {
    console.log("Agent has expired — renew with renewAgent()");
  }
}`}</Code>

                {/* Legacy Migration */}
                <SectionTitle id="legacy-migration">LEGACY AGENT MIGRATION</SectionTitle>
                <Callout type="warning">
                    <strong style={{ color: "#ffb800" }}>Important:</strong> Agents created before the contract upgrade that added the <code>expires_at</code> field cannot be deserialized against the new struct. These agents appear as <strong>LEGACY</strong> in the dashboard and cannot be renewed or used with the current contract version.
                </Callout>
                <P>This happens because Solana account data is fixed at creation time. When the contract struct gains a new field, existing accounts on-chain don't have that field — so the new deserializer fails to read them.</P>
                <SubTitle>// HOW TO IDENTIFY LEGACY AGENTS</SubTitle>
                <P>Legacy agents show <code style={{ color: "#ffb800" }}>EXPIRES: LEGACY</code> in the dashboard. In the SDK, their <code>expiresAt</code> field returns a value of 0 or throws a deserialization error.</P>
                <SubTitle>// MIGRATION STEPS</SubTitle>
                <Code>{`// Step 1 — Note the legacy agent's name and spend limit
const legacy = await client.fetchAllAgents();
const legacyAgent = legacy.find(a => a.name === "my-old-agent");
const originalLimit = legacyAgent.spendLimit.toNumber();

// Step 2 — Register a new agent with the same name
// (The old PDA still exists on-chain but is effectively replaced)
const { agentPDA } = await client.registerAgent(
  "my-old-agent",  // same name
  originalLimit    // same spend limit
);

// Step 3 — Verify the new agent is active and has an expiration
const expiry = await client.checkAgentExpiry("my-old-agent");
console.log("New agent expires in:", expiry.daysRemaining, "days");
// Output: New agent expires in: 365 days`}</Code>
                <Callout type="info">
                    The old legacy PDA remains on-chain permanently as an immutable record. It does not consume additional rent or resources — it simply cannot be interacted with using the current contract version.
                </Callout>

                {/* LangChain Integration */}
                <SectionTitle id="langchain">LANGCHAIN INTEGRATION</SectionTitle>
                <P>PayKit integrates naturally with LangChain agents as a custom tool. Register PayKit methods as tools that your LangChain agent can call autonomously to record payments and manage budgets.</P>
                <SubTitle>// SETUP</SubTitle>
                <Code>{`npm install langchain @langchain/openai @paykit/sdk`}</Code>
                <SubTitle>// CUSTOM TOOL DEFINITION</SubTitle>
                <Code>{`const { createClient } = require("@paykit/sdk");
const { DynamicStructuredTool } = require("langchain/tools");
const { z } = require("zod");

const paykit = createClient("/path/to/keypair.json", "devnet");

// Tool: record a payment onchain
const recordPaymentTool = new DynamicStructuredTool({
  name: "record_payment",
  description: "Record a payment made by the AI agent onchain with an immutable audit trail.",
  schema: z.object({
    agentName: z.string().describe("Name of the registered PayKit agent"),
    amountSOL: z.number().describe("Payment amount in SOL"),
    recipientAddress: z.string().describe("Recipient wallet address"),
    memo: z.string().describe("Description of what the payment is for"),
  }),
  func: async ({ agentName, amountSOL, recipientAddress, memo }) => {
    const { PublicKey } = require("@solana/web3.js");
    const { tx } = await paykit.recordPayment(
      agentName,
      Math.floor(amountSOL * 1_000_000_000),
      new PublicKey(recipientAddress),
      memo
    );
    return \`Payment recorded onchain. TX: \${tx}\`;
  },
});

// Tool: check agent budget
const checkBudgetTool = new DynamicStructuredTool({
  name: "check_agent_budget",
  description: "Check how much budget the agent has remaining before taking action.",
  schema: z.object({
    agentName: z.string().describe("Name of the registered PayKit agent"),
  }),
  func: async ({ agentName }) => {
    const agent = await paykit.fetchAgent(agentName);
    const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
    const expiry = await paykit.checkAgentExpiry(agentName);
    return JSON.stringify({
      remainingSOL: (remaining / 1e9).toFixed(4),
      paymentCount: agent.paymentCount.toString(),
      daysUntilExpiry: expiry.daysRemaining,
    });
  },
});

// Tool: pay another agent
const payAgentTool = new DynamicStructuredTool({
  name: "pay_agent",
  description: "Pay another registered PayKit agent for a completed service.",
  schema: z.object({
    senderAgent: z.string().describe("Name of the paying agent"),
    receiverAgent: z.string().describe("Name of the receiving agent"),
    amountSOL: z.number().describe("Payment amount in SOL"),
    service: z.string().describe("Description of the service rendered"),
  }),
  func: async ({ senderAgent, receiverAgent, amountSOL, service }) => {
    const { tx } = await paykit.agentToAgentPayment(
      senderAgent,
      receiverAgent,
      Math.floor(amountSOL * 1_000_000_000),
      service
    );
    return \`Agent payment confirmed. TX: \${tx}\`;
  },
});`}</Code>
                <SubTitle>// AGENT SETUP</SubTitle>
                <Code>{`const { ChatOpenAI } = require("@langchain/openai");
const { AgentExecutor, createOpenAIFunctionsAgent } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const tools = [recordPaymentTool, checkBudgetTool, payAgentTool];

const prompt = ChatPromptTemplate.fromMessages([
  ["system", \`You are an autonomous AI agent with a PayKit wallet on Solana.
Your agent name is "langchain-agent-01".
Always check your budget before making payments.
Record all significant actions onchain for accountability.\`],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools, verbose: true });

// The agent now autonomously manages payments
const result = await executor.invoke({
  input: "Check my remaining budget, then pay agent-researcher 0.001 SOL for completing the market analysis task."
});
console.log(result.output);`}</Code>

                {/* CrewAI Integration */}
                <SectionTitle id="crewai">CREWAI INTEGRATION</SectionTitle>
                <P>PayKit works with CrewAI to give your crew members autonomous payment capabilities. Each crew member can be assigned a PayKit agent identity and pay other crew members for completed tasks.</P>
                <SubTitle>// SETUP</SubTitle>
                <Code>{`pip install crewai
npm install @paykit/sdk  # PayKit runs as a sidecar Node.js service`}</Code>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Architecture note:</strong> Since PayKit SDK is Node.js, the recommended pattern for CrewAI (Python) is to run PayKit as a lightweight HTTP sidecar service that CrewAI tools call via requests. Alternatively, use the subprocess pattern shown below.
                </Callout>
                <SubTitle>// PAYKIT SIDECAR SERVICE (Node.js)</SubTitle>
                <Code>{`// paykit-service.js — Run this alongside your CrewAI crew
const express = require("express");
const { createClient } = require("@paykit/sdk");

const app = express();
app.use(express.json());

const paykit = createClient("/path/to/keypair.json", "devnet");

app.post("/register", async (req, res) => {
  const { name, spendLimitSOL } = req.body;
  const result = await paykit.registerAgent(name, spendLimitSOL * 1e9);
  res.json({ pda: result.agentPDA.toBase58(), tx: result.tx });
});

app.post("/pay", async (req, res) => {
  const { sender, receiver, amountSOL, service } = req.body;
  const result = await paykit.agentToAgentPayment(
    sender, receiver, Math.floor(amountSOL * 1e9), service
  );
  res.json({ tx: result.tx });
});

app.post("/batch", async (req, res) => {
  const { sender, payments } = req.body;
  const result = await paykit.batchPayment(sender, payments.map(p => ({
    ...p, amountLamports: Math.floor(p.amountSOL * 1e9)
  })));
  res.json({ tx: result.tx, count: result.count });
});

app.get("/agent/:name", async (req, res) => {
  const agent = await paykit.fetchAgent(req.params.name);
  const expiry = await paykit.checkAgentExpiry(req.params.name);
  res.json({
    spendLimit: agent.spendLimit.toString(),
    totalSpent: agent.totalSpent.toString(),
    paymentCount: agent.paymentCount.toString(),
    isActive: agent.isActive,
    daysRemaining: expiry.daysRemaining,
  });
});

app.listen(3333, () => console.log("PayKit sidecar running on port 3333"));`}</Code>
                <SubTitle>// CREWAI TOOLS (Python)</SubTitle>
                <Code>{`# paykit_tools.py
import requests
from crewai.tools import BaseTool

PAYKIT_URL = "http://localhost:3333"

class RecordPaymentTool(BaseTool):
    name: str = "record_payment"
    description: str = (
        "Record a payment onchain via PayKit for accountability. "
        "Use this after completing any paid task."
    )

    def _run(self, agent_name: str, amount_sol: float,
             recipient: str, memo: str) -> str:
        res = requests.post(f"{PAYKIT_URL}/pay", json={
            "sender": agent_name,
            "receiver": recipient,
            "amountSOL": amount_sol,
            "service": memo,
        })
        data = res.json()
        return f"Payment recorded onchain. TX: {data['tx']}"

class CheckBudgetTool(BaseTool):
    name: str = "check_budget"
    description: str = (
        "Check the remaining budget and status of a PayKit agent "
        "before executing any payment."
    )

    def _run(self, agent_name: str) -> str:
        res = requests.get(f"{PAYKIT_URL}/agent/{agent_name}")
        data = res.json()
        spent = int(data["totalSpent"]) / 1e9
        limit = int(data["spendLimit"]) / 1e9
        remaining = limit - spent
        return (
            f"Agent: {agent_name} | "
            f"Spent: {spent:.4f} SOL | "
            f"Remaining: {remaining:.4f} SOL | "
            f"Payments: {data['paymentCount']} | "
            f"Days until expiry: {data['daysRemaining']}"
        )`}</Code>
                <SubTitle>// CREW DEFINITION</SubTitle>
                <Code>{`# crew.py
from crewai import Agent, Task, Crew
from paykit_tools import RecordPaymentTool, CheckBudgetTool

record_payment = RecordPaymentTool()
check_budget = CheckBudgetTool()

researcher = Agent(
    role="Research Specialist",
    goal="Gather and analyze market data",
    backstory="Expert in data research with a PayKit agent identity on Solana.",
    tools=[check_budget, record_payment],
    verbose=True,
)

writer = Agent(
    role="Content Writer",
    goal="Produce high-quality written content",
    backstory="Professional writer compensated via PayKit for each deliverable.",
    tools=[check_budget, record_payment],
    verbose=True,
)

research_task = Task(
    description="Research the current state of AI agent payment protocols.",
    agent=researcher,
    expected_output="A concise market analysis with key findings.",
)

writing_task = Task(
    description="Write a blog post based on the research findings.",
    agent=writer,
    expected_output="A 500-word blog post ready for publication.",
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    verbose=True,
)

result = crew.kickoff()
print(result)`}</Code>

                {/* Smart Contract */}
                <SectionTitle id="contract">SMART CONTRACT</SectionTitle>
                <P>The PayKit program is written in Rust using the Anchor framework and deployed on Solana Devnet.</P>
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
                        { name: "register_agent", desc: "Creates a new agent PDA with name, spend limit, and 365-day expiration." },
                        { name: "record_payment", desc: "Logs a payment. Enforces total spend limit and daily rate limit." },
                        { name: "agent_to_agent_payment", desc: "Records a direct payment between two registered agents." },
                        { name: "update_spend_limit", desc: "Updates the spend limit. Owner only." },
                        { name: "deactivate_agent", desc: "Permanently disables an agent. Irreversible." },
                        { name: "renew_agent", desc: "Extends an agent's expiration by a specified number of seconds." },
                    ].map(ix => (
                        <div key={ix.name} style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
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
  pub daily_spent: u64,       // Amount spent today in lamports
  pub daily_reset_at: i64,    // Unix timestamp of last daily reset
  pub expires_at: i64,        // Unix timestamp of expiration (0 = legacy)
}`}</Code>

                {/* Architecture */}
                <SectionTitle id="architecture">ARCHITECTURE</SectionTitle>
                <P>PayKit is structured as three independent layers that can be used together or separately:</P>
                <Code>{`┌─────────────────────────────────────────────────────┐
│         AI Agent / LangChain / CrewAI / Custom       │
├─────────────────────────────────────────────────────┤
│               PayKit SDK (Node.js)                   │
│  registerAgent · recordPayment · batchPayment        │
│  agentToAgent · renewAgent · estimateFee · expiry    │
├─────────────────────────────────────────────────────┤
│          PayKit Program (Solana / Anchor)            │
│   PDAs · Spend Limits · Rate Limiting · Expiration   │
├─────────────────────────────────────────────────────┤
│                 Solana Blockchain                    │
│          ~400ms finality · ~$0.00025/tx              │
└─────────────────────────────────────────────────────┘`}</Code>
                <SubTitle>// PDA DERIVATION</SubTitle>
                <P>Each agent account is a Program Derived Address derived from the program ID, the string "agent", the owner's public key, and the agent name:</P>
                <Code>{`const [agentPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("agent"),
    ownerPublicKey.toBuffer(),
    Buffer.from(agentName),
  ],
  PROGRAM_ID
);`}</Code>
                <SubTitle>// RATE LIMITING</SubTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "24px" }}>
                    {[
                        { rule: "Total spend limit", desc: "The agent can never spend more than spend_limit in total across its entire lifetime. Enforced at the protocol level — cannot be bypassed." },
                        { rule: "Daily spend limit", desc: "The agent can spend at most 10% of its total spend limit per 24-hour period. Resets automatically every 24 hours." },
                        { rule: "Expiration", desc: "Agents expire after 365 days by default. Expired agents cannot make or receive payments. Renewable via renewAgent." },
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