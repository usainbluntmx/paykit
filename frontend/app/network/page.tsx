"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const AGENT_ACCOUNT_SIZE = 371;
const TIER_LABELS = ["BASIC", "STANDARD", "PREMIUM"];
const TIER_COLORS = ["#6aaa80", "#00ff88", "#ffb800"];
const REFRESH_INTERVAL = 15_000;

const CAP_LABELS: Record<number, string> = {
    0: "PAY", 1: "HIRE·B", 2: "HIRE·S", 3: "HIRE·P",
    4: "SOL", 5: "SPL", 6: "BATCH",
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

interface NetworkActivity {
    a2aCount24h: number;
    a2aVolume24h: number;   // lamports
    totalTxCount: number;
    lastA2aTx: string | null;
    loading: boolean;
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

    const [activity, setActivity] = useState<NetworkActivity>({
        a2aCount24h: 0,
        a2aVolume24h: 0,
        totalTxCount: 0,
        lastA2aTx: null,
        loading: true,
    });

    // ─── Fetch A2A activity from onchain tx history ─────────────────────────────

    const fetchActivity = useCallback(async () => {
        try {
            const cutoff = Date.now() / 1000 - 86400;
            const sigs = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 100 });
            if (sigs.length === 0) {
                setActivity({ a2aCount24h: 0, a2aVolume24h: 0, totalTxCount: 0, lastA2aTx: null, loading: false });
                return;
            }

            // Batch fetch — one round-trip instead of N sequential calls
            const BATCH = 25;
            const allTxs: (any | null)[] = [];
            for (let i = 0; i < sigs.length; i += BATCH) {
                const batch = sigs.slice(i, i + BATCH).map(s => s.signature);
                const results = await connection.getParsedTransactions(batch, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                });
                allTxs.push(...results);
            }

            let a2aCount = 0;
            let a2aVolume = 0;
            let lastA2aTx: string | null = null;

            allTxs.forEach((tx, idx) => {
                if (!tx?.meta?.logMessages) return;
                const sig = sigs[idx];
                if (!sig?.blockTime) return;

                const isA2A = tx.meta.logMessages.some((l: string) =>
                    l.includes("Instruction: AgentToAgentPayment")
                );
                if (!isA2A) return;

                if (!lastA2aTx) lastA2aTx = sig.signature;
                if (sig.blockTime > cutoff) {
                    a2aCount++;
                    const pre = tx.meta.preBalances || [];
                    const post = tx.meta.postBalances || [];
                    const maxDelta = pre.reduce((max: number, val: number, i: number) => {
                        const delta = val - (post[i] || 0);
                        return delta > max ? delta : max;
                    }, 0);
                    if (maxDelta > 0 && maxDelta < 1_000_000_000) {
                        a2aVolume += maxDelta;
                    }
                }
            });

            setActivity({
                a2aCount24h: a2aCount,
                a2aVolume24h: a2aVolume,
                totalTxCount: sigs.length,
                lastA2aTx,
                loading: false,
            });
        } catch {
            setActivity(prev => ({ ...prev, loading: false }));
        }
    }, [connection]);

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
        fetchActivity();
        const interval = setInterval(() => {
            fetchNetworkAgents();
            fetchActivity();
        }, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNetworkAgents, fetchActivity]);

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
        fontSize: "13px",
        padding: "5px 12px",
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
        padding: "9px 18px",
        background: "transparent",
        border: "1px solid rgba(0,255,136,0.25)",
        color: "#c8f0d8",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "13px",
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
                    <span onClick={() => router.push("/")} style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.08em", cursor: "pointer", textShadow: "0 0 20px rgba(0,255,136,0.35)" }}>
                        PAYKIT
                    </span>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", color: "#9aeab0", letterSpacing: "0.15em" }}>NETWORK</span>
                </div>
                <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                    {[
                        { label: "DEMO", path: "/demo" },
                        { label: "DASHBOARD", path: "/dashboard" },
                        { label: "DOCS", path: "/docs" },
                    ].map(item => (
                        <button key={item.label} onClick={() => router.push(item.path)}
                            style={{ background: "transparent", border: "none", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", letterSpacing: "0.1em", cursor: "pointer", transition: "color 0.2s" }}
                            onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = "#00ff88")}
                            onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = "#c8f0d8")}>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "26px", fontWeight: 700, color: "#00ff88", letterSpacing: "0.12em", marginBottom: "10px", textShadow: "0 0 24px rgba(0,255,136,0.3)" }}>
                    // NETWORK EXPLORER
                </div>
                <div style={{ fontSize: "16px", color: "#c8f0d8" }}>
                    All PayKit agents registered on Solana Devnet · live data
                </div>
            </div>

            {/* ── LIVE ACTIVITY — 24h A2A stats ──────────────────────────────── */}
            <div style={{ marginBottom: "16px", padding: "16px 20px", background: "rgba(0,255,136,0.02)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px rgba(0,255,136,0.6)", animation: "pulse-green 2s infinite", display: "inline-block" }} />
                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#00ff88", letterSpacing: "0.2em" }}>LIVE PROTOCOL ACTIVITY</span>
                    </div>
                    <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "26px", fontWeight: 700, color: "#00ff88", textShadow: "0 0 16px rgba(0,255,136,0.4)", lineHeight: 1 }}>
                                {activity.loading ? "..." : activity.a2aCount24h}
                            </div>
                            <div style={{ fontSize: "12px", color: "#9aeab0", letterSpacing: "0.12em", marginTop: "6px" }}>A2A PAYMENTS · 24H</div>
                        </div>
                        <div style={{ width: "1px", background: "rgba(0,255,136,0.1)" }} />
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "26px", fontWeight: 700, color: "#ffb800", textShadow: "0 0 16px rgba(255,184,0,0.3)", lineHeight: 1 }}>
                                {activity.loading ? "..." : `${fmtSOL(activity.a2aVolume24h)} SOL`}
                            </div>
                            <div style={{ fontSize: "12px", color: "#9aeab0", letterSpacing: "0.12em", marginTop: "6px" }}>A2A VOLUME · 24H</div>
                        </div>
                        <div style={{ width: "1px", background: "rgba(0,255,136,0.1)" }} />
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "26px", fontWeight: 700, color: "#9aeab0", lineHeight: 1 }}>
                                {activity.loading ? "..." : activity.totalTxCount}
                            </div>
                            <div style={{ fontSize: "12px", color: "#9aeab0", letterSpacing: "0.12em", marginTop: "6px" }}>RECENT TXS SCANNED</div>
                        </div>
                        {activity.lastA2aTx && (
                            <>
                                <div style={{ width: "1px", background: "rgba(0,255,136,0.1)" }} />
                                <div style={{ textAlign: "center" }}>
                                    <button
                                        onClick={() => window.open(`https://explorer.solana.com/tx/${activity.lastA2aTx}?cluster=devnet`, "_blank")}
                                        style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: "#c8f0d8", background: "transparent", border: "1px solid rgba(0,255,136,0.25)", padding: "6px 12px", borderRadius: "2px", cursor: "pointer", letterSpacing: "0.08em" }}
                                    >
                                        LAST A2A TX ↗
                                    </button>
                                    <div style={{ fontSize: "12px", color: "#6aaa80", letterSpacing: "0.1em", marginTop: "6px" }}>VIEW ON EXPLORER</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── AGGREGATE STATS ─────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "TOTAL AGENTS", value: loading ? "..." : agents.length.toString(), color: "#00ff88" },
                    { label: "ACTIVE", value: loading ? "..." : activeCount.toString(), color: "#00ff88" },
                    { label: "TOTAL PAYMENTS", value: loading ? "..." : totalPayments.toString(), color: "#ffb800" },
                    { label: "TOTAL VOLUME", value: loading ? "..." : `${fmtSOL(totalSpent)} SOL`, color: "#ffb800" },
                ].map(stat => (
                    <div key={stat.label} className="card-corner" style={card}>
                        <div style={{ fontSize: "13px", color: "#9aeab0", letterSpacing: "0.15em", marginBottom: "10px" }}>{stat.label}</div>
                        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "24px", fontWeight: 700, color: stat.color, textShadow: `0 0 16px ${stat.color}40` }}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters + refresh */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#9aeab0", letterSpacing: "0.1em" }}>TIER:</span>
                    {(["all", 0, 1, 2] as const).map(t => (
                        <button key={t} onClick={() => setFilterTier(t)} style={pill(filterTier === t)}>
                            {t === "all" ? "ALL" : TIER_LABELS[t]}
                        </button>
                    ))}
                    <span style={{ fontSize: "13px", color: "#9aeab0", letterSpacing: "0.1em", marginLeft: "8px" }}>STATUS:</span>
                    <button onClick={() => setFilterActive("all")} style={pill(filterActive === "all")}>ALL</button>
                    <button onClick={() => setFilterActive(true)} style={pill(filterActive === true)}>ACTIVE</button>
                    <button onClick={() => setFilterActive(false)} style={pill(filterActive === false, "#ff3c5a")}>INACTIVE</button>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#9aeab0", letterSpacing: "0.1em" }}>SORT:</span>
                    {(["payments", "spent", "name"] as const).map(s => (
                        <button key={s} onClick={() => setSortBy(s)} style={pill(sortBy === s)}>
                            {s.toUpperCase()}
                        </button>
                    ))}
                    <button onClick={() => { fetchNetworkAgents(); fetchActivity(); }} style={{ padding: "8px 18px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", letterSpacing: "0.1em", borderRadius: "3px", cursor: "pointer", marginLeft: "8px" }}>
                        ↻ REFRESH
                    </button>
                </div>
            </div>

            {/* Auto-refresh status */}
            <div style={{ fontSize: "13px", color: "#6aaa80", letterSpacing: "0.08em", marginBottom: "16px", display: "flex", gap: "16px" }}>
                {lastUpdate && <span>LAST UPDATE: {lastUpdate.toLocaleTimeString()}</span>}
                <span style={{ color: countdown <= 5 ? "#ffb800" : "#6aaa80" }}>AUTO-REFRESH IN {countdown}s</span>
                {error && <span style={{ color: "#ff3c5a" }}>✗ {error}</span>}
            </div>

            {/* Agent list */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9aeab0", fontFamily: "'Share Tech Mono', monospace", fontSize: "16px", letterSpacing: "0.1em" }}>
                    SCANNING DEVNET...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#6aaa80", fontFamily: "'Share Tech Mono', monospace", fontSize: "16px" }}>
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
                                        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "16px", color: "#00ff88", letterSpacing: "0.08em" }}>
                                            {agent.name}
                                        </span>
                                        <span style={{ fontSize: "12px", color: TIER_COLORS[agent.tier], border: `1px solid ${TIER_COLORS[agent.tier]}50`, padding: "2px 8px", borderRadius: "2px", fontFamily: "'Share Tech Mono', monospace" }}>
                                            {TIER_LABELS[agent.tier]}
                                        </span>
                                        <span style={{ fontSize: "14px", color: agent.isActive && !expired ? "#00ff88" : "#ff3c5a" }}>
                                            ● {expired ? "EXPIRED" : agent.isActive ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#c8f0d8" }}>
                                        <span>{agent.paymentCount} <span style={{ color: "#9aeab0" }}>TXS</span></span>
                                        <span style={{ color: "#ffb800" }}>{fmtSOL(agent.totalSpent)} <span style={{ color: "#9aeab0" }}>SOL SPENT</span></span>
                                        <span>{fmtSOL(agent.spendLimit)} <span style={{ color: "#9aeab0" }}>LIMIT</span></span>
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
                                    <div style={{ fontSize: "12px", color: "#6aaa80", marginTop: "4px", textAlign: "right" }}>
                                        {spendPct.toFixed(1)}% of limit used
                                    </div>
                                </div>

                                {/* Row 2: addresses + caps */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "8px" }}>
                                    <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "#9aeab0" }}>
                                        <span>AGENT <span style={{ color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace" }}>{fmtAddr(agent.agentKey)}</span></span>
                                        <span>OWNER <span style={{ color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace" }}>{fmtAddr(agent.owner)}</span></span>
                                        <span>DAILY <span style={{ color: "#c8f0d8" }}>{(agent.dailyLimitBps / 100).toFixed(0)}%</span></span>
                                        <span>EXP <span style={{ color: expired ? "#ff3c5a" : "#9aeab0" }}>{new Date(agent.expiresAt * 1000).toLocaleDateString()}</span></span>
                                    </div>
                                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                        {caps.map(cap => (
                                            <span key={cap} style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "2px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace" }}>
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
            <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid rgba(0,255,136,0.06)", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#9aeab0", letterSpacing: "0.08em" }}>
                <span>PAYKIT · ZERO TWO LABS · 2026</span>
                <span style={{ color: "#6aaa80" }}>{PROGRAM_ID.toBase58().slice(0, 20)}...</span>
            </div>

        </main>
    );
}
