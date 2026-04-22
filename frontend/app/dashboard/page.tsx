"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import dynamic from "next/dynamic";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { QRCodeSVG } from "qrcode.react";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const AGENT_ACCOUNT_SIZE = 371;
const OWNER_OFFSET = 8 + 32;

const CAP_ALL_DEFAULT = 0b01111111;
const TIER_LABELS = ["BASIC", "STANDARD", "PREMIUM"];
const TIER_COLORS = ["#6aaa80", "#00ff88", "#ffb800"];

const CAP_LABELS: Record<string, string> = {
  canPayAgents: "PAY AGENTS",
  canHireBasic: "HIRE BASIC",
  canHireStandard: "HIRE STANDARD",
  canHirePremium: "HIRE PREMIUM",
  canTransferSOL: "TRANSFER SOL",
  canTransferSPL: "TRANSFER SPL",
  canBatchPay: "BATCH PAY",
};

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useWindowSize() {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    function update() { setWidth(window.innerWidth); }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  pda: string;
  agentKey: string;
  name: string;
  owner: string;
  spendLimit: number;
  totalSpent: number;
  paymentCount: number;
  isActive: boolean;
  expiresAt: number;
  dailyLimitBps: number;
  capabilities: number;
  tier: number;
}

interface Payment {
  type: "a2a" | "pay" | "reg";
  time: string;
  sig: string;
}

// ─── Capability decoder ───────────────────────────────────────────────────────

function decodeCapabilities(caps: number) {
  return {
    canPayAgents: !!(caps & (1 << 0)),
    canHireBasic: !!(caps & (1 << 1)),
    canHireStandard: !!(caps & (1 << 2)),
    canHirePremium: !!(caps & (1 << 3)),
    canTransferSOL: !!(caps & (1 << 4)),
    canTransferSPL: !!(caps & (1 << 5)),
    canBatchPay: !!(caps & (1 << 6)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 768;

  const [program, setProgram] = useState<Program | null>(null);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("AWAITING CONNECTION");
  const [statusType, setStatusType] = useState<"idle" | "ok" | "error" | "loading">("idle");
  const [lastTx, setLastTx] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "ok" | "error" }[]>([]);

  // Data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const AGENTS_PER_PAGE = 4;
  const [agentPage, setAgentPage] = useState(0);

  // Deploy agent
  const [agentName, setAgentName] = useState("");
  const [spendLimit, setSpendLimit] = useState("1");
  const [dailyLimitBps, setDailyLimitBps] = useState("1000");
  const [fundingSOL, setFundingSOL] = useState("0.05");
  const [agentTier, setAgentTier] = useState(0);
  const [agentCaps, setAgentCaps] = useState(CAP_ALL_DEFAULT);
  const [showCapsPanel, setShowCapsPanel] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);

  // A2A
  const [a2aSender, setA2aSender] = useState("");
  const [a2aReceiver, setA2aReceiver] = useState("");
  const [a2aService, setA2aService] = useState("");
  const [a2aAmount, setA2aAmount] = useState("0.001");
  const [a2aCategory, setA2aCategory] = useState(0);
  const [a2aLog, setA2aLog] = useState<{ time: string; sender: string; receiver: string; service: string; amount: string; sig: string }[]>([]);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  // QR
  const [qrAgent, setQrAgent] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setProgram(null); setAgents([]);
      setStatus("AWAITING CONNECTION"); setStatusType("idle");
      return;
    }
    initProgram();
  }, [wallet.connected, wallet.publicKey]);

  // ─── Init ──────────────────────────────────────────────────────────────────

  async function initProgram() {
    try {
      setStatus("INITIALIZING..."); setStatusType("loading");
      const idlRes = await fetch(`/idl/paykit.json?v=${Date.now()}`);
      const idl = await idlRes.json();
      const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
      const prog = new Program(idl, provider);
      setProgram(prog);
      setStatus("SYSTEM ONLINE"); setStatusType("ok");
      await fetchAgents(prog);
      await fetchPaymentHistory();
    } catch (e: any) {
      setStatus(`ERR: ${e.message?.slice(0, 60)}`); setStatusType("error");
    }
  }

  function getAgentPDA(agentPublicKey: PublicKey, name: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), agentPublicKey.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    );
    return pda;
  }

  function showToast(message: string, type: "ok" | "error" = "ok") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  function openExplorer(sig: string) {
    window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, "_blank");
  }

  function loadBrowserAgentKeypair(name: string): Keypair | null {
    try {
      const stored = JSON.parse(localStorage.getItem("paykit_agents") || "{}");
      if (!stored[name]) return null;
      return Keypair.fromSecretKey(Uint8Array.from(stored[name]));
    } catch { return null; }
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchAgents(prog?: Program) {
    const p = prog || program;
    if (!p || !wallet.publicKey) return;
    try {
      const all = await (p.account as any).agentAccount.all([
        { dataSize: AGENT_ACCOUNT_SIZE },
        { memcmp: { offset: OWNER_OFFSET, bytes: wallet.publicKey.toBase58() } },
      ]);
      const valid = all.filter((a: any) => {
        try {
          a.account.spendLimit.toNumber();
          a.account.expiresAt.toNumber();
          return a.account.capabilities !== undefined && a.account.capabilities !== null;
        } catch { return false; }
      });
      setAgents(valid.map((a: any) => ({
        pda: a.publicKey.toBase58(),
        agentKey: a.account.agentKey.toBase58(),
        name: a.account.name,
        owner: a.account.owner.toBase58(),
        spendLimit: a.account.spendLimit.toNumber(),
        totalSpent: a.account.totalSpent.toNumber(),
        paymentCount: a.account.paymentCount.toNumber(),
        isActive: a.account.isActive,
        expiresAt: a.account.expiresAt.toNumber(),
        dailyLimitBps: a.account.dailyLimitBps,
        capabilities: a.account.capabilities,
        tier: a.account.tier,
      })));
    } catch (e) { console.error(e); }
  }

  async function fetchPaymentHistory() {
    try {
      const sigs = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 30 });
      const history: Payment[] = [];
      for (const sig of sigs) {
        const tx = await connection.getParsedTransaction(sig.signature, {
          commitment: "confirmed", maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta?.logMessages) continue;
        const logs = tx.meta.logMessages;
        const time = new Date((tx.blockTime || 0) * 1000);
        const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
        if (logs.some(l => l.includes("Instruction: AgentToAgentPayment")))
          history.push({ type: "a2a", time: timeStr, sig: sig.signature });
        else if (logs.some(l => l.includes("Instruction: RecordPayment")))
          history.push({ type: "pay", time: timeStr, sig: sig.signature });
        else if (logs.some(l => l.includes("Instruction: RegisterAgent")))
          history.push({ type: "reg", time: timeStr, sig: sig.signature });
      }
      setPayments(history);
    } catch (e) { console.error(e); }
  }

  // ─── Deploy Agent ──────────────────────────────────────────────────────────

  async function handleDeployAgent() {
    if (!program || !wallet.publicKey || !agentName) return;
    setLoading(true); setStatus("GENERATING KEYPAIR..."); setStatusType("loading");
    try {
      const agentKeypair = Keypair.generate();
      const agentPDA = getAgentPDA(agentKeypair.publicKey, agentName);
      const limitLamports = parseFloat(spendLimit) * 1_000_000_000;
      const fundLamports = parseFloat(fundingSOL) * 1_000_000_000;
      const bps = Math.min(10000, Math.max(1, parseInt(dailyLimitBps) || 1000));

      setStatus("DEPLOYING AGENT...");
      const tx = await program.methods
        .registerAgent(agentName, new BN(limitLamports), bps, new BN(fundLamports), agentCaps, agentTier)
        .accounts({ agent: agentPDA, agentSigner: agentKeypair.publicKey, owner: wallet.publicKey, systemProgram: PublicKey.default })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      const stored = JSON.parse(localStorage.getItem("paykit_agents") || "{}");
      stored[agentName] = Array.from(agentKeypair.secretKey);
      localStorage.setItem("paykit_agents", JSON.stringify(stored));

      setLastTx(tx); setStatus(`AGENT "${agentName.toUpperCase()}" DEPLOYED`); setStatusType("ok");
      showToast(`"${agentName}" deployed · ${TIER_LABELS[agentTier]}`);
      setAgentName(""); setShowDeploy(false);
      await fetchAgents(program);
      await fetchPaymentHistory();
    } catch (e: any) {
      setStatus(`ERR: ${e.message?.slice(0, 60)}`); setStatusType("error");
      showToast(e.message?.slice(0, 50), "error");
    }
    setLoading(false);
  }

  // ─── A2A Payment ───────────────────────────────────────────────────────────

  async function handleA2A() {
    if (!program || !a2aSender || !a2aReceiver || !a2aService) return;
    setLoading(true); setStatus("EXECUTING A2A..."); setStatusType("loading");
    try {
      const senderKeypair = loadBrowserAgentKeypair(a2aSender);
      const receiverAgent = agents.find(a => a.name === a2aReceiver)!;
      if (!senderKeypair) throw new Error(`Keypair not found for "${a2aSender}"`);
      const senderPDA = getAgentPDA(senderKeypair.publicKey, a2aSender);
      const receiverPDA = new PublicKey(receiverAgent.pda);

      const ix = await program.methods
        .agentToAgentPayment(new BN(parseFloat(a2aAmount) * 1_000_000_000), a2aService, a2aCategory)
        .accounts({ senderAgent: senderPDA, receiverAgent: receiverPDA, agentSigner: senderKeypair.publicKey })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = senderKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(senderKeypair);
      const txId = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(txId, "confirmed");

      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setA2aLog(prev => [{ time, sender: a2aSender, receiver: a2aReceiver, service: a2aService, amount: a2aAmount, sig: txId }, ...prev.slice(0, 4)]);
      setLastTx(txId); setStatus(`A2A CONFIRMED · ${a2aSender} → ${a2aReceiver}`); setStatusType("ok");
      showToast(`${a2aSender} → ${a2aReceiver} · agent signed`);
      setA2aService(""); setEstimatedFee(null);
      await fetchAgents(program);
      await fetchPaymentHistory();
    } catch (e: any) {
      setStatus(`ERR: ${e.message?.slice(0, 60)}`); setStatusType("error");
      showToast(e.message?.slice(0, 50), "error");
    }
    setLoading(false);
  }

  // ─── Estimate Fee ──────────────────────────────────────────────────────────

  async function handleEstimateFee() {
    if (!program || !a2aSender || !a2aReceiver) return;
    setFeeLoading(true); setEstimatedFee(null);
    try {
      const senderKeypair = loadBrowserAgentKeypair(a2aSender);
      if (!senderKeypair) throw new Error(`Keypair not found for "${a2aSender}"`);
      const receiverAgent = agents.find(a => a.name === a2aReceiver);
      if (!receiverAgent) throw new Error("Select a receiver first");

      const ix = await program.methods
        .agentToAgentPayment(new BN(parseFloat(a2aAmount) * 1_000_000_000), a2aService || "estimate", a2aCategory)
        .accounts({ senderAgent: getAgentPDA(senderKeypair.publicKey, a2aSender), receiverAgent: new PublicKey(receiverAgent.pda), agentSigner: senderKeypair.publicKey })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = senderKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(senderKeypair);

      const fee = await connection.getFeeForMessage(tx.compileMessage(), "confirmed");
      const lamports = fee.value ?? 5000;
      setEstimatedFee(`~${lamports} lamports (~${(lamports / 1e9).toFixed(6)} SOL)`);
    } catch (e: any) {
      setEstimatedFee(`ERR: ${e.message?.slice(0, 50)}`);
    }
    setFeeLoading(false);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async function handleRenew(name: string) {
    if (!program || !wallet.publicKey) return;
    try {
      const agent = agents.find(a => a.name === name)!;
      const tx = await program.methods.renewAgent(new BN(31_536_000))
        .accounts({ agent: getAgentPDA(new PublicKey(agent.agentKey), name), owner: wallet.publicKey })
        .rpc({ skipPreflight: true });
      setLastTx(tx); showToast(`${name} renewed +365d`);
      await fetchAgents(program);
    } catch (e: any) { showToast(e.message?.slice(0, 50), "error"); }
  }

  async function handleToggleActive(name: string, active: boolean) {
    if (!program || !wallet.publicKey) return;
    try {
      const agent = agents.find(a => a.name === name)!;
      const agentPDA = getAgentPDA(new PublicKey(agent.agentKey), name);
      const tx = active
        ? await program.methods.deactivateAgent().accounts({ agent: agentPDA, owner: wallet.publicKey }).rpc({ skipPreflight: true })
        : await program.methods.reactivateAgent().accounts({ agent: agentPDA, owner: wallet.publicKey }).rpc({ skipPreflight: true });
      setLastTx(tx);
      showToast(`${name} ${active ? "deactivated" : "reactivated"}`, active ? "error" : "ok");
      await fetchAgents(program);
    } catch (e: any) { showToast(e.message?.slice(0, 50), "error"); }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const statusColor = { idle: "#6aaa80", ok: "#00ff88", error: "#ff3c5a", loading: "#ffb800" }[statusType];
  const pagedAgents = agents.slice(agentPage * AGENTS_PER_PAGE, (agentPage + 1) * AGENTS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(agents.length / AGENTS_PER_PAGE));

  // ─── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    position: "relative",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: isMobile ? "16px" : "24px",
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Orbitron', monospace",
    fontSize: "12px",
    color: "#00ff88",
    letterSpacing: "0.2em",
    marginBottom: "18px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 13px",
    borderRadius: "3px",
    fontSize: "14px",
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "11px",
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.4)",
    color: "#00ff88",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "13px", letterSpacing: "0.15em",
    borderRadius: "3px", cursor: "pointer",
  };

  const btnOff: React.CSSProperties = {
    ...btnPrimary,
    background: "transparent",
    borderColor: "rgba(0,255,136,0.1)",
    color: "#3a6a4a", cursor: "not-allowed",
  };

  const btnSmall = (color = "rgba(0,255,136,0.15)", textColor = "#6aaa80"): React.CSSProperties => ({
    background: "transparent",
    border: `1px solid ${color}`,
    color: textColor,
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "10px", padding: "3px 9px",
    borderRadius: "2px", cursor: "pointer",
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", padding: isMobile ? "14px 16px" : "24px 36px", maxWidth: "1300px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingBottom: "16px", borderBottom: "1px solid rgba(0,255,136,0.08)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "20px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.06em", textShadow: "0 0 20px rgba(0,255,136,0.35)" }}>PAYKIT</span>
          </a>
          <a href="/network" style={{ textDecoration: "none" }}><span style={{ fontSize: "12px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>NETWORK</span></a>
          <a href="/docs" style={{ textDecoration: "none" }}><span style={{ fontSize: "12px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>DOCS</span></a>
          <span style={{ fontSize: "11px", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)", padding: "2px 8px", borderRadius: "2px", letterSpacing: "0.12em" }}>v0.2.0 · DEVNET</span>
        </div>
        {mounted && <WalletMultiButton />}
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.07)", borderLeft: `3px solid ${statusColor}`, borderRadius: "2px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: statusType === "loading" ? "pulse-green 1s infinite" : "none", flexShrink: 0 }} />
          <span style={{ fontSize: "12px", color: statusColor, letterSpacing: "0.1em" }}>{status}</span>
        </div>
        {lastTx && (
          <button onClick={() => openExplorer(lastTx)} style={{ background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "3px 10px", borderRadius: "2px", cursor: "pointer", letterSpacing: "0.08em" }}>
            EXPLORER ↗
          </button>
        )}
      </div>

      {/* Not connected */}
      {!wallet.connected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "4px", minHeight: "260px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", color: "#3a6a4a", letterSpacing: "0.2em", marginBottom: "8px" }}>NO WALLET DETECTED</div>
            <div style={{ fontSize: "13px", color: "#3a6a4a" }}>Connect your Phantom wallet to access the protocol</div>
          </div>
          {mounted && <WalletMultiButton />}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* ── ROW 1: Agents ─────────────────────────────────────────────── */}
          <div className="card-corner" style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={sectionTitle}>// REGISTERED AGENTS</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => fetchAgents()} style={btnSmall()}>↻ REFRESH</button>
                <button onClick={() => setShowDeploy(v => !v)} style={btnSmall("rgba(0,255,136,0.35)", "#00ff88")}>
                  {showDeploy ? "CANCEL" : "+ DEPLOY AGENT"}
                </button>
              </div>
            </div>

            {/* Deploy form — inline collapsible */}
            {showDeploy && (
              <div style={{ padding: "20px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: "3px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                  <input style={inputStyle} placeholder="agent-id (max 32 chars)" value={agentName} onChange={e => setAgentName(e.target.value)} />
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="spend limit" type="number" value={spendLimit} onChange={e => setSpendLimit(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "12px", whiteSpace: "nowrap" }}>SOL</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="fund wallet" type="number" value={fundingSOL} onChange={e => setFundingSOL(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "12px", whiteSpace: "nowrap" }}>SOL</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="daily limit" type="number" value={dailyLimitBps} onChange={e => setDailyLimitBps(e.target.value)} />
                    <span style={{ color: "#9aeab0", fontSize: "12px" }}>BPS ({(parseInt(dailyLimitBps || "0") / 100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {TIER_LABELS.map((t, i) => (
                      <button key={i} onClick={() => setAgentTier(i)} style={{ flex: 1, padding: "6px", background: agentTier === i ? `${TIER_COLORS[i]}15` : "transparent", border: `1px solid ${agentTier === i ? TIER_COLORS[i] : "rgba(0,255,136,0.1)"}`, color: agentTier === i ? TIER_COLORS[i] : "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", borderRadius: "2px", cursor: "pointer", letterSpacing: "0.08em" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button onClick={() => setShowCapsPanel(v => !v)} style={{ background: "transparent", border: "1px solid rgba(0,255,136,0.12)", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "6px 12px", borderRadius: "2px", cursor: "pointer" }}>
                    CAPABILITIES · {[0,1,2,3,4,5,6].filter(i => agentCaps & (1 << i)).length}/7
                  </button>
                  <button onClick={handleDeployAgent} disabled={loading || !agentName} style={{ ...(loading || !agentName ? btnOff : btnPrimary), width: "auto", padding: "8px 24px" }}>
                    {loading ? "DEPLOYING..." : "DEPLOY"}
                  </button>
                </div>
                {showCapsPanel && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                    {Object.entries(CAP_LABELS).map(([key, label], i) => {
                      const bit = 1 << i;
                      const active = !!(agentCaps & bit);
                      return (
                        <button key={key} onClick={() => setAgentCaps(c => active ? c & ~bit : c | bit)} style={{ background: active ? "rgba(0,255,136,0.1)" : "transparent", border: `1px solid ${active ? "rgba(0,255,136,0.35)" : "rgba(0,255,136,0.1)"}`, color: active ? "#00ff88" : "#3a6a4a", fontFamily: "'Share Tech Mono', monospace", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}>
                          {active ? "✓ " : ""}{label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Agent grid */}
            {agents.length === 0 ? (
              <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "32px 0" }}>
                NO AGENTS DEPLOYED · click + DEPLOY AGENT to get started
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                  {pagedAgents.map(a => {
                    const decoded = decodeCapabilities(a.capabilities);
                    const spendPct = Math.min(100, (a.totalSpent / a.spendLimit) * 100);
                    const expired = a.expiresAt * 1000 < Date.now();
                    return (
                      <div key={a.pda} style={{ padding: "16px", background: "rgba(0,255,136,0.02)", border: `1px solid ${a.isActive && !expired ? "rgba(0,255,136,0.1)" : "rgba(255,60,90,0.12)"}`, borderRadius: "3px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88" }}>{a.name}</span>
                            <span style={{ fontSize: "9px", color: TIER_COLORS[a.tier], border: `1px solid ${TIER_COLORS[a.tier]}40`, padding: "1px 5px", borderRadius: "2px" }}>{TIER_LABELS[a.tier]}</span>
                          </div>
                          <span style={{ fontSize: "11px", color: a.isActive && !expired ? "#00ff88" : "#ff3c5a", animation: a.isActive && !expired ? "pulse-green 2s infinite" : "none" }}>
                            ● {expired ? "EXPIRED" : a.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", fontSize: "11px", color: "#9aeab0", marginBottom: "10px" }}>
                          <div>LIMIT <span style={{ color: "#00cc6a" }}>{(a.spendLimit / 1e9).toFixed(2)} SOL</span></div>
                          <div>SPENT <span style={{ color: "#00cc6a" }}>{(a.totalSpent / 1e9).toFixed(4)} SOL</span></div>
                          <div>TXS <span style={{ color: "#00cc6a" }}>{a.paymentCount}</span></div>
                          <div>DAILY <span style={{ color: "#ffb800" }}>{(a.dailyLimitBps / 100).toFixed(0)}%</span></div>
                        </div>
                        <div style={{ height: "2px", background: "rgba(0,255,136,0.07)", borderRadius: "2px", marginBottom: "10px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${spendPct}%`, background: spendPct > 80 ? "#ff3c5a" : spendPct > 50 ? "#ffb800" : "#00ff88", borderRadius: "2px" }} />
                        </div>
                        <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {Object.entries(decoded).map(([key, active]) => (
                            <span key={key} style={{ fontSize: "9px", padding: "2px 5px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace", background: active ? "rgba(0,255,136,0.07)" : "transparent", border: `1px solid ${active ? "rgba(0,255,136,0.2)" : "rgba(0,255,136,0.05)"}`, color: active ? "#9aeab0" : "#2a4a3a" }}>
                              {CAP_LABELS[key]}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: "10px", color: "#4a7a5a", marginBottom: "10px", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace" }}
                          onClick={() => { navigator.clipboard.writeText(a.agentKey); showToast("Address copied"); }}
                          title="Click to copy">
                          {a.agentKey.slice(0, 14)}...{a.agentKey.slice(-4)}
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button onClick={() => handleRenew(a.name)} style={btnSmall()}>RENEW</button>
                          <button onClick={() => handleToggleActive(a.name, a.isActive)} style={btnSmall(a.isActive ? "rgba(255,60,90,0.2)" : "rgba(255,184,0,0.2)", a.isActive ? "#ff3c5a" : "#ffb800")}>
                            {a.isActive ? "DEACTIVATE" : "REACTIVATE"}
                          </button>
                          <button onClick={() => setQrAgent(a.name)} style={btnSmall()}>QR</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(0,255,136,0.06)" }}>
                    <button onClick={() => setAgentPage(p => Math.max(0, p - 1))} disabled={agentPage === 0} style={{ ...btnSmall(), opacity: agentPage === 0 ? 0.3 : 1 }}>← PREV</button>
                    <span style={{ fontSize: "11px", color: "#6aaa80" }}>{agentPage + 1} / {totalPages}</span>
                    <button onClick={() => setAgentPage(p => Math.min(totalPages - 1, p + 1))} disabled={agentPage >= totalPages - 1} style={{ ...btnSmall(), opacity: agentPage >= totalPages - 1 ? 0.3 : 1 }}>NEXT →</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── ROW 2: A2A + Log ──────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", alignItems: "start" }}>

            {/* A2A */}
            <div className="card-corner" style={card}>
              <div style={sectionTitle}>// AGENT-TO-AGENT PAYMENT</div>
              {agents.length < 2 ? (
                <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>DEPLOY AT LEAST 2 AGENTS TO ENABLE A2A PAYMENTS</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "end" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.1em", marginBottom: "5px" }}>SENDER</div>
                      <select style={inputStyle} value={a2aSender} onChange={e => { setA2aSender(e.target.value); setEstimatedFee(null); }}>
                        <option value="">select sender</option>
                        {agents.filter(a => a.name !== a2aReceiver).map(a => <option key={a.pda} value={a.name}>{a.name} · {TIER_LABELS[a.tier]}</option>)}
                      </select>
                    </div>
                    <span style={{ color: "#00ff88", fontSize: "18px", opacity: a2aSender && a2aReceiver ? 1 : 0.15, paddingBottom: "2px" }}>→</span>
                    <div>
                      <div style={{ fontSize: "10px", color: "#6aaa80", letterSpacing: "0.1em", marginBottom: "5px" }}>RECEIVER</div>
                      <select style={inputStyle} value={a2aReceiver} onChange={e => { setA2aReceiver(e.target.value); setEstimatedFee(null); }}>
                        <option value="">select receiver</option>
                        {agents.filter(a => a.name !== a2aSender).map(a => <option key={a.pda} value={a.name}>{a.name} · {TIER_LABELS[a.tier]}</option>)}
                      </select>
                    </div>
                  </div>
                  <select style={inputStyle} value={a2aCategory} onChange={e => setA2aCategory(parseInt(e.target.value))}>
                    <option value="0">no category</option>
                    <option value="1">compute</option>
                    <option value="2">data</option>
                    <option value="3">storage</option>
                    <option value="4">inference</option>
                    <option value="5">research</option>
                    <option value="6">content</option>
                  </select>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="service description" value={a2aService} onChange={e => setA2aService(e.target.value)} />
                    <input style={{ ...inputStyle, width: "80px" }} placeholder="SOL" type="number" value={a2aAmount} onChange={e => { setA2aAmount(e.target.value); setEstimatedFee(null); }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={handleEstimateFee} disabled={feeLoading || !a2aSender || !a2aReceiver} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${!a2aSender || !a2aReceiver ? "rgba(0,255,136,0.08)" : "rgba(0,255,136,0.2)"}`, color: !a2aSender || !a2aReceiver ? "#3a6a4a" : "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "0.08em", borderRadius: "3px", cursor: !a2aSender || !a2aReceiver ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                      {feeLoading ? "ESTIMATING..." : "⚡ ESTIMATE FEE"}
                    </button>
                    {estimatedFee && (
                      <span style={{ fontSize: "11px", color: estimatedFee.startsWith("ERR") ? "#ff3c5a" : "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>
                        {estimatedFee}
                      </span>
                    )}
                  </div>
                  <button onClick={handleA2A} disabled={loading || !a2aSender || !a2aReceiver || !a2aService} style={loading || !a2aSender || !a2aReceiver || !a2aService ? btnOff : btnPrimary}>
                    {loading ? "AGENT SIGNING..." : "EXECUTE A2A PAYMENT"}
                  </button>
                  {a2aLog.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      {a2aLog.map((entry, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.06)", borderRadius: "3px", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span>
                            <span style={{ color: "#00ff88" }}>[{entry.time}]</span>{" "}
                            <span style={{ color: "#c8f0d8" }}>{entry.sender}</span>
                            <span style={{ color: "#6aaa80" }}> → </span>
                            <span style={{ color: "#c8f0d8" }}>{entry.receiver}</span>
                            <span style={{ color: "#6aaa80" }}> · </span>
                            <span style={{ color: "#00ff88" }}>{entry.amount} SOL</span>
                          </span>
                          <button onClick={() => openExplorer(entry.sig)} style={{ background: "transparent", border: "none", color: "#6aaa80", fontSize: "11px", cursor: "pointer" }}>↗</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Onchain log */}
            <div className="card-corner" style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div style={sectionTitle}>// ONCHAIN PAYMENT LOG</div>
                <button onClick={fetchPaymentHistory} style={btnSmall()}>↻</button>
              </div>
              {payments.length === 0 ? (
                <div style={{ color: "#3a6a4a", fontSize: "13px", textAlign: "center", padding: "24px 0" }}>NO TRANSACTIONS FOUND</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {payments.slice(0, 12).map((p, i) => {
                    const typeColor = p.type === "a2a" ? "#00ff88" : p.type === "pay" ? "#ffb800" : "#6aaa80";
                    const typeLabel = p.type === "a2a" ? "A2A" : p.type === "pay" ? "PAY" : "REG";
                    return (
                      <div key={i} onClick={() => openExplorer(p.sig)} style={{ padding: "8px 12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.06)", borderRadius: "3px", fontSize: "11px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.15s" }}
                        onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.2)")}
                        onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.06)")}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "9px", color: typeColor, border: `1px solid ${typeColor}40`, padding: "1px 5px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace" }}>{typeLabel}</span>
                          <span style={{ color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace" }}>{p.sig.slice(0, 14)}...</span>
                        </div>
                        <span style={{ color: "#4a7a5a", fontSize: "10px" }}>{p.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── ROW 3: Activity Chart ──────────────────────────────────────── */}
          {agents.length > 0 && (
            <div className="card-corner" style={card}>
              <div style={sectionTitle}>// AGENT ACTIVITY</div>
              <ResponsiveContainer width="100%" height={isMobile ? 120 : 150}>
                <BarChart data={agents.map(a => ({
                  name: a.name.length > 10 ? a.name.slice(0, 10) + "…" : a.name,
                  payments: a.paymentCount,
                  spent: parseFloat((a.totalSpent / 1e9).toFixed(4)),
                }))} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#6aaa80", fontSize: isMobile ? 9 : 11, fontFamily: "'Share Tech Mono', monospace" }} axisLine={{ stroke: "rgba(0,255,136,0.1)" }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#6aaa80", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#ffb800", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0d1410", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "3px", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", color: "#00ff88" }} labelStyle={{ color: "#c8f0d8" }} cursor={{ fill: "rgba(0,255,136,0.04)" }} />
                  <Bar yAxisId="left" dataKey="payments" name="Payments" radius={[2, 2, 0, 0]} maxBarSize={32}>
                    {agents.map((_, i) => <Cell key={`p-${i}`} fill="#00ff88" opacity={0.7} />)}
                  </Bar>
                  <Bar yAxisId="right" dataKey="spent" name="SOL Spent" radius={[2, 2, 0, 0]} maxBarSize={32}>
                    {agents.map((_, i) => <Cell key={`s-${i}`} fill="#ffb800" opacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>■ <span style={{ color: "#00ff88" }}>PAYMENTS</span></span>
                <span style={{ fontSize: "11px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>■ <span style={{ color: "#ffb800" }}>SOL SPENT</span></span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid rgba(0,255,136,0.06)", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#3a6a4a", letterSpacing: "0.08em" }}>
        <span>PAYKIT · ZERO TWO LABS · 2026</span>
        {!isMobile && <span>{PROGRAM_ID.toBase58().slice(0, 20)}...</span>}
      </div>

      {/* QR Modal */}
      {qrAgent && (() => {
        const agent = agents.find(a => a.name === qrAgent);
        if (!agent) return null;
        return (
          <div onClick={() => setQrAgent(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} className="card-corner" style={{ background: "#0d1410", border: "1px solid rgba(0,255,136,0.35)", borderRadius: "4px", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", minWidth: "280px" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.15em" }}>// AGENT WALLET</div>
              <div style={{ padding: "12px", background: "#ffffff", borderRadius: "3px" }}>
                <QRCodeSVG value={agent.agentKey} size={180} />
              </div>
              <div style={{ fontSize: "12px", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", textAlign: "center" }}>
                <div style={{ color: "#00ff88", marginBottom: "4px" }}>{agent.name}</div>
                <div style={{ fontSize: "10px", color: "#6aaa80", wordBreak: "break-all", maxWidth: "240px" }}>{agent.agentKey}</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { navigator.clipboard.writeText(agent.agentKey); showToast("Address copied"); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(0,255,136,0.25)", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", borderRadius: "3px", cursor: "pointer", letterSpacing: "0.1em" }}>COPY ADDRESS</button>
                <button onClick={() => setQrAgent(null)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,60,90,0.25)", color: "#ff3c5a", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", borderRadius: "3px", cursor: "pointer", letterSpacing: "0.1em" }}>CLOSE</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: isMobile ? "12px" : "24px", right: isMobile ? "12px" : "24px", left: isMobile ? "12px" : "auto", display: "flex", flexDirection: "column", gap: "8px", zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: "12px 20px", background: t.type === "ok" ? "rgba(0,20,10,0.95)" : "rgba(20,0,5,0.95)", border: `1px solid ${t.type === "ok" ? "rgba(0,255,136,0.4)" : "rgba(255,60,90,0.4)"}`, borderLeft: `3px solid ${t.type === "ok" ? "#00ff88" : "#ff3c5a"}`, borderRadius: "3px", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: t.type === "ok" ? "#00ff88" : "#ff3c5a", letterSpacing: "0.08em", animation: "fade-in-up 0.3s ease forwards" }}>
            {t.type === "ok" ? "✓ " : "✗ "}{t.message}
          </div>
        ))}
      </div>

    </main>
  );
}
