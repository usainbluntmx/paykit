"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const AGENT_ACCOUNT_SIZE = 371;
const TIER_LABELS = ["BASIC", "STANDARD", "PREMIUM"];
const TIER_COLORS = ["#6aaa80", "#00ff88", "#ffb800"];
const REFRESH_INTERVAL = 15_000; // 15s

const CAP_LABELS: Record<number, string> = {
    0: "PAY",
    1: "HIRE·B",
    2: "HIRE·S",
    3: "HIRE·P",
    4: "SOL",
    5: "SPL",
    6: "BATCH",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkAgent {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSOL(lamports: number) {
    return (lamports / 1e9).toFixed(4);
}

function fmtAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getActiveCaps(caps: number): string[] {
    return Object.entries(CAP_LABELS)
        .filter(([bit]) => caps & (1 << parseInt(bit)))
        .map(([, label]) => label);
}

function getSpendPct(spent: number, limit: number) {
    if (limit === 0) return 0;
    return Math.min(100, (spent / limit) * 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetworkPage() {
    const { connection } = useConnection();
    const router = useRouter();

    const [agents, setAgents] = useState<NetworkAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState("");
    const [sortBy, setSortBy] = useState<"payments" | "spent" | "name">("payments");
    const [filterTier, setFilterTier] = useState<number | "all">("all");
    const [filterActive, setFilterActive] = useState<boolean | "all">("all");
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

    // ─── Fetch all agents network-wide ─────────────────────────────────────────

    const fetchNetworkAgents = useCallback(async () => {
        try {
            const idlRes = await fetch(`/idl/paykit.json?v=${Date.now()}`);
            const idl = await idlRes.json();
            const dummyWallet = {
                publicKey: PublicKey.default,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs,
            };
            const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
            const program = new Program(idl, provider);

            const all = await (program.account as any).agentAccount.all([
                { dataSize: AGENT_ACCOUNT_SIZE },
            ]);

            const valid: NetworkAgent[] = all
                .filter((a: any) => {
                    try {
                        a.account.spendLimit.toNumber();
                        return a.account.capabilities !== undefined;
                    } catch { return false; }
                })
                .map((a: any) => ({
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
                }));

            setAgents(valid);
            setLastUpdate(new Date());
            setError("");
        } catch (e: any) {
            setError(e.message?.slice(0, 80) || "fetch failed");
        } finally {
            setLoading(false);
            setCountdown(REFRESH_INTERVAL / 1000);
        }
    }, [connection]);

    useEffect(() => {
        fetchNetworkAgents();
        const interval = setInterval(fetchNetworkAgents, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNetworkAgents]);

    // Countdown ticker
    useEffect(() => {
        const tick = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL / 1000 : prev - 1));
        }, 1000);
        return () => clearInterval(tick);
    }, []);

    // ─── Derived data ──────────────────────────────────────────────────────────

    const filtered = agents
        .filter(a => filterTier === "all" || a.tier === filterTier)
        .filter(a => filterActive === "all" || a.isActive === filterActive)
        .sort((a, b) => {
            if (sortBy === "payments") return b.paymentCount - a.paymentCount;
            if (sortBy === "spent") return b.totalSpent - a.totalSpent;
            return a.name.localeCompare(b.name);
        });

    const totalPayments = agents.reduce((s, a) => s + a.paymentCount, 0);
    const totalSpent = agents.reduce((s, a) => s + a.totalSpent, 0);
    const activeCount = agents.filter(a => a.isActive).length;

    // ─── Styles ────────────────────────────────────────────────────────────────

    const card = {
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px",
        position: "relative" as const,
    };

    const pill = (active: boolean, color = "#00ff88") => ({
        fontSize: "11px",
        padding: "3px 8px",
        borderRadius: "2px",
        fontFamily: "'Share Tech Mono', monospace",
        letterSpacing: "0.05em",
        border: `1px solid ${active ? `${color}50` : "rgba(0,255,136,0.1)"}`,
        background: active ? `${color}12` : "transparent",
        color: active ? color : "#3a6a4a",
        cursor: "pointer",
        transition: "all 0.15s",
    });

    const btnStyle = {
        padding: "8px 16px",
        background: "transparent",
        border: "1px solid rgba(0,255,136,0.25)",
        color: "#9aeab0",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "12px",
        letterSpacing: "0.1em",
        borderRadius: "3px",
        cursor: "pointer",
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <main style={{ minHeight: "100vh", padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>

            {/* Nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span
                        onClick={() => router.push("/")}
                        style={{ fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.1em", cursor: "pointer", textShadow: "0 0 20px rgba(0,255,136,0.3)" }}
                    >
                        PAYKIT
                    </span>
                    <span style={{ color: "rgba(0,255,136,0.3)" }}>·</span>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#9aeab0", letterSpacing: "0.15em" }}>NETWORK</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {[
                        { label: "DEMO", path: "/demo" },
                        { label: "DASHBOARD", path: "/dashboard" },
                        { label: "DOCS", path: "/docs" },
                    ].map(item => (
                        <button key={item.label} onClick={() => router.push(item.path)} style={btnStyle}>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: 700, color: "#00ff88", letterSpacing: "0.12em", marginBottom: "6px", textShadow: "0 0 24px rgba(0,255,136,0.3)" }}>
          // NETWORK EXPLORER
                </div>
                <div style={{ fontSize: "14px", color: "#9aeab0" }}>
                    All PayKit agents registered on Solana Devnet · live data
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "TOTAL AGENTS", value: loading ? "..." : agents.length.toString(), color: "#00ff88" },
                    { label: "ACTIVE", value: loading ? "..." : activeCount.toString(), color: "#00ff88" },
                    { label: "TOTAL PAYMENTS", value: loading ? "..." : totalPayments.toString(), color: "#ffb800" },
                    { label: "TOTAL VOLUME", value: loading ? "..." : `${fmtSOL(totalSpent)} SOL`, color: "#ffb800" },
                ].map(stat => (
                    <div key={stat.label} className="card-corner" style={card}>
                        <div style={{ fontSize: "11px", color: "#6aaa80", letterSpacing: "0.15em", marginBottom: "8px" }}>{stat.label}</div>
                        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "20px", fontWeight: 700, color: stat.color, textShadow: `0 0 16px ${stat.color}40` }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters + refresh */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em" }}>TIER:</span>
                    {(["all", 0, 1, 2] as const).map(t => (
                        <button key={t} onClick={() => setFilterTier(t)} style={pill(filterTier === t)}>
                            {t === "all" ? "ALL" : TIER_LABELS[t]}
                        </button>
                    ))}
                    <span style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em", marginLeft: "8px" }}>STATUS:</span>
                    <button onClick={() => setFilterActive("all")} style={pill(filterActive === "all")}>ALL</button>
                    <button onClick={() => setFilterActive(true)} style={pill(filterActive === true)}>ACTIVE</button>
                    <button onClick={() => setFilterActive(false)} style={pill(filterActive === false, "#ff3c5a")}>INACTIVE</button>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em" }}>SORT:</span>
                    {(["payments", "spent", "name"] as const).map(s => (
                        <button key={s} onClick={() => setSortBy(s)} style={pill(sortBy === s)}>
                            {s.toUpperCase()}
                        </button>
                    ))}
                    <button onClick={fetchNetworkAgents} style={{ ...btnStyle, marginLeft: "8px" }}>
                        ↻ REFRESH
                    </button>
                </div>
            </div>

            {/* Auto-refresh status */}
            <div style={{ fontSize: "11px", color: "#3a6a4a", letterSpacing: "0.08em", marginBottom: "16px", display: "flex", gap: "16px" }}>
                {lastUpdate && <span>LAST UPDATE: {lastUpdate.toLocaleTimeString()}</span>}
                <span style={{ color: countdown <= 5 ? "#ffb800" : "#3a6a4a" }}>AUTO-REFRESH IN {countdown}s</span>
                {error && <span style={{ color: "#ff3c5a" }}>✗ {error}</span>}
            </div>

            {/* Agent table */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>
                    SCANNING DEVNET...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#3a6a4a", fontFamily: "'Share Tech Mono', monospace" }}>
                    NO AGENTS FOUND
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filtered.map(agent => {
                        const spendPct = getSpendPct(agent.totalSpent, agent.spendLimit);
                        const expired = agent.expiresAt * 1000 < Date.now();
                        const caps = getActiveCaps(agent.capabilities);

                        return (
                            <div
                                key={agent.pda}
                                className="card-corner"
                                style={{
                                    ...card,
                                    borderColor: agent.isActive && !expired ? "rgba(0,255,136,0.18)" : "rgba(255,60,90,0.15)",
                                    transition: "border-color 0.2s",
                                }}
                            >
                                {/* Row 1: name + tier + status */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", color: "#00ff88", letterSpacing: "0.08em" }}>
                                            {agent.name}
                                        </span>
                                        <span style={{ fontSize: "10px", color: TIER_COLORS[agent.tier], border: `1px solid ${TIER_COLORS[agent.tier]}40`, padding: "1px 6px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace" }}>
                                            {TIER_LABELS[agent.tier]}
                                        </span>
                                        <span style={{ fontSize: "11px", color: agent.isActive && !expired ? "#00ff88" : "#ff3c5a" }}>
                                            ● {expired ? "EXPIRED" : agent.isActive ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#9aeab0" }}>
                                        <span>{agent.paymentCount} <span style={{ color: "#6aaa80" }}>TXS</span></span>
                                        <span style={{ color: "#ffb800" }}>{fmtSOL(agent.totalSpent)} <span style={{ color: "#6aaa80" }}>SOL SPENT</span></span>
                                        <span>{fmtSOL(agent.spendLimit)} <span style={{ color: "#6aaa80" }}>LIMIT</span></span>
                                    </div>
                                </div>

                                {/* Spend bar */}
                                <div style={{ marginBottom: "12px" }}>
                                    <div style={{ height: "3px", background: "rgba(0,255,136,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%",
                                            width: `${spendPct}%`,
                                            background: spendPct > 80 ? "#ff3c5a" : spendPct > 50 ? "#ffb800" : "#00ff88",
                                            borderRadius: "2px",
                                            transition: "width 0.4s ease",
                                            boxShadow: `0 0 6px ${spendPct > 80 ? "#ff3c5a" : spendPct > 50 ? "#ffb800" : "#00ff88"}60`,
                                        }} />
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#3a6a4a", marginTop: "3px", textAlign: "right" }}>
                                        {spendPct.toFixed(1)}% of limit used
                                    </div>
                                </div>

                                {/* Row 2: addresses + caps */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "8px" }}>
                                    <div style={{ display: "flex", gap: "20px", fontSize: "11px", color: "#6aaa80" }}>
                                        <span>AGENT <span style={{ color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace" }}>{fmtAddr(agent.agentKey)}</span></span>
                                        <span>OWNER <span style={{ color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace" }}>{fmtAddr(agent.owner)}</span></span>
                                        <span>DAILY <span style={{ color: "#9aeab0" }}>{(agent.dailyLimitBps / 100).toFixed(0)}%</span></span>
                                        <span>EXP <span style={{ color: expired ? "#ff3c5a" : "#6aaa80" }}>{new Date(agent.expiresAt * 1000).toLocaleDateString()}</span></span>
                                    </div>
                                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                        {caps.map(cap => (
                                            <span key={cap} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "2px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace" }}>
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid rgba(0,255,136,0.06)", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#3a6a4a", letterSpacing: "0.08em" }}>
                <span>PAYKIT · ZERO TWO LABS · 2026</span>
                <span>{PROGRAM_ID.toBase58().slice(0, 20)}...</span>
            </div>

        </main>
    );
}