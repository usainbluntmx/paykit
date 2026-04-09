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
            [Buffer.from("agent"), ownerPubkey.toBuffer(), Buffer.from(name)],
            PROGRAM_ID
        );
        return pda;
    }

    // ─── Register Agent ────────────────────────────────────────────────────────

    /**
     * Register a new AI agent on-chain
     * @param {string} name - Agent name (max 32 chars)
     * @param {number} spendLimitLamports - Maximum spend in lamports
     * @returns {Promise<{tx: string, agentPDA: PublicKey}>}
     */
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

    /**
     * Record a payment made by an agent
     * @param {string} agentName - Name of the agent
     * @param {number} amountLamports - Payment amount in lamports
     * @param {PublicKey} recipientPubkey - Recipient public key
     * @param {string} memo - Payment description (max 64 chars)
     * @returns {Promise<{tx: string}>}
     */
    async recordPayment(agentName, amountLamports, recipientPubkey, memo) {
        const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
        const tx = await this.program.methods
            .recordPayment(new anchor.BN(amountLamports), recipientPubkey, memo)
            .accounts({
                agent: agentPDA,
                owner: this.wallet.publicKey,
            })
            .rpc();
        return { tx };
    }

    // ─── Agent to Agent Payment ────────────────────────────────────────────────

    /**
     * Execute a payment from one agent to another
     * @param {string} senderName - Name of the sender agent
     * @param {string} receiverName - Name of the receiver agent
     * @param {number} amountLamports - Payment amount in lamports
     * @param {string} service - Service description (max 64 chars)
     * @returns {Promise<{tx: string}>}
     */
    async agentToAgentPayment(senderName, receiverName, amountLamports, service) {
        const senderPDA = this.getAgentPDA(this.wallet.publicKey, senderName);
        const receiverPDA = this.getAgentPDA(this.wallet.publicKey, receiverName);
        const tx = await this.program.methods
            .agentToAgentPayment(new anchor.BN(amountLamports), service)
            .accounts({
                senderAgent: senderPDA,
                receiverAgent: receiverPDA,
                owner: this.wallet.publicKey,
            })
            .rpc();
        return { tx };
    }

    // ─── Update Spend Limit ────────────────────────────────────────────────────

    /**
     * Update the spend limit of an agent
     * @param {string} agentName - Name of the agent
     * @param {number} newLimitLamports - New spend limit in lamports
     * @returns {Promise<{tx: string}>}
     */
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

    /**
     * Deactivate an agent permanently
     * @param {string} agentName - Name of the agent
     * @returns {Promise<{tx: string}>}
     */
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

    /**
     * Fetch a single agent account
     * @param {string} agentName - Name of the agent
     * @param {PublicKey} [ownerPubkey] - Owner public key (defaults to wallet)
     * @returns {Promise<AgentWithPDA>}
     */
    async fetchAgent(agentName, ownerPubkey) {
        const owner = ownerPubkey || this.wallet.publicKey;
        const agentPDA = this.getAgentPDA(owner, agentName);
        const agent = await this.program.account.agentAccount.fetch(agentPDA);
        return { pda: agentPDA, ...agent };
    }

    // ─── Fetch All Agents ──────────────────────────────────────────────────────

    /**
     * Fetch all agents owned by the current wallet
     * @returns {Promise<AgentWithPDA[]>}
     */
    async fetchAllAgents() {
        const agents = await this.program.account.agentAccount.all([
            {
                memcmp: {
                    offset: 8,
                    bytes: this.wallet.publicKey.toBase58(),
                },
            },
        ]);
        return agents.map(a => ({ pda: a.publicKey, ...a.account }));
    }

    // ─── Get Payment History ───────────────────────────────────────────────────

    /**
     * Fetch payment history from on-chain transaction logs
     * @param {number} [limit=50] - Number of transactions to fetch
     * @returns {Promise<Array>}
     */
    async getPaymentHistory(limit = 50) {
        const signatures = await this.connection.getSignaturesForAddress(
            PROGRAM_ID,
            { limit }
        );

        const history = [];

        for (const sig of signatures) {
            const tx = await this.connection.getParsedTransaction(sig.signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });

            if (!tx?.meta?.logMessages) continue;

            const logs = tx.meta.logMessages;
            const time = new Date((tx.blockTime || 0) * 1000).toISOString();

            if (logs.some(l => l.includes("Instruction: AgentToAgentPayment"))) {
                history.push({ type: "agent_to_agent", time, tx: sig.signature });
            } else if (logs.some(l => l.includes("Instruction: RecordPayment"))) {
                history.push({ type: "record_payment", time, tx: sig.signature });
            } else if (logs.some(l => l.includes("Instruction: RegisterAgent"))) {
                history.push({ type: "register_agent", time, tx: sig.signature });
            }
        }

        return history;
    }
}

// ─── Helper: Load Wallet from File ────────────────────────────────────────────

function loadWalletFromFile(keypairPath) {
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    return new anchor.Wallet(keypair);
}

// ─── Helper: Create Client ────────────────────────────────────────────────────

/**
 * Create a PayKitClient instance
 * @param {string} keypairPath - Path to Solana keypair JSON file
 * @param {string} [cluster="devnet"] - Solana cluster
 * @returns {PayKitClient}
 */
function createClient(keypairPath, cluster = "devnet") {
    const connection = new Connection(clusterApiUrl(cluster), "confirmed");
    const wallet = loadWalletFromFile(keypairPath);
    return new PayKitClient(connection, wallet);
}

module.exports = {
    PayKitClient,
    loadWalletFromFile,
    createClient,
    PROGRAM_ID,
};