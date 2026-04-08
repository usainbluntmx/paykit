"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  pda: string;
  name: string;
  owner: string;
  spendLimit: number;
  totalSpent: number;
  paymentCount: number;
  isActive: boolean;
}

interface Payment {
  agent: string;
  amount: number;
  memo: string;
  tx: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("AWAITING CONNECTION");
  const [statusType, setStatusType] = useState<"idle" | "ok" | "error" | "loading">("idle");
  const [agentName, setAgentName] = useState("");
  const [spendLimit, setSpendLimit] = useState("1");
  const [paymentMemo, setPaymentMemo] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("0.001");
  const [program, setProgram] = useState<Program | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setProgram(null);
      setAgents([]);
      setStatus("AWAITING CONNECTION");
      setStatusType("idle");
      return;
    }
    initProgram();
  }, [wallet.connected, wallet.publicKey]);

  async function initProgram() {
    try {
      setStatus("INITIALIZING...");
      setStatusType("loading");
      const idlRes = await fetch("/idl/paykit.json");
      const idl = await idlRes.json();
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const prog = new Program(idl, provider);
      setProgram(prog);
      setStatus("SYSTEM ONLINE");
      setStatusType("ok");
      await fetchAgents(prog);
    } catch (e: any) {
      setStatus(`ERR: ${e.message}`);
      setStatusType("error");
    }
  }

  function getAgentPDA(ownerPubkey: PublicKey, name: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), ownerPubkey.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    );
    return pda;
  }

  async function handleRegisterAgent() {
    if (!program || !wallet.publicKey || !agentName) return;
    setLoading(true);
    setStatus("REGISTERING AGENT...");
    setStatusType("loading");
    try {
      const agentPDA = getAgentPDA(wallet.publicKey, agentName);
      const limitLamports = parseFloat(spendLimit) * 1_000_000_000;
      await program.methods
        .registerAgent(agentName, new BN(limitLamports))
        .accounts({
          agent: agentPDA,
          owner: wallet.publicKey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      setStatus(`AGENT "${agentName.toUpperCase()}" REGISTERED`);
      setStatusType("ok");
      setAgentName("");
      await fetchAgents(program);
    } catch (e: any) {
      setStatus(`ERR: ${e.message.slice(0, 60)}`);
      setStatusType("error");
    }
    setLoading(false);
  }

  async function handleRecordPayment() {
    if (!program || !wallet.publicKey || !selectedAgent || !paymentMemo) return;
    setLoading(true);
    setStatus("BROADCASTING PAYMENT...");
    setStatusType("loading");
    try {
      const agentPDA = getAgentPDA(wallet.publicKey, selectedAgent);
      const amountLamports = parseFloat(paymentAmount) * 1_000_000_000;
      const tx = await program.methods
        .recordPayment(new BN(amountLamports), wallet.publicKey, paymentMemo)
        .accounts({ agent: agentPDA, owner: wallet.publicKey })
        .rpc();
      setPayments((prev) => [{
        agent: selectedAgent,
        amount: parseFloat(paymentAmount),
        memo: paymentMemo,
        tx: tx.slice(0, 20) + "...",
      }, ...prev]);
      setStatus("PAYMENT CONFIRMED ONCHAIN");
      setStatusType("ok");
      setPaymentMemo("");
      await fetchAgents(program);
    } catch (e: any) {
      setStatus(`ERR: ${e.message.slice(0, 60)}`);
      setStatusType("error");
    }
    setLoading(false);
  }

  async function fetchAgents(prog?: Program) {
    const p = prog || program;
    if (!p || !wallet.publicKey) return;
    try {
      const all = await (p.account as any).agentAccount.all([{
        memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() },
      }]);
      setAgents(all.map((a: any) => ({
        pda: a.publicKey.toBase58(),
        name: a.account.name,
        owner: a.account.owner.toBase58(),
        spendLimit: a.account.spendLimit.toNumber(),
        totalSpent: a.account.totalSpent.toNumber(),
        paymentCount: a.account.paymentCount.toNumber(),
        isActive: a.account.isActive,
      })));
    } catch (e) {
      console.error(e);
    }
  }

  const statusColor = {
    idle: "#4a7a5a",
    ok: "#00ff88",
    error: "#ff3c5a",
    loading: "#ffb800",
  }[statusType];

  return (
    <main style={{ minHeight: "100vh", padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px", animation: "fade-in-up 0.5s ease forwards" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "28px",
                fontWeight: 900,
                color: "#00ff88",
                letterSpacing: "0.05em",
                textShadow: "0 0 20px rgba(0,255,136,0.4)",
              }}>
                PAYKIT
              </span>
              <span style={{
                fontSize: "10px",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,0.3)",
                padding: "2px 8px",
                borderRadius: "2px",
                letterSpacing: "0.15em",
              }}>
                v0.1.0 DEVNET
              </span>
            </div>
            <p style={{ color: "#4a7a5a", fontSize: "12px", letterSpacing: "0.1em" }}>
              AUTONOMOUS AI AGENT PAYMENT PROTOCOL · SOLANA
            </p>
          </div>
          {mounted && <WalletMultiButton />}
        </div>

        {/* Status bar */}
        <div style={{
          marginTop: "20px",
          padding: "10px 16px",
          background: "rgba(0,255,136,0.03)",
          border: "1px solid rgba(0,255,136,0.1)",
          borderLeft: `3px solid ${statusColor}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          borderRadius: "2px",
        }}>
          <span style={{
            width: "6px", height: "6px",
            borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: statusType === "loading" ? "pulse-green 1s infinite" : "none",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", color: statusColor, letterSpacing: "0.1em" }}>
            {status}
          </span>
        </div>
      </div>

      {/* Not connected */}
      {!wallet.connected ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
          gap: "24px",
          border: "1px solid rgba(0,255,136,0.08)",
          borderRadius: "4px",
          background: "rgba(0,255,136,0.01)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "14px",
              color: "#2a4a35",
              letterSpacing: "0.2em",
              marginBottom: "8px",
            }}>
              NO WALLET DETECTED
            </div>
            <div style={{ fontSize: "11px", color: "#2a4a35" }}>
              Connect your Phantom wallet to access the protocol
            </div>
          </div>
          {mounted && <WalletMultiButton />}
        </div>
      ) : (

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Register Agent */}
          <div className="card-corner" style={{
            position: "relative",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px",
            animation: "fade-in-up 0.4s ease forwards",
          }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "11px",
              color: "#00ff88",
              letterSpacing: "0.2em",
              marginBottom: "20px",
              opacity: 0.7,
            }}>
              // REGISTER AGENT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                placeholder="agent-id (max 32 chars)"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  placeholder="spend limit"
                  type="number"
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(e.target.value)}
                />
                <span style={{ color: "#4a7a5a", fontSize: "12px", whiteSpace: "nowrap" }}>SOL</span>
              </div>
              <button
                onClick={handleRegisterAgent}
                disabled={loading || !agentName}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: loading || !agentName ? "transparent" : "rgba(0,255,136,0.08)",
                  border: "1px solid",
                  borderColor: loading || !agentName ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.4)",
                  color: loading || !agentName ? "#2a4a35" : "#00ff88",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "12px",
                  letterSpacing: "0.15em",
                  borderRadius: "3px",
                  cursor: loading || !agentName ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "PROCESSING..." : "DEPLOY AGENT"}
              </button>
            </div>
          </div>

          {/* Record Payment */}
          <div className="card-corner" style={{
            position: "relative",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px",
            animation: "fade-in-up 0.5s ease forwards",
          }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "11px",
              color: "#00ff88",
              letterSpacing: "0.2em",
              marginBottom: "20px",
              opacity: 0.7,
            }}>
              // RECORD PAYMENT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <select
                style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">select agent</option>
                {agents.map((a) => (
                  <option key={a.pda} value={a.name}>{a.name}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  placeholder="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <span style={{ color: "#4a7a5a", fontSize: "12px" }}>SOL</span>
              </div>
              <input
                style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                placeholder="memo"
                value={paymentMemo}
                onChange={(e) => setPaymentMemo(e.target.value)}
              />
              <button
                onClick={handleRecordPayment}
                disabled={loading || !selectedAgent || !paymentMemo}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: loading || !selectedAgent || !paymentMemo ? "transparent" : "rgba(0,255,136,0.08)",
                  border: "1px solid",
                  borderColor: loading || !selectedAgent || !paymentMemo ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.4)",
                  color: loading || !selectedAgent || !paymentMemo ? "#2a4a35" : "#00ff88",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "12px",
                  letterSpacing: "0.15em",
                  borderRadius: "3px",
                  cursor: loading || !selectedAgent || !paymentMemo ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "BROADCASTING..." : "SEND PAYMENT"}
              </button>
            </div>
          </div>

          {/* Agents List */}
          <div className="card-corner" style={{
            position: "relative",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px",
            animation: "fade-in-up 0.6s ease forwards",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "11px",
                color: "#00ff88",
                letterSpacing: "0.2em",
                opacity: 0.7,
              }}>
                // REGISTERED AGENTS
              </div>
              <button
                onClick={() => fetchAgents()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#4a7a5a",
                  fontSize: "11px",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                REFRESH
              </button>
            </div>
            {agents.length === 0 ? (
              <div style={{ color: "#2a4a35", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
                NO AGENTS DEPLOYED
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {agents.map((a) => (
                  <div key={a.pda} style={{
                    padding: "14px",
                    background: "rgba(0,255,136,0.02)",
                    border: "1px solid rgba(0,255,136,0.08)",
                    borderRadius: "3px",
                    fontSize: "12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#00ff88", fontWeight: 600 }}>{a.name}</span>
                      <span style={{
                        color: a.isActive ? "#00ff88" : "#ff3c5a",
                        fontSize: "10px",
                        animation: a.isActive ? "pulse-green 2s infinite" : "none",
                      }}>
                        ● {a.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div style={{ color: "#4a7a5a", marginBottom: "6px", fontSize: "11px" }}>
                      {a.pda.slice(0, 20)}...
                    </div>
                    <div style={{ display: "flex", gap: "16px", color: "#4a7a5a", fontSize: "11px" }}>
                      <span>LIMIT <span style={{ color: "#00cc6a" }}>{(a.spendLimit / 1e9).toFixed(2)} SOL</span></span>
                      <span>SPENT <span style={{ color: "#00cc6a" }}>{(a.totalSpent / 1e9).toFixed(4)} SOL</span></span>
                      <span>TXS <span style={{ color: "#00cc6a" }}>{a.paymentCount}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments List */}
          <div className="card-corner" style={{
            position: "relative",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px",
            animation: "fade-in-up 0.7s ease forwards",
          }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "11px",
              color: "#00ff88",
              letterSpacing: "0.2em",
              marginBottom: "20px",
              opacity: 0.7,
            }}>
              // PAYMENT LOG
            </div>
            {payments.length === 0 ? (
              <div style={{ color: "#2a4a35", fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
                NO PAYMENTS RECORDED
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {payments.map((p, i) => (
                  <div key={i} style={{
                    padding: "14px",
                    background: "rgba(0,255,136,0.02)",
                    border: "1px solid rgba(0,255,136,0.08)",
                    borderRadius: "3px",
                    fontSize: "12px",
                    animation: "fade-in-up 0.3s ease forwards",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#e8f5ee" }}>{p.memo}</span>
                      <span style={{ color: "#00ff88" }}>+{p.amount} SOL</span>
                    </div>
                    <div style={{ color: "#4a7a5a", fontSize: "11px", marginBottom: "4px" }}>
                      AGENT: {p.agent}
                    </div>
                    <div style={{ color: "#2a4a35", fontSize: "11px" }}>
                      TX: {p.tx}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: "48px",
        paddingTop: "16px",
        borderTop: "1px solid rgba(0,255,136,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ color: "#2a4a35", fontSize: "11px", letterSpacing: "0.1em" }}>
          PAYKIT · ZERO TWO LABS · 2026
        </span>
        <span style={{ color: "#2a4a35", fontSize: "11px", fontFamily: "'Share Tech Mono', monospace" }}>
          {PROGRAM_ID.toBase58().slice(0, 20)}...
        </span>
      </div>

    </main>
  );
}