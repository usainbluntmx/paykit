require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("./index");

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYPAIR_PATH = "/home/usainbluntmx/.config/solana/id.json";
const AGENT_ORCHESTRATOR = "agent-v2-alpha";
const AGENT_EXECUTOR = "agent-v2-beta";

// ─── Anthropic Client ─────────────────────────────────────────────────────────

const anthropic = new Anthropic.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── PayKit Client ────────────────────────────────────────────────────────────

const paykit = createClient(KEYPAIR_PATH);

// ─── Tools ────────────────────────────────────────────────────────────────────

const tools = [
    {
        name: "pay_agent",
        description: "Pay another AI agent for a service it provided. Use this when you need to compensate an agent for completing a task.",
        input_schema: {
            type: "object",
            properties: {
                sender: {
                    type: "string",
                    description: "Name of the agent making the payment",
                },
                receiver: {
                    type: "string",
                    description: "Name of the agent receiving the payment",
                },
                amount_lamports: {
                    type: "number",
                    description: "Payment amount in lamports (1 SOL = 1,000,000,000 lamports)",
                },
                service: {
                    type: "string",
                    description: "Description of the service being paid for",
                },
            },
            required: ["sender", "receiver", "amount_lamports", "service"],
        },
    },
    {
        name: "check_agent_balance",
        description: "Check the current spend limit and total spent by an agent.",
        input_schema: {
            type: "object",
            properties: {
                agent_name: {
                    type: "string",
                    description: "Name of the agent to check",
                },
            },
            required: ["agent_name"],
        },
    },
    {
        name: "get_payment_history",
        description: "Get the recent payment history from the blockchain.",
        input_schema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of recent transactions to fetch",
                },
            },
            required: [],
        },
    },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(toolName, toolInput) {
    console.log(`\n🔧 Ejecutando tool: ${toolName}`);
    console.log(`   Input:`, JSON.stringify(toolInput, null, 2));

    if (toolName === "pay_agent") {
        const { sender, receiver, amount_lamports, service } = toolInput;
        const { tx } = await paykit.agentToAgentPayment(
            sender,
            receiver,
            amount_lamports,
            service
        );
        const result = {
            success: true,
            tx,
            message: `Payment of ${amount_lamports} lamports from ${sender} to ${receiver} confirmed onchain`,
        };
        console.log(`   ✅ TX: ${tx.slice(0, 20)}...`);
        return result;
    }

    if (toolName === "check_agent_balance") {
        const { agent_name } = toolInput;
        const agent = await paykit.fetchAgent(agent_name);
        const result = {
            name: agent.name,
            spend_limit: agent.spendLimit.toString(),
            total_spent: agent.totalSpent.toString(),
            remaining: (agent.spendLimit.toNumber() - agent.totalSpent.toNumber()).toString(),
            payment_count: agent.paymentCount.toString(),
            is_active: agent.isActive,
        };
        console.log(`   ✅ Balance:`, result);
        return result;
    }

    if (toolName === "get_payment_history") {
        const { limit = 5 } = toolInput;
        const history = await paykit.getPaymentHistory(limit);
        console.log(`   ✅ ${history.length} transacciones encontradas`);
        return history;
    }

    throw new Error(`Unknown tool: ${toolName}`);
}

// ─── Agentic Loop ─────────────────────────────────────────────────────────────

async function runAgentDemo(task) {
    console.log("\n" + "=".repeat(60));
    console.log("⚡ PAYKIT — AUTONOMOUS AGENT DEMO");
    console.log("=".repeat(60));
    console.log(`\n📋 Task: ${task}`);
    console.log(`🤖 Orchestrator: ${AGENT_ORCHESTRATOR}`);
    console.log(`🤖 Executor: ${AGENT_EXECUTOR}`);
    console.log("=".repeat(60) + "\n");

    const messages = [
        {
            role: "user",
            content: task,
        },
    ];

    const systemPrompt = `You are an autonomous AI agent orchestrator running on the PayKit protocol on Solana blockchain.

You have access to two agents:
- "${AGENT_ORCHESTRATOR}": The orchestrator agent (you control this one)
- "${AGENT_EXECUTOR}": The executor agent that performs tasks

Your job is to:
1. Analyze the task
2. Check the orchestrator agent's balance before making payments
3. Delegate work to the executor agent
4. Pay the executor agent for its services using the pay_agent tool
5. Verify the payment was recorded on-chain
6. Report back with a summary

Always check balances before paying. Always pay for services rendered. Be specific about what service you are paying for.
Amounts should be small (between 100000 and 500000 lamports = 0.0001 to 0.0005 SOL).`;

    let continueLoop = true;

    while (continueLoop) {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages,
        });

        console.log(`\n🧠 Agent thinking... (stop_reason: ${response.stop_reason})`);

        // Process response content
        for (const block of response.content) {
            if (block.type === "text") {
                console.log(`\n💬 Agent: ${block.text}`);
            }
            if (block.type === "tool_use") {
                console.log(`\n⚡ Agent wants to use tool: ${block.name}`);
            }
        }

        // If no tool use, we're done
        if (response.stop_reason === "end_turn") {
            continueLoop = false;
            break;
        }

        // Execute tools
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
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: JSON.stringify({ error: e.message }),
                            is_error: true,
                        });
                    }
                }
            }

            // Add assistant response and tool results to messages
            messages.push({ role: "assistant", content: response.content });
            messages.push({ role: "user", content: toolResults });
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEMO COMPLETE");
    console.log("=".repeat(60) + "\n");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const task = `
You are agent-alpha, an orchestrator AI agent.
Your task: Hire agent-beta to analyze market data and generate a report.
Steps:
1. Check your current balance
2. Request agent-beta to complete the analysis task
3. Pay agent-beta 250000 lamports for the data analysis service
4. Verify the payment was recorded on Solana
5. Get the recent payment history to confirm
6. Summarize what happened
`;

runAgentDemo(task).catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});