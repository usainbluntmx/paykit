require("dotenv").config();
const { createClient } = require("./index");

const KEYPAIR_PATH = "/home/usainbluntmx/.config/solana/id.json";
const AGENT_NAME = "agent-001";
const SPEND_LIMIT = 1_000_000_000; // 1 SOL en lamports

async function main() {
    console.log("🚀 PayKit SDK Test\n");

    const client = createClient(KEYPAIR_PATH);
    console.log("✅ Cliente creado");
    console.log("   Owner:", client.wallet.publicKey.toBase58(), "\n");

    // 1. Registrar agente
    console.log("📝 Registrando agente:", AGENT_NAME);
    try {
        const { tx, agentPDA } = await client.registerAgent(AGENT_NAME, SPEND_LIMIT);
        console.log("✅ Agente registrado");
        console.log("   PDA:", agentPDA.toBase58());
        console.log("   TX:", tx, "\n");
    } catch (e) {
        if (e.message.includes("already in use")) {
            console.log("⚠️  Agente ya existe, continuando...\n");
        } else {
            throw e;
        }
    }

    // 2. Fetch agente
    console.log("🔍 Consultando agente...");
    const agent = await client.fetchAgent(AGENT_NAME);
    console.log("✅ Agente encontrado");
    console.log("   Nombre:", agent.name);
    console.log("   Owner:", agent.owner.toBase58());
    console.log("   Spend limit:", agent.spendLimit.toString(), "lamports");
    console.log("   Total gastado:", agent.totalSpent.toString(), "lamports");
    console.log("   Pagos realizados:", agent.paymentCount.toString());
    console.log("   Activo:", agent.isActive, "\n");

    // 3. Registrar pago
    console.log("💸 Registrando pago...");
    const recipient = client.wallet.publicKey;
    const { tx: payTx } = await client.recordPayment(
        AGENT_NAME,
        1_000_000, // 0.001 SOL
        recipient,
        "Pago de prueba PayKit"
    );
    console.log("✅ Pago registrado");
    console.log("   TX:", payTx, "\n");

    // 4. Fetch agente actualizado
    console.log("🔍 Estado final del agente...");
    const updated = await client.fetchAgent(AGENT_NAME);
    console.log("✅ Estado actualizado");
    console.log("   Total gastado:", updated.totalSpent.toString(), "lamports");
    console.log("   Pagos realizados:", updated.paymentCount.toString(), "\n");

    console.log("🎉 SDK funcionando correctamente en Devnet");
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});