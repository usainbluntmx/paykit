"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const CAP_ALL_DEFAULT = 0b01111111;
const AGENT_ACCOUNT_SIZE = 371;
const OWNER_OFFSET = 8 + 32;

const CAP_DEFS = [
  { key: "canPayAgents", bit: 0, label: "PAY AGENTS", desc: "Agent can pay other registered agents" },
  { key: "canHireBasic", bit: 1, label: "HIRE BASIC", desc: "Can hire tier-0 (basic) agents" },
  { key: "canHireStandard", bit: 2, label: "HIRE STANDARD", desc: "Can hire tier-1 (standard) agents" },
  { key: "canHirePremium", bit: 3, label: "HIRE PREMIUM", desc: "Can hire tier-2 (premium) agents" },
  { key: "canTransferSOL", bit: 4, label: "TRANSFER SOL", desc: "Can transfer SOL between agent wallets" },
  { key: "canTransferSPL", bit: 5, label: "TRANSFER SPL", desc: "Can transfer SPL tokens (USDC, etc.)" },
  { key: "canBatchPay", bit: 6, label: "BATCH PAY", desc: "Can send up to 5 payments in one TX" },
];

const TIER_DEFS = [
  { label: "BASIC", color: "#6aaa80", desc: "Hirable by any agent" },
  { label: "STANDARD", color: "#00ff88", desc: "Hirable by standard+ agents" },
  { label: "PREMIUM", color: "#ffb800", desc: "Hirable by premium agents only" },
];

const CATEGORIES = [
  { id: 0, label: "none", color: "#6aaa80" },
  { id: 1, label: "compute", color: "#00ff88" },
  { id: 2, label: "data", color: "#00cc6a" },
  { id: 3, label: "storage", color: "#9aeab0" },
  { id: 4, label: "inference", color: "#ffb800" },
  { id: 5, label: "research", color: "#ff9900" },
  { id: 6, label: "content", color: "#ff6600" },
];

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "CONNECT", short: "CONNECT WALLET" },
  { id: 2, label: "DEPLOY", short: "DEPLOY AGENT" },
  { id: 3, label: "CONFIGURE", short: "CAPABILITIES" },
  { id: 4, label: "PAYMENT", short: "FIRST PAYMENT" },
  { id: 5, label: "AGENT→AGENT", short: "A2A PAYMENT" },
  { id: 6, label: "AUDIT", short: "VERIFY ONCHAIN" },
];

// ─── Typing effect hook ───────────────────────────────────────────────────────

function useTypingEffect(text: string, speed = 18, trigger = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, trigger]);

  return { displayed, done };
}

// ─── Animated arrow component ─────────────────────────────────────────────────

function AnimatedArrow({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 8px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: "inline-block",
          width: "8px", height: "8px",
          borderTop: "2px solid #00ff88",
          borderRight: "2px solid #00ff88",
          transform: "rotate(45deg)",
          opacity: active ? 1 : 0.2,
          animation: active ? `arrow-pulse 1.2s ease-in-out ${i * 0.2}s infinite` : "none",
        }} />
      ))}
      <style>{`
        @keyframes arrow-pulse {
          0%, 100% { opacity: 0.2; transform: rotate(45deg) translateX(0); }
          50% { opacity: 1; transform: rotate(45deg) translateX(3px); }
        }
      `}</style>
    </div>
  );
}

// ─── TX confirmation particle burst ──────────────────────────────────────────

function TxBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 9998 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: "4px", height: "4px",
          background: i % 3 === 0 ? "#00ff88" : i % 3 === 1 ? "#ffb800" : "#9aeab0",
          borderRadius: "50%",
          animation: `burst-${i} 0.8s ease-out forwards`,
        }} />
      ))}
      <style>{Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360;
        const dist = 60 + Math.random() * 40;
        const x = Math.cos(angle * Math.PI / 180) * dist;
        const y = Math.sin(angle * Math.PI / 180) * dist;
        return `@keyframes burst-${i} { 0% { transform: translate(0,0); opacity:1; } 100% { transform: translate(${x}px,${y}px); opacity:0; } }`;
      }).join("\n")}</style>
    </div>
  );
}

// ─── Step context panel ───────────────────────────────────────────────────────

function ContextPanel({ title, text, visible }: { title: string; text: string; visible: boolean }) {
  const { displayed } = useTypingEffect(text, 14, visible);
  return (
    <div style={{
      padding: "20px 24px",
      background: "rgba(0,255,136,0.03)",
      border: "1px solid rgba(0,255,136,0.12)",
      borderLeft: "3px solid #00ff88",
      borderRadius: "3px",
      marginBottom: "24px",
    }}>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "10px" }}>
        {title}
      </div>
      <p style={{ fontSize: "14px", color: "#9aeab0", lineHeight: 1.9, minHeight: "44px" }}>
        {displayed}<span style={{ animation: "blink 1s step-end infinite", color: "#00ff88" }}>▊</span>
      </p>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, completed, onGoTo }: { current: number; completed: Set<number>; onGoTo: (n: number) => void }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "rgba(8,12,10,0.95)", borderBottom: "1px solid rgba(0,255,136,0.12)", padding: "12px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "0" }}>
        {STEPS.map((step, i) => {
          const isCompleted = completed.has(step.id);
          const isCurrent = current === step.id;
          const canClick = isCompleted && !isCurrent;
          return (
            <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <button
                onClick={() => canClick && onGoTo(step.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "transparent", border: "none", cursor: canClick ? "pointer" : "default",
                  padding: "4px 8px", borderRadius: "2px",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${isCurrent ? "#00ff88" : isCompleted ? "#00cc6a" : "rgba(0,255,136,0.2)"}`,
                  background: isCurrent ? "rgba(0,255,136,0.15)" : isCompleted ? "rgba(0,204,106,0.1)" : "transparent",
                  transition: "all 0.3s",
                  animation: isCurrent ? "pulse-ring 2s ease-in-out infinite" : "none",
                }}>
                  {isCompleted && !isCurrent ? (
                    <span style={{ color: "#00cc6a", fontSize: "12px" }}>✓</span>
                  ) : (
                    <span style={{ color: isCurrent ? "#00ff88" : "#3a6a4a", fontSize: "11px", fontFamily: "'Share Tech Mono', monospace" }}>{step.id}</span>
                  )}
                </div>
                <span style={{ display: "none", color: isCurrent ? "#00ff88" : isCompleted ? "#6aaa80" : "#3a6a4a", fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: "2px", background: isCompleted ? "rgba(0,204,106,0.5)" : "rgba(0,255,136,0.1)", transition: "background 0.5s", margin: "0 4px" }} />
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0.4)} 50%{box-shadow:0 0 0 6px rgba(0,255,136,0)} }`}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Demo() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Navigation state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  // Program
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [txBurst, setTxBurst] = useState(false);

  // Step 2 — Deploy agent
  const [agentName, setAgentName] = useState("my-first-agent");
  const [spendLimit, setSpendLimit] = useState("1");
  const [fundingSOL, setFundingSOL] = useState("0.01");
  const [deployedAgent, setDeployedAgent] = useState<{ name: string; pda: string; agentKey: string; keypair: number[] } | null>(null);

  // Step 3 — Capabilities
  const [capabilities, setCapabilities] = useState(CAP_ALL_DEFAULT);
  const [agentTier, setAgentTier] = useState(0);
  const [capsConfirmed, setCapsConfirmed] = useState(false);

  // Step 4 — First payment
  const [payMemo, setPayMemo] = useState("OpenAI API call");
  const [payAmount, setPayAmount] = useState("0.001");
  const [payCategory, setPayCategory] = useState(1);
  const [payTx, setPayTx] = useState("");

  // Step 5 — A2A
  const [agent2Name, setAgent2Name] = useState("my-second-agent");
  const [agent2Deployed, setAgent2Deployed] = useState<{ name: string; pda: string; agentKey: string; keypair: number[] } | null>(null);
  const [a2aService, setA2aService] = useState("Data analysis task");
  const [a2aCategory, setA2aCategory] = useState(4);
  const [a2aTx, setA2aTx] = useState("");
  const [a2aAnimating, setA2aAnimating] = useState(false);

  // Step 6 — Audit
  const [auditResult, setAuditResult] = useState<any>(null);
  const [historyResult, setHistoryResult] = useState<any[]>([]);

  // Status
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"idle" | "ok" | "error" | "loading">("idle");
  const statusColor = { idle: "#6aaa80", ok: "#00ff88", error: "#ff3c5a", loading: "#ffb800" }[statusType];

  useEffect(() => { setMounted(true); }, []);

  // Init program when wallet connects
  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) { setProgram(null); return; }
    (async () => {
      try {
        const idlRes = await fetch(`/idl/paykit.json?v=${Date.now()}`);
        const idl = await idlRes.json();
        const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
        setProgram(new Program(idl, provider));
        if (currentStep === 1) completeStep(1);
      } catch (e: any) { setStatusMsg(`ERR: ${e.message}`); setStatusType("error"); }
    })();
  }, [wallet.connected, wallet.publicKey]);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function completeStep(step: number) {
    setCompletedSteps(prev => new Set([...prev, step]));
  }

  function goToStep(step: number, dir: "left" | "right" = "right") {
    if (animating) return;
    setAnimating(true);
    setSlideDir(dir);
    setTimeout(() => {
      setCurrentStep(step);
      setAnimating(false);
    }, 300);
  }

  function nextStep() {
    if (currentStep < 6) goToStep(currentStep + 1, "right");
  }

  function prevStep(target?: number) {
    const dest = target ?? currentStep - 1;
    if (dest >= 1) goToStep(dest, "left");
  }

  // ─── PDA derivation ──────────────────────────────────────────────────────────

  function getAgentPDA(agentPublicKey: PublicKey, name: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), agentPublicKey.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    );
    return pda;
  }

  // ─── Save agent to localStorage ──────────────────────────────────────────────

  function saveAgent(name: string, keypair: Keypair, pda: PublicKey) {
    const stored = JSON.parse(localStorage.getItem("paykit_agents") || "{}");
    stored[name] = Array.from(keypair.secretKey);
    localStorage.setItem("paykit_agents", JSON.stringify(stored));
    const agentList = JSON.parse(localStorage.getItem("paykit_demo_agents") || "[]");
    agentList.push({ name, pda: pda.toBase58(), agentKey: keypair.publicKey.toBase58() });
    localStorage.setItem("paykit_demo_agents", JSON.stringify(agentList));
  }

  function showBurst() {
    setTxBurst(true);
    setTimeout(() => setTxBurst(false), 1000);
  }

  // ─── Step 2: Deploy agent ────────────────────────────────────────────────────

  async function handleDeployAgent() {
    if (!program || !wallet.publicKey || !agentName) return;
    setLoading(true); setStatusMsg("GENERATING KEYPAIR..."); setStatusType("loading");
    try {
      const agentKeypair = Keypair.generate();
      const agentPDA = getAgentPDA(agentKeypair.publicKey, agentName);
      const limitLamports = parseFloat(spendLimit) * 1_000_000_000;
      const fundLamports = parseFloat(fundingSOL) * 1_000_000_000;

      setStatusMsg("DEPLOYING ONCHAIN...");
      const tx = await program.methods
        .registerAgent(agentName, new BN(limitLamports), 1000, new BN(fundLamports), CAP_ALL_DEFAULT, 0)
        .accounts({ agent: agentPDA, agentSigner: agentKeypair.publicKey, owner: wallet.publicKey, systemProgram: PublicKey.default })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      saveAgent(agentName, agentKeypair, agentPDA);
      setDeployedAgent({ name: agentName, pda: agentPDA.toBase58(), agentKey: agentKeypair.publicKey.toBase58(), keypair: Array.from(agentKeypair.secretKey) });
      setStatusMsg(`AGENT "${agentName.toUpperCase()}" DEPLOYED · ${tx.slice(0, 16)}...`);
      setStatusType("ok");
      showBurst();
      completeStep(2);
    } catch (e: any) {
      setStatusMsg(`ERR: ${e.message.slice(0, 80)}`); setStatusType("error");
    }
    setLoading(false);
  }

  // ─── Step 3: Confirm capabilities ────────────────────────────────────────────

  function handleConfirmCaps() {
    setCapsConfirmed(true);
    completeStep(3);
    setStatusMsg("CAPABILITIES CONFIGURED");
    setStatusType("ok");
  }

  // ─── Step 4: Record payment ───────────────────────────────────────────────────

  async function handleRecordPayment() {
    if (!program || !wallet.publicKey || !deployedAgent) return;
    setLoading(true); setStatusMsg("AGENT SIGNING..."); setStatusType("loading");
    try {
      const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(deployedAgent.keypair));
      const agentPDA = new PublicKey(deployedAgent.pda);
      const amountLamports = parseFloat(payAmount) * 1_000_000_000;

      const ix = await program.methods
        .recordPayment(new BN(amountLamports), wallet.publicKey, payMemo, payCategory)
        .accounts({ agent: agentPDA, agentSigner: agentKeypair.publicKey })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = agentKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(agentKeypair);
      const txId = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(txId, "confirmed");

      setPayTx(txId);
      setStatusMsg(`PAYMENT CONFIRMED · ${txId.slice(0, 16)}...`);
      setStatusType("ok");
      showBurst();
      completeStep(4);
    } catch (e: any) {
      setStatusMsg(`ERR: ${e.message.slice(0, 80)}`); setStatusType("error");
    }
    setLoading(false);
  }

  // ─── Step 5: Deploy second agent + A2A ───────────────────────────────────────

  async function handleDeployAgent2() {
    if (!program || !wallet.publicKey || !agent2Name) return;
    setLoading(true); setStatusMsg("DEPLOYING SECOND AGENT..."); setStatusType("loading");
    try {
      const agentKeypair = Keypair.generate();
      const agentPDA = getAgentPDA(agentKeypair.publicKey, agent2Name);
      const tx = await program.methods
        .registerAgent(agent2Name, new BN(500_000_000), 1000, new BN(10_000_000), CAP_ALL_DEFAULT, 0)
        .accounts({ agent: agentPDA, agentSigner: agentKeypair.publicKey, owner: wallet.publicKey, systemProgram: PublicKey.default })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      saveAgent(agent2Name, agentKeypair, agentPDA);
      setAgent2Deployed({ name: agent2Name, pda: agentPDA.toBase58(), agentKey: agentKeypair.publicKey.toBase58(), keypair: Array.from(agentKeypair.secretKey) });
      setStatusMsg(`"${agent2Name.toUpperCase()}" DEPLOYED · ${tx.slice(0, 16)}...`);
      setStatusType("ok");
      showBurst();
    } catch (e: any) {
      setStatusMsg(`ERR: ${e.message.slice(0, 80)}`); setStatusType("error");
    }
    setLoading(false);
  }

  async function handleA2APayment() {
    if (!program || !deployedAgent || !agent2Deployed) return;
    setLoading(true); setStatusMsg("SENDER AGENT SIGNING..."); setStatusType("loading");
    setA2aAnimating(true);
    try {
      const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(deployedAgent.keypair));
      const senderPDA = new PublicKey(deployedAgent.pda);
      const receiverPDA = new PublicKey(agent2Deployed.pda);

      const ix = await program.methods
        .agentToAgentPayment(new BN(250_000), a2aService, a2aCategory)
        .accounts({ senderAgent: senderPDA, receiverAgent: receiverPDA, agentSigner: senderKeypair.publicKey })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = senderKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(senderKeypair);
      const txId = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(txId, "confirmed");

      setTimeout(() => setA2aAnimating(false), 1500);
      setA2aTx(txId);
      setStatusMsg(`A2A CONFIRMED · ${txId.slice(0, 16)}...`);
      setStatusType("ok");
      showBurst();
      completeStep(5);
    } catch (e: any) {
      setA2aAnimating(false);
      setStatusMsg(`ERR: ${e.message.slice(0, 80)}`); setStatusType("error");
    }
    setLoading(false);
  }

  // ─── Step 6: Audit ────────────────────────────────────────────────────────────

  async function handleAudit() {
    if (!program || !deployedAgent) return;
    setLoading(true); setStatusMsg("READING ONCHAIN STATE..."); setStatusType("loading");
    try {
      const agent = await (program.account as any).agentAccount.fetch(new PublicKey(deployedAgent.pda));
      setAuditResult({
        name: agent.name,
        agentKey: agent.agentKey.toBase58(),
        owner: agent.owner.toBase58(),
        spendLimit: agent.spendLimit.toNumber(),
        totalSpent: agent.totalSpent.toNumber(),
        paymentCount: agent.paymentCount.toNumber(),
        isActive: agent.isActive,
        tier: agent.tier,
        capabilities: agent.capabilities,
        dailyLimitBps: agent.dailyLimitBps,
        expiresAt: agent.expiresAt.toNumber(),
      });

      // Fetch history
      const sigs = await connection.getSignaturesForAddress(new PublicKey(deployedAgent.pda), { limit: 10 });
      const hist = sigs.map(s => {
        const time = new Date((s.blockTime || 0) * 1000);
        return `[${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}] ${s.signature.slice(0, 20)}...`;
      });
      setHistoryResult(hist);
      setStatusMsg("ONCHAIN DATA VERIFIED");
      setStatusType("ok");
      completeStep(6);
    } catch (e: any) {
      setStatusMsg(`ERR: ${e.message.slice(0, 80)}`); setStatusType("error");
    }
    setLoading(false);
  }

  function goToDashboard() {
    router.push("/dashboard");
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const card = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "28px",
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    borderRadius: "3px", fontSize: "15px",
  };

  const btnGreen = {
    width: "100%", padding: "13px",
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.4)",
    color: "#00ff88",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "14px", letterSpacing: "0.15em",
    borderRadius: "3px", cursor: "pointer", transition: "all 0.2s",
  };

  const btnGhost = {
    ...btnGreen,
    background: "transparent",
    borderColor: "rgba(0,255,136,0.15)",
    color: "#6aaa80",
  };

  const btnDisabled = {
    ...btnGreen,
    background: "transparent",
    borderColor: "rgba(0,255,136,0.1)",
    color: "#3a6a4a", cursor: "not-allowed",
  };

  // ─── Step content ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (currentStep) {

      // ── STEP 1 ──────────────────────────────────────────────────────────────
      case 1: return (
        <div>
          <ContextPanel
            visible={currentStep === 1}
            title="// WHAT YOU ARE ABOUT TO BUILD"
            text="PayKit is an accountability layer for autonomous AI agents on Solana. Agents get their own keypair, their own wallet, and enforced spend limits — all at the protocol level. No human signs their payments. No bank. No permission. You will deploy a real agent onchain in the next 5 steps."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 1 — CONNECT YOUR WALLET</div>
            {wallet.connected ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 12px rgba(0,255,136,0.6)", animation: "pulse-green 2s infinite" }} />
                  <span style={{ color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px" }}>WALLET CONNECTED</span>
                </div>
                <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.03)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: "3px", marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "4px", letterSpacing: "0.1em" }}>CONNECTED AS</div>
                  <div style={{ color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", wordBreak: "break-all" }}>{wallet.publicKey?.toBase58()}</div>
                </div>
                <div style={{ fontSize: "13px", color: "#9aeab0", lineHeight: 1.8, marginBottom: "24px" }}>
                  Your wallet is the <strong style={{ color: "#c8f0d8" }}>owner</strong> — it controls agents but doesn't sign their payments. Agents sign their own transactions using their own keypair. This is the agent-native approach.
                </div>
                <button onClick={nextStep} style={btnGreen}>
                  DEPLOY YOUR FIRST AGENT →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "14px", color: "#9aeab0", lineHeight: 1.8, marginBottom: "24px" }}>
                  Connect your Phantom wallet to start. Your wallet acts as the <strong style={{ color: "#c8f0d8" }}>owner</strong> — it registers agents and controls their configuration, but agents sign their own payment transactions.
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                  {mounted && <WalletMultiButton />}
                </div>
                <div style={{ fontSize: "12px", color: "#6aaa80", textAlign: "center" }}>
                  Phantom, Backpack, Solflare supported · Devnet
                </div>
              </div>
            )}
          </div>
        </div>
      );

      // ── STEP 2 ──────────────────────────────────────────────────────────────
      case 2: return (
        <div>
          <ContextPanel
            visible={currentStep === 2}
            title="// AGENT-NATIVE — AUTONOMOUS KEYPAIRS"
            text="PayKit takes an agent-native approach: each agent generates its own Solana keypair at creation. The SDK stores it locally and uses it to sign payment transactions autonomously. The owner wallet only signs the initial registration — never individual payments. This is what makes PayKit different from every other agent payment system."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 2 — DEPLOY AUTONOMOUS AGENT</div>

            {deployedAgent ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "16px", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "3px", animation: "fade-in-up 0.4s ease forwards" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 12px rgba(0,255,136,0.6)", animation: "pulse-green 2s infinite", flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: "13px", marginBottom: "4px" }}>{deployedAgent.name.toUpperCase()} · LIVE</div>
                    <div style={{ color: "#9aeab0", fontSize: "11px", wordBreak: "break-all" }}>KEY {deployedAgent.agentKey.slice(0, 32)}...</div>
                    <div style={{ color: "#6aaa80", fontSize: "11px", wordBreak: "break-all" }}>PDA {deployedAgent.pda.slice(0, 32)}...</div>
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#9aeab0", marginBottom: "16px" }}>
                  ✓ Keypair generated and stored locally<br />
                  ✓ PDA registered onchain via <code style={{ color: "#ffb800" }}>registerAgent</code><br />
                  ✓ Agent wallet funded with {fundingSOL} SOL for transaction fees
                </div>
                <button onClick={nextStep} style={btnGreen}>CONFIGURE CAPABILITIES →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>AGENT NAME</div>
                  <input style={inputStyle} value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="my-first-agent" />
                  <div style={{ fontSize: "11px", color: "#3a6a4a", marginTop: "4px" }}>max 32 chars · lowercase, no spaces</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>SPEND LIMIT</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input style={{ ...inputStyle, flex: 1, width: "auto" }} type="number" value={spendLimit} onChange={e => setSpendLimit(e.target.value)} />
                      <span style={{ color: "#9aeab0", fontSize: "13px" }}>SOL</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#3a6a4a", marginTop: "4px" }}>enforced by contract</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>FUND WALLET</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input style={{ ...inputStyle, flex: 1, width: "auto" }} type="number" value={fundingSOL} onChange={e => setFundingSOL(e.target.value)} />
                      <span style={{ color: "#9aeab0", fontSize: "13px" }}>SOL</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#3a6a4a", marginTop: "4px" }}>for agent TX fees</div>
                  </div>
                </div>
                <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px", fontSize: "12px", color: "#6aaa80", lineHeight: 1.7 }}>
                  <span style={{ color: "#00ff88" }}>createAutonomousAgent</span> will generate a Solana keypair, register this agent onchain via the PayKit program, and fund its wallet — all in one transaction signed by your Phantom wallet.
                </div>
                <button onClick={handleDeployAgent} disabled={loading || !agentName} style={loading || !agentName ? btnDisabled : btnGreen}>
                  {loading ? "⟳ DEPLOYING..." : "DEPLOY AGENT ONCHAIN"}
                </button>
              </div>
            )}
          </div>
        </div>
      );

      // ── STEP 3 ──────────────────────────────────────────────────────────────
      case 3: return (
        <div>
          <ContextPanel
            visible={currentStep === 3}
            title="// CAPABILITIES — GRANULAR PERMISSIONS"
            text="Every agent has a bitmask of capabilities stored onchain. The contract verifies these before every payment — an agent without CAN_PAY_AGENTS cannot pay other agents, period. The owner sets capabilities; the contract enforces them. Agents cannot grant themselves permissions."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 3 — CONFIGURE CAPABILITIES & TIER</div>

            {/* Tier */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "10px", letterSpacing: "0.1em" }}>AGENT TIER — defines who can hire this agent</div>
              <div style={{ display: "flex", gap: "8px" }}>
                {TIER_DEFS.map((t, i) => (
                  <button key={i} onClick={() => !capsConfirmed && setAgentTier(i)} style={{
                    flex: 1, padding: "12px 8px",
                    background: agentTier === i ? `${t.color}15` : "transparent",
                    border: `1px solid ${agentTier === i ? t.color : "rgba(0,255,136,0.1)"}`,
                    color: agentTier === i ? t.color : "#6aaa80",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: "11px",
                    borderRadius: "2px", cursor: capsConfirmed ? "default" : "pointer",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ letterSpacing: "0.1em", marginBottom: "4px" }}>{t.label}</div>
                    <div style={{ fontSize: "10px", opacity: 0.7 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "10px", letterSpacing: "0.1em" }}>CAPABILITIES — enforced onchain by the contract</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {CAP_DEFS.map(cap => {
                  const active = !!(capabilities & (1 << cap.bit));
                  return (
                    <div key={cap.key} onClick={() => !capsConfirmed && setCapabilities(c => active ? c & ~(1 << cap.bit) : c | (1 << cap.bit))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px",
                        background: active ? "rgba(0,255,136,0.04)" : "transparent",
                        border: `1px solid ${active ? "rgba(0,255,136,0.2)" : "rgba(0,255,136,0.06)"}`,
                        borderRadius: "2px",
                        cursor: capsConfirmed ? "default" : "pointer",
                        transition: "all 0.15s",
                      }}>
                      <div>
                        <span style={{ color: active ? "#00ff88" : "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", letterSpacing: "0.08em" }}>{cap.label}</span>
                        <span style={{ color: "#3a6a4a", fontSize: "11px", marginLeft: "12px" }}>{cap.desc}</span>
                      </div>
                      <div style={{
                        width: "36px", height: "18px",
                        background: active ? "rgba(0,255,136,0.2)" : "rgba(0,0,0,0.3)",
                        border: `1px solid ${active ? "rgba(0,255,136,0.5)" : "rgba(0,255,136,0.1)"}`,
                        borderRadius: "9px",
                        position: "relative", transition: "all 0.2s", flexShrink: 0,
                      }}>
                        <div style={{
                          position: "absolute", top: "2px",
                          left: active ? "18px" : "2px",
                          width: "12px", height: "12px",
                          background: active ? "#00ff88" : "#3a6a4a",
                          borderRadius: "50%", transition: "all 0.2s",
                          boxShadow: active ? "0 0 6px rgba(0,255,136,0.5)" : "none",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "10px 14px", background: "rgba(255,184,0,0.05)", border: "1px solid rgba(255,184,0,0.15)", borderRadius: "2px", fontSize: "12px", color: "#9aeab0", marginBottom: "16px" }}>
              <span style={{ color: "#ffb800" }}>Note: </span>
              Capabilities are stored in a <code style={{ color: "#ffb800" }}>u16</code> bitmask in the agent's onchain account. The contract checks them on every payment instruction — they cannot be bypassed at the application layer.
            </div>

            {capsConfirmed ? (
              <div>
                <div style={{ color: "#00ff88", marginBottom: "16px", fontSize: "13px" }}>
                  ✓ {[0, 1, 2, 3, 4, 5, 6].filter(i => capabilities & (1 << i)).length}/7 capabilities active · tier {TIER_DEFS[agentTier].label}
                </div>
                <button onClick={nextStep} style={btnGreen}>RECORD FIRST PAYMENT →</button>
              </div>
            ) : (
              <button onClick={handleConfirmCaps} style={btnGreen}>
                CONFIRM CAPABILITIES
              </button>
            )}
          </div>
        </div>
      );

      // ── STEP 4 ──────────────────────────────────────────────────────────────
      case 4: return (
        <div>
          <ContextPanel
            visible={currentStep === 4}
            title="// ACCOUNTABILITY LAYER — NOT A PAYMENT PROCESSOR"
            text="PayKit doesn't move funds — it records accountability. When an agent calls record_payment, it logs the payment onchain with a memo, category, and spend counter. The agent's keypair signs the transaction. The contract enforces the spend limit and daily BPS limit. This is the immutable audit trail."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 4 — FIRST AUTONOMOUS PAYMENT</div>

            {payTx ? (
              <div>
                <div style={{ padding: "16px", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "3px", marginBottom: "20px", animation: "fade-in-up 0.4s ease forwards" }}>
                  <div style={{ color: "#00ff88", fontSize: "13px", marginBottom: "8px" }}>✓ PAYMENT CONFIRMED ONCHAIN</div>
                  <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Signed by: <span style={{ color: "#c8f0d8" }}>{deployedAgent?.agentKey.slice(0, 20)}... (agent keypair)</span></div>
                  <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Memo: <span style={{ color: "#c8f0d8" }}>{payMemo}</span></div>
                  <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Category: <span style={{ color: CATEGORIES[payCategory]?.color || "#9aeab0" }}>{CATEGORIES[payCategory]?.label}</span></div>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginTop: "8px", wordBreak: "break-all" }}>TX: {payTx}</div>
                  <button onClick={() => window.open(`https://explorer.solana.com/tx/${payTx}?cluster=devnet`, "_blank")} style={{ marginTop: "10px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }}>
                    VIEW ON EXPLORER ↗
                  </button>
                </div>
                <button onClick={nextStep} style={btnGreen}>DEPLOY SECOND AGENT & PAY →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ padding: "10px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px", fontSize: "12px", color: "#9aeab0" }}>
                  Agent: <span style={{ color: "#00ff88" }}>{deployedAgent?.name}</span> will sign this transaction using its own keypair. Your Phantom wallet is not involved.
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>PAYMENT MEMO</div>
                  <input style={inputStyle} value={payMemo} onChange={e => setPayMemo(e.target.value)} placeholder="What is this payment for?" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>AMOUNT</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input style={{ ...inputStyle, flex: 1, width: "auto" }} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                      <span style={{ color: "#9aeab0", fontSize: "13px" }}>SOL</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>CATEGORY</div>
                    <select style={inputStyle} value={payCategory} onChange={e => setPayCategory(parseInt(e.target.value))}>
                      {CATEGORIES.filter(c => c.id > 0).map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={handleRecordPayment} disabled={loading || !payMemo} style={loading || !payMemo ? btnDisabled : btnGreen}>
                  {loading ? "⟳ AGENT SIGNING..." : "RECORD PAYMENT — AGENT SIGNS AUTONOMOUSLY"}
                </button>
              </div>
            )}
          </div>
        </div>
      );

      // ── STEP 5 ──────────────────────────────────────────────────────────────
      case 5: return (
        <div>
          <ContextPanel
            visible={currentStep === 5}
            title="// THE AUTONOMOUS AI ECONOMY — AGENTS HIRING AGENTS"
            text="Agent-to-agent payments are the core primitive of PayKit. One agent delegates a task to another and pays for it — autonomously, with spend limits enforced at the protocol level. No human approval. The sender's capabilities are checked against the receiver's tier before the transaction succeeds."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 5 — AGENT-TO-AGENT PAYMENT</div>

            {/* Deploy second agent */}
            {!agent2Deployed ? (
              <div>
                <div style={{ fontSize: "13px", color: "#9aeab0", marginBottom: "16px", lineHeight: 1.7 }}>
                  First, deploy a second agent that will receive the payment. This agent will have its own keypair and identity onchain.
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>RECEIVER AGENT NAME</div>
                  <input style={inputStyle} value={agent2Name} onChange={e => setAgent2Name(e.target.value)} placeholder="my-second-agent" />
                </div>
                <button onClick={handleDeployAgent2} disabled={loading || !agent2Name} style={loading || !agent2Name ? btnDisabled : btnGhost}>
                  {loading ? "⟳ DEPLOYING..." : "DEPLOY RECEIVER AGENT"}
                </button>
              </div>
            ) : (
              <div>
                {/* A2A visualization */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "16px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: "3px" }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>SENDER</div>
                    <div style={{ color: "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>{deployedAgent?.name}</div>
                    <div style={{ fontSize: "10px", color: "#6aaa80", marginTop: "4px" }}>STANDARD tier</div>
                  </div>
                  <AnimatedArrow active={a2aAnimating} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>RECEIVER</div>
                    <div style={{ color: "#9aeab0", fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>{agent2Deployed.name}</div>
                    <div style={{ fontSize: "10px", color: "#6aaa80", marginTop: "4px" }}>BASIC tier</div>
                  </div>
                </div>

                {a2aTx ? (
                  <div>
                    <div style={{ padding: "14px", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "3px", marginBottom: "16px", animation: "fade-in-up 0.4s ease forwards" }}>
                      <div style={{ color: "#00ff88", fontSize: "13px", marginBottom: "6px" }}>✓ A2A PAYMENT CONFIRMED</div>
                      <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Signed by: <span style={{ color: "#c8f0d8" }}>{deployedAgent?.name} (agent keypair — no owner)</span></div>
                      <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Service: <span style={{ color: "#c8f0d8" }}>{a2aService}</span></div>
                      <div style={{ fontSize: "12px", color: "#9aeab0", marginBottom: "4px" }}>Category: <span style={{ color: CATEGORIES[a2aCategory]?.color }}>{CATEGORIES[a2aCategory]?.label}</span></div>
                      <div style={{ fontSize: "11px", color: "#6aaa80", marginTop: "6px", wordBreak: "break-all" }}>TX: {a2aTx}</div>
                      <button onClick={() => window.open(`https://explorer.solana.com/tx/${a2aTx}?cluster=devnet`, "_blank")} style={{ marginTop: "8px", background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }}>
                        VIEW ON EXPLORER ↗
                      </button>
                    </div>
                    <button onClick={nextStep} style={btnGreen}>VERIFY ONCHAIN →</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>SERVICE DESCRIPTION</div>
                      <input style={inputStyle} value={a2aService} onChange={e => setA2aService(e.target.value)} placeholder="What service is being paid for?" />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "6px", letterSpacing: "0.1em" }}>CATEGORY</div>
                      <select style={inputStyle} value={a2aCategory} onChange={e => setA2aCategory(parseInt(e.target.value))}>
                        {CATEGORIES.filter(c => c.id > 0).map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6aaa80", padding: "8px 12px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.06)", borderRadius: "2px" }}>
                      Amount: <span style={{ color: "#00ff88" }}>250,000 lamports (0.00025 SOL)</span> · Sender agent signs autonomously
                    </div>
                    <button onClick={handleA2APayment} disabled={loading || !a2aService} style={loading || !a2aService ? btnDisabled : btnGreen}>
                      {loading ? "⟳ AGENT SIGNING..." : "EXECUTE A2A PAYMENT"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );

      // ── STEP 6 ──────────────────────────────────────────────────────────────
      case 6: return (
        <div>
          <ContextPanel
            visible={currentStep === 6}
            title="// IMMUTABLE · PERMISSIONLESS · AUDITABLE"
            text="Every action your agents take is recorded onchain and verifiable by anyone. No API key needed. No database. Just a PDA address. Any developer, any auditor, any smart contract can inspect your agent's full history. This is what accountability means at the protocol level."
          />
          <div style={card}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em", marginBottom: "20px" }}>// STEP 6 — AUDIT & VERIFY ONCHAIN</div>

            {!auditResult ? (
              <div>
                <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "3px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "4px" }}>AGENT PDA</div>
                  <div style={{ color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", wordBreak: "break-all" }}>{deployedAgent?.pda}</div>
                </div>
                <div style={{ fontSize: "13px", color: "#9aeab0", marginBottom: "20px", lineHeight: 1.7 }}>
                  Fetch the live onchain state of <strong style={{ color: "#c8f0d8" }}>{deployedAgent?.name}</strong> — spend counters, payment count, capabilities bitmask, expiry timestamp. All stored in a 371-byte account on Solana.
                </div>
                <button onClick={handleAudit} disabled={loading} style={loading ? btnDisabled : btnGreen}>
                  {loading ? "⟳ READING ONCHAIN STATE..." : "FETCH AGENT STATE FROM SOLANA"}
                </button>
              </div>
            ) : (
              <div style={{ animation: "fade-in-up 0.4s ease forwards" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { label: "AGENT NAME", value: auditResult.name, color: "#00ff88" },
                    { label: "STATUS", value: auditResult.isActive ? "ACTIVE" : "INACTIVE", color: auditResult.isActive ? "#00ff88" : "#ff3c5a" },
                    { label: "SPEND LIMIT", value: `${(auditResult.spendLimit / 1e9).toFixed(2)} SOL`, color: "#c8f0d8" },
                    { label: "TOTAL SPENT", value: `${(auditResult.totalSpent / 1e9).toFixed(6)} SOL`, color: "#ffb800" },
                    { label: "PAYMENTS", value: auditResult.paymentCount, color: "#9aeab0" },
                    { label: "DAILY BPS", value: `${auditResult.dailyLimitBps} (${(auditResult.dailyLimitBps / 100).toFixed(0)}%)`, color: "#9aeab0" },
                    { label: "CAPABILITIES", value: `${[0, 1, 2, 3, 4, 5, 6].filter(i => auditResult.capabilities & (1 << i)).length}/7 active`, color: "#6aaa80" },
                    { label: "EXPIRES", value: new Date(auditResult.expiresAt * 1000).toLocaleDateString(), color: "#6aaa80" },
                  ].map(item => (
                    <div key={item.label} style={{ padding: "10px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "2px" }}>
                      <div style={{ fontSize: "10px", color: "#3a6a4a", letterSpacing: "0.1em", marginBottom: "4px" }}>{item.label}</div>
                      <div style={{ color: item.color, fontFamily: "'Share Tech Mono', monospace", fontSize: "13px" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Capabilities pills */}
                <div style={{ gridColumn: "1 / -1", padding: "10px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderRadius: "2px" }}>
                  <div style={{ fontSize: "10px", color: "#3a6a4a", letterSpacing: "0.1em", marginBottom: "8px" }}>CAPABILITIES</div>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {[
                      { bit: 0, label: "PAY AGENTS" },
                      { bit: 1, label: "HIRE BASIC" },
                      { bit: 2, label: "HIRE STANDARD" },
                      { bit: 3, label: "HIRE PREMIUM" },
                      { bit: 4, label: "TRANSFER SOL" },
                      { bit: 5, label: "TRANSFER SPL" },
                      { bit: 6, label: "BATCH PAY" },
                    ].map(cap => {
                      const active = !!(auditResult.capabilities & (1 << cap.bit));
                      return (
                        <span key={cap.bit} style={{
                          fontSize: "10px", padding: "3px 8px", borderRadius: "2px",
                          fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em",
                          background: active ? "rgba(0,255,136,0.08)" : "transparent",
                          border: `1px solid ${active ? "rgba(0,255,136,0.3)" : "rgba(0,255,136,0.06)"}`,
                          color: active ? "#00ff88" : "#3a6a4a",
                        }}>
                          {active ? "✓ " : "○ "}{cap.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {historyResult.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", color: "#6aaa80", marginBottom: "8px", letterSpacing: "0.1em" }}>TRANSACTION HISTORY</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {historyResult.slice(0, 5).map((h, i) => (
                        <div key={i} style={{ fontSize: "11px", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", padding: "6px 10px", background: "rgba(0,255,136,0.02)", borderRadius: "2px" }}>
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: "14px", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "3px", marginBottom: "20px" }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "12px", color: "#00ff88", marginBottom: "10px", letterSpacing: "0.15em" }}>DEMO COMPLETE</div>
                  <div style={{ fontSize: "13px", color: "#9aeab0", lineHeight: 1.8 }}>
                    You just deployed {deployedAgent ? 2 : 1} autonomous agent{deployedAgent ? "s" : ""} on Solana Devnet, configured granular capabilities, and executed onchain payments — all without any human signing individual transactions. This is what the PayKit SDK makes possible in production.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={goToDashboard} style={{ ...btnGreen, flex: 1 }}>
                    VIEW DASHBOARD →
                  </button>
                  <a href="/docs" style={{ ...btnGhost as any, flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    READ THE DOCS
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      default: return null;
    }
  }

  // ─── Root render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ProgressBar current={currentStep} completed={completedSteps} onGoTo={n => prevStep(n)} />
      <TxBurst show={txBurst} />

      {/* Header */}
      <div style={{ paddingTop: "72px", paddingBottom: "0", maxWidth: "900px", margin: "0 auto", padding: "72px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "20px", fontWeight: 900, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>PAYKIT</span>
            </a>
            <span style={{ fontSize: "11px", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)", padding: "2px 8px", borderRadius: "2px", letterSpacing: "0.15em" }}>INTERACTIVE DEMO</span>
            <span style={{ fontSize: "12px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>
              {STEPS[currentStep - 1]?.short}
            </span>
          </div>
          {mounted && <WalletMultiButton />}
        </div>
      </div>

      {/* Status bar */}
      {statusMsg && (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.08)", borderLeft: `3px solid ${statusColor}`, borderRadius: "2px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: statusType === "loading" ? "pulse-green 1s infinite" : "none", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: statusColor, letterSpacing: "0.1em" }}>{statusMsg}</span>
          </div>
        </div>
      )}

      {/* Step content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 48px" }}>
        <div style={{
          opacity: animating ? 0 : 1,
          transform: animating ? `translateX(${slideDir === "right" ? "20px" : "-20px"})` : "translateX(0)",
          transition: "all 0.3s ease",
        }}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
          <button
            onClick={() => prevStep()}
            disabled={currentStep === 1}
            style={{
              background: "transparent",
              border: "1px solid",
              borderColor: currentStep === 1 ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.3)",
              color: currentStep === 1 ? "#3a6a4a" : "#6aaa80",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "12px", padding: "8px 20px",
              borderRadius: "2px", cursor: currentStep === 1 ? "not-allowed" : "pointer",
              letterSpacing: "0.1em", transition: "all 0.2s",
            }}
          >
            ← PREV
          </button>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {STEPS.map(s => (
              <div key={s.id} style={{
                width: currentStep === s.id ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background: currentStep === s.id ? "#00ff88" : completedSteps.has(s.id) ? "rgba(0,204,106,0.6)" : "rgba(0,255,136,0.15)",
                transition: "all 0.3s",
                cursor: completedSteps.has(s.id) && currentStep !== s.id ? "pointer" : "default",
              }} onClick={() => completedSteps.has(s.id) && currentStep !== s.id && prevStep(s.id)} />
            ))}
          </div>

          <div style={{ fontSize: "12px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace" }}>
            STEP {currentStep} / {STEPS.length}
          </div>
        </div>
      </div>
    </div>
  );
}
