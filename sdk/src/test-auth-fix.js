/**
 * Prueba del fix de autenticación (constraint agent.agent_key == agent_signer.key())
 *
 * Caso 1 (legítimo): agent-v2-alpha paga con su propio keypair → debe pasar.
 * Caso 2 (ataque):    se pasa la cuenta de agent-v2-alpha pero firmando con
 *                      el keypair de agent-v2-beta → debe fallar con UnauthorizedSigner.
 *
 * Ejecutar con: node test-auth-fix.js
 *
 * Requiere que agent-v2-alpha y agent-v2-beta ya existan en devnet
 * (creados previamente con createAutonomousAgent) y que sus keypairs
 * estén en ~/.paykit/agents/agent-v2-alpha.json y agent-v2-beta.json.
 */

const { createClient } = require("./index"); // ajusta la ruta si corres esto fuera de sdk/src
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Keypair, PublicKey } = require("@solana/web3.js");

const OWNER_KEYPAIR_PATH =
  process.env.KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");

const AGENT_A = "agent-cap-01"; // el agente legítimo
const AGENT_B = "agent-cap-02"; // el atacante: su keypair intentará suplantar a A

function loadAgentKeypair(name) {
  const p = path.join(os.homedir(), ".paykit", "agents", `${name}.json`);
  const secret = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function main() {
  const client = createClient(OWNER_KEYPAIR_PATH, "devnet");
  const program = client.program; // objeto Anchor ya cargado con el IDL parcheado

  const keypairA = loadAgentKeypair(AGENT_A);
  const keypairB = loadAgentKeypair(AGENT_B);

  const agentA = await client.fetchAgent(AGENT_A);
  const pdaA = agentA.pda; // PublicKey de la cuenta on-chain de agent-v2-alpha

  console.log(`Agent A (${AGENT_A}) PDA:`, pdaA.toBase58());
  console.log(`Agent A owner key on-chain:`, agentA.agentKey.toBase58());
  console.log(`Keypair A pubkey:`, keypairA.publicKey.toBase58());
  console.log(`Keypair B pubkey:`, keypairB.publicKey.toBase58());
  console.log(
    "¿Coinciden A y su propio keypair?",
    agentA.agentKey.toBase58() === keypairA.publicKey.toBase58()
  );

  // ── Caso 1: legítimo — A paga con su propio keypair ──────────────────────
  console.log("\n[Caso 1] record_payment con el firmante correcto (debe pasar)...");
  try {
    const sig = await program.methods
      .recordPayment(
        /* amount_lamports */ new (require("bn.js"))(1000),
        /* recipient */ Keypair.generate().publicKey,
        /* memo */ "test-auth-fix legit",
        /* category_id */ 0
      )
      .accounts({
        agent: pdaA,
        agentSigner: keypairA.publicKey,
      })
      .signers([keypairA])
      .rpc();
    console.log("✓ Pasó como se esperaba. TX:", sig);
  } catch (e) {
    console.log("✗ FALLÓ Y NO DEBÍA. Revisa el fix o los nombres de campos del IDL:");
    console.log(e.message || e);
  }

  // ── Caso 2: ataque — cuenta de A, firmando con el keypair de B ───────────
  console.log("\n[Caso 2] record_payment con firmante que NO coincide (debe fallar)...");
  try {
    const sig = await program.methods
      .recordPayment(
        new (require("bn.js"))(1000),
        Keypair.generate().publicKey,
        "test-auth-fix attack",
        0
      )
      .accounts({
        agent: pdaA, // cuenta de agent-v2-alpha
        agentSigner: keypairB.publicKey, // pero firma agent-v2-beta
      })
      .signers([keypairB])
      .rpc();
    console.log("✗ PASÓ Y NO DEBÍA — el fix NO está funcionando. TX:", sig);
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes("UnauthorizedSigner") || msg.includes("6015") || /custom program error/i.test(msg)) {
      console.log("✓ Falló como se esperaba. Detalle:");
      console.log(msg);
    } else {
      console.log("⚠ Falló, pero no está claro si por la razón correcta. Detalle completo:");
      console.log(msg);
    }
  }
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
