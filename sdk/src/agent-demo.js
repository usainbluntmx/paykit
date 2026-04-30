require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const {
    createClient,
    CAPABILITIES,
    CAP_ALL_DEFAULT,
    CATEGORIES,
    agentKeypairExists,
} = require("./index");

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYPAIR_PATH = process.env.KEYPAIR_PATH || require("os").homedir() + "/.config/solana/id.json";
const ORCHESTRATOR = "demo-orchestrator";
const EXECUTOR = "demo-executor";
const FUNDING_SOL = 0.05; // SOL to fund each agent wallet

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const paykit = createClient(KEYPAIR_PATH, "devnet");

// ─── Bootstrap agents ─────────────────────────────────────────────────────────
// Creates agents if they don't exist yet. Agent-native — each agent has its own keypair.

async function bootstrapAgents() {
    console.log("\n  Checking agents...");

    if (!agentKeypairExists(ORCHESTRATOR)) {
        process.stdout.write(`  Creating ${ORCHESTRATOR}...`);
        const result = await paykit.createAutonomousAgent(
            ORCHESTRATOR,
            1_000_000_000,      // 1 SOL spend limit
            1000,               // 10% daily limit
            Math.floor(FUNDING_SOL * 1_000_000_000),
            CAP_ALL_DEFAULT,
            1                   // tier: standard
        );
        console.log(` ✓ ${result.agentPublicKey.toBase58().slice(0, 20)}...`);
    } else {
        console.log(`  ${ORCHESTRATOR} already exists ✓`);
    }

    if (!agentKeypairExists(EXECUTOR)) {
        process.stdout.write(`  Creating ${EXECUTOR}...`);
        const result = await paykit.createAutonomousAgent(
            EXECUTOR,
            500_000_000,        // 0.5 SOL spend limit
            2000,               // 20% daily limit
            Math.floor(FUNDING_SOL * 1_000_000_000),
            CAP_ALL_DEFAULT,
            0                   // tier: basic
        );
        console.log(` ✓ ${result.agentPublicKey.toBase58().slice(0, 20)}...`);
    } else {
        console.log(`  ${EXECUTOR} already exists ✓`);
    }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const tools = [
    {
        name: "pay_agent",
        description: "Pay another autonomous AI agent for a service. The sender agent signs the transaction with its own keypair — no owner needed.",
        input_schema: {
            type: "object",
            properties: {
                sender: { type: "string", description: "Name of the agent making the payment" },
                receiver: { type: "string", description: "Name of the agent receiving the payment" },
                amount_lamports: { type: "number", description: "Amount in lamports (1 SOL = 1,000,000,000)" },
                service: { type: "string", description: "Service description" },
                category: { type: "string", description: "Service category: compute, data, storage, inference, research, content", enum: ["compute", "data", "storage", "inference", "research", "content"] },
            },
            required: ["sender", "receiver", "amount_lamports", "service", "category"],
        },
    },
    {
        name: "check_agent_status",
        description: "Check an agent's balance, capabilities, tier, and expiry status.",
        input_schema: {
            type: "object",
            properties: {
                agent_name: { type: "string", description: "Name of the agent" },
            },
            required: ["agent_name"],
        },
    },
    {
        name: "get_agent_history",
        description: "Get the transaction history for a specific agent from the blockchain.",
        input_schema: {
            type: "object",
            properties: {
                agent_name: { type: "string", description: "Name of the agent" },
                limit: { type: "number", description: "Number of transactions to fetch (default 5)" },
            },
            required: ["agent_name"],
        },
    },
    {
        name: "transfer_sol",
        description: "Transfer SOL directly between agent wallets. The sender agent signs autonomously.",
        input_schema: {
            type: "object",
            properties: {
                sender: { type: "string", description: "Sender agent name" },
                receiver: { type: "string", description: "Receiver agent name" },
                amount_sol: { type: "number", description: "Amount in SOL" },
                memo: { type: "string", description: "Transfer memo" },
            },
            required: ["sender", "receiver", "amount_sol", "memo"],
        },
    },
    {
        name: "check_sol_balance",
        description: "Check the SOL wallet balance of an agent.",
        input_schema: {
            type: "object",
            properties: {
                agent_name: { type: "string", description: "Agent name" },
            },
            required: ["agent_name"],
        },
    },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(name, input) {
    const C = { green: s => `\x1b[32m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m` };
    console.log(`\n  ${C.yellow("⚡")} tool: ${C.green(name)}`);

    if (name === "pay_agent") {
        const { sender, receiver, amount_lamports, service, category } = input;
        const categoryId = CATEGORIES[category.toUpperCase()] || 0;

        const { tx } = await paykit.agentToAgentPayment(
            sender, receiver, amount_lamports, service, categoryId
        );
        const result = {
            success: true,
            tx,
            sender,
            receiver,
            amount_lamports,
            service,
            category,
            message: `${sender} → ${receiver}: ${amount_lamports} lamports for "${service}" [${category}] — agent signed autonomously`,
        };
        console.log(`  ${C.green("✓")} TX: ${C.dim(tx.slice(0, 24))}...`);
        console.log(`  ${C.dim(`  ${sender} → ${receiver} · ${amount_lamports} lamports · ${category}`)}`);
        return result;
    }

    if (name === "check_agent_status") {
        const { agent_name } = input;
        const agent = await paykit.fetchAgent(agent_name);
        const expiry = await paykit.checkAgentExpiry(agent_name);
        const decoded = paykit.decodeCapabilities(agent.capabilities);
        const activeCaps = Object.entries(decoded)
            .filter(([k, v]) => k !== "raw" && k !== "custom" && v)
            .map(([k]) => k);

        const result = {
            name: agent.name,
            agentKey: agent.agentKey.toBase58(),
            tier: ["basic", "standard", "premium"][agent.tier] || "basic",
            spendLimit: agent.spendLimit.toNumber(),
            totalSpent: agent.totalSpent.toNumber(),
            remaining: agent.spendLimit.toNumber() - agent.totalSpent.toNumber(),
            dailyLimitBps: agent.dailyLimitBps,
            paymentCount: agent.paymentCount.toNumber(),
            isActive: agent.isActive,
            daysRemaining: expiry.daysRemaining,
            capabilities: activeCaps,
        };
        console.log(`  ${C.green("✓")} ${agent_name}: ${(result.remaining / 1e9).toFixed(4)} SOL remaining · tier ${result.tier} · ${activeCaps.length} caps`);
        return result;
    }

    if (name === "get_agent_history") {
        const { agent_name, limit = 5 } = input;
        const history = await paykit.getAgentHistory(agent_name, limit);
        console.log(`  ${C.green("✓")} ${history.length} transactions found for ${agent_name}`);
        return { agent: agent_name, count: history.length, history };
    }

    if (name === "transfer_sol") {
        const { sender, receiver, amount_sol, memo } = input;
        const { tx } = await paykit.transferSOL(sender, receiver, amount_sol, memo);
        console.log(`  ${C.green("✓")} SOL transfer TX: ${C.dim(tx.slice(0, 24))}...`);
        return { success: true, tx, sender, receiver, amount_sol, memo };
    }

    if (name === "check_sol_balance") {
        const { agent_name } = input;
        const balance = await paykit.getSOLBalance(agent_name);
        console.log(`  ${C.green("✓")} ${agent_name} wallet: ${balance.sol.toFixed(6)} SOL`);
        return { agent: agent_name, ...balance };
    }

    throw new Error(`Unknown tool: ${name}`);
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

async function runAgentDemo(task) {
    const C = {
        green: s => `\x1b[32m${s}\x1b[0m`,
        yellow: s => `\x1b[33m${s}\x1b[0m`,
        cyan: s => `\x1b[36m${s}\x1b[0m`,
        dim: s => `\x1b[2m${s}\x1b[0m`,
        bold: s => `\x1b[1m${s}\x1b[0m`,
    };

    console.log("\n" + C.green("  " + "─".repeat(58)));
    console.log(C.green(C.bold("  ⚡ PAYKIT — AUTONOMOUS AGENT DEMO · AGENT-NATIVE")));
    console.log(C.green("  " + "─".repeat(58)));
    console.log(`\n  ${C.dim("Task:")} ${task.trim().split("\n")[0]}`);
    console.log(`  ${C.dim("Orchestrator:")} ${C.cyan(ORCHESTRATOR)}`);
    console.log(`  ${C.dim("Executor:")}     ${C.cyan(EXECUTOR)}`);
    console.log(`  ${C.dim("Architecture:")} ${C.yellow("Agent-native — each agent signs its own transactions")}`);
    console.log("\n" + C.green("  " + "─".repeat(58)) + "\n");

    const systemPrompt = `You are ${ORCHESTRATOR}, an autonomous AI agent orchestrator running on the PayKit protocol on Solana.

Architecture: Agent-native — you and ${EXECUTOR} each have your own keypair and wallet. You sign your own transactions. No human owner is involved in payments.

Available agents:
- ${ORCHESTRATOR} (you): orchestrator — tier standard, full capabilities
- ${EXECUTOR}: executor — tier basic, performs tasks

Your workflow:
1. Check your SOL wallet balance and agent status before starting
2. Delegate the task to ${EXECUTOR} 
3. Pay ${EXECUTOR} for completed work using pay_agent — always specify the category
4. Verify the payment with get_agent_history
5. Report a clear summary with TX signatures

Payment amounts: 100000–500000 lamports (0.0001–0.0005 SOL) per service.
Always use the most specific category for each payment.
You sign payments autonomously — no owner approval needed. This is agent-native architecture.`;

    const messages = [{ role: "user", content: task }];
    let continueLoop = true;
    let turn = 0;

    while (continueLoop) {
        turn++;
        console.log(`\n  ${C.dim(`[turn ${turn}]`)} ${C.yellow("Agent thinking...")}`);

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages,
        });

        // Process text blocks
        for (const block of response.content) {
            if (block.type === "text" && block.text.trim()) {
                console.log(`\n  ${C.cyan("Agent:")} ${block.text}`);
            }
        }

        if (response.stop_reason === "end_turn") {
            continueLoop = false;
            break;
        }

        if (response.stop_reason === "tool_use") {
            const toolResults = [];

            for (const block of response.content) {
                if (block.type === "tool_use") {
                    try {
                        const result = await executeTool(block.name, block.input);
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: JSON.stringify(result),
                        });
                    } catch (e) {
                        console.log(`  ${C.dim("✗")} Tool error: ${e.message}`);
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: JSON.stringify({ error: e.message }),
                            is_error: true,
                        });
                    }
                }
            }

            messages.push({ role: "assistant", content: response.content });
            messages.push({ role: "user", content: toolResults });
        }
    }

    console.log("\n" + C.green("  " + "─".repeat(58)));
    console.log(C.green(C.bold("  ✓ DEMO COMPLETE")));
    console.log(C.green("  " + "─".repeat(58)) + "\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // Bootstrap agents if needed
    await bootstrapAgents();

    const task = `
You are ${ORCHESTRATOR}, an autonomous orchestrator agent on PayKit/Solana (Camino B).

Your mission:
1. Check your SOL wallet balance and current agent status
2. Check ${EXECUTOR}'s status to confirm it is active and its tier
3. Instruct ${EXECUTOR} to perform a market inference task: analyze AI agent payment trends and estimate demand for autonomous agent payments in Q2 2026
4. Pay ${EXECUTOR} 250000 lamports for the inference service (category: inference)
5. Also pay ${EXECUTOR} 100000 lamports for the data report it produces (category: data)
6. Get your agent history to verify both payments were recorded onchain
7. Summarize the complete operation — include TX signatures, amounts paid, categories used, and confirm that you signed the transactions autonomously without owner involvement
`;

    await runAgentDemo(task);
}

main().catch(err => {
    console.error("\n  ✗ Error:", err.message || err.code || err);
    process.exit(1);
});