"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("revealed"); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ─── Label component ─────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "13px", color: "#6aaa80", letterSpacing: "0.2em", marginBottom: "28px", textAlign: "center" }}>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const solutionRef = useReveal() as React.RefObject<HTMLElement>;
  const beforeAfterRef = useReveal() as React.RefObject<HTMLElement>;
  const terminalRef = useReveal() as React.RefObject<HTMLElement>;
  const solanaRef = useReveal() as React.RefObject<HTMLElement>;
  const ctaRef = useReveal() as React.RefObject<HTMLElement>;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── FIXED NAV ───────────────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50,
        background: scrolled ? "rgba(8,12,10,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,255,136,0.12)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 40px", height: "68px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: 900, color: "#00ff88", letterSpacing: "0.08em", textShadow: "0 0 20px rgba(0,255,136,0.4)", cursor: "pointer" }}
            onClick={() => router.push("/")}>
            PAYKIT
          </span>
          <nav style={{ display: "flex", alignItems: "center", gap: "36px" }}>
            {[
              { label: "DEMO", path: "/demo" },
              { label: "DASHBOARD", path: "/dashboard" },
              { label: "NETWORK", path: "/network" },
              { label: "DOCS", path: "/docs" },
            ].map(item => (
              <button key={item.label} onClick={() => router.push(item.path)}
                style={{ background: "transparent", border: "none", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", letterSpacing: "0.1em", cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#00ff88")}
                onMouseOut={e => (e.currentTarget.style.color = "#c8f0d8")}>
                {item.label}
              </button>
            ))}
            <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer"
              style={{ padding: "9px 22px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.4)", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", letterSpacing: "0.1em", borderRadius: "3px", textDecoration: "none", transition: "all 0.2s" }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,255,136,0.15)"; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,255,136,0.08)"; }}>
              GITHUB
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "160px 40px 110px", textAlign: "center" }}>
        <h1 className="animate-fade-in-lg stagger-1" style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(38px, 6.5vw, 76px)", fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1.1, marginBottom: "28px", textTransform: "uppercase" }}>
          THE PROTOCOL FOR<br />
          <span className="shimmer-text">AGENTIC ECONOMIES</span>
        </h1>

        <p className="animate-fade-in stagger-2" style={{ fontSize: "20px", color: "#c8f0d8", lineHeight: 1.9, maxWidth: "700px", margin: "0 auto 44px", fontFamily: "'Share Tech Mono', monospace" }}>
          Each agent owns its keypair · Signs its own transactions<br />
          Enforced spend limits · Verifiable onchain history
        </p>

        <div className="animate-fade-in stagger-3" style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/demo")}
            style={{ padding: "17px 52px", background: "#00ff88", border: "none", color: "#080c0a", fontFamily: "'Orbitron', monospace", fontSize: "15px", fontWeight: 700, letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", transition: "all 0.25s" }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 36px rgba(0,255,136,0.45)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            LIVE DEMO →
          </button>
          <button onClick={() => router.push("/docs")}
            style={{ padding: "16px 44px", background: "transparent", border: "1px solid rgba(0,255,136,0.35)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.12em", borderRadius: "3px", cursor: "pointer", transition: "all 0.25s" }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.7)"; (e.currentTarget as HTMLElement).style.color = "#00ff88"; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.35)"; (e.currentTarget as HTMLElement).style.color = "#c8f0d8"; }}>
            READ DOCS
          </button>
        </div>
      </section>

      {/* ── BENTO GRID ──────────────────────────────────────────────────────── */}
      <section ref={solutionRef as any} className="reveal" style={{ maxWidth: "1280px", margin: "0 auto 110px", padding: "0 40px" }}>
        <Label>// THE SOLUTION</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1px", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.12)" }}>

          {/* Feature 1 — large */}
          <div className="bento-card reveal-delay-1" style={{ gridColumn: "span 8", background: "var(--bg-card)", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "300px", border: "none" }}>
            <div>
              <div style={{ fontSize: "38px", marginBottom: "22px" }}>⚡</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", color: "#e8f5ee", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>Agent-Owned Keypairs</div>
              <p style={{ fontSize: "17px", color: "#c8f0d8", lineHeight: 1.85, maxWidth: "500px" }}>
                Every agent generates its own Solana keypair at creation. The agent signs its own payment transactions — your owner wallet is never touched after the initial registration.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: "#6aaa80", letterSpacing: "0.12em" }}>01 · IDENTITY</span>
              <div style={{ height: "1px", background: "rgba(0,255,136,0.15)", flex: 1, margin: "0 20px" }} />
              <div style={{ width: "8px", height: "8px", background: "#00ff88" }} />
            </div>
          </div>

          {/* Feature 2 — small */}
          <div className="bento-card reveal-delay-2" style={{ gridColumn: "span 4", background: "var(--bg-card)", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "none" }}>
            <div>
              <div style={{ fontSize: "38px", marginBottom: "22px" }}>🛡️</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "19px", color: "#e8f5ee", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>Enforced Spend Limits</div>
              <p style={{ fontSize: "16px", color: "#c8f0d8", lineHeight: 1.8 }}>Total and daily BPS limits enforced at the protocol level. Cannot be bypassed from any application layer.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: "#6aaa80", letterSpacing: "0.12em" }}>02 · SAFETY</span>
              <div style={{ width: "8px", height: "8px", border: "1px solid #00ff88" }} />
            </div>
          </div>

          {/* Feature 3 — small */}
          <div className="bento-card reveal-delay-3" style={{ gridColumn: "span 4", background: "var(--bg-card)", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "none" }}>
            <div>
              <div style={{ fontSize: "38px", marginBottom: "22px" }}>🔗</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "19px", color: "#e8f5ee", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>Agent-to-Agent</div>
              <p style={{ fontSize: "16px", color: "#c8f0d8", lineHeight: 1.8 }}>Agents pay agents autonomously. No owner involvement. Contract verifies capabilities and tier compatibility onchain.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: "#6aaa80", letterSpacing: "0.12em" }}>03 · AUTONOMY</span>
              <div style={{ width: "8px", height: "8px", border: "1px solid #00ff88" }} />
            </div>
          </div>

          {/* Feature 4 — large */}
          <div className="bento-card reveal-delay-4" style={{ gridColumn: "span 8", background: "#060a08", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "none" }}>
            <div>
              <div style={{ fontSize: "38px", marginBottom: "22px" }}>🌐</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "22px", color: "#e8f5ee", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>Any Language via REST</div>
              <p style={{ fontSize: "17px", color: "#c8f0d8", lineHeight: 1.85, maxWidth: "500px" }}>
                HTTP sidecar with 24 endpoints — use PayKit from Python, Go, Ruby, or any language. No Node.js required in your agent stack.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "22px", flexWrap: "wrap" }}>
              {["Node.js", "Python", "Go", "Ruby", "LangChain", "CrewAI"].map(lang => (
                <span key={lang} style={{ fontSize: "14px", padding: "6px 14px", border: "1px solid rgba(0,255,136,0.3)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", background: "rgba(0,255,136,0.06)", borderRadius: "2px", letterSpacing: "0.05em" }}>
                  {lang}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "13px", color: "#6aaa80", letterSpacing: "0.12em" }}>04 · INTEROP</span>
              <div style={{ height: "1px", background: "rgba(0,255,136,0.15)", flex: 1, margin: "0 20px" }} />
              <div style={{ width: "8px", height: "8px", background: "#00ff88" }} />
            </div>
          </div>

        </div>
      </section>

      {/* ── BEFORE / AFTER ──────────────────────────────────────────────────── */}
      <section ref={beforeAfterRef as any} className="reveal" style={{ maxWidth: "1280px", margin: "0 auto 110px", padding: "0 40px" }}>
        <Label>// OTHER SDKS VS PAYKIT</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.12)" }}>

          {/* Before */}
          <div className="animate-slide-left" style={{ background: "var(--bg-card)", padding: "44px" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "15px", color: "#ff3c5a", letterSpacing: "0.15em", marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", background: "#ff3c5a" }} />
              OTHER SDKS
            </div>
            <pre style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", lineHeight: 2.1, color: "#7a5a5a", margin: 0, whiteSpace: "pre-wrap" }}>{`// owner signs every payment
await ownerWallet.signTransaction(
  paymentTx
);

// agent has no identity
// no spend limits enforced
// no onchain payment history
// human required for every tx`}</pre>
          </div>

          {/* After */}
          <div className="animate-slide-right" style={{ background: "#060a08", padding: "44px", borderLeft: "2px solid #00ff88" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "15px", color: "#00ff88", letterSpacing: "0.15em", marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", background: "#00ff88" }} />
              PAYKIT
            </div>
            <pre style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", lineHeight: 2.1, color: "#c8f0d8", margin: 0, whiteSpace: "pre-wrap" }}>{`// agent signs autonomously
await client.agentToAgentPayment(
  "orchestrator",
  "executor",
  250_000,
  "inference task",
  CATEGORIES.INFERENCE
);`}</pre>
          </div>

        </div>
      </section>

      {/* ── TERMINAL ────────────────────────────────────────────────────────── */}
      <section ref={terminalRef as any} className="reveal" style={{ maxWidth: "1280px", margin: "0 auto 110px", padding: "0 40px" }}>
        <Label>// INTEGRATE IN MINUTES</Label>
        <div style={{ border: "1px solid rgba(0,255,136,0.18)", background: "#030806", boxShadow: "0 0 60px rgba(0,255,136,0.06)", animation: "glow-pulse 4s ease-in-out infinite" }}>

          {/* Terminal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "rgba(0,255,136,0.04)", borderBottom: "1px solid rgba(0,255,136,0.1)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: "13px", height: "13px", borderRadius: "50%", background: "rgba(255,60,90,0.5)" }} />
              <div style={{ width: "13px", height: "13px", borderRadius: "50%", background: "rgba(255,184,0,0.5)" }} />
              <div style={{ width: "13px", height: "13px", borderRadius: "50%", background: "rgba(0,255,136,0.5)" }} />
            </div>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", color: "#9aeab0", letterSpacing: "0.1em" }}>PAYKIT_QUICKSTART.JS</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", color: "#00ff88" }}>●</span>
          </div>

          {/* Code */}
          <div style={{ padding: "40px 44px", fontFamily: "'Share Tech Mono', monospace", fontSize: "16px", lineHeight: 2.2 }}>
            {[
              { n: 1, content: <span style={{ color: "#6aaa80" }}>// install</span> },
              { n: 2, content: <span style={{ color: "#e8f5ee" }}>npm install @paykit/sdk</span> },
              { n: 3, content: <span>&nbsp;</span> },
              { n: 4, content: <span style={{ color: "#6aaa80" }}>// create agent — generates keypair, registers onchain, funds wallet</span> },
              { n: 5, content: <span><span style={{ color: "#00ff88" }}>await </span><span style={{ color: "#e8f5ee" }}>client.</span><span style={{ color: "#00ff88" }}>createAutonomousAgent</span><span style={{ color: "#e8f5ee" }}>(</span><span style={{ color: "#ffb800" }}>"my-agent"</span><span style={{ color: "#e8f5ee" }}>, 1_000_000_000, 1000);</span></span> },
              { n: 6, content: <span>&nbsp;</span> },
              { n: 7, content: <span style={{ color: "#6aaa80" }}>// agent signs its own transactions — no human required</span> },
              { n: 8, content: <span><span style={{ color: "#00ff88" }}>await </span><span style={{ color: "#e8f5ee" }}>client.</span><span style={{ color: "#00ff88" }}>agentToAgentPayment</span><span style={{ color: "#e8f5ee" }}>(</span><span style={{ color: "#ffb800" }}>"agent-a"</span><span style={{ color: "#e8f5ee" }}>, </span><span style={{ color: "#ffb800" }}>"agent-b"</span><span style={{ color: "#e8f5ee" }}>, 250_000, </span><span style={{ color: "#ffb800" }}>"inference"</span><span style={{ color: "#e8f5ee" }}>, CATEGORIES.INFERENCE);</span></span> },
            ].map(({ n, content }) => (
              <div key={n} style={{ display: "flex", gap: "28px" }}>
                <span style={{ color: "rgba(0,255,136,0.2)", userSelect: "none", minWidth: "20px", textAlign: "right" }}>{n}</span>
                {content}
              </div>
            ))}

            {/* Callout */}
            <div style={{ marginTop: "32px", padding: "22px 28px", borderLeft: "3px solid #00ff88", background: "rgba(0,255,136,0.04)" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "15px", color: "#00ff88", letterSpacing: "0.1em", marginBottom: "10px" }}>BUILD THE AUTONOMOUS AGENT ECONOMY.</div>
              <div style={{ fontSize: "15px", color: "#c8f0d8", lineHeight: 1.8 }}>The first agent-native payment SDK on Solana. Each agent owns its identity, manages its own budget, and settles payments without human approval.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY SOLANA ──────────────────────────────────────────────────────── */}
      <section ref={solanaRef as any} className="reveal" style={{ maxWidth: "1280px", margin: "0 auto 110px", padding: "0 40px" }}>
        <Label>// WHY SOLANA</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.12)" }}>
          {[
            { metric: "~400ms", label: "FINALITY", sub: "Sub-second settlement for agents" },
            { metric: "$0.00025", label: "PER TX", sub: "Negligible cost per payment" },
            { metric: "65K+ TPS", label: "THROUGHPUT", sub: "Scales with your agent fleet" },
          ].map((item, i) => (
            <div key={item.label} className="bento-card" style={{ background: "var(--bg-card)", padding: "52px 44px", textAlign: "center", border: "none", animation: `count-up 0.6s ease ${i * 0.15}s both` }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 700, color: "#00ff88", textShadow: "0 0 28px rgba(0,255,136,0.3)", marginBottom: "12px" }}>
                {item.metric}
              </div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "15px", color: "#e8f5ee", letterSpacing: "0.15em", marginBottom: "8px" }}>{item.label}</div>
              <div style={{ fontSize: "14px", color: "#9aeab0", letterSpacing: "0.05em" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section ref={ctaRef as any} className="reveal" style={{ maxWidth: "1280px", margin: "0 auto 80px", padding: "88px 40px", textAlign: "center", borderTop: "1px solid rgba(0,255,136,0.1)", borderBottom: "1px solid rgba(0,255,136,0.1)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "700px", height: "350px", background: "rgba(0,255,136,0.035)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
        <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, color: "#e8f5ee", letterSpacing: "0.06em", marginBottom: "18px", textTransform: "uppercase", position: "relative" }}>
          Ready to <span style={{ color: "#00ff88", textShadow: "0 0 28px rgba(0,255,136,0.4)" }}>Automate</span>?
        </h2>
        <p style={{ fontSize: "18px", color: "#c8f0d8", marginBottom: "44px", fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.7, position: "relative" }}>
          Deploy your first autonomous agent in minutes.<br />No custodians. No approvals. Just code.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
          <button onClick={() => router.push("/demo")}
            style={{ padding: "17px 52px", background: "#00ff88", border: "none", color: "#080c0a", fontFamily: "'Orbitron', monospace", fontSize: "15px", fontWeight: 700, letterSpacing: "0.15em", borderRadius: "3px", cursor: "pointer", transition: "all 0.25s" }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 36px rgba(0,255,136,0.5)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            START BUILDING
          </button>
          <a href="https://github.com/usainbluntmx/paykit" target="_blank" rel="noopener noreferrer"
            style={{ padding: "16px 44px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#c8f0d8", fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.1em", borderRadius: "3px", textDecoration: "none", transition: "all 0.25s", display: "inline-flex", alignItems: "center" }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.5)"; (e.currentTarget as HTMLElement).style.color = "#00ff88"; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "#c8f0d8"; }}>
            VIEW ON GITHUB
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(0,255,136,0.08)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", color: "#9aeab0", letterSpacing: "0.1em" }}>
            PAYKIT · ZERO TWO LABS · 2026
          </span>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", color: "#9aeab0" }}>SOLANA FRONTIER HACKATHON</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "14px", color: "#00ff88" }}>F27DrerUQGnk...</span>
          </div>
        </div>
      </footer>

    </main>
  );
}
