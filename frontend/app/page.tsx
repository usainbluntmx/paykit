"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Landing() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <main style={{ minHeight: "100vh", maxWidth: "900px", margin: "0 auto", padding: "64px 32px" }}>

      {/* Header */}
      <div style={{ marginBottom: "80px", animation: "fade-in-up 0.5s ease forwards" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "36px",
            fontWeight: 900,
            color: "#00ff88",
            letterSpacing: "0.05em",
            textShadow: "0 0 30px rgba(0,255,136,0.4)",
          }}>
            PAYKIT
          </span>
          <span style={{
            fontSize: "11px",
            color: "#00ff88",
            border: "1px solid rgba(0,255,136,0.3)",
            padding: "3px 10px",
            borderRadius: "2px",
            letterSpacing: "0.15em",
          }}>
            v0.1.0
          </span>
        </div>
        <p style={{
          fontSize: "20px",
          color: "#e8f5ee",
          lineHeight: 1.6,
          maxWidth: "600px",
          marginBottom: "12px",
        }}>
          The payments SDK for autonomous AI agents on Solana.
        </p>
        <p style={{ fontSize: "14px", color: "#6aaa80", lineHeight: 1.6, maxWidth: "560px" }}>
          PayKit gives AI agents an on-chain identity, enforced spend limits, and verifiable payment history — without human intervention.
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "12px 24px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "13px",
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

          <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer" style={{ padding: "12px 24px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", textDecoration: "none", transition: "all 0.2s", display: "inline-block" }}>GITHUB</a>
        </div>
      </div>

      {/* Problem */}
      <div style={{ marginBottom: "64px", animation: "fade-in-up 0.6s ease forwards" }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          color: "#00ff88",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          opacity: 0.7,
        }}>
          // THE PROBLEM
        </div>
        <p style={{ fontSize: "15px", color: "#6aaa80", lineHeight: 1.8, maxWidth: "640px" }}>
          AI agents are becoming autonomous. They browse the web, write code, and make decisions — but they still can't pay for anything without asking a human first.
          There is no standard protocol for agents to transact with each other. No wallets. No spend limits. No verifiable payment history.
        </p>
      </div>

      {/* Solution */}
      <div style={{ marginBottom: "64px", animation: "fade-in-up 0.7s ease forwards" }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          color: "#00ff88",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          opacity: 0.7,
        }}>
          // THE SOLUTION
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { title: "ON-CHAIN IDENTITY", desc: "Each agent gets a unique PDA on Solana — a verifiable identity tied to its owner." },
            { title: "SPEND LIMITS", desc: "Enforced by the smart contract. Agents cannot exceed their budget, ever." },
            { title: "PAYMENT HISTORY", desc: "Every transaction recorded immutably on Solana. Full audit trail, always." },
            { title: "AGENT-TO-AGENT", desc: "Agents pay other agents autonomously for services — no human required." },
          ].map((item) => (
            <div key={item.title} style={{
              padding: "20px",
              background: "rgba(0,255,136,0.02)",
              border: "1px solid rgba(0,255,136,0.1)",
              borderRadius: "4px",
            }}>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "10px",
                color: "#00ff88",
                letterSpacing: "0.15em",
                marginBottom: "10px",
              }}>
                {item.title}
              </div>
              <p style={{ fontSize: "13px", color: "#6aaa80", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Code Example */}
      <div style={{ marginBottom: "64px", animation: "fade-in-up 0.8s ease forwards" }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          color: "#00ff88",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          opacity: 0.7,
        }}>
          // INTEGRATE IN MINUTES
        </div>
        <div style={{
          background: "#060a08",
          border: "1px solid rgba(0,255,136,0.15)",
          borderRadius: "4px",
          padding: "24px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "13px",
          lineHeight: 1.8,
          overflowX: "auto",
        }}>
          <div style={{ color: "#3a6a4a" }}>{"// Install the SDK"}</div>
          <div style={{ color: "#6aaa80" }}>{"npm install @paykit/sdk"}</div>
          <br />
          <div style={{ color: "#3a6a4a" }}>{"// Register an AI agent"}</div>
          <div>
            <span style={{ color: "#00ff88" }}>{"const "}</span>
            <span style={{ color: "#e8f5ee" }}>{"client "}</span>
            <span style={{ color: "#00ff88" }}>{"= "}</span>
            <span style={{ color: "#6aaa80" }}>{"createClient(keypairPath);"}</span>
          </div>
          <div>
            <span style={{ color: "#00ff88" }}>{"await "}</span>
            <span style={{ color: "#e8f5ee" }}>{"client"}</span>
            <span style={{ color: "#6aaa80" }}>{"."}</span>
            <span style={{ color: "#00ff88" }}>{"registerAgent"}</span>
            <span style={{ color: "#e8f5ee" }}>{"("}</span>
            <span style={{ color: "#ffb800" }}>{'"my-agent"'}</span>
            <span style={{ color: "#e8f5ee" }}>{", 1_000_000_000);"}</span>
          </div>
          <br />
          <div style={{ color: "#3a6a4a" }}>{"// Agent pays another agent autonomously"}</div>
          <div>
            <span style={{ color: "#00ff88" }}>{"await "}</span>
            <span style={{ color: "#e8f5ee" }}>{"client"}</span>
            <span style={{ color: "#6aaa80" }}>{"."}</span>
            <span style={{ color: "#00ff88" }}>{"agentToAgentPayment"}</span>
            <span style={{ color: "#e8f5ee" }}>{"("}</span>
          </div>
          <div style={{ paddingLeft: "20px" }}>
            <span style={{ color: "#ffb800" }}>{'"agent-alpha"'}</span>
            <span style={{ color: "#e8f5ee" }}>{", "}</span>
            <span style={{ color: "#ffb800" }}>{'"agent-beta"'}</span>
            <span style={{ color: "#e8f5ee" }}>{", 250_000, "}</span>
            <span style={{ color: "#ffb800" }}>{'"API call"'}</span>
          </div>
          <div><span style={{ color: "#e8f5ee" }}>{")"}</span></div>
        </div>
      </div>

      {/* Why Solana */}
      <div style={{ marginBottom: "64px", animation: "fade-in-up 0.9s ease forwards" }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          color: "#00ff88",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          opacity: 0.7,
        }}>
          // WHY SOLANA
        </div>
        <div style={{ display: "flex", gap: "32px" }}>
          {[
            { metric: "~400ms", label: "Transaction finality" },
            { metric: "$0.00025", label: "Cost per transaction" },
            { metric: "65,000+", label: "TPS capacity" },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "24px",
                fontWeight: 700,
                color: "#00ff88",
                textShadow: "0 0 20px rgba(0,255,136,0.3)",
                marginBottom: "6px",
              }}>
                {item.metric}
              </div>
              <div style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: "32px",
        border: "1px solid rgba(0,255,136,0.2)",
        borderRadius: "4px",
        background: "rgba(0,255,136,0.02)",
        textAlign: "center",
        animation: "fade-in-up 1s ease forwards",
      }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "16px",
          color: "#00ff88",
          marginBottom: "12px",
          letterSpacing: "0.1em",
        }}>
          READY TO BUILD?
        </div>
        <p style={{ fontSize: "13px", color: "#6aaa80", marginBottom: "24px" }}>
          PayKit is open-source. Deploy your first agent in minutes.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "12px 32px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "13px",
              letterSpacing: "0.15em",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "rgba(0,255,136,0.15)")}
            onMouseOut={e => (e.currentTarget.style.background = "rgba(0,255,136,0.08)")}
          >
            LAUNCH DEMO
          </button>

          <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer" style={{ padding: "12px 32px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", textDecoration: "none", transition: "all 0.2s", display: "inline-block" }}>VIEW SOURCE</a>
        </div>
      </div >

      {/* Footer */}
      < div style={{
        marginTop: "64px",
        paddingTop: "16px",
        borderTop: "1px solid rgba(0,255,136,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }
      }>
        <span style={{ color: "#3a6a4a", fontSize: "11px", letterSpacing: "0.1em" }}>
          PAYKIT · ZERO TWO LABS · 2026
        </span>
        <span style={{ color: "#3a6a4a", fontSize: "11px" }}>
          SOLANA FRONTIER HACKATHON
        </span>
      </div >

    </main >
  );
}