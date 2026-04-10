"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import dynamic from "next/dynamic";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

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
  const [a2aSender, setA2aSender] = useState("");
  const [a2aReceiver, setA2aReceiver] = useState("");
  const [a2aService, setA2aService] = useState("");
  const [a2aAmount, setA2aAmount] = useState("0.001");
  const [a2aLog, setA2aLog] = useState<{ time: string; sender: string; receiver: string; service: string; amount: string; tx: string }[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [usdcRecipient, setUsdcRecipient] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("1");
  const [usdcMemo, setUsdcMemo] = useState("");
  const [usdcAgent, setUsdcAgent] = useState("");
  const [paymentPage, setPaymentPage] = useState(0);
  const PAYMENTS_PER_PAGE = 5;

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
      await fetchPaymentHistory(prog);
      await fetchUsdcBalance();
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
      await fetchPaymentHistory(program);
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

  async function fetchPaymentHistory(prog?: Program) {
    const p = prog || program;
    if (!p || !wallet.publicKey) return;
    try {
      const signatures = await connection.getSignaturesForAddress(
        PROGRAM_ID,
        { limit: 50 }
      );

      const history: Payment[] = [];

      for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        if (!tx?.meta?.logMessages) continue;

        const logs = tx.meta.logMessages;
        const time = new Date((tx.blockTime || 0) * 1000);
        const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}`;

        const isA2A = logs.some(l => l.includes("Instruction: AgentToAgentPayment"));
        const isRecord = logs.some(l => l.includes("Instruction: RecordPayment"));
        const isRegister = logs.some(l => l.includes("Instruction: RegisterAgent"));

        if (isA2A) {
          history.push({
            agent: "agent-to-agent",
            amount: 0,
            memo: "agent-to-agent payment",
            tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...`,
          });
        } else if (isRecord) {
          history.push({
            agent: "manual payment",
            amount: 0,
            memo: "recorded payment",
            tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...`,
          });
        } else if (isRegister) {
          history.push({
            agent: "system",
            amount: 0,
            memo: "agent registered",
            tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...`,
          });
        }
      }

      setPayments(history);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAgentToAgent() {
    if (!program || !wallet.publicKey || !a2aSender || !a2aReceiver || !a2aService) return;
    setLoading(true);
    setStatus("EXECUTING AGENT-TO-AGENT PAYMENT...");
    setStatusType("loading");
    try {
      const senderAgent = agents.find(a => a.name === a2aSender)!;
      const receiverAgent = agents.find(a => a.name === a2aReceiver)!;
      const senderPDA = new PublicKey(senderAgent.pda);
      const receiverPDA = new PublicKey(receiverAgent.pda);
      const amountLamports = parseFloat(a2aAmount) * 1_000_000_000;

      const tx = await program.methods
        .agentToAgentPayment(new BN(amountLamports), a2aService)
        .accounts({
          senderAgent: senderPDA,
          receiverAgent: receiverPDA,
          owner: wallet.publicKey,
        })
        .rpc();

      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setA2aLog(prev => [{
        time,
        sender: a2aSender,
        receiver: a2aReceiver,
        service: a2aService,
        amount: a2aAmount,
        tx: tx.slice(0, 16) + "...",
      }, ...prev]);

      setStatus(`AGENT PAYMENT CONFIRMED · ${a2aSender} → ${a2aReceiver}`);
      setStatusType("ok");
      setA2aService("");
      await fetchAgents(program);
      await fetchPaymentHistory(program);
    } catch (e: any) {
      setStatus(`ERR: ${e.message.slice(0, 60)}`);
      setStatusType("error");
    }
    setLoading(false);
  }

  async function fetchUsdcBalance() {
    if (!wallet.publicKey) return;
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      const balance = await connection.getTokenAccountBalance(ata);
      setUsdcBalance(balance.value.uiAmount || 0);
    } catch (e) {
      setUsdcBalance(0);
    }
  }

  async function handleUsdcPayment() {
    if (!program || !wallet.publicKey || !usdcRecipient || !usdcAgent || !usdcMemo) return;
    setLoading(true);
    setStatus("PREPARING USDC TRANSFER...");
    setStatusType("loading");
    try {
      const recipientPubkey = new PublicKey(usdcRecipient);
      const amountUSDC = parseFloat(usdcAmount);
      const amountLamports = Math.floor(amountUSDC * 1_000_000);

      const senderATA = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      const recipientATA = await getAssociatedTokenAddress(USDC_MINT, recipientPubkey);

      const agentPDA = getAgentPDA(wallet.publicKey, usdcAgent);

      const transferIx = createTransferInstruction(
        senderATA,
        recipientATA,
        wallet.publicKey,
        amountLamports,
        [],
        TOKEN_PROGRAM_ID
      );

      const recordIx = await program.methods
        .recordPayment(
          new BN(amountLamports),
          recipientPubkey,
          usdcMemo
        )
        .accounts({
          agent: agentPDA,
          owner: wallet.publicKey,
        })
        .instruction();

      const tx = new Transaction().add(transferIx, recordIx);
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await wallet.signTransaction!(tx);
      const txId = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(txId, "confirmed");

      setStatus(`USDC TRANSFER CONFIRMED · ${amountUSDC} USDC → ${usdcRecipient.slice(0, 8)}...`);
      setStatusType("ok");
      setUsdcMemo("");
      setUsdcRecipient("");
      await fetchUsdcBalance();
      await fetchAgents(program);
      await fetchPaymentHistory(program);
    } catch (e: any) {
      setStatus(`ERR: ${e.message.slice(0, 60)}`);
      setStatusType("error");
    }
    setLoading(false);
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
            <p style={{ color: "#4a7a5a", fontSize: "13px", letterSpacing: "0.1em" }}>
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
          <span style={{ fontSize: "13px", color: statusColor, letterSpacing: "0.1em" }}>
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
                  letterSpacing: "0.2em",
                  borderRadius: "3px",
                  cursor: loading || !agentName ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginBottom: "20px",
                  opacity: 1,
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
                  letterSpacing: "0.2em",
                  borderRadius: "3px",
                  cursor: loading || !selectedAgent || !paymentMemo ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginBottom: "20px",
                  opacity: 1,
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
              <div className="card-corner" style={{
                position: "relative",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "24px",
                animation: "fade-in-up 0.7s ease forwards",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "12px",
                    color: "#00ff88",
                    letterSpacing: "0.2em",
                    opacity: 1,
                  }}>
                // PAYMENT LOG
                  </div>
                  <span style={{ color: "#6aaa80", fontSize: "11px" }}>
                    {payments.length} TX TOTAL
                  </span>
                </div>
                {payments.length === 0 ? (
                  <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>
                    NO PAYMENTS RECORDED
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {payments
                        .slice(paymentPage * PAYMENTS_PER_PAGE, (paymentPage + 1) * PAYMENTS_PER_PAGE)
                        .map((p, i) => (
                          <div key={i} style={{
                            padding: "14px",
                            background: "rgba(0,255,136,0.02)",
                            border: "1px solid rgba(0,255,136,0.08)",
                            borderRadius: "3px",
                            fontSize: "13px",
                            animation: "fade-in-up 0.3s ease forwards",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ color: "#e8f5ee" }}>{p.memo}</span>
                              <span style={{ color: "#00ff88" }}>{p.agent === "agent-to-agent" ? "A2A" : p.agent === "system" ? "SYS" : "PAY"}</span>
                            </div>
                            <div style={{ color: "#6aaa80", fontSize: "12px", marginBottom: "4px" }}>
                              {p.agent.toUpperCase()}
                            </div>
                            <div style={{ color: "#3a6a4a", fontSize: "12px" }}>
                              {p.tx}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid rgba(0,255,136,0.06)",
                    }}>
                      <button
                        onClick={() => setPaymentPage(p => Math.max(0, p - 1))}
                        disabled={paymentPage === 0}
                        style={{
                          background: "transparent",
                          border: "1px solid",
                          borderColor: paymentPage === 0 ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.3)",
                          color: paymentPage === 0 ? "#3a6a4a" : "#00ff88",
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: "11px",
                          padding: "6px 12px",
                          borderRadius: "3px",
                          cursor: paymentPage === 0 ? "not-allowed" : "pointer",
                          letterSpacing: "0.1em",
                        }}
                      >
                        ← PREV
                      </button>
                      <span style={{ color: "#6aaa80", fontSize: "11px", letterSpacing: "0.1em" }}>
                        PAGE {paymentPage + 1} / {Math.ceil(payments.length / PAYMENTS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setPaymentPage(p => Math.min(Math.ceil(payments.length / PAYMENTS_PER_PAGE) - 1, p + 1))}
                        disabled={(paymentPage + 1) * PAYMENTS_PER_PAGE >= payments.length}
                        style={{
                          background: "transparent",
                          border: "1px solid",
                          borderColor: (paymentPage + 1) * PAYMENTS_PER_PAGE >= payments.length ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.3)",
                          color: (paymentPage + 1) * PAYMENTS_PER_PAGE >= payments.length ? "#3a6a4a" : "#00ff88",
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: "11px",
                          padding: "6px 12px",
                          borderRadius: "3px",
                          cursor: (paymentPage + 1) * PAYMENTS_PER_PAGE >= payments.length ? "not-allowed" : "pointer",
                          letterSpacing: "0.1em",
                        }}
                      >
                        NEXT →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* USDC Transfer */}
      <div className="card-corner" style={{
        position: "relative",
        gridColumn: "1 / -1",
        background: "var(--bg-card)",
        border: "1px solid rgba(0,255,136,0.2)",
        borderRadius: "4px",
        padding: "24px",
        animation: "fade-in-up 0.75s ease forwards",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "11px",
            color: "#00ff88",
            letterSpacing: "0.2em",
            opacity: 0.7,
          }}>
                // USDC TRANSFER
          </div>
          <div style={{
            fontSize: "11px",
            color: "#00ff88",
            border: "1px solid rgba(0,255,136,0.2)",
            padding: "4px 12px",
            borderRadius: "2px",
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            BALANCE: {usdcBalance.toFixed(2)} USDC
          </div>
        </div>

        {agents.length === 0 ? (
          <div style={{ color: "#2a4a35", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>
            DEPLOY AN AGENT TO ENABLE USDC TRANSFERS
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#4a7a5a", fontSize: "10px", marginBottom: "6px", letterSpacing: "0.1em" }}>AGENT</div>
                <select
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  value={usdcAgent}
                  onChange={(e) => setUsdcAgent(e.target.value)}
                >
                  <option value="">select agent</option>
                  {agents.map((a) => (
                    <option key={a.pda} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#4a7a5a", fontSize: "10px", marginBottom: "6px", letterSpacing: "0.1em" }}>RECIPIENT WALLET</div>
                <input
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  placeholder="recipient public key"
                  value={usdcRecipient}
                  onChange={(e) => setUsdcRecipient(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                style={{ flex: 1, padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                placeholder="memo"
                value={usdcMemo}
                onChange={(e) => setUsdcMemo(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  style={{ width: "100px", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  placeholder="amount"
                  type="number"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                />
                <span style={{ color: "#4a7a5a", fontSize: "12px" }}>USDC</span>
              </div>
            </div>
            <button
              onClick={handleUsdcPayment}
              disabled={loading || !usdcAgent || !usdcRecipient || !usdcMemo}
              style={{
                width: "100%",
                padding: "12px",
                background: loading || !usdcAgent || !usdcRecipient || !usdcMemo
                  ? "transparent"
                  : "rgba(0,255,136,0.08)",
                border: "1px solid",
                borderColor: loading || !usdcAgent || !usdcRecipient || !usdcMemo
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(0,255,136,0.4)",
                color: loading || !usdcAgent || !usdcRecipient || !usdcMemo
                  ? "#2a4a35"
                  : "#00ff88",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.15em",
                borderRadius: "3px",
                cursor: loading || !usdcAgent || !usdcRecipient || !usdcMemo ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {loading ? "PROCESSING..." : "SEND USDC"}
            </button>
          </div>
        )}
      </div>

      {/* Agent to Agent Demo */}
      <div className="card-corner" style={{
        position: "relative",
        gridColumn: "1 / -1",
        background: "var(--bg-card)",
        border: "1px solid rgba(0,255,136,0.2)",
        borderRadius: "4px",
        padding: "24px",
        animation: "fade-in-up 0.8s ease forwards",
      }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          color: "#00ff88",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          opacity: 0.7,
        }}>
              // AGENT-TO-AGENT DEMO
        </div>

        {agents.length < 2 ? (
          <div style={{ color: "#2a4a35", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>
            DEPLOY AT LEAST 2 AGENTS TO ENABLE AGENT-TO-AGENT PAYMENTS
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#4a7a5a", fontSize: "12px", marginBottom: "6px", letterSpacing: "0.1em" }}>SENDER AGENT</div>
                <select
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  value={a2aSender}
                  onChange={(e) => setA2aSender(e.target.value)}
                >
                  <option value="">select sender</option>
                  {agents.filter(a => a.name !== a2aReceiver).map((a) => (
                    <option key={a.pda} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div style={{
                color: "#00ff88",
                fontSize: "20px",
                opacity: a2aSender && a2aReceiver ? 1 : 0.2,
                transition: "opacity 0.3s",
                paddingTop: "20px",
              }}>→</div>

              <div style={{ flex: 1 }}>
                <div style={{ color: "#4a7a5a", fontSize: "12px", marginBottom: "6px", letterSpacing: "0.1em" }}>RECEIVER AGENT</div>
                <select
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  value={a2aReceiver}
                  onChange={(e) => setA2aReceiver(e.target.value)}
                >
                  <option value="">select receiver</option>
                  {agents.filter(a => a.name !== a2aSender).map((a) => (
                    <option key={a.pda} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <input
                style={{ flex: 1, padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                placeholder="service description"
                value={a2aService}
                onChange={(e) => setA2aService(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  style={{ width: "100px", padding: "10px 14px", borderRadius: "3px", fontSize: "13px" }}
                  placeholder="amount"
                  type="number"
                  value={a2aAmount}
                  onChange={(e) => setA2aAmount(e.target.value)}
                />
                <span style={{ color: "#4a7a5a", fontSize: "12px" }}>SOL</span>
              </div>
            </div>

            <button
              onClick={handleAgentToAgent}
              disabled={loading || !a2aSender || !a2aReceiver || !a2aService}
              style={{
                width: "100%",
                padding: "12px",
                background: loading || !a2aSender || !a2aReceiver || !a2aService
                  ? "transparent"
                  : "rgba(0,255,136,0.08)",
                border: "1px solid",
                borderColor: loading || !a2aSender || !a2aReceiver || !a2aService
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(0,255,136,0.4)",
                color: loading || !a2aSender || !a2aReceiver || !a2aService
                  ? "#2a4a35"
                  : "#00ff88",
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.15em",
                borderRadius: "3px",
                cursor: loading || !a2aSender || !a2aReceiver || !a2aService ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {loading ? "EXECUTING..." : "EXECUTE AGENT-TO-AGENT PAYMENT"}
            </button>

            {/* A2A Log */}
            {a2aLog.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {a2aLog.map((entry, i) => (
                  <div key={i} style={{
                    padding: "10px 14px",
                    background: "rgba(0,255,136,0.02)",
                    border: "1px solid rgba(0,255,136,0.06)",
                    borderRadius: "3px",
                    fontSize: "11px",
                    color: "#4a7a5a",
                    animation: "fade-in-up 0.3s ease forwards",
                  }}>
                    <span style={{ color: "#00ff88" }}>[{entry.time}]</span>{" "}
                    <span style={{ color: "#00cc6a" }}>{entry.sender}</span>
                    {" → "}
                    <span style={{ color: "#00cc6a" }}>{entry.receiver}</span>
                    {" · "}
                    {entry.service}
                    {" · "}
                    <span style={{ color: "#00ff88" }}>{entry.amount} SOL</span>
                    {" · TX: "}
                    {entry.tx}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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