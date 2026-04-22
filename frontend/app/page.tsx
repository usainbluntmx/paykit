"use client";

import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  return (
    <main style={{
      minHeight: "100vh",
      maxHeight: "100vh",
      overflow: "hidden",
      display: "grid",
      gridTemplateRows: "auto 1fr auto auto",
      padding: "36px 48px",
      maxWidth: "1400px",
      margin: "0 auto",
      gap: "0px",
    }}>

      {/* TOP */}
      <div style={{
        textAlign: "center",
        paddingBottom: "28px",
        borderBottom: "1px solid rgba(0,255,136,0.1)",
        animation: "fade-in-up 0.4s ease forwards",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "14px" }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "48px",
            fontWeight: 900,
            color: "#00ff88",
            letterSpacing: "0.06em",
            textShadow: "0 0 30px rgba(0,255,136,0.4)",
          }}>PAYKIT</span>
          <span style={{
            fontSize: "13px",
            color: "#00ff88",
            border: "1px solid rgba(0,255,136,0.4)",
            padding: "4px 12px",
            borderRadius: "2px",
            letterSpacing: "0.15em",
          }}>v0.2.0 · DEVNET</span>
        </div>
        <p style={{ fontSize: "20px", color: "#e8f5ee", marginBottom: "10px", fontWeight: 500 }}>
          The payments SDK for autonomous AI agents on Solana.
        </p>
        <p style={{ fontSize: "15px", color: "#c8f0d8", marginBottom: "24px" }}>
          On-chain identity · Enforced spend limits · Verifiable payment history · No human required.
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/demo")}
            style={{
              padding: "12px 36px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "15px",
              letterSpacing: "0.15em",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "rgba(0,255,136,0.15)")}
            onMouseOut={e => (e.currentTarget.style.background = "rgba(0,255,136,0.08)")}
          >
            LIVE DEMO →
          </button>
          <a href="/docs" style={{ padding: "11px 32px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>DOCS</a>
          <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer" style={{ padding: "12px 36px", background: "transparent", border: "1px solid rgba(0,255,136,0.3)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>GITHUB</a>
          <a href="/network" style={{ padding: "11px 32px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>NETWORK</a>
        </div>
      </div>

      {/* MIDDLE — Two columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
        padding: "32px 0 20px 0",
        overflow: "hidden",
      }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "14px" }}>
              // THE PROBLEM
            </div>
            <p style={{ fontSize: "15px", color: "#c8f0d8", lineHeight: 1.9 }}>
              AI agents are becoming autonomous — but they still can't pay for anything without asking a human first. No wallets. No spend limits. No payment history. The autonomous AI economy needs a payment layer.
            </p>
          </div>

          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "14px" }}>
              // THE SOLUTION
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { title: "AUTONOMOUS KEYPAIRS", desc: "Each agent has its own keypair and signs its own transactions." },
                { title: "SPEND LIMITS + BPS", desc: "Total and daily limits enforced at the protocol level." },
                { title: "CAPABILITIES", desc: "Granular permissions per agent — tier, category limits, custom caps." },
                { title: "AGENT-TO-AGENT", desc: "Agents pay agents autonomously. No owner involvement." },
              ].map((item) => (
                <div key={item.title} style={{
                  padding: "16px",
                  background: "rgba(0,255,136,0.03)",
                  border: "1px solid rgba(0,255,136,0.12)",
                  borderRadius: "3px",
                }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    {item.title}
                  </div>
                  <p style={{ fontSize: "14px", color: "#c8f0d8", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "14px" }}>
              // INTEGRATE IN MINUTES
            </div>
            <div style={{
              background: "#060a08",
              border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: "3px",
              padding: "22px",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "14px",
              lineHeight: 2,
            }}>
              <div style={{ color: "#9aeab0" }}>{"// install"}</div>
              <div style={{ color: "#e8f5ee" }}>{"npm install @paykit/sdk"}</div>
              <br />
              <div style={{ color: "#9aeab0" }}>{"// create autonomous agent"}</div>
              <div>
                <span style={{ color: "#00ff88" }}>{"await "}</span>
                <span style={{ color: "#e8f5ee" }}>{"client."}</span>
                <span style={{ color: "#00ff88" }}>{"createAutonomousAgent"}</span>
                <span style={{ color: "#e8f5ee" }}>{"("}</span>
              </div>
              <div style={{ paddingLeft: "20px" }}>
                <span style={{ color: "#ffb800" }}>{'"my-agent"'}</span>
                <span style={{ color: "#e8f5ee" }}>{", 1_000_000_000, 1000);"}</span>
              </div>
              <br />
              <div style={{ color: "#9aeab0" }}>{"// agent signs autonomously"}</div>
              <div>
                <span style={{ color: "#00ff88" }}>{"await "}</span>
                <span style={{ color: "#e8f5ee" }}>{"client."}</span>
                <span style={{ color: "#00ff88" }}>{"agentToAgentPayment"}</span>
                <span style={{ color: "#e8f5ee" }}>{"("}</span>
              </div>
              <div style={{ paddingLeft: "20px" }}>
                <span style={{ color: "#ffb800" }}>{'"agent-a"'}</span>
                <span style={{ color: "#e8f5ee" }}>{", "}</span>
                <span style={{ color: "#ffb800" }}>{'"agent-b"'}</span>
                <span style={{ color: "#e8f5ee" }}>{", 250_000,"}</span>
              </div>
              <div style={{ paddingLeft: "20px" }}>
                <span style={{ color: "#ffb800" }}>{'"inference task"'}</span>
                <span style={{ color: "#e8f5ee" }}>{", CATEGORIES.INFERENCE);"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* WHY SOLANA */}
      <div style={{
        borderTop: "1px solid rgba(0,255,136,0.08)",
        paddingTop: "20px",
        paddingBottom: "16px",
        animation: "fade-in-up 0.7s ease forwards",
      }}>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "16px", textAlign: "center" }}>
          // WHY SOLANA
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", border: "1px solid rgba(0,255,136,0.12)", borderRadius: "3px", overflow: "hidden", width: "560px" }}>
            {[
              { metric: "~400ms", label: "FINALITY" },
              { metric: "$0.00025", label: "PER TX" },
              { metric: "65K+ TPS", label: "THROUGHPUT" },
            ].map((item, i) => (
              <div key={item.label} style={{
                flex: 1,
                textAlign: "center",
                padding: "18px 12px",
                borderRight: i < 2 ? "1px solid rgba(0,255,136,0.08)" : "none",
                background: "rgba(0,255,136,0.02)",
              }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: 700, color: "#00ff88", textShadow: "0 0 16px rgba(0,255,136,0.3)", marginBottom: "6px" }}>
                  {item.metric}
                </div>
                <div style={{ fontSize: "12px", color: "#c8f0d8", letterSpacing: "0.12em" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        paddingTop: "16px",
        borderTop: "1px solid rgba(0,255,136,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "13px", color: "#c8f0d8", letterSpacing: "0.1em" }}>
          PAYKIT · ZERO TWO LABS · 2026
        </span>
        <span style={{ fontSize: "13px", color: "#c8f0d8" }}>
          SOLANA FRONTIER HACKATHON · <span style={{ color: "#00ff88" }}>F27DrerUQGnk...</span>
        </span>
      </div>

    </main>
  );
}