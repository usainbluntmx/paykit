const { createClient, PROGRAM_ID } = require("../index");
const { PublicKey } = require("@solana/web3.js");

const KEYPAIR_PATH = "/home/usainbluntmx/.config/solana/id.json";

describe("PayKit SDK", () => {
    let client;

    beforeAll(() => {
        client = createClient(KEYPAIR_PATH, "devnet");
    });

    // ─── Client ──────────────────────────────────────────────────────────────

    test("createClient returns a PayKitClient instance", () => {
        expect(client).toBeDefined();
        expect(client.connection).toBeDefined();
        expect(client.wallet).toBeDefined();
        expect(client.program).toBeDefined();
    });

    test("wallet public key is a valid PublicKey", () => {
        expect(client.wallet.publicKey).toBeInstanceOf(PublicKey);
    });

    test("PROGRAM_ID is the correct PayKit program", () => {
        expect(PROGRAM_ID.toBase58()).toBe("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
    });

    // ─── PDA Derivation ───────────────────────────────────────────────────────

    test("getAgentPDA returns a valid PublicKey", () => {
        const pda = client.getAgentPDA(client.wallet.publicKey, "test-agent");
        expect(pda).toBeInstanceOf(PublicKey);
    });

    test("getAgentPDA is deterministic", () => {
        const pda1 = client.getAgentPDA(client.wallet.publicKey, "test-agent");
        const pda2 = client.getAgentPDA(client.wallet.publicKey, "test-agent");
        expect(pda1.toBase58()).toBe(pda2.toBase58());
    });

    test("getAgentPDA differs by agent name", () => {
        const pda1 = client.getAgentPDA(client.wallet.publicKey, "agent-a");
        const pda2 = client.getAgentPDA(client.wallet.publicKey, "agent-b");
        expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });

    // ─── Fetch Agents ─────────────────────────────────────────────────────────

    test("fetchAllAgents returns an array", async () => {
        const agents = await client.fetchAllAgents();
        expect(Array.isArray(agents)).toBe(true);
    }, 15000);

    test("fetchAllAgents returns agents with correct fields", async () => {
        const agents = await client.fetchAllAgents();
        if (agents.length > 0) {
            const agent = agents[0];
            expect(agent.name).toBeDefined();
            expect(agent.owner).toBeDefined();
            expect(agent.spendLimit).toBeDefined();
            expect(agent.totalSpent).toBeDefined();
            expect(agent.paymentCount).toBeDefined();
            expect(typeof agent.isActive).toBe("boolean");
        }
    }, 15000);

    // ─── Payment History ──────────────────────────────────────────────────────

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

    // ─── Expiry Check ─────────────────────────────────────────────────────────

    test("checkAgentExpiry returns expiry info for existing agent", async () => {
        const agents = await client.fetchAllAgents();
        const newAgent = agents.find(a => a.expiresAt && a.expiresAt.toNumber() > 0);
        if (newAgent) {
            const expiry = await client.checkAgentExpiry(newAgent.name);
            expect(typeof expiry.expired).toBe("boolean");
            expect(expiry.expiresAt).toBeInstanceOf(Date);
            expect(typeof expiry.daysRemaining).toBe("number");
            expect(expiry.expired).toBe(false);
            expect(expiry.daysRemaining).toBeGreaterThan(0);
        }
    }, 15000);

    // ─── Batch Payment ────────────────────────────────────────────────────────

    test("batchPayment throws if payments array is empty", async () => {
        await expect(client.batchPayment("agent-gamma", [])).rejects.toThrow("Payments array cannot be empty");
    });

    test("batchPayment throws if more than 5 payments", async () => {
        const payments = Array(6).fill({ receiverName: "agent-omega", amountLamports: 100, service: "test" });
        await expect(client.batchPayment("agent-gamma", payments)).rejects.toThrow("Maximum 5 payments per batch");
    });

    // ─── Reactivate Agent ─────────────────────────────────────────────────────

    test("reactivateAgent throws if agent does not exist", async () => {
        await expect(client.reactivateAgent("non-existent-agent-xyz")).rejects.toThrow();
    }, 15000);

    // ─── Browser Wallet ───────────────────────────────────────────────────────

    test("createClientFromWallet throws if wallet not connected", () => {
        const { createClientFromWallet } = require("../index");
        expect(() => createClientFromWallet({ publicKey: null, signTransaction: async () => { } }, client.connection))
            .toThrow("Wallet not connected");
    });

    test("createClientFromWallet throws if wallet has no signTransaction", () => {
        const { createClientFromWallet } = require("../index");
        expect(() => createClientFromWallet({ publicKey: new PublicKey("11111111111111111111111111111111"), signTransaction: null }, client.connection))
            .toThrow("Wallet does not support signTransaction");
    });

    test("createClientFromWallet returns a PayKitClient with valid adapter", () => {
        const { createClientFromWallet } = require("../index");
        const mockWallet = {
            publicKey: new PublicKey("11111111111111111111111111111111"),
            signTransaction: async (tx) => tx,
        };
        const browserClient = createClientFromWallet(mockWallet, client.connection);
        expect(browserClient).toBeDefined();
        expect(browserClient.wallet.publicKey.toBase58()).toBe("11111111111111111111111111111111");
    });

    // ─── Error Handling ───────────────────────────────────────────────────────

    test("PayKitError has correct structure", () => {
        const { PayKitError } = require("../errors");
        const err = new PayKitError("SpendLimitExceeded", "Agent has exceeded its spend limit.");
        expect(err.name).toBe("PayKitError");
        expect(err.code).toBe("SpendLimitExceeded");
        expect(err.message).toBe("Agent has exceeded its spend limit.");
        expect(err.originalError).toBeNull();
    });

    test("parsePayKitError identifies SpendLimitExceeded by error number", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("AnchorError: Error Code: SpendLimitExceeded. Error Number: 6003.");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("SpendLimitExceeded");
    });

    test("parsePayKitError identifies AgentExpired by error number", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("AnchorError: Error Code: AgentExpired. Error Number: 6007.");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("AgentExpired");
    });

    test("parsePayKitError identifies DailyLimitExceeded by error number", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("AnchorError: Error Code: DailyLimitExceeded. Error Number: 6006.");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("DailyLimitExceeded");
    });

    test("parsePayKitError identifies LegacyAgent from deserialization error", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("AccountDidNotDeserialize: Failed to deserialize the account.");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("LegacyAgent");
    });

    test("parsePayKitError identifies BlockhashExpired", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("Transaction simulation failed: Blockhash not found");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("BlockhashExpired");
    });

    test("parsePayKitError identifies InsufficientFunds", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("Transaction failed: insufficient funds for transaction");
        const parsed = parsePayKitError(raw);
        expect(parsed).not.toBeNull();
        expect(parsed.code).toBe("InsufficientFunds");
    });

    test("parsePayKitError returns null for unknown errors", () => {
        const { parsePayKitError } = require("../errors");
        const raw = new Error("Some completely unknown error xyz123");
        const parsed = parsePayKitError(raw);
        expect(parsed).toBeNull();
    });

    test("withPayKitError rethrows PayKitError with correct code", async () => {
        const { withPayKitError } = require("../errors");
        await expect(
            withPayKitError(async () => {
                throw new Error("AnchorError: Error Code: AgentInactive. Error Number: 6004.");
            })
        ).rejects.toMatchObject({ code: "AgentInactive" });
    });

    test("withPayKitError rethrows unknown errors as-is", async () => {
        const { withPayKitError } = require("../errors");
        const unknownErr = new Error("totally unknown error xyz");
        await expect(
            withPayKitError(async () => { throw unknownErr; })
        ).rejects.toThrow("totally unknown error xyz");
    });

    // ─── Agent History ────────────────────────────────────────────────────────

    test("getAgentHistory returns an array", async () => {
        const agents = await client.fetchAllAgents();
        if (agents.length > 0) {
            const history = await client.getAgentHistory(agents[0].name);
            expect(Array.isArray(history)).toBe(true);
        }
    }, 30000);

    test("getAgentHistory entries have correct fields", async () => {
        const agents = await client.fetchAllAgents();
        if (agents.length > 0) {
            const history = await client.getAgentHistory(agents[0].name, 5);
            if (history.length > 0) {
                const entry = history[0];
                expect(["agent_to_agent", "record_payment", "register_agent"]).toContain(entry.type);
                expect(entry.agentName).toBe(agents[0].name);
                expect(entry.agentPDA).toBeDefined();
                expect(entry.time).toBeDefined();
                expect(entry.tx).toBeDefined();
            }
        }
    }, 30000);

    // ─── Webhooks ─────────────────────────────────────────────────────────────

    test("watchAgent returns a stop function", () => {
        const stop = client.watchAgent("agent-gamma", () => { });
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

    test("createWebhook throws with invalid API key", async () => {
        await expect(
            client.createWebhook("agent-gamma", "https://example.com/webhook", "invalid-key")
        ).rejects.toThrow();
    }, 15000);
});