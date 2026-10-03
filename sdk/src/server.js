#!/usr/bin/env node

// ─── PayKit Sidecar HTTP Server ───────────────────────────────────────────────
// Exposes the PayKit SDK as a REST API so agents in any language can use it.
// Run: node src/server.js [port] [keypair-path] [cluster]

const http = require("http");
const path = require("path");
const os = require("os");
const {
    createClient,
    CAPABILITIES,
    CAP_ALL_DEFAULT,
    CATEGORIES,
    CATEGORY_NAMES,
    agentKeypairExists,
    solToLamports,
} = require("./index");

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.argv[2]) || 3333;
const KEYPAIR = process.argv[3] || path.join(os.homedir(), ".config/solana/id.json");
const CLUSTER = process.argv[4] || "devnet";

const client = createClient(KEYPAIR, CLUSTER);

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ─── Router ───────────────────────────────────────────────────────────────────

const routes = {};

function route(method, path, handler) {
    routes[`${method} ${path}`] = handler;
}

function matchRoute(method, url) {
    // Exact match
    const exact = `${method} ${url}`;
    if (routes[exact]) return { handler: routes[exact], params: {} };

    // Pattern match — e.g. /agent/:name
    for (const [key, handler] of Object.entries(routes)) {
        const [rMethod, rPath] = key.split(" ");
        if (rMethod !== method) continue;

        const rParts = rPath.split("/");
        const uParts = url.split("/");
        if (rParts.length !== uParts.length) continue;

        const params = {};
        let match = true;
        for (let i = 0; i < rParts.length; i++) {
            if (rParts[i].startsWith(":")) {
                params[rParts[i].slice(1)] = uParts[i];
            } else if (rParts[i] !== uParts[i]) {
                match = false; break;
            }
        }
        if (match) return { handler, params };
    }
    return null;
}

// ─── Request helpers ──────────────────────────────────────────────────────────

// CORS allowlist — empty by default. Non-browser clients (curl, the CLI, a
// Python script) never send an Origin header, so they are unaffected either
// way; this only matters for requests made from inside a browser tab. Set
// PAYKIT_SIDECAR_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
// if you need a local frontend dev server to call this sidecar directly.
const ALLOWED_ORIGINS = new Set(
    (process.env.PAYKIT_SIDECAR_ALLOWED_ORIGINS || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
);

function corsOriginFor(req) {
    const origin = req.headers.origin;
    if (!origin) return null; // no Origin header — not a CORS request
    return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

const MAX_BODY_BYTES = 1_000_000; // 1 MB — see PAYKIT-SEC-002

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        let bytes = 0;
        let aborted = false;
        req.on("data", chunk => {
            if (aborted) return;
            bytes += chunk.length;
            if (bytes > MAX_BODY_BYTES) {
                aborted = true;
                req.destroy();
                reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`));
                return;
            }
            data += chunk;
        });
        req.on("end", () => {
            if (aborted) return;
            try { resolve(data ? JSON.parse(data) : {}); }
            catch { reject(new Error("Invalid JSON body")); }
        });
        req.on("error", reject);
    });
}

function send(res, status, body, corsOrigin) {
    const json = JSON.stringify(body, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
    );
    const headers = { "Content-Type": "application/json" };
    if (corsOrigin) {
        headers["Access-Control-Allow-Origin"] = corsOrigin;
        headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
        headers["Vary"] = "Origin";
    }
    res.writeHead(status, headers);
    res.end(json);
}

function ok(res, body, corsOrigin) { send(res, 200, body, corsOrigin); }
function err(res, msg, status = 400, corsOrigin) { send(res, status, { error: msg }, corsOrigin); }

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(method, url, status, ms) {
    const color = status < 300 ? C.green : status < 400 ? C.yellow : C.red;
    console.log(
        `  ${color(status)} ${C.cyan(method.padEnd(6))} ${url.padEnd(40)} ${C.dim(ms + "ms")}`
    );
}

// ─── Routes — Agent Management ────────────────────────────────────────────────

route("POST", "/agent/create", async (req, body) => {
    const {
        name, spendLimitSOL = 1, dailyLimitBps = 1000,
        fundingSOL = 0.01, capabilities = CAP_ALL_DEFAULT, tier = 0
    } = body;

    if (!name) throw new Error("name is required");

    const result = await client.createAutonomousAgent(
        name,
        solToLamports(spendLimitSOL),
        dailyLimitBps,
        solToLamports(fundingSOL),
        capabilities,
        tier
    );

    return {
        tx: result.tx,
        agentPDA: result.agentPDA.toBase58(),
        agentPublicKey: result.agentPublicKey.toBase58(),
        keypairPath: result.keypairPath,
        capabilities: result.capabilities,
        tier: result.tier,
    };
});

route("GET", "/agent/:name", async (req, body, params) => {
    const agent = await client.fetchAgent(params.name);
    const expiry = await client.checkAgentExpiry(params.name);
    const balance = await client.getSOLBalance(params.name);
    const decoded = client.decodeCapabilities(agent.capabilities);

    return {
        name: agent.name,
        agentKey: agent.agentKey.toBase58(),
        owner: agent.owner.toBase58(),
        pda: agent.pda.toBase58(),
        spendLimit: agent.spendLimit.toString(),
        totalSpent: agent.totalSpent.toString(),
        paymentCount: agent.paymentCount.toString(),
        isActive: agent.isActive,
        dailyLimitBps: agent.dailyLimitBps,
        capabilities: agent.capabilities,
        capabilitiesDecoded: decoded,
        tier: agent.tier,
        expiresAt: expiry.expiresAt.toISOString(),
        daysRemaining: expiry.daysRemaining,
        expired: expiry.expired,
        solBalance: balance.sol,
    };
});

route("GET", "/agents", async (req, body) => {
    const agents = await client.fetchAllAgents();
    return {
        count: agents.length,
        agents: agents.map(a => ({
            name: a.name,
            agentKey: a.agentKey.toBase58(),
            pda: a.pda.toBase58(),
            isActive: a.isActive,
            tier: a.tier,
            capabilities: a.capabilities,
            totalSpent: a.totalSpent.toString(),
            spendLimit: a.spendLimit.toString(),
        })),
    };
});

route("GET", "/agents/local", async (req, body) => {
    const agents = client.listLocalAgents();
    return { count: agents.length, agents };
});

// ─── Routes — Payments ────────────────────────────────────────────────────────

route("POST", "/pay", async (req, body) => {
    const { sender, recipient, amountSOL, memo, categoryId = 0 } = body;
    if (!sender) throw new Error("sender is required");
    if (!recipient) throw new Error("recipient is required");
    if (!amountSOL) throw new Error("amountSOL is required");
    if (!memo) throw new Error("memo is required");

    const { PublicKey } = require("@solana/web3.js");
    const { tx } = await client.recordPayment(
        sender,
        solToLamports(amountSOL),
        new PublicKey(recipient),
        memo,
        categoryId
    );
    return { tx, sender, recipient, amountSOL, memo, categoryId };
});

route("POST", "/pay/agent-to-agent", async (req, body) => {
    const { sender, receiver, amountSOL, service, categoryId = 0 } = body;
    if (!sender) throw new Error("sender is required");
    if (!receiver) throw new Error("receiver is required");
    if (!amountSOL) throw new Error("amountSOL is required");
    if (!service) throw new Error("service is required");

    const { tx } = await client.agentToAgentPayment(
        sender,
        receiver,
        solToLamports(amountSOL),
        service,
        categoryId
    );
    return { tx, sender, receiver, amountSOL, service, categoryId };
});

route("POST", "/pay/batch", async (req, body) => {
    const { sender, payments } = body;
    if (!sender) throw new Error("sender is required");
    if (!payments || !Array.isArray(payments)) throw new Error("payments array is required");

    const normalized = payments.map(p => ({
        receiverName: p.receiverName || p.receiver,
        amountLamports: solToLamports(p.amountSOL || 0),
        service: p.service,
    }));

    const { tx, count } = await client.batchPayment(sender, normalized);
    return { tx, sender, count };
});

route("POST", "/pay/sol", async (req, body) => {
    const { sender, receiver, amountSOL, memo } = body;
    if (!sender) throw new Error("sender is required");
    if (!receiver) throw new Error("receiver is required");
    if (!amountSOL) throw new Error("amountSOL is required");
    if (!memo) throw new Error("memo is required");

    const { tx } = await client.transferSOL(sender, receiver, amountSOL, memo);
    return { tx, sender, receiver, amountSOL, memo };
});

route("POST", "/pay/usdc", async (req, body) => {
    const { sender, receiver, amountUSDC, memo } = body;
    if (!sender) throw new Error("sender is required");
    if (!receiver) throw new Error("receiver is required");
    if (!amountUSDC) throw new Error("amountUSDC is required");
    if (!memo) throw new Error("memo is required");

    const { tx } = await client.transferUSDC(sender, receiver, amountUSDC, memo);
    return { tx, sender, receiver, amountUSDC, memo };
});

route("POST", "/pay/spl", async (req, body) => {
    const { sender, receiver, amount, mint, decimals = 6, memo } = body;
    if (!sender) throw new Error("sender is required");
    if (!receiver) throw new Error("receiver is required");
    if (!amount) throw new Error("amount is required");
    if (!mint) throw new Error("mint is required");
    if (!memo) throw new Error("memo is required");

    const { PublicKey } = require("@solana/web3.js");
    const { tx } = await client.transferSPL(
        sender, receiver, amount, new PublicKey(mint), decimals, memo
    );
    return { tx, sender, receiver, amount, mint, memo };
});

// ─── Routes — Balances ────────────────────────────────────────────────────────

route("GET", "/balance/:name/sol", async (req, body, params) => {
    const balance = await client.getSOLBalance(params.name);
    return { agent: params.name, ...balance };
});

route("GET", "/balance/:name/usdc", async (req, body, params) => {
    const { PublicKey } = require("@solana/web3.js");
    const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    const balance = await client.getTokenBalance(params.name, USDC_MINT, 6);
    return { agent: params.name, ...balance };
});

// ─── Routes — History ─────────────────────────────────────────────────────────

route("GET", "/history/:name", async (req, body, params) => {
    const url = new URL("http://x" + req.url);
    const limit = parseInt(url.searchParams.get("limit")) || 20;
    const history = await client.getAgentHistory(params.name, limit);
    return { agent: params.name, count: history.length, history };
});

route("GET", "/history", async (req, body) => {
    const url = new URL("http://x" + req.url);
    const limit = parseInt(url.searchParams.get("limit")) || 20;
    const history = await client.getPaymentHistory(limit);
    return { count: history.length, history };
});

// ─── Routes — Capabilities ────────────────────────────────────────────────────

route("POST", "/agent/:name/capabilities", async (req, body, params) => {
    const { capabilities } = body;
    if (capabilities === undefined) throw new Error("capabilities bitmask is required");
    const { tx } = await client.setCapabilities(params.name, capabilities);
    const decoded = client.decodeCapabilities(capabilities);
    return { tx, agent: params.name, capabilities, decoded };
});

route("POST", "/agent/:name/tier", async (req, body, params) => {
    const { tier } = body;
    if (tier === undefined) throw new Error("tier is required (0, 1, or 2)");
    const { tx } = await client.setTier(params.name, tier);
    return { tx, agent: params.name, tier };
});

route("POST", "/agent/:name/category-limit", async (req, body, params) => {
    const { categoryId, limitSOL, customName } = body;
    if (categoryId === undefined) throw new Error("categoryId is required");
    if (!limitSOL) throw new Error("limitSOL is required");
    const limitLamports = solToLamports(limitSOL);
    const { tx } = await client.setCategoryLimit(params.name, categoryId, limitLamports, customName);
    return { tx, agent: params.name, categoryId, limitSOL };
});

route("POST", "/agent/:name/custom-capability", async (req, body, params) => {
    const { slot, name, enabled = true } = body;
    if (slot === undefined) throw new Error("slot is required (0-7)");
    if (!name) throw new Error("name is required");
    const { tx } = await client.setCustomCapability(params.name, slot, name, enabled);
    return { tx, agent: params.name, slot, name, enabled };
});

// ─── Routes — Admin ───────────────────────────────────────────────────────────

route("POST", "/agent/:name/deactivate", async (req, body, params) => {
    const { tx } = await client.deactivateAgent(params.name);
    return { tx, agent: params.name, isActive: false };
});

route("POST", "/agent/:name/reactivate", async (req, body, params) => {
    const { tx } = await client.reactivateAgent(params.name);
    return { tx, agent: params.name, isActive: true };
});

route("POST", "/agent/:name/renew", async (req, body, params) => {
    const { extensionDays = 365 } = body;
    const extensionSeconds = extensionDays * 86400;
    const { tx } = await client.renewAgent(params.name, extensionSeconds);
    return { tx, agent: params.name, extensionDays };
});

route("POST", "/agent/:name/spend-limit", async (req, body, params) => {
    const { limitSOL } = body;
    if (!limitSOL) throw new Error("limitSOL is required");
    const { tx } = await client.updateSpendLimit(params.name, solToLamports(limitSOL));
    return { tx, agent: params.name, limitSOL };
});

// ─── Routes — Meta ────────────────────────────────────────────────────────────

route("GET", "/health", async () => ({
    status: "ok",
    cluster: CLUSTER,
    owner: client.wallet.publicKey.toBase58(),
    timestamp: new Date().toISOString(),
}));

route("GET", "/capabilities", async () => ({
    predefined: CAPABILITIES,
    allDefault: CAP_ALL_DEFAULT,
    categories: CATEGORIES,
    categoryNames: CATEGORY_NAMES,
}));

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    const start = Date.now();
    const url = req.url.split("?")[0];
    const corsOrigin = corsOriginFor(req); // computed once per request — no shared mutable state

    // CORS preflight
    if (req.method === "OPTIONS") {
        send(res, 204, {}, corsOrigin);
        return;
    }

    const match = matchRoute(req.method, url);
    if (!match) {
        log(req.method, url, 404, Date.now() - start);
        return err(res, `Route not found: ${req.method} ${url}`, 404, corsOrigin);
    }

    try {
        const body = req.method !== "GET" ? await readBody(req) : {};
        const result = await match.handler(req, body, match.params);
        log(req.method, url, 200, Date.now() - start);
        ok(res, result, corsOrigin);
    } catch (e) {
        log(req.method, url, 400, Date.now() - start);
        err(res, e.message || e.code || "Unknown error", 400, corsOrigin);
    }
});

// Loopback only — this sidecar signs transactions with the owner's keypair and
// has no authentication. Binding to 0.0.0.0 would expose it to the local network
// (and, on a misconfigured firewall/router, beyond it). See PAYKIT-SEC-002.
const HOST = "127.0.0.1";

server.listen(PORT, HOST, () => {
    console.log();
    console.log(C.green(C.bold("  ⚡ PAYKIT SIDECAR")));
    console.log(C.dim("  Autonomous AI Agent Payment Protocol · Solana"));
    console.log();
    console.log(`  ${C.dim("Port:")}    ${C.cyan(PORT)}`);
    console.log(`  ${C.dim("Host:")}    ${C.cyan(HOST)} ${C.dim("(loopback only — not reachable from other devices)")}`);
    console.log(`  ${C.dim("Cluster:")} ${C.cyan(CLUSTER)}`);
    console.log(`  ${C.dim("Owner:")}   ${C.cyan(client.wallet.publicKey.toBase58())}`);
    console.log(`  ${C.dim("CORS:")}    ${ALLOWED_ORIGINS.size ? C.cyan([...ALLOWED_ORIGINS].join(", ")) : C.dim("no origins allowed (browser requests will be blocked)")}`);
    console.log();
    console.log(C.dim("  ─────────────────────────────────────────────────────────"));
    console.log(C.dim("  ENDPOINTS"));
    console.log(C.dim("  ─────────────────────────────────────────────────────────"));
    console.log(`  ${C.cyan("POST")}   /agent/create`);
    console.log(`  ${C.cyan("GET")}    /agent/:name`);
    console.log(`  ${C.cyan("GET")}    /agents`);
    console.log(`  ${C.cyan("GET")}    /agents/local`);
    console.log(`  ${C.cyan("POST")}   /pay`);
    console.log(`  ${C.cyan("POST")}   /pay/agent-to-agent`);
    console.log(`  ${C.cyan("POST")}   /pay/batch`);
    console.log(`  ${C.cyan("POST")}   /pay/sol`);
    console.log(`  ${C.cyan("POST")}   /pay/usdc`);
    console.log(`  ${C.cyan("POST")}   /pay/spl`);
    console.log(`  ${C.cyan("GET")}    /balance/:name/sol`);
    console.log(`  ${C.cyan("GET")}    /balance/:name/usdc`);
    console.log(`  ${C.cyan("GET")}    /history/:name`);
    console.log(`  ${C.cyan("GET")}    /history`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/capabilities`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/tier`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/category-limit`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/custom-capability`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/deactivate`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/reactivate`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/renew`);
    console.log(`  ${C.cyan("POST")}   /agent/:name/spend-limit`);
    console.log(`  ${C.cyan("GET")}    /health`);
    console.log(`  ${C.cyan("GET")}    /capabilities`);
    console.log();
    console.log(C.dim("  Waiting for requests..."));
    console.log();
});

module.exports = server;
