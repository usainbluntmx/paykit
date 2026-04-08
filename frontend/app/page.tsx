"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
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
  const [status, setStatus] = useState("🔌 Conecta tu wallet para comenzar");
  const [agentName, setAgentName] = useState("");
  const [spendLimit, setSpendLimit] = useState("1");
  const [paymentMemo, setPaymentMemo] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("0.001");
  const [program, setProgram] = useState<Program | null>(null);

  // ─── Init Program ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setProgram(null);
      setAgents([]);
      setStatus("🔌 Conecta tu wallet para comenzar");
      return;
    }
    initProgram();
  }, [wallet.connected, wallet.publicKey]);

  async function initProgram() {
    try {
      const idlRes = await fetch("/idl/paykit.json");
      const idl = await idlRes.json();
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const prog = new Program(idl, provider);
      setProgram(prog);
      setStatus("✅ Wallet conectada — PayKit listo");
      await fetchAgents(prog);
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    }
  }

  // ─── Get Agent PDA ──────────────────────────────────────────────────────────

  function getAgentPDA(ownerPubkey: PublicKey, name: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), ownerPubkey.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    );
    return pda;
  }

  // ─── Register Agent ─────────────────────────────────────────────────────────

  async function handleRegisterAgent() {
    if (!program || !wallet.publicKey || !agentName) return;
    setLoading(true);
    setStatus("⏳ Registrando agente...");
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
      setStatus(`✅ Agente "${agentName}" registrado`);
      setAgentName("");
      await fetchAgents(program);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
    setLoading(false);
  }

  // ─── Record Payment ─────────────────────────────────────────────────────────

  async function handleRecordPayment() {
    if (!program || !wallet.publicKey || !selectedAgent || !paymentMemo) return;
    setLoading(true);
    setStatus("⏳ Registrando pago...");
    try {
      const agentPDA = getAgentPDA(wallet.publicKey, selectedAgent);
      const amountLamports = parseFloat(paymentAmount) * 1_000_000_000;
      const tx = await program.methods
        .recordPayment(new BN(amountLamports), wallet.publicKey, paymentMemo)
        .accounts({
          agent: agentPDA,
          owner: wallet.publicKey,
        })
        .rpc();
      setPayments((prev) => [
        {
          agent: selectedAgent,
          amount: parseFloat(paymentAmount),
          memo: paymentMemo,
          tx: tx.slice(0, 16) + "...",
        },
        ...prev,
      ]);
      setStatus("✅ Pago registrado onchain");
      setPaymentMemo("");
      await fetchAgents(program);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
    setLoading(false);
  }

  // ─── Fetch Agents ───────────────────────────────────────────────────────────

  async function fetchAgents(prog?: Program) {
    const p = prog || program;
    if (!p || !wallet.publicKey) return;
    try {
      const all = await (p.account as any).agentAccount.all([
        {
          memcmp: {
            offset: 8,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);
      setAgents(
        all.map((a: any) => ({
          pda: a.publicKey.toBase58(),
          name: a.account.name,
          owner: a.account.owner.toBase58(),
          spendLimit: a.account.spendLimit.toNumber(),
          totalSpent: a.account.totalSpent.toNumber(),
          paymentCount: a.account.paymentCount.toNumber(),
          isActive: a.account.isActive,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">

      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">⚡ PayKit</h1>
          <p className="text-gray-400 text-sm">
            Autonomous AI Agent Payments on Solana
          </p>
          <div className="mt-3 text-xs text-yellow-400 font-mono">{status}</div>
        </div>
        <WalletMultiButton style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "600",
          fontFamily: "monospace",
        }} />
      </div>

      {/* Content */}
      {!wallet.connected ? (
        <div className="flex flex-col items-center justify-center h-64 border border-gray-800 rounded-xl">
          <p className="text-gray-500 font-mono text-sm mb-4">
            Conecta tu wallet para interactuar con PayKit
          </p>
          <WalletMultiButton style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "monospace",
          }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Register Agent */}
          <div className="border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🤖 Registrar Agente</h2>
            <div className="space-y-3">
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                placeholder="Nombre del agente (ej: agent-001)"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <input
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                  placeholder="Spend limit"
                  type="number"
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(e.target.value)}
                />
                <span className="text-gray-500 text-sm">SOL</span>
              </div>
              <button
                onClick={handleRegisterAgent}
                disabled={loading || !agentName}
                className="w-full bg-white text-black font-semibold py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-40 transition"
              >
                {loading ? "Procesando..." : "Registrar Agente"}
              </button>
            </div>
          </div>

          {/* Record Payment */}
          <div className="border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">💸 Registrar Pago</h2>
            <div className="space-y-3">
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Selecciona un agente</option>
                {agents.map((a) => (
                  <option key={a.pda} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 items-center">
                <input
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                  placeholder="Monto"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <span className="text-gray-500 text-sm">SOL</span>
              </div>
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                placeholder="Memo (ej: API call payment)"
                value={paymentMemo}
                onChange={(e) => setPaymentMemo(e.target.value)}
              />
              <button
                onClick={handleRecordPayment}
                disabled={loading || !selectedAgent || !paymentMemo}
                className="w-full bg-white text-black font-semibold py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-40 transition"
              >
                {loading ? "Procesando..." : "Registrar Pago"}
              </button>
            </div>
          </div>

          {/* Agents List */}
          <div className="border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">🗂 Agentes Registrados</h2>
              <button
                onClick={() => fetchAgents()}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Actualizar
              </button>
            </div>
            {agents.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono">
                No hay agentes registrados aún.
              </p>
            ) : (
              <div className="space-y-3">
                {agents.map((a) => (
                  <div
                    key={a.pda}
                    className="bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">{a.name}</span>
                      <span className={a.isActive ? "text-green-400" : "text-red-400"}>
                        {a.isActive ? "● activo" : "● inactivo"}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      PDA: {a.pda.slice(0, 16)}...
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Limit: {(a.spendLimit / 1e9).toFixed(2)} SOL</span>
                      <span>Gastado: {(a.totalSpent / 1e9).toFixed(4)} SOL</span>
                      <span>Pagos: {a.paymentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments List */}
          <div className="border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📋 Pagos Recientes</h2>
            {payments.length === 0 ? (
              <p className="text-gray-600 text-sm font-mono">
                No hay pagos registrados aún.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((p, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">{p.memo}</span>
                      <span className="text-green-400">{p.amount} SOL</span>
                    </div>
                    <div className="text-gray-500">Agente: {p.agent}</div>
                    <div className="text-gray-600">TX: {p.tx}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-gray-700 text-xs font-mono">
        PayKit · Zero Two Labs · Solana Devnet ·{" "}
        {PROGRAM_ID.toBase58().slice(0, 16)}...
      </div>

    </main>
  );
}