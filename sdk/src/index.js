const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const IDL_PATH = path.resolve(__dirname, "../../target/idl/paykit.json");

// ─── PayKit Client ────────────────────────────────────────────────────────────

class PayKitClient {
    constructor(connection, wallet) {
        this.connection = connection;
        this.wallet = wallet;
        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
        this.program = new anchor.Program(idl, provider);
    }

    // ─── Get Agent PDA ─────────────────────────────────────────────────────────

    getAgentPDA(ownerPubkey, name) {
        const [pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("agent"),
                ownerPubkey.toBuffer(),
                Buffer.from(name),
            ],
            PROGRAM_ID
        );
        return pda;
    }

    // ─── Register Agent ────────────────────────────────────────────────────────

    async registerAgent(name, spendLimitLamports) {
        const agentPDA = this.getAgentPDA(this.wallet.publicKey, name);

        const tx = await this.program.methods
            .registerAgent(name, new anchor.BN(spendLimitLamports))
            .accounts({
                agent: agentPDA,
                owner: this.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        return { tx, agentPDA };
    }

    // ─── Record Payment ────────────────────────────────────────────────────────

    async recordPayment(agentName, amountLamports, recipientPubkey, memo) {
        const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);

        const tx = await this.program.methods
            .recordPayment(
                new anchor.BN(amountLamports),
                recipientPubkey,
                memo
            )
            .accounts({
                agent: agentPDA,
                owner: this.wallet.publicKey,
            })
            .rpc();

        return { tx };
    }

    // ─── Update Spend Limit ────────────────────────────────────────────────────

    async updateSpendLimit(agentName, newLimitLamports) {
        const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);

        const tx = await this.program.methods
            .updateSpendLimit(new anchor.BN(newLimitLamports))
            .accounts({
                agent: agentPDA,
                owner: this.wallet.publicKey,
            })
            .rpc();

        return { tx };
    }

    // ─── Deactivate Agent ──────────────────────────────────────────────────────

    async deactivateAgent(agentName) {
        const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);

        const tx = await this.program.methods
            .deactivateAgent()
            .accounts({
                agent: agentPDA,
                owner: this.wallet.publicKey,
            })
            .rpc();

        return { tx };
    }

    // ─── Fetch Agent ───────────────────────────────────────────────────────────

    async fetchAgent(agentName, ownerPubkey) {
        const owner = ownerPubkey || this.wallet.publicKey;
        const agentPDA = this.getAgentPDA(owner, agentName);
        const agent = await this.program.account.agentAccount.fetch(agentPDA);
        return { pda: agentPDA, ...agent };
    }

    // ─── Fetch All Agents ──────────────────────────────────────────────────────

    async fetchAllAgents() {
        const agents = await this.program.account.agentAccount.all([
            {
                memcmp: {
                    offset: 8,
                    bytes: this.wallet.publicKey.toBase58(),
                },
            },
        ]);
        return agents;
    }
}

// ─── Helper: Load Wallet from File ────────────────────────────────────────────

function loadWalletFromFile(keypairPath) {
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    return new anchor.Wallet(keypair);
}

// ─── Helper: Create Client ────────────────────────────────────────────────────

function createClient(keypairPath, cluster = "devnet") {
    const connection = new Connection(clusterApiUrl(cluster), "confirmed");
    const wallet = loadWalletFromFile(keypairPath);
    return new PayKitClient(connection, wallet);
}

module.exports = { PayKitClient, loadWalletFromFile, createClient, PROGRAM_ID };