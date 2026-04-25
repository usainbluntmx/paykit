require("dotenv").config();
const {
    createClient,
    CAP_ALL_DEFAULT,
    CATEGORIES,
    agentKeypairExists,
} = require("../src/index");

// ─── Config ───────────────────────────────────────────────────────────────────

const KEYPAIR_PATH = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;
const AGENT_A = "example-alpha";
const AGENT_B = "example-beta";
const SPEND_LIMIT = 1_000_000_000; // 1 SOL
const FUNDING = 0.02 * 1_000_000_000; // 0.02 SOL per agent

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("PayKit SDK — Basic Usage Example (Agent-Native)\n");

    const client = createClient(KEYPAIR_PATH, "devnet");
    console.log("✓ Client created");
    console.log("  Owner:", client.wallet.publicKey.toBase58(), "\n");

    // 1. Create autonomous agents — each has its own keypair and signs its own transactions
    for (const name of [AGENT_A, AGENT_B]) {
        if (agentKeypairExists(name)) {
            console.log(`  ${name} already exists — skipping`);
            continue;
        }
        process.stdout.write(`  Creating ${name}...`);
        const result = await client.createAutonomousAgent(
            name,
            SPEND_LIMIT,
            1000,        // 10% daily limit
            FUNDING,
            CAP_ALL_DEFAULT,
            0            // tier: basic
        );
        console.log(` ✓ ${result.agentPublicKey.toBase58().slice(0, 20)}...`);
        console.log(`    TX: ${result.tx}`);
    }
    console.log();

    // 2. Fetch agents
    console.log("Fetching agents...");
    const agents = await client.fetchAllAgents();
    console.log(`✓ ${agents.length} agent(s) found`);
    for (const a of agents) {
        console.log(`  ${a.name} — spent: ${a.totalSpent.toString()} lamports — txs: ${a.paymentCount.toString()}`);
    }
    console.log();

    // 3. Agent-to-agent payment (agent signs autonomously)
    console.log(`Agent-to-agent: ${AGENT_A} → ${AGENT_B}`);
    const { tx: a2aTx } = await client.agentToAgentPayment(
        AGENT_A,
        AGENT_B,
        500_000,
        "example inference task",
        CATEGORIES.INFERENCE
    );
    console.log(`✓ Payment recorded`);
    console.log(`  TX: ${a2aTx}\n`);

    // 4. SOL balance
    const balance = await client.getSOLBalance(AGENT_A);
    console.log(`${AGENT_A} wallet: ${balance.sol.toFixed(6)} SOL\n`);

    // 5. Agent history
    console.log(`History for ${AGENT_A}...`);
    const history = await client.getAgentHistory(AGENT_A, 5);
    console.log(`✓ ${history.length} transaction(s) found`);
    for (const h of history) {
        console.log(`  [${h.type}] ${h.time} — ${h.tx.slice(0, 16)}...`);
    }
    console.log();

    // 6. Batch payment
    console.log(`Batch payment: ${AGENT_A} → [${AGENT_B} ×3]`);
    const { tx: batchTx, count } = await client.batchPayment(
        AGENT_A,
        [
            { receiverName: AGENT_B, amountLamports: 100_000, service: "data analysis", categoryId: CATEGORIES.DATA },
            { receiverName: AGENT_B, amountLamports: 100_000, service: "compute task", categoryId: CATEGORIES.COMPUTE },
            { receiverName: AGENT_B, amountLamports: 100_000, service: "content report", categoryId: CATEGORIES.CONTENT },
        ]
    );
    console.log(`✓ Batch confirmed — ${count} payments in 1 TX`);
    console.log(`  TX: ${batchTx}\n`);

    console.log("✓ Example complete");
}

main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});