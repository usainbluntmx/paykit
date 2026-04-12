"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import dynamic from "next/dynamic";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

interface Agent {
  pda: string;
  name: string;
  owner: string;
  spendLimit: number;
  totalSpent: number;
  paymentCount: number;
  isActive: boolean;
  expiresAt: number;
}

interface Payment {
  agent: string;
  amount: number;
  memo: string;
  tx: string;
}

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
  const [paymentFilter, setPaymentFilter] = useState<"all" | "agent_to_agent" | "record_payment" | "register_agent">("all");
  const [auditPDA, setAuditPDA] = useState("");
  const [auditResult, setAuditResult] = useState<Agent | null>(null);
  const [auditError, setAuditError] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string>("");
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "ok" | "error" }[]>([]);
  const PAYMENTS_PER_PAGE = 3;

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
      const idlRes = await fetch(`/idl/paykit.json?v=${Date.now()}`);
      const idl = await idlRes.json();
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
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

  function openExplorer(tx: string) {
    window.open(`https://explorer.solana.com/tx/${tx}?cluster=devnet`, "_blank");
  }

  function showToast(message: string, type: "ok" | "error" = "ok") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  async function handleRegisterAgent() {
    if (!program || !wallet.publicKey || !agentName) return;
    setLoading(true);
    setStatus("REGISTERING AGENT...");
    setStatusType("loading");
    try {
      const agentPDA = getAgentPDA(wallet.publicKey, agentName);
      const limitLamports = parseFloat(spendLimit) * 1_000_000_000;
      const tx = await program.methods
        .registerAgent(agentName, new BN(limitLamports))
        .accounts({ agent: agentPDA, owner: wallet.publicKey, systemProgram: PublicKey.default })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      setStatus(`AGENT "${agentName.toUpperCase()}" REGISTERED`);
      setLastTx(tx);
      setStatusType("ok");
      showToast(`Agent "${agentName.toUpperCase()}" deployed`);
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
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      setStatus("PAYMENT CONFIRMED ONCHAIN");
      setLastTx(tx);
      setStatusType("ok");
      showToast("Payment confirmed onchain");
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
      const valid = all.filter((a: any) => {
        try { a.account.spendLimit.toNumber(); return true; } catch { return false; }
      });
      setAgents(valid.map((a: any) => ({
        pda: a.publicKey.toBase58(),
        name: a.account.name,
        owner: a.account.owner.toBase58(),
        spendLimit: a.account.spendLimit.toNumber(),
        totalSpent: a.account.totalSpent.toNumber(),
        paymentCount: a.account.paymentCount.toNumber(),
        isActive: a.account.isActive,
        expiresAt: a.account.expiresAt ? a.account.expiresAt.toNumber() : 0,
      })));
    } catch (e) { console.error(e); }
  }

  async function fetchPaymentHistory(prog?: Program) {
    const p = prog || program;
    if (!p || !wallet.publicKey) return;
    try {
      const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 50 });
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
        if (logs.some(l => l.includes("Instruction: AgentToAgentPayment"))) {
          history.push({ agent: "agent-to-agent", amount: 0, memo: "agent-to-agent payment", tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...` });
        } else if (logs.some(l => l.includes("Instruction: RecordPayment"))) {
          history.push({ agent: "manual payment", amount: 0, memo: "recorded payment", tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...` });
        } else if (logs.some(l => l.includes("Instruction: RegisterAgent"))) {
          history.push({ agent: "system", amount: 0, memo: "agent registered", tx: `[${timeStr}] ${sig.signature.slice(0, 16)}...` });
        }
      }
      setPayments(history);
    } catch (e) { console.error(e); }
  }

  async function fetchUsdcBalance() {
    if (!wallet.publicKey) return;
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      const balance = await connection.getTokenAccountBalance(ata);
      setUsdcBalance(balance.value.uiAmount || 0);
    } catch { setUsdcBalance(0); }
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
      const createATAIx = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        recipientATA,
        recipientPubkey,
        USDC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const transferIx = createTransferInstruction(senderATA, recipientATA, wallet.publicKey, amountLamports, [], TOKEN_PROGRAM_ID);
      const recordIx = await program.methods
        .recordPayment(new BN(amountLamports), recipientPubkey, usdcMemo)
        .accounts({ agent: agentPDA, owner: wallet.publicKey })
        .instruction();
      const tx = new Transaction().add(createATAIx, transferIx, recordIx);
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signed = await wallet.signTransaction!(tx);
      const txId = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(txId, "confirmed");
      setStatus(`USDC TRANSFER CONFIRMED · ${amountUSDC} USDC → ${usdcRecipient.slice(0, 8)}...`);
      setLastTx(txId);
      setStatusType("ok");
      showToast(`${amountUSDC} USDC sent`);
      setUsdcMemo("");
      setUsdcRecipient("");
      await fetchUsdcBalance();
      await fetchAgents(program);
      await fetchPaymentHistory(program);
    } catch (e: any) {
      if (e.message?.includes("TokenAccountNotFound") || e.message?.includes("AccountNotFound")) {
        setStatus("ERR: Recipient wallet has no USDC token account — creating it automatically...");
      } else {
        setStatus(`ERR: ${e.message?.slice(0, 60)}`);
      }
      setStatusType("error");
    }
    setLoading(false);
  }

  async function handleAgentToAgent() {
    if (!program || !wallet.publicKey || !a2aSender || !a2aReceiver || !a2aService) return;
    setLoading(true);
    setStatus("EXECUTING AGENT-TO-AGENT PAYMENT...");
    setStatusType("loading");
    try {
      const senderAgent = agents.find(a => a.name === a2aSender)!;
      const receiverAgent = agents.find(a => a.name === a2aReceiver)!;
      const tx = await program.methods
        .agentToAgentPayment(new BN(parseFloat(a2aAmount) * 1_000_000_000), a2aService)
        .accounts({ senderAgent: new PublicKey(senderAgent.pda), receiverAgent: new PublicKey(receiverAgent.pda), owner: wallet.publicKey })
        .rpc({ skipPreflight: true, commitment: "confirmed" });
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setA2aLog(prev => [{ time, sender: a2aSender, receiver: a2aReceiver, service: a2aService, amount: a2aAmount, tx: tx.slice(0, 16) + "..." }, ...prev]);
      setStatus(`AGENT PAYMENT CONFIRMED · ${a2aSender} → ${a2aReceiver}`);
      setLastTx(tx);
      setStatusType("ok");
      showToast(`${a2aSender} → ${a2aReceiver} confirmed`);
      setA2aService("");
      await fetchAgents(program);
      await fetchPaymentHistory(program);
    } catch (e: any) {
      setStatus(`ERR: ${e.message.slice(0, 60)}`);
      setStatusType("error");
    }
    setLoading(false);
  }

  async function handleAudit() {
    if (!program || !auditPDA) return;
    setAuditLoading(true);
    setAuditError("");
    setAuditResult(null);
    try {
      const agent = await (program.account as any).agentAccount.fetch(new PublicKey(auditPDA));
      setAuditResult({
        pda: auditPDA,
        name: agent.name,
        owner: agent.owner.toBase58(),
        spendLimit: agent.spendLimit.toNumber(),
        totalSpent: agent.totalSpent.toNumber(),
        paymentCount: agent.paymentCount.toNumber(),
        isActive: agent.isActive,
        expiresAt: agent.expiresAt ? agent.expiresAt.toNumber() : 0,
      });
    } catch { setAuditError("AGENT NOT FOUND OR INVALID PDA"); }
    setAuditLoading(false);
  }

  const statusColor = { idle: "#6aaa80", ok: "#00ff88", error: "#ff3c5a", loading: "#ffb800" }[statusType];

  const filteredPayments = payments.filter(p =>
    paymentFilter === "all" ||
    p.agent === paymentFilter.replace("record_payment", "manual payment").replace("register_agent", "system").replace("agent_to_agent", "agent-to-agent")
  );

  const card = {
    position: "relative" as const,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "20px",
  };

  const sectionTitle = {
    fontFamily: "'Orbitron', monospace",
    fontSize: "13px",
    color: "#00ff88",
    letterSpacing: "0.2em",
    marginBottom: "16px",
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "3px",
    fontSize: "15px",
  };

  const btnActive = {
    width: "100%",
    padding: "11px",
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.4)",
    color: "#00ff88",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "14px",
    letterSpacing: "0.15em",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const btnDisabled = {
    ...btnActive,
    background: "transparent",
    borderColor: "rgba(0,255,136,0.1)",
    color: "#3a6a4a",
    cursor: "not-allowed",
  };

  return (
    <main style={{ minHeight: "100vh", maxHeight: "100vh", overflow: "hidden", display: "grid", gridTemplateRows: "auto auto 1fr", padding: "24px 32px", maxWidth: "1400px", margin: "0 auto", gap: "0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid rgba(0,255,136,0.08)", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.05em", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>PAYKIT</span>
          </a>
          <a href="/docs" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "13px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>DOCS</span>
          </a>
          <span style={{ fontSize: "11px", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)", padding: "2px 8px", borderRadius: "2px", letterSpacing: "0.15em" }}>v0.1.0 DEVNET</span>
          <span style={{ fontSize: "13px", color: "#9aeab0", letterSpacing: "0.08em" }}>AUTONOMOUS AI AGENT PAYMENT PROTOCOL · SOLANA</span>
        </div>
        {mounted && <WalletMultiButton />}
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderLeft: `3px solid ${statusColor}`, borderRadius: "2px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: statusType === "loading" ? "pulse-green 1s infinite" : "none", flexShrink: 0 }} />
          <span style={{ fontSize: "13px", color: statusColor, letterSpacing: "0.1em" }}>{status}</span>
        </div>
        {lastTx && (
          <button
            onClick={() => openExplorer(lastTx)}
            style={{
              background: "transparent",
              border: "1px solid rgba(0,255,136,0.2)",
              color: "#9aeab0",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "2px",
              cursor: "pointer",
              letterSpacing: "0.1em",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.border = "1px solid rgba(0,255,136,0.5)")}
            onMouseOut={e => (e.currentTarget.style.border = "1px solid rgba(0,255,136,0.2)")}
          >
            VIEW ON EXPLORER ↗
          </button>
        )}
      </div>

      {/* Not connected */}
      {!wallet.connected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "4px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "15px", color: "#3a6a4a", letterSpacing: "0.2em", marginBottom: "8px" }}>NO WALLET DETECTED</div>
            <div style={{ fontSize: "13px", color: "#3a6a4a" }}>Connect your Phantom wallet to access the protocol</div>
          </div>
          {mounted && <WalletMultiButton />}
        </div>
      ) : (

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", overflow: "auto" }}>

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Register Agent + Record Payment en la misma fila */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* Register Agent */}
              <div className="card-corner" style={card}>
                <div style={sectionTitle}>// REGISTER AGENT</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input style={inputStyle} placeholder="agent-id (max 32 chars)" value={agentName} onChange={e => setAgentName(e.target.value)} />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="spend limit" type="number" value={spendLimit} onChange={e => setSpendLimit(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "13px" }}>SOL</span>
                  </div>
                  <button onClick={handleRegisterAgent} disabled={loading || !agentName} style={loading || !agentName ? btnDisabled : btnActive}>
                    {loading ? "PROCESSING..." : "DEPLOY AGENT"}
                  </button>
                </div>
              </div>

              {/* Record Payment */}
              <div className="card-corner" style={card}>
                <div style={sectionTitle}>// RECORD PAYMENT</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <select style={inputStyle} value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                    <option value="">select agent</option>
                    {agents.map(a => <option key={a.pda} value={a.name}>{a.name}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="amount" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "13px" }}>SOL</span>
                  </div>
                  <input style={inputStyle} placeholder="memo" value={paymentMemo} onChange={e => setPaymentMemo(e.target.value)} />
                  <button onClick={handleRecordPayment} disabled={loading || !selectedAgent || !paymentMemo} style={loading || !selectedAgent || !paymentMemo ? btnDisabled : btnActive}>
                    {loading ? "BROADCASTING..." : "SEND PAYMENT"}
                  </button>
                </div>
              </div>

            </div>

            {/* Registered Agents + Payment Log en la misma fila */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* Registered Agents */}
              <div className="card-corner" style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={sectionTitle}>// REGISTERED AGENTS</div>
                  <button onClick={() => fetchAgents()} style={{ background: "transparent", border: "none", color: "#9aeab0", fontSize: "12px", cursor: "pointer", letterSpacing: "0.1em", fontFamily: "'Share Tech Mono', monospace" }}>REFRESH</button>
                </div>
                {agents.length === 0 ? (
                  <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "16px 0" }}>NO AGENTS DEPLOYED</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {agents.map(a => (
                      <div key={a.pda} style={{ padding: "12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px", fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "#00ff88", fontWeight: 600 }}>{a.name}</span>
                          <span style={{ color: a.isActive ? "#00ff88" : "#ff3c5a", fontSize: "11px", animation: a.isActive ? "pulse-green 2s infinite" : "none" }}>● {a.isActive ? "ACTIVE" : "INACTIVE"}</span>
                        </div>
                        <div style={{ color: "#9aeab0", marginBottom: "6px", fontSize: "11px", cursor: "pointer", wordBreak: "break-all" }} onClick={() => navigator.clipboard.writeText(a.pda)} title="Click to copy PDA">
                          {a.pda}
                        </div>
                        <div style={{ display: "flex", gap: "10px", color: "#9aeab0", fontSize: "11px", flexWrap: "wrap" }}>
                          <span>LIMIT <span style={{ color: "#00cc6a" }}>{(a.spendLimit / 1e9).toFixed(2)} SOL</span></span>
                          <span>SPENT <span style={{ color: "#00cc6a" }}>{(a.totalSpent / 1e9).toFixed(4)} SOL</span></span>
                          <span>DAILY <span style={{ color: "#ffb800" }}>{(a.spendLimit / 1e9 / 10).toFixed(4)} SOL</span></span>
                          <span>TXS <span style={{ color: "#00cc6a" }}>{a.paymentCount}</span></span>
                          <span>EXPIRES <span style={{ color: a.expiresAt > 0 ? (a.expiresAt * 1000 > Date.now() ? "#6aaa80" : "#ff3c5a") : "#3a6a4a" }}>
                            {a.expiresAt > 0 ? new Date(a.expiresAt * 1000).toLocaleDateString() : "LEGACY"}
                          </span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Log */}
              <div className="card-corner" style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={sectionTitle}>// PAYMENT LOG</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["all", "agent_to_agent", "record_payment", "register_agent"] as const).map(f => (
                      <button key={f} onClick={() => { setPaymentFilter(f); setPaymentPage(0); }} style={{ background: paymentFilter === f ? "rgba(0,255,136,0.1)" : "transparent", border: "1px solid", borderColor: paymentFilter === f ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.1)", color: paymentFilter === f ? "#00ff88" : "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", padding: "3px 7px", borderRadius: "2px", cursor: "pointer" }}>
                        {f === "all" ? "ALL" : f === "agent_to_agent" ? "A2A" : f === "record_payment" ? "PAY" : "REG"}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredPayments.length === 0 ? (
                  <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "16px 0" }}>NO PAYMENTS RECORDED</div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {filteredPayments.slice(paymentPage * PAYMENTS_PER_PAGE, (paymentPage + 1) * PAYMENTS_PER_PAGE).map((p, i) => (
                        <div key={i} style={{ padding: "10px 12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px", fontSize: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ color: "#e8f5ee" }}>{p.memo}</span>
                            <span style={{ color: "#00ff88", fontSize: "11px" }}>{p.agent === "agent-to-agent" ? "A2A" : p.agent === "system" ? "SYS" : "PAY"}</span>
                          </div>
                          <div style={{ color: "#9aeab0", fontSize: "11px" }}>{p.tx}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(0,255,136,0.06)" }}>
                      <button onClick={() => setPaymentPage(p => Math.max(0, p - 1))} disabled={paymentPage === 0} style={{ background: "transparent", border: "1px solid", borderColor: paymentPage === 0 ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.3)", color: paymentPage === 0 ? "#3a6a4a" : "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "4px 10px", borderRadius: "3px", cursor: paymentPage === 0 ? "not-allowed" : "pointer" }}>← PREV</button>
                      <span style={{ color: "#9aeab0", fontSize: "11px" }}>PAGE {paymentPage + 1} / {Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE)}</span>
                      <button onClick={() => setPaymentPage(p => Math.min(Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE) - 1, p + 1))} disabled={(paymentPage + 1) * PAYMENTS_PER_PAGE >= filteredPayments.length} style={{ background: "transparent", border: "1px solid", borderColor: (paymentPage + 1) * PAYMENTS_PER_PAGE >= filteredPayments.length ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.3)", color: (paymentPage + 1) * PAYMENTS_PER_PAGE >= filteredPayments.length ? "#3a6a4a" : "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "4px 10px", borderRadius: "3px", cursor: (paymentPage + 1) * PAYMENTS_PER_PAGE >= filteredPayments.length ? "not-allowed" : "pointer" }}>NEXT →</button>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* USDC Transfer */}
            <div className="card-corner" style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={sectionTitle}>// USDC TRANSFER</div>
                <div style={{ fontSize: "12px", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)", padding: "3px 10px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace" }}>
                  {usdcBalance.toFixed(2)} USDC
                </div>
              </div>
              {agents.length === 0 ? (
                <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "16px 0" }}>DEPLOY AN AGENT TO ENABLE USDC TRANSFERS</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#9aeab0", fontSize: "11px", marginBottom: "5px", letterSpacing: "0.1em" }}>AGENT</div>
                      <select style={inputStyle} value={usdcAgent} onChange={e => setUsdcAgent(e.target.value)}>
                        <option value="">select agent</option>
                        {agents.map(a => <option key={a.pda} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#9aeab0", fontSize: "11px", marginBottom: "5px", letterSpacing: "0.1em" }}>RECIPIENT WALLET</div>
                      <input style={inputStyle} placeholder="wallet address (not agent PDA)" value={usdcRecipient} onChange={e => setUsdcRecipient(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="memo" value={usdcMemo} onChange={e => setUsdcMemo(e.target.value)} />
                    <input style={{ ...inputStyle, width: "90px" }} placeholder="amount" type="number" value={usdcAmount} onChange={e => setUsdcAmount(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "13px", alignSelf: "center" }}>USDC</span>
                  </div>
                  <button onClick={handleUsdcPayment} disabled={loading || !usdcAgent || !usdcRecipient || !usdcMemo} style={loading || !usdcAgent || !usdcRecipient || !usdcMemo ? btnDisabled : btnActive}>
                    {loading ? "PROCESSING..." : "SEND USDC"}
                  </button>
                </div>
              )}
            </div>

            {/* Agent to Agent */}
            <div className="card-corner" style={card}>
              <div style={sectionTitle}>// AGENT-TO-AGENT DEMO</div>
              {agents.length < 2 ? (
                <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "16px 0" }}>DEPLOY AT LEAST 2 AGENTS TO ENABLE AGENT-TO-AGENT PAYMENTS</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#9aeab0", fontSize: "11px", marginBottom: "5px" }}>SENDER</div>
                      <select style={inputStyle} value={a2aSender} onChange={e => setA2aSender(e.target.value)}>
                        <option value="">select sender</option>
                        {agents.filter(a => a.name !== a2aReceiver).map(a => <option key={a.pda} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                    <span style={{ color: "#00ff88", fontSize: "18px", opacity: a2aSender && a2aReceiver ? 1 : 0.2, paddingTop: "18px" }}>→</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#9aeab0", fontSize: "11px", marginBottom: "5px" }}>RECEIVER</div>
                      <select style={inputStyle} value={a2aReceiver} onChange={e => setA2aReceiver(e.target.value)}>
                        <option value="">select receiver</option>
                        {agents.filter(a => a.name !== a2aSender).map(a => <option key={a.pda} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="service description" value={a2aService} onChange={e => setA2aService(e.target.value)} />
                    <input style={{ ...inputStyle, width: "90px" }} placeholder="amount" type="number" value={a2aAmount} onChange={e => setA2aAmount(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "13px", alignSelf: "center" }}>SOL</span>
                  </div>
                  <button onClick={handleAgentToAgent} disabled={loading || !a2aSender || !a2aReceiver || !a2aService} style={loading || !a2aSender || !a2aReceiver || !a2aService ? btnDisabled : btnActive}>
                    {loading ? "EXECUTING..." : "EXECUTE AGENT-TO-AGENT PAYMENT"}
                  </button>
                  {a2aLog.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {a2aLog.slice(0, 3).map((entry, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.06)", borderRadius: "3px", fontSize: "12px", color: "#9aeab0" }}>
                          <span style={{ color: "#00ff88" }}>[{entry.time}]</span>{" "}
                          <span style={{ color: "#c8f0d8" }}>{entry.sender}</span>{" → "}
                          <span style={{ color: "#c8f0d8" }}>{entry.receiver}</span>{" · "}
                          {entry.service}{" · "}
                          <span style={{ color: "#00ff88" }}>{entry.amount} SOL</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audit Mode */}
            <div className="card-corner" style={card}>
              <div style={sectionTitle}>// AUDIT MODE — INSPECT ANY AGENT</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="agent PDA address" value={auditPDA} onChange={e => setAuditPDA(e.target.value)} />
                <button onClick={handleAudit} disabled={auditLoading || !auditPDA} style={{ padding: "10px 18px", background: auditLoading || !auditPDA ? "transparent" : "rgba(0,255,136,0.08)", border: "1px solid", borderColor: auditLoading || !auditPDA ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.4)", color: auditLoading || !auditPDA ? "#3a6a4a" : "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", borderRadius: "3px", cursor: auditLoading || !auditPDA ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                  {auditLoading ? "SCANNING..." : "INSPECT"}
                </button>
              </div>
              {auditError && <div style={{ marginTop: "10px", color: "#ff3c5a", fontSize: "13px" }}>{auditError}</div>}
              {auditResult && (
                <div style={{ marginTop: "12px", padding: "14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: "3px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ color: "#00ff88", fontSize: "15px", fontWeight: 600 }}>{auditResult.name}</span>
                    <span style={{ color: auditResult.isActive ? "#00ff88" : "#ff3c5a", fontSize: "12px" }}>● {auditResult.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", color: "#9aeab0", fontSize: "13px" }}>
                    <div>OWNER<div style={{ color: "#c8f0d8", marginTop: "3px", fontSize: "12px", wordBreak: "break-all" }}>{auditResult.owner.slice(0, 20)}...</div></div>
                    <div>PDA<div style={{ color: "#c8f0d8", marginTop: "3px", fontSize: "12px", wordBreak: "break-all" }}>{auditResult.pda.slice(0, 20)}...</div></div>
                    <div>SPEND LIMIT<div style={{ color: "#00ff88", marginTop: "3px" }}>{(auditResult.spendLimit / 1e9).toFixed(4)} SOL</div></div>
                    <div>TOTAL SPENT<div style={{ color: "#00ff88", marginTop: "3px" }}>{(auditResult.totalSpent / 1e9).toFixed(4)} SOL</div></div>
                    <div>PAYMENTS<div style={{ color: "#00ff88", marginTop: "3px" }}>{auditResult.paymentCount}</div></div>
                    <div>DAILY LIMIT<div style={{ color: "#ffb800", marginTop: "3px" }}>{(auditResult.spendLimit / 1e9 / 10).toFixed(4)} SOL</div></div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Activity Chart */}
      {wallet.connected && agents.length > 0 && (
        <div className="card-corner" style={{
          position: "relative",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "20px",
          marginTop: "16px",
        }}>
          <div style={sectionTitle}>// AGENT ACTIVITY</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agents.map(a => ({
              name: a.name.length > 10 ? a.name.slice(0, 10) + "..." : a.name,
              spent: parseFloat((a.totalSpent / 1e9).toFixed(4)),
              txs: a.paymentCount,
            }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#6aaa80", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}
                axisLine={{ stroke: "rgba(0,255,136,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6aaa80", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1410",
                  border: "1px solid rgba(0,255,136,0.2)",
                  borderRadius: "3px",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "12px",
                  color: "#00ff88",
                }}
                labelStyle={{ color: "#c8f0d8" }}
                cursor={{ fill: "rgba(0,255,136,0.05)" }}
              />
              <Bar dataKey="txs" name="Payments" radius={[2, 2, 0, 0]}>
                {agents.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#00ff88" : "#00cc6a"} opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "8px" }}>
            <span style={{ fontSize: "11px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>
              ■ <span style={{ color: "#00ff88" }}>PAYMENTS PER AGENT</span>
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(0,255,136,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <span style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em" }}>PAYKIT · ZERO TWO LABS · 2026</span>
        <span style={{ fontSize: "12px", color: "#6aaa80" }}>{PROGRAM_ID.toBase58().slice(0, 20)}...</span>
      </div>

      {/* Toasts */}
      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "12px 20px",
            background: t.type === "ok" ? "rgba(0,20,10,0.95)" : "rgba(20,0,5,0.95)",
            border: `1px solid ${t.type === "ok" ? "rgba(0,255,136,0.4)" : "rgba(255,60,90,0.4)"}`,
            borderLeft: `3px solid ${t.type === "ok" ? "#00ff88" : "#ff3c5a"}`,
            borderRadius: "3px",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "13px",
            color: t.type === "ok" ? "#00ff88" : "#ff3c5a",
            letterSpacing: "0.08em",
            boxShadow: `0 4px 20px ${t.type === "ok" ? "rgba(0,255,136,0.1)" : "rgba(255,60,90,0.1)"}`,
            animation: "fade-in-up 0.3s ease forwards",
            maxWidth: "320px",
          }}>
            {t.type === "ok" ? "✓ " : "✗ "}{t.message}
          </div>
        ))}
      </div>

    </main>
  );
}