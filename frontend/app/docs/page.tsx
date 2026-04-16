"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Section {
    id: string;
    title: string;
}

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
    { id: "reactivate-agent", title: "reactivateAgent" },
    { id: "renew-agent", title: "renewAgent" },
    { id: "check-expiry", title: "checkAgentExpiry" },
    { id: "estimate-fee", title: "estimateFee" },
    { id: "fetch-agent", title: "fetchAgent" },
    { id: "fetch-all-agents", title: "fetchAllAgents" },
    { id: "payment-history", title: "getPaymentHistory" },
    { id: "agent-history", title: "getAgentHistory" },
    { id: "watch-agent", title: "watchAgent" },
    { id: "webhooks", title: "createWebhook" },
    { id: "browser-wallet", title: "Browser Wallet" },
    { id: "errors", title: "Error Codes" },
    { id: "legacy-migration", title: "Legacy Migration" },
    { id: "langchain", title: "LangChain Integration" },
    { id: "crewai", title: "CrewAI Integration" },
    { id: "contract", title: "Smart Contract" },
    { id: "architecture", title: "Architecture" },
];

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
        <div style={{ display: "grid", gridTemplateColumns: "160px 120px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
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
                    <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: "8px" }}>
                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: 900, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>PAYKIT</span>
                    </button>
                    <div style={{ fontSize: "11px", color: "#6aaa80", letterSpacing: "0.15em" }}>SDK DOCUMENTATION</div>
                </div>
                {sections.map(s => (
                    <button key={s.id} onClick={() => scrollTo(s.id)} style={{ background: activeSection === s.id ? "rgba(0,255,136,0.08)" : "transparent", border: "none", borderLeft: `2px solid ${activeSection === s.id ? "#00ff88" : "transparent"}`, color: activeSection === s.id ? "#00ff88" : "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", padding: "8px 12px", cursor: "pointer", textAlign: "left", letterSpacing: "0.05em", transition: "all 0.15s", borderRadius: "0 3px 3px 0" }}>
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
                    <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: "28px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.05em", textShadow: "0 0 20px rgba(0,255,136,0.3)", marginBottom: "20px" }}>PayKit SDK</h1>
                    <P>PayKit is an open-source SDK for registering autonomous AI agents on Solana, enforcing spend limits, and recording payment history immutably onchain. It is the accountability infrastructure layer for the autonomous AI economy.</P>
                    <P>PayKit is <strong style={{ color: "#c8f0d8" }}>not a payment processor</strong>. It is an accountability layer. The SDK wraps the PayKit Anchor program and exposes a simple JavaScript/TypeScript API any developer can integrate in minutes.</P>
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
                                <div style={{ fontSize: "13px", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", cursor: item.full ? "pointer" : "default" }} onClick={() => item.full && navigator.clipboard.writeText(item.full)} title={item.full ? "Click to copy" : undefined}>
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
                <P>The SDK requires Node.js 18+ and a Solana keypair file to sign transactions.</P>

                {/* Quickstart */}
                <SectionTitle id="quickstart">QUICKSTART</SectionTitle>
                <Code>{`const { createClient } = require("@paykit/sdk");

// 1. Create a client with your keypair
const client = createClient("/path/to/keypair.json", "devnet");

// 2. Register an AI agent with a 1 SOL spend limit and 10% daily limit
const { agentPDA } = await client.registerAgent("my-agent", 1_000_000_000, 1000);

// 3. Record a payment
await client.recordPayment("my-agent", 1_000_000, recipientPublicKey, "API call");

// 4. Agent pays another agent
await client.agentToAgentPayment("my-agent", "other-agent", 250_000, "Data analysis");

// 5. Watch for new transactions (polling)
const stop = client.watchAgent("my-agent", (err, entry) => {
  if (entry) console.log("New tx:", entry.type, entry.tx);
});
// later...
stop();`}</Code>

                {/* registerAgent */}
                <SectionTitle id="register-agent">registerAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /></div>
                <P>Registers a new AI agent onchain. Creates a PDA account with identity, spend limit, configurable daily rate limit, and 365-day expiration. The daily limit is specified in basis points (BPS) — 1000 BPS = 10%, 500 BPS = 5%, 10000 BPS = 100%.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Why BPS?</strong> Basis points give precise control over the daily limit without floating point math. 100 BPS = 1%, so a 5% daily limit is 500 BPS, a 25% daily limit is 2500 BPS.
                </Callout>
                <Code>{`const { tx, agentPDA } = await client.registerAgent(name, spendLimitLamports, dailyLimitBps);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="name" type="string" required desc="Unique identifier. Maximum 32 characters." />
                <Param name="spendLimitLamports" type="number" required desc="Maximum total spend in lamports. 1 SOL = 1,000,000,000 lamports." />
                <Param name="dailyLimitBps" type="number" required desc="Daily spend limit in basis points. 1000 = 10%, 500 = 5%, 10000 = 100%. Must be between 1 and 10000." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`// Agent with 5 SOL limit and 20% daily cap
const { agentPDA } = await client.registerAgent("trading-agent", 5_000_000_000, 2000);

// Agent with 1 SOL limit and 5% daily cap (very conservative)
await client.registerAgent("safe-agent", 1_000_000_000, 500);

// Agent with 1 SOL limit and 100% daily cap (no daily restriction)
await client.registerAgent("fast-agent", 1_000_000_000, 10000);`}</Code>

                {/* recordPayment */}
                <SectionTitle id="record-payment">recordPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="enforces limits" color="#ff3c5a" /></div>
                <P>Records a payment made by an agent onchain. Enforces the total spend limit and the configurable daily limit. Both limits are enforced at the protocol level — they cannot be bypassed by the SDK or any application.</P>
                <Code>{`const { tx } = await client.recordPayment(agentName, amountLamports, recipient, memo);`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent making the payment." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="recipient" type="PublicKey" required desc="Recipient public key." />
                <Param name="memo" type="string" required desc="Payment description. Maximum 64 characters." />
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.recordPayment("trading-agent", 500_000, new PublicKey("..."), "OpenAI API call");`}</Code>

                {/* agentToAgentPayment */}
                <SectionTitle id="agent-to-agent">agentToAgentPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="enforces limits" color="#ff3c5a" /></div>
                <P>Records a direct payment from one registered agent to another. Both agents must be registered, active, and not expired. The sender's spend limit and daily limit are enforced atomically.</P>
                <Code>{`const { tx } = await client.agentToAgentPayment(senderName, receiverName, amountLamports, service);`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`await client.agentToAgentPayment("agent-alpha", "agent-beta", 250_000, "Market data analysis");`}</Code>

                {/* batchPayment */}
                <SectionTitle id="batch-payment">batchPayment</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="atomic" color="#00ff88" /><Badge text="max 5" color="#ffb800" /></div>
                <P>Sends payments from one agent to multiple agents in a single Solana transaction. All payments succeed or all fail atomically. This is the key primitive for orchestrator patterns — one agent delegates work and pays multiple specialized agents in one shot.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Why batch?</strong> Solana transactions support multiple instructions. Instead of 5 separate transactions (5x fees, 5x latency), batchPayment packs all payments into one transaction — atomic, cheaper, and faster.
                </Callout>
                <Code>{`const { tx, count } = await client.batchPayment(senderName, payments);`}</Code>
                <SubTitle>// EXAMPLE</SubTitle>
                <Code>{`const { tx, count } = await client.batchPayment("orchestrator", [
  { receiverName: "agent-researcher", amountLamports: 100_000, service: "Web research" },
  { receiverName: "agent-writer",     amountLamports: 150_000, service: "Content generation" },
  { receiverName: "agent-reviewer",   amountLamports: 50_000,  service: "Quality review" },
]);
console.log(\`\${count} payments in 1 TX: \${tx}\`);`}</Code>

                {/* updateSpendLimit */}
                <SectionTitle id="update-spend-limit">updateSpendLimit</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="owner only" color="#6aaa80" /></div>
                <P>Updates the total spend limit of an existing agent. Does not reset total_spent or daily_spent.</P>
                <Code>{`await client.updateSpendLimit("my-agent", 10_000_000_000); // 10 SOL`}</Code>

                {/* deactivateAgent */}
                <SectionTitle id="deactivate-agent">deactivateAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="owner only" color="#6aaa80" /></div>
                <P>Disables an agent. A deactivated agent cannot make or receive payments. Unlike previous versions where this was irreversible, agents can now be reactivated using <code style={{ color: "#ffb800" }}>reactivateAgent</code> as long as they haven't expired.</P>
                <Code>{`await client.deactivateAgent("my-agent");`}</Code>

                {/* reactivateAgent */}
                <SectionTitle id="reactivate-agent">reactivateAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="owner only" color="#6aaa80" /></div>
                <P>Reactivates a previously deactivated agent. The agent must not be expired — if it is, renew it first with <code style={{ color: "#ffb800" }}>renewAgent</code>. This allows temporary suspension and resumption of agent activity without losing its onchain history.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Why reactivate?</strong> A common pattern is to temporarily deactivate an agent while reconfiguring its spend limit or investigating suspicious activity, then reactivate it once the review is complete — without losing its payment history.
                </Callout>
                <Code>{`await client.reactivateAgent("my-agent");`}</Code>

                {/* renewAgent */}
                <SectionTitle id="renew-agent">renewAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="onchain" color="#ffb800" /><Badge text="owner only" color="#6aaa80" /></div>
                <P>Extends an agent's expiration. If already expired, extension starts from now. If still active, adds to the current expiration. Only agents created with the current contract version support renewal — legacy agents cannot be renewed.</P>
                <Code>{`await client.renewAgent("my-agent", 31_536_000); // +1 year
await client.renewAgent("my-agent", 15_768_000); // +6 months`}</Code>

                {/* checkAgentExpiry */}
                <SectionTitle id="check-expiry">checkAgentExpiry</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /></div>
                <P>Returns the expiration status of an agent. Use this before executing payments to avoid AgentExpired errors.</P>
                <Code>{`const expiry = await client.checkAgentExpiry("my-agent");
// { expired: false, expiresAt: Date, daysRemaining: 342 }

if (expiry.expired) await client.renewAgent("my-agent", 31_536_000);`}</Code>

                {/* estimateFee */}
                <SectionTitle id="estimate-fee">estimateFee</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /></div>
                <P>Estimates the Solana network fee for a transaction before executing. Useful for agents that need to factor gas costs into their budget calculations.</P>
                <Code>{`const { fee, feeSOL } = await client.estimateFee("my-agent", 250_000, "record");
console.log(\`Fee: \${feeSOL} SOL\`); // ~0.000005000 SOL`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent." />
                <Param name="amountLamports" type="number" required desc="Payment amount in lamports." />
                <Param name="type" type="string" desc='"record" or "agent_to_agent". Defaults to "record".' />

                {/* fetchAgent */}
                <SectionTitle id="fetch-agent">fetchAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /></div>
                <P>Fetches the current state of a single agent account. Any public key can be inspected — no ownership required.</P>
                <Code>{`const agent = await client.fetchAgent("my-agent");
const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
console.log("Remaining:", remaining / 1e9, "SOL");`}</Code>

                {/* fetchAllAgents */}
                <SectionTitle id="fetch-all-agents">fetchAllAgents</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /></div>
                <P>Fetches all current-version agent accounts owned by the wallet. Automatically excludes legacy agents (created before the current contract version) using an onchain dataSize filter — only accounts of exactly 136 bytes are returned.</P>
                <Callout type="warning">
                    <strong style={{ color: "#ffb800" }}>Legacy agents:</strong> Agents created before the current contract version will not appear in fetchAllAgents results. This is intentional — they cannot be deserialized against the current struct. See the Legacy Migration guide below.
                </Callout>
                <Code>{`const agents = await client.fetchAllAgents();
for (const a of agents) {
  console.log(a.name, a.dailyLimitBps, "bps daily limit");
}`}</Code>

                {/* getPaymentHistory */}
                <SectionTitle id="payment-history">getPaymentHistory</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /><Badge text="program-wide" color="#ffb800" /></div>
                <P>Fetches recent transaction history across the entire PayKit program by reading onchain logs. Returns transactions from all agents. For agent-specific history, use <code style={{ color: "#ffb800" }}>getAgentHistory</code>.</P>
                <Code>{`const history = await client.getPaymentHistory(10);
// [{ type: "agent_to_agent", time: "...", tx: "..." }, ...]`}</Code>

                {/* getAgentHistory */}
                <SectionTitle id="agent-history">getAgentHistory</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="read only" color="#6aaa80" /><Badge text="agent-specific" color="#00ff88" /></div>
                <P>Fetches transaction history filtered to a specific agent. Uses the agent's PDA address as the filter — only transactions that directly involved this agent are returned. This is more efficient and precise than getPaymentHistory for single-agent monitoring.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Why use this instead of getPaymentHistory?</strong> getPaymentHistory fetches all program transactions and requires you to filter. getAgentHistory queries only the agent's PDA — it's faster, more targeted, and scales better when you have many agents.
                </Callout>
                <Code>{`const history = await client.getAgentHistory("my-agent", 20);
for (const entry of history) {
  console.log(\`[\${entry.type}] \${entry.time} — \${entry.tx}\`);
}
// [agent_to_agent] 2026-04-15T... — 3GjtjJ...
// [register_agent] 2026-04-15T... — 5kwYQ1...`}</Code>
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`Array<{
  type: "agent_to_agent" | "record_payment" | "register_agent",
  agentName: string,
  agentPDA: string,
  time: string,   // ISO 8601
  tx: string      // Transaction signature
}>`}</Code>

                {/* watchAgent */}
                <SectionTitle id="watch-agent">watchAgent</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="polling" color="#ffb800" /><Badge text="no external service" color="#6aaa80" /></div>
                <P>Watches an agent for new transactions via polling. The SDK polls the agent's PDA at a configurable interval and calls your callback whenever a new transaction is detected. Returns a stop function — call it to stop watching.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>When to use this vs createWebhook:</strong> Use watchAgent for development, testing, or short-lived processes. Use createWebhook (Helius) for production systems where you need reliable, persistent notifications to an HTTP endpoint.
                </Callout>
                <Code>{`// Start watching — callback receives (error, entry)
const stop = client.watchAgent(
  "my-agent",
  (err, entry) => {
    if (err) { console.error("Watch error:", err.code); return; }
    console.log("New transaction:", entry.type, entry.tx);
  },
  5000  // poll every 5 seconds (default)
);

// Stop watching when done
setTimeout(stop, 60_000); // stop after 1 minute`}</Code>
                <SubTitle>// PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to watch." />
                <Param name="callback" type="function" required desc="Called with (err, entry) on each new transaction. err is null on success." />
                <Param name="intervalMs" type="number" desc="Polling interval in milliseconds. Defaults to 5000 (5 seconds)." />
                <SubTitle>// RETURNS</SubTitle>
                <P>A <code style={{ color: "#ffb800" }}>stop()</code> function. Call it to stop polling and clean up the timer.</P>

                {/* createWebhook */}
                <SectionTitle id="webhooks">createWebhook / deleteWebhook</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="async" /><Badge text="Helius required" color="#ffb800" /><Badge text="production" color="#00ff88" /></div>
                <P>Registers a real-time webhook via Helius that POSTs to your endpoint whenever the agent transacts onchain. Unlike watchAgent, this runs server-side and works even when your Node.js process is not running.</P>
                <Callout type="warning">
                    <strong style={{ color: "#ffb800" }}>Requires a Helius API key.</strong> Free tier includes 3 webhooks and up to 1M notifications/month — sufficient for development and most production use cases. Get your key at helius.dev.
                </Callout>
                <Code>{`// Register webhook — Helius will POST to your URL on every agent transaction
const { webhookId, agentPDA } = await client.createWebhook(
  "my-agent",
  "https://your-api.com/webhook/paykit",
  process.env.HELIUS_API_KEY,
  "devnet"  // or "mainnet-beta"
);
console.log("Webhook registered:", webhookId);

// Your endpoint receives POST requests like:
// {
//   type: "TRANSFER",
//   accountData: [...],
//   transaction: { ... }
// }

// Delete webhook when no longer needed
await client.deleteWebhook(webhookId, process.env.HELIUS_API_KEY);`}</Code>
                <SubTitle>// createWebhook PARAMETERS</SubTitle>
                <Param name="agentName" type="string" required desc="Name of the agent to monitor." />
                <Param name="webhookUrl" type="string" required desc="Your public HTTP endpoint that will receive POST requests." />
                <Param name="heliusApiKey" type="string" required desc="Your Helius API key from helius.dev." />
                <Param name="cluster" type="string" desc='"devnet" or "mainnet-beta". Defaults to "devnet".' />
                <SubTitle>// RETURNS</SubTitle>
                <Code>{`{
  webhookId: string,  // Use this to delete the webhook later
  agentPDA: string,   // The agent's onchain address being monitored
  webhookUrl: string  // The URL that will receive notifications
}`}</Code>

                {/* Browser Wallet */}
                <SectionTitle id="browser-wallet">BROWSER WALLET SUPPORT</SectionTitle>
                <div style={{ marginBottom: "16px" }}><Badge text="Phantom" color="#00ff88" /><Badge text="Backpack" color="#ffb800" /><Badge text="any wallet adapter" color="#6aaa80" /></div>
                <P>PayKit supports browser wallet adapters (Phantom, Backpack, Solflare, etc.) directly via <code style={{ color: "#ffb800" }}>createClientFromWallet</code>. This enables frontend applications to use the SDK without a keypair file.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Two client constructors:</strong> Use <code style={{ color: "#c8f0d8" }}>createClient</code> for Node.js server-side code (LangChain agents, backend services, scripts). Use <code style={{ color: "#c8f0d8" }}>createClientFromWallet</code> for browser-based applications with wallet adapters.
                </Callout>
                <Code>{`import { createClientFromWallet } from "@paykit/sdk";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

function MyComponent() {
  const wallet = useWallet();
  const { connection } = useConnection();

  async function handleRegister() {
    if (!wallet.connected) return;

    // Create client from browser wallet — no keypair file needed
    const client = createClientFromWallet(wallet, connection);

    const { agentPDA } = await client.registerAgent(
      "my-web-agent",
      1_000_000_000,
      1000  // 10% daily limit
    );
    console.log("Agent registered:", agentPDA.toBase58());
  }
}`}</Code>

                {/* Error Codes */}
                <SectionTitle id="errors">ERROR CODES</SectionTitle>
                <P>PayKit throws structured <code style={{ color: "#ffb800" }}>PayKitError</code> instances with a <code style={{ color: "#ffb800" }}>code</code> field. All contract errors, network errors, and SDK validation errors are mapped to named codes.</P>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {[
                        { code: "NameTooLong", num: "6000", desc: "Agent name exceeds 32 characters." },
                        { code: "InvalidSpendLimit", num: "6001", desc: "Spend limit must be greater than zero." },
                        { code: "InvalidAmount", num: "6002", desc: "Payment amount must be greater than zero." },
                        { code: "SpendLimitExceeded", num: "6003", desc: "Payment would exceed the agent's total spend limit." },
                        { code: "AgentInactive", num: "6004", desc: "Agent is deactivated. Use reactivateAgent to restore." },
                        { code: "MemoTooLong", num: "6005", desc: "Memo exceeds 64 characters." },
                        { code: "DailyLimitExceeded", num: "6006", desc: "Payment would exceed the agent's daily BPS limit. Resets every 24h." },
                        { code: "AgentExpired", num: "6007", desc: "Agent has expired. Use renewAgent to extend." },
                        { code: "InvalidDailyLimit", num: "6008", desc: "dailyLimitBps must be between 1 and 10000." },
                        { code: "BlockhashExpired", num: "—", desc: "Transaction blockhash expired. Retry the transaction." },
                        { code: "AlreadyProcessed", num: "—", desc: "Transaction was already processed onchain." },
                        { code: "AccountNotFound", num: "—", desc: "Agent account not found. Check name and owner." },
                        { code: "LegacyAgent", num: "—", desc: "Agent created with older contract. See Legacy Migration." },
                        { code: "InsufficientFunds", num: "—", desc: "Insufficient SOL for transaction fees." },
                        { code: "WalletNotConnected", num: "—", desc: "Wallet is not connected." },
                    ].map(err => (
                        <div key={err.code} style={{ display: "grid", gridTemplateColumns: "200px 60px 1fr", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(0,255,136,0.06)", fontSize: "14px", alignItems: "start" }}>
                            <span style={{ color: "#ff3c5a", fontFamily: "'Share Tech Mono', monospace" }}>{err.code}</span>
                            <span style={{ color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px" }}>{err.num}</span>
                            <span style={{ color: "#9aeab0" }}>{err.desc}</span>
                        </div>
                    ))}
                </div>
                <SubTitle>// HANDLING ERRORS</SubTitle>
                <Code>{`import { PayKitError } from "@paykit/sdk/errors";

try {
  await client.recordPayment("my-agent", 1_000_000, recipient, "payment");
} catch (e) {
  if (e instanceof PayKitError) {
    switch (e.code) {
      case "SpendLimitExceeded":
        console.log("Agent hit its total budget");
        break;
      case "DailyLimitExceeded":
        console.log("Agent hit its daily limit — resets in 24h");
        break;
      case "AgentExpired":
        await client.renewAgent("my-agent", 31_536_000);
        break;
      case "AgentInactive":
        await client.reactivateAgent("my-agent");
        break;
      default:
        console.error(e.code, e.message);
    }
  }
}`}</Code>

                {/* Legacy Migration */}
                <SectionTitle id="legacy-migration">LEGACY AGENT MIGRATION</SectionTitle>
                <Callout type="warning">
                    <strong style={{ color: "#ffb800" }}>Important:</strong> Agents created before the current contract version cannot be deserialized against the new struct. They appear as <strong>LEGACY</strong> in the dashboard and are excluded from fetchAllAgents results. This is a known limitation of Solana's fixed account size model.
                </Callout>
                <P>Each time the contract struct gains a new field (expires_at, daily_limit_bps, etc.), existing accounts on-chain become incompatible because they were allocated with the old size.</P>
                <SubTitle>// HOW TO IDENTIFY LEGACY AGENTS</SubTitle>
                <P>Legacy agents show <code style={{ color: "#ffb800" }}>EXPIRES: LEGACY</code> in the dashboard. In the SDK they cause a <code style={{ color: "#ff3c5a" }}>LegacyAgent</code> error when fetched directly.</P>
                <SubTitle>// MIGRATION STEPS</SubTitle>
                <Code>{`// Step 1 — Note the legacy agent's configuration
// (Use Solana Explorer or the audit mode in the dashboard)

// Step 2 — Register a new agent with the same name
// The new agent gets expires_at and daily_limit_bps fields
const { agentPDA } = await client.registerAgent(
  "my-old-agent",   // same name — creates a new PDA
  1_000_000_000,    // same spend limit
  1000              // 10% daily limit (new required field)
);

// Step 3 — Verify
const expiry = await client.checkAgentExpiry("my-old-agent");
console.log("Migrated — expires in:", expiry.daysRemaining, "days");`}</Code>
                <Callout type="info">
                    The old legacy PDA remains on-chain permanently as an immutable record. It does not consume additional rent — it simply cannot be interacted with using the current contract version.
                </Callout>

                {/* LangChain */}
                <SectionTitle id="langchain">LANGCHAIN INTEGRATION</SectionTitle>
                <P>PayKit integrates naturally with LangChain as a set of custom tools. Register PayKit methods as tools your agent can call autonomously to manage budgets and record payments.</P>
                <Code>{`npm install langchain @langchain/openai @paykit/sdk`}</Code>
                <SubTitle>// TOOL DEFINITIONS</SubTitle>
                <Code>{`const { createClient } = require("@paykit/sdk");
const { DynamicStructuredTool } = require("langchain/tools");
const { z } = require("zod");

const paykit = createClient("/path/to/keypair.json", "devnet");

const recordPaymentTool = new DynamicStructuredTool({
  name: "record_payment",
  description: "Record a payment onchain via PayKit for accountability.",
  schema: z.object({
    agentName: z.string(),
    amountSOL: z.number(),
    recipientAddress: z.string(),
    memo: z.string(),
  }),
  func: async ({ agentName, amountSOL, recipientAddress, memo }) => {
    const { PublicKey } = require("@solana/web3.js");
    const { tx } = await paykit.recordPayment(
      agentName,
      Math.floor(amountSOL * 1_000_000_000),
      new PublicKey(recipientAddress),
      memo
    );
    return \`Payment recorded. TX: \${tx}\`;
  },
});

const checkBudgetTool = new DynamicStructuredTool({
  name: "check_budget",
  description: "Check remaining budget and expiry before making a payment.",
  schema: z.object({ agentName: z.string() }),
  func: async ({ agentName }) => {
    const agent = await paykit.fetchAgent(agentName);
    const expiry = await paykit.checkAgentExpiry(agentName);
    const remaining = agent.spendLimit.toNumber() - agent.totalSpent.toNumber();
    return JSON.stringify({
      remainingSOL: (remaining / 1e9).toFixed(4),
      dailyLimitBps: agent.dailyLimitBps,
      daysUntilExpiry: expiry.daysRemaining,
    });
  },
});

const payAgentTool = new DynamicStructuredTool({
  name: "pay_agent",
  description: "Pay another registered agent for a completed service.",
  schema: z.object({
    senderAgent: z.string(),
    receiverAgent: z.string(),
    amountSOL: z.number(),
    service: z.string(),
  }),
  func: async ({ senderAgent, receiverAgent, amountSOL, service }) => {
    const { tx } = await paykit.agentToAgentPayment(
      senderAgent, receiverAgent,
      Math.floor(amountSOL * 1_000_000_000), service
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
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: "Check my budget, then pay agent-researcher 0.001 SOL for the analysis task."
});`}</Code>

                {/* CrewAI */}
                <SectionTitle id="crewai">CREWAI INTEGRATION</SectionTitle>
                <P>PayKit works with CrewAI via a lightweight Node.js sidecar service that CrewAI Python tools call via HTTP requests.</P>
                <Callout type="info">
                    <strong style={{ color: "#00ff88" }}>Architecture note:</strong> PayKit SDK is Node.js. The recommended pattern for CrewAI (Python) is to run PayKit as an HTTP sidecar that Python tools call via requests.
                </Callout>
                <SubTitle>// PAYKIT SIDECAR (Node.js)</SubTitle>
                <Code>{`const express = require("express");
const { createClient } = require("@paykit/sdk");

const app = express();
app.use(express.json());
const paykit = createClient("/path/to/keypair.json", "devnet");

app.post("/register", async (req, res) => {
  const { name, spendLimitSOL, dailyLimitBps = 1000 } = req.body;
  const result = await paykit.registerAgent(name, spendLimitSOL * 1e9, dailyLimitBps);
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
    dailyLimitBps: agent.dailyLimitBps,
    isActive: agent.isActive,
    daysRemaining: expiry.daysRemaining,
  });
});

app.listen(3333, () => console.log("PayKit sidecar on port 3333"));`}</Code>
                <SubTitle>// CREWAI TOOLS (Python)</SubTitle>
                <Code>{`import requests
from crewai.tools import BaseTool

PAYKIT_URL = "http://localhost:3333"

class RecordPaymentTool(BaseTool):
    name: str = "record_payment"
    description: str = "Record a payment onchain via PayKit for accountability."

    def _run(self, agent_name: str, amount_sol: float, recipient: str, memo: str) -> str:
        res = requests.post(f"{PAYKIT_URL}/pay", json={
            "sender": agent_name, "receiver": recipient,
            "amountSOL": amount_sol, "service": memo,
        })
        return f"Payment recorded. TX: {res.json()['tx']}"

class CheckBudgetTool(BaseTool):
    name: str = "check_budget"
    description: str = "Check remaining budget before executing any payment."

    def _run(self, agent_name: str) -> str:
        data = requests.get(f"{PAYKIT_URL}/agent/{agent_name}").json()
        spent = int(data["totalSpent"]) / 1e9
        limit = int(data["spendLimit"]) / 1e9
        return (
            f"Agent: {agent_name} | Spent: {spent:.4f} SOL | "
            f"Remaining: {limit - spent:.4f} SOL | "
            f"Daily limit: {data['dailyLimitBps'] / 100:.0f}% | "
            f"Days until expiry: {data['daysRemaining']}"
        )`}</Code>

                {/* Smart Contract */}
                <SectionTitle id="contract">SMART CONTRACT</SectionTitle>
                <P>The PayKit program is written in Rust using Anchor and deployed on Solana Devnet. All 7 instructions emit rich onchain events that include agent names, amounts, and timestamps.</P>
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
                        { name: "register_agent", desc: "Creates agent PDA with name, spend limit, configurable daily BPS, and 365-day expiration." },
                        { name: "record_payment", desc: "Logs a payment. Enforces total spend limit and configurable daily BPS limit." },
                        { name: "agent_to_agent_payment", desc: "Records a direct payment between two registered agents." },
                        { name: "update_spend_limit", desc: "Updates the spend limit. Owner only." },
                        { name: "deactivate_agent", desc: "Disables an agent. Reversible via reactivate_agent." },
                        { name: "reactivate_agent", desc: "Re-enables a deactivated agent. Requires agent to not be expired." },
                        { name: "renew_agent", desc: "Extends expiration by specified seconds. Owner only." },
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
  pub daily_limit_bps: u16,   // Daily limit in basis points (1–10000)
}
// Account size: 136 bytes (used as dataSize filter in fetchAllAgents)`}</Code>

                {/* Architecture */}
                <SectionTitle id="architecture">ARCHITECTURE</SectionTitle>
                <P>PayKit is three independent layers that can be used together or separately:</P>
                <Code>{`┌──────────────────────────────────────────────────────────────┐
│     AI Agent / LangChain / CrewAI / Browser App / Custom      │
├──────────────────────────────────────────────────────────────┤
│                     PayKit SDK (Node.js)                       │
│  registerAgent · recordPayment · batchPayment · reactivate    │
│  agentToAgent · renewAgent · estimateFee · checkExpiry        │
│  getAgentHistory · watchAgent · createWebhook · browserWallet │
├──────────────────────────────────────────────────────────────┤
│              PayKit Program (Solana / Anchor)                  │
│  PDAs · Spend Limits · BPS Rate Limiting · Expiration         │
│  Rich Onchain Events · dataSize=136 Filter                    │
├──────────────────────────────────────────────────────────────┤
│                      Solana Blockchain                         │
│             ~400ms finality · ~$0.00025/tx                    │
└──────────────────────────────────────────────────────────────┘`}</Code>
                <SubTitle>// PDA DERIVATION</SubTitle>
                <Code>{`const [agentPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), ownerPublicKey.toBuffer(), Buffer.from(agentName)],
  PROGRAM_ID
);`}</Code>
                <SubTitle>// RATE LIMITING</SubTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "24px" }}>
                    {[
                        { rule: "Total spend limit", desc: "Agent can never exceed spend_limit across its entire lifetime. Protocol-enforced — cannot be bypassed." },
                        { rule: "Daily BPS limit", desc: "Configurable per agent in basis points. 1000 BPS = 10%, 500 BPS = 5%. Resets every 24 hours automatically." },
                        { rule: "Expiration", desc: "Agents expire after 365 days by default. Expired agents cannot transact. Renewable via renewAgent." },
                        { rule: "Activation", desc: "Agents can be deactivated and reactivated by their owner. Deactivation is now reversible." },
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
