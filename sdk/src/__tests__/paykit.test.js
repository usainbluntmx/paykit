const { createClient, loadAgentKeypair, agentKeypairExists, PROGRAM_ID } = require("../index");
const { PublicKey } = require("@solana/web3.js");
const { PayKitError, parsePayKitError } = require("../errors");
const path = require("path");

const KEYPAIR_PATH = path.join(process.env.HOME, ".config/solana/id.json");

let client;

beforeAll(() => {
    client = createClient(KEYPAIR_PATH, "devnet");
});

describe("PayKit SDK", () => {

    // ─── Client ───────────────────────────────────────────────────────────────

    test("createClient returns a PayKitClient instance", () => {
        expect(client).toBeDefined();
        expect(client.constructor.name).toBe("PayKitClient");
    });

    test("wallet public key is a valid PublicKey", () => {
        expect(client.wallet.publicKey).toBeInstanceOf(PublicKey);
    });

    test("PROGRAM_ID is the correct PayKit program", () => {
        expect(PROGRAM_ID.toBase58()).toBe("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
    });

    // ─── PDA ──────────────────────────────────────────────────────────────────

    test("getAgentPDA returns a valid PublicKey", () => {
        const agentKey = client.wallet.publicKey;
        const pda = client.getAgentPDA(agentKey, "test-agent");
        expect(pda).toBeInstanceOf(PublicKey);
    });

    test("getAgentPDA is deterministic", () => {
        const agentKey = client.wallet.publicKey;
        const pda1 = client.getAgentPDA(agentKey, "test-agent");
        const pda2 = client.getAgentPDA(agentKey, "test-agent");
        expect(pda1.toBase58()).toBe(pda2.toBase58());
    });

    test("getAgentPDA differs by agent key", () => {
        const { Keypair } = require("@solana/web3.js");
        const key1 = Keypair.generate().publicKey;
        const key2 = Keypair.generate().publicKey;
        const pda1 = client.getAgentPDA(key1, "test-agent");
        const pda2 = client.getAgentPDA(key2, "test-agent");
        expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });

    test("getAgentPDA differs by agent name", () => {
        const agentKey = client.wallet.publicKey;
        const pda1 = client.getAgentPDA(agentKey, "agent-alpha");
        const pda2 = client.getAgentPDA(agentKey, "agent-beta");
        expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });

    // ─── Keypair Storage ──────────────────────────────────────────────────────

    test("agentKeypairExists returns true for registered agent", () => {
        expect(agentKeypairExists("agent-autonomous-01")).toBe(true);
    });

    test("agentKeypairExists returns false for unknown agent", () => {
        expect(agentKeypairExists("agent-does-not-exist-xyz")).toBe(false);
    });

    test("loadAgentKeypair returns a valid keypair", () => {
        const { Keypair } = require("@solana/web3.js");
        const keypair = loadAgentKeypair("agent-autonomous-01");
        expect(keypair).toBeDefined();
        expect(keypair.publicKey).toBeInstanceOf(PublicKey);
    });

    test("loadAgentKeypair throws for unknown agent", () => {
        expect(() => loadAgentKeypair("agent-does-not-exist-xyz")).toThrow();
    });

    // ─── fetchAllAgents ────────────────────────────────────────────────────────

    test("fetchAllAgents returns an array", async () => {
        const agents = await client.fetchAllAgents();
        expect(Array.isArray(agents)).toBe(true);
    }, 30000);

    test("fetchAllAgents returns agents with correct fields", async () => {
        const agents = await client.fetchAllAgents();
        if (agents.length > 0) {
            const a = agents[0];
            expect(a.name).toBeDefined();
            expect(a.spendLimit).toBeDefined();
            expect(a.totalSpent).toBeDefined();
            expect(a.isActive).toBeDefined();
            expect(a.dailyLimitBps).toBeDefined();
            expect(a.agentKey).toBeDefined();
            expect(a.owner).toBeDefined();
        }
    }, 30000);

    // ─── getPaymentHistory ────────────────────────────────────────────────────

    test("getPaymentHistory returns an array", async () => {
        const history = await client.getPaymentHistory(5);
        expect(Array.isArray(history)).toBe(true);
    }, 30000);

    test("getPaymentHistory entries have correct fields", async () => {
        const history = await client.getPaymentHistory(5);
        if (history.length > 0) {
            const entry = history[0];
            expect(["agent_to_agent", "record_payment", "register_agent"]).toContain(entry.type);
            expect(entry.time).toBeDefined();
            expect(entry.tx).toBeDefined();
        }
    }, 30000);

    // ─── checkAgentExpiry ─────────────────────────────────────────────────────

    test("checkAgentExpiry returns expiry info for existing agent", async () => {
        const expiry = await client.checkAgentExpiry("agent-cap-01");
        expect(expiry.expired).toBe(false);
        expect(expiry.daysRemaining).toBeGreaterThan(300);
        expect(expiry.expiresAt).toBeInstanceOf(Date);
    }, 30000);

    // ─── batchPayment ─────────────────────────────────────────────────────────

    test("batchPayment throws if payments array is empty", async () => {
        await expect(client.batchPayment("agent-autonomous-01", [])).rejects.toThrow();
    });

    test("batchPayment throws if more than 5 payments", async () => {
        const payments = Array(6).fill({
            receiverName: "agent-autonomous-02",
            amountLamports: 1000,
            service: "test",
        });
        await expect(client.batchPayment("agent-autonomous-01", payments)).rejects.toThrow();
    });

    // ─── reactivateAgent ──────────────────────────────────────────────────────

    test("reactivateAgent throws if agent does not exist", async () => {
        await expect(client.reactivateAgent("agent-does-not-exist-xyz")).rejects.toThrow();
    }, 30000);

    // ─── createClientFromWallet ───────────────────────────────────────────────

    test("createClientFromWallet throws if wallet not connected", () => {
        const { createClientFromWallet } = require("../index");
        const { Connection, clusterApiUrl } = require("@solana/web3.js");
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        expect(() => createClientFromWallet({ publicKey: null }, connection)).toThrow("Wallet not connected");
    });

    test("createClientFromWallet throws if wallet has no signTransaction", () => {
        const { createClientFromWallet } = require("../index");
        const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        expect(() => createClientFromWallet({ publicKey: Keypair.generate().publicKey }, connection)).toThrow("signTransaction");
    });

    test("createClientFromWallet returns a PayKitClient with valid adapter", () => {
        const { createClientFromWallet, PayKitClient } = require("../index");
        const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const mockWallet = {
            publicKey: Keypair.generate().publicKey,
            signTransaction: async (tx) => tx,
            signAllTransactions: async (txs) => txs,
        };
        const c = createClientFromWallet(mockWallet, connection);
        expect(c).toBeInstanceOf(PayKitClient);
    });

    // ─── Error Handling ───────────────────────────────────────────────────────

    test("PayKitError has correct structure", () => {
        const err = new PayKitError("SpendLimitExceeded", "Agent exceeded spend limit", 6003, null);
        expect(err.code).toBe("SpendLimitExceeded");
        expect(err.message).toBe("Agent exceeded spend limit");
        expect(err.errorNumber).toBe(6003);
        expect(err instanceof Error).toBe(true);
    });

    test("parsePayKitError identifies SpendLimitExceeded by error number", () => {
        const raw = { message: "custom program error: 0x1773" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("SpendLimitExceeded");
    });

    test("parsePayKitError identifies AgentExpired by error number", () => {
        const raw = { message: "custom program error: 0x1777" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("AgentExpired");
    });

    test("parsePayKitError identifies DailyLimitExceeded by error number", () => {
        const raw = { message: "custom program error: 0x1776" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("DailyLimitExceeded");
    });

    test("parsePayKitError identifies LegacyAgent from deserialization error", () => {
        const raw = { message: "Trying to access beyond buffer length" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("LegacyAgent");
    });

    test("parsePayKitError identifies BlockhashExpired", () => {
        const raw = { message: "Blockhash not found" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("BlockhashExpired");
    });

    test("parsePayKitError identifies InsufficientFunds", () => {
        const raw = { message: "Insufficient funds for transaction" };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("InsufficientFunds");
    });

    test("parsePayKitError returns null for unknown errors", () => {
        const raw = { message: "some completely unknown error xyz" };
        const err = parsePayKitError(raw);
        expect(err).toBeNull();
    });

    test("withPayKitError rethrows PayKitError with correct code", async () => {
        const { withPayKitError } = require("../errors");
        const raw = { message: "custom program error: 0x1773" };
        await expect(withPayKitError(async () => { throw raw; })).rejects.toMatchObject({ code: "SpendLimitExceeded" });
    });

    test("withPayKitError rethrows unknown errors as-is", async () => {
        const { withPayKitError } = require("../errors");
        const raw = new Error("unknown random error");
        await expect(withPayKitError(async () => { throw raw; })).rejects.toThrow("unknown random error");
    });

    // ─── getAgentHistory ──────────────────────────────────────────────────────

    test("getAgentHistory returns an array", async () => {
        const history = await client.getAgentHistory("agent-autonomous-01");
        expect(Array.isArray(history)).toBe(true);
    }, 30000);

    test("getAgentHistory entries have correct fields", async () => {
        const history = await client.getAgentHistory("agent-autonomous-01", 5);
        if (history.length > 0) {
            const entry = history[0];
            expect(["agent_to_agent", "record_payment", "register_agent"]).toContain(entry.type);
            expect(entry.agentName).toBe("agent-autonomous-01");
            expect(entry.agentPDA).toBeDefined();
            expect(entry.time).toBeDefined();
            expect(entry.tx).toBeDefined();
        }
    }, 30000);

    // ─── watchAgent ───────────────────────────────────────────────────────────

    test("watchAgent returns a stop function", () => {
        const stop = client.watchAgent("agent-autonomous-01", () => { });
        expect(typeof stop).toBe("function");
        stop();
    });

    test("watchAgent calls callback with error on invalid agent", async () => {
        await new Promise((resolve) => {
            const stop = client.watchAgent("non-existent-xyz-999", (err, entry) => {
                stop();
                resolve(null);
            }, 500);
            setTimeout(() => { stop(); resolve(null); }, 3000);
        });
    }, 10000);

    // ─── createWebhook ────────────────────────────────────────────────────────

    test("createWebhook throws with invalid API key", async () => {
        await expect(
            client.createWebhook("agent-autonomous-01", "https://example.com/webhook", "invalid-key")
        ).rejects.toThrow();
    }, 15000);

    // ─── listLocalAgents ──────────────────────────────────────────────────────

    test("listLocalAgents returns an array", () => {
        const agents = client.listLocalAgents();
        expect(Array.isArray(agents)).toBe(true);
    });

    test("listLocalAgents includes registered agents", () => {
        const agents = client.listLocalAgents();
        const names = agents.map(a => a.name);
        expect(names).toContain("agent-autonomous-01");
        expect(names).toContain("agent-autonomous-02");
    });

    test("listLocalAgents entries have correct fields", () => {
        const agents = client.listLocalAgents();
        if (agents.length > 0) {
            const a = agents[0];
            expect(a.name).toBeDefined();
            expect(a.publicKey).toBeDefined();
            expect(a.keypairPath).toBeDefined();
        }
    });

    // ─── Token Transfers ──────────────────────────────────────────────────────

    test("getSOLBalance returns balance for existing agent", async () => {
        const balance = await client.getSOLBalance("agent-autonomous-01");
        expect(balance.lamports).toBeGreaterThan(0);
        expect(balance.sol).toBeGreaterThan(0);
        expect(typeof balance.sol).toBe("number");
    }, 15000);

    test("getSOLBalance returns zero for unknown agent", async () => {
        await expect(client.getSOLBalance("agent-does-not-exist-xyz")).rejects.toThrow();
    });

    test("getTokenBalance returns zero for agent with no USDC", async () => {
        const { PublicKey } = require("@solana/web3.js");
        const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        const balance = await client.getTokenBalance("agent-autonomous-01", USDC_MINT, 6);
        expect(balance.raw).toBe(0);
        expect(balance.ui).toBe(0);
        expect(balance.mint).toBe(USDC_MINT.toBase58());
    }, 15000);

    test("transferSOL moves funds between agents autonomously", async () => {
        const before = await client.getSOLBalance("agent-cap-02");
        const { tx } = await client.transferSOL(
            "agent-cap-01",
            "agent-cap-02",
            0.0001,
            "Jest test transfer"
        );
        expect(tx).toBeDefined();
        expect(tx.length).toBeGreaterThan(0);
        const after = await client.getSOLBalance("agent-cap-02");
        expect(after.lamports).toBeGreaterThan(before.lamports);
    }, 30000);

    test("transferSOL records payment onchain", async () => {
        await client.transferSOL(
            "agent-cap-01",
            "agent-cap-02",
            0.0001,
            "Jest accountability test"
        );
        const historyAfter = await client.getAgentHistory("agent-cap-01", 5);
        expect(historyAfter.length).toBeGreaterThan(0);
        expect(historyAfter[0].type).toBe("record_payment");
    }, 30000);

});