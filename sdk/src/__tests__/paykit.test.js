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
});