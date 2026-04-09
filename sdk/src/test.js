require("dotenv").config();
const { createClient } = require("./index");

const KEYPAIR_PATH = "/home/usainbluntmx/.config/solana/id.json";
const AGENT_A = "agent-alpha";
const AGENT_B = "agent-beta";
const SPEND_LIMIT = 1_000_000_000; // 1 SOL

async function main() {
    console.log("🚀 PayKit SDK Test\n");

    const client = createClient(KEYPAIR_PATH);
    console.log("✅ Cliente creado");
    console.log("   Owner:", client.wallet.publicKey.toBase58(), "\n");

    // 1. Registrar agentes
    for (const name of [AGENT_A, AGENT_B]) {
        console.log(`📝 Registrando agente: ${name}`);
        try {
            const { tx, agentPDA } = await client.registerAgent(name, SPEND_LIMIT);
            console.log(`✅ Agente registrado`);
            console.log(`   PDA: ${agentPDA.toBase58()}`);
            console.log(`   TX: ${tx}\n`);
        } catch (e) {
            if (e.message.includes("already in use")) {
                console.log(`⚠️  Agente "${name}" ya existe, continuando...\n`);
            } else {
                throw e;
            }
        }
    }

    // 2. Fetch agentes
    console.log("🔍 Consultando todos los agentes...");
    const agents = await client.fetchAllAgents();
    console.log(`✅ ${agents.length} agente(s) encontrado(s)`);
    for (const a of agents) {
        console.log(`   ${a.name} — spent: ${a.totalSpent.toString()} lamports — txs: ${a.paymentCount.toString()}`);
    }
    console.log();

    // 3. Agent to agent payment
    console.log(`💸 Agent-to-agent: ${AGENT_A} → ${AGENT_B}`);
    const { tx: a2aTx } = await client.agentToAgentPayment(
        AGENT_A,
        AGENT_B,
        500_000,
        "SDK test service"
    );
    console.log(`✅ Pago registrado`);
    console.log(`   TX: ${a2aTx}\n`);

    // 4. Fetch historial
    console.log("📋 Historial de pagos onchain...");
    const history = await client.getPaymentHistory(10);
    console.log(`✅ ${history.length} transaccion(es) encontrada(s)`);
    for (const h of history) {
        console.log(`   [${h.type}] ${h.time} — ${h.tx.slice(0, 16)}...`);
    }
    console.log();

    console.log("🎉 SDK completo funcionando correctamente en Devnet");
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});