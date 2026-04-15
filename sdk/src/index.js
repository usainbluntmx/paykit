const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const { withPayKitError } = require("./errors");

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
    async registerAgent(name, spendLimitLamports, dailyLimitBps = 1000) {
        return withPayKitError(async () => {
            if (dailyLimitBps < 1 || dailyLimitBps > 10000) throw new Error("dailyLimitBps must be between 1 and 10000");
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, name);
            const tx = await this.program.methods
                .registerAgent(name, new anchor.BN(spendLimitLamports), dailyLimitBps)
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            return { tx, agentPDA };
        });
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
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            const tx = await this.program.methods
                .recordPayment(new anchor.BN(amountLamports), recipientPubkey, memo)
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                })
                .rpc();
            return { tx };
        });
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
        return withPayKitError(async () => {
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
        });
    }

    // ─── Batch Payment ─────────────────────────────────────────────────────────

    /**
     * Send payments from one agent to multiple agents in a single transaction
     * @param {string} senderName - Name of the sender agent
     * @param {Array<{receiverName: string, amountLamports: number, service: string}>} payments
     * @returns {Promise<{tx: string, count: number}>}
     */
    async batchPayment(senderName, payments) {
        if (!payments || payments.length === 0) throw new Error("Payments array cannot be empty");
        if (payments.length > 5) throw new Error("Maximum 5 payments per batch");

        return withPayKitError(async () => {
            const senderPDA = this.getAgentPDA(this.wallet.publicKey, senderName);
            const instructions = [];

            for (const payment of payments) {
                const receiverPDA = this.getAgentPDA(this.wallet.publicKey, payment.receiverName);
                const ix = await this.program.methods
                    .agentToAgentPayment(
                        new anchor.BN(payment.amountLamports),
                        payment.service
                    )
                    .accounts({
                        senderAgent: senderPDA,
                        receiverAgent: receiverPDA,
                        owner: this.wallet.publicKey,
                    })
                    .instruction();
                instructions.push(ix);
            }

            const tx = new anchor.web3.Transaction();
            instructions.forEach(ix => tx.add(ix));
            tx.feePayer = this.wallet.publicKey;
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

            const signed = await this.wallet.signTransaction(tx);
            const txId = await this.connection.sendRawTransaction(signed.serialize());
            await this.connection.confirmTransaction(txId, "confirmed");

            return { tx: txId, count: payments.length };
        });
    }

    // ─── Update Spend Limit ────────────────────────────────────────────────────

    /**
     * Update the spend limit of an agent
     * @param {string} agentName - Name of the agent
     * @param {number} newLimitLamports - New spend limit in lamports
     * @returns {Promise<{tx: string}>}
     */
    async updateSpendLimit(agentName, newLimitLamports) {
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            const tx = await this.program.methods
                .updateSpendLimit(new anchor.BN(newLimitLamports))
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                })
                .rpc();
            return { tx };
        });
    }

    // ─── Deactivate Agent ──────────────────────────────────────────────────────

    /**
     * Deactivate an agent permanently
     * @param {string} agentName - Name of the agent
     * @returns {Promise<{tx: string}>}
     */
    async deactivateAgent(agentName) {
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            const tx = await this.program.methods
                .deactivateAgent()
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                })
                .rpc();
            return { tx };
        });
    }

    // ─── Reactivate Agent ──────────────────────────────────────────────────────

    /**
     * Reactivate a previously deactivated agent
     * @param {string} agentName - Name of the agent
     * @returns {Promise<{tx: string}>}
     */
    async reactivateAgent(agentName) {
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            const tx = await this.program.methods
                .reactivateAgent()
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                })
                .rpc();
            return { tx };
        });
    }

    // ─── Renew Agent ───────────────────────────────────────────────────────────

    /**
     * Renew an agent's expiration date
     * @param {string} agentName - Name of the agent
     * @param {number} extensionSeconds - Seconds to extend (e.g. 31_536_000 = 1 year)
     * @returns {Promise<{tx: string}>}
     */
    async renewAgent(agentName, extensionSeconds) {
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            const tx = await this.program.methods
                .renewAgent(new anchor.BN(extensionSeconds))
                .accounts({
                    agent: agentPDA,
                    owner: this.wallet.publicKey,
                })
                .rpc();
            return { tx };
        });
    }

    // ─── Fetch Agent ───────────────────────────────────────────────────────────

    /**
     * Fetch a single agent account
     * @param {string} agentName - Name of the agent
     * @param {PublicKey} [ownerPubkey] - Owner public key (defaults to wallet)
     * @returns {Promise<AgentWithPDA>}
     */
    async fetchAgent(agentName, ownerPubkey) {
        return withPayKitError(async () => {
            const owner = ownerPubkey || this.wallet.publicKey;
            const agentPDA = this.getAgentPDA(owner, agentName);
            const agent = await this.program.account.agentAccount.fetch(agentPDA);
            return { pda: agentPDA, ...agent };
        });
    }

    // ─── Fetch All Agents ──────────────────────────────────────────────────────

    /**
     * Fetch all agents owned by the current wallet
     * @returns {Promise<AgentWithPDA[]>}
     */
    async fetchAllAgents() {
        return withPayKitError(async () => {
            const agents = await this.program.account.agentAccount.all([
                { dataSize: 136 },
                {
                    memcmp: {
                        offset: 8,
                        bytes: this.wallet.publicKey.toBase58(),
                    },
                },
            ]);
            return agents.map(a => ({ pda: a.publicKey, ...a.account }));
        });
    }

    // ─── Get Payment History ───────────────────────────────────────────────────

    /**
     * Fetch payment history from on-chain transaction logs
     * @param {number} [limit=50] - Number of transactions to fetch
     * @returns {Promise<Array>}
     */
    async getPaymentHistory(limit = 50) {
        return withPayKitError(async () => {
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
                    const senderLog = logs.find(l => l.includes("sender_name"));
                    const receiverLog = logs.find(l => l.includes("receiver_name"));
                    const amountLog = logs.find(l => l.includes("amount"));
                    history.push({
                        type: "agent_to_agent",
                        time,
                        tx: sig.signature,
                        senderName: senderLog ? senderLog.match(/"sender_name":"([^"]+)"/)?.[1] : null,
                        receiverName: receiverLog ? receiverLog.match(/"receiver_name":"([^"]+)"/)?.[1] : null,
                    });
                } else if (logs.some(l => l.includes("Instruction: RecordPayment"))) {
                    const agentLog = logs.find(l => l.includes("agent_name"));
                    const memoLog = logs.find(l => l.includes("memo"));
                    history.push({
                        type: "record_payment",
                        time,
                        tx: sig.signature,
                        agentName: agentLog ? agentLog.match(/"agent_name":"([^"]+)"/)?.[1] : null,
                        memo: memoLog ? memoLog.match(/"memo":"([^"]+)"/)?.[1] : null,
                    });
                } else if (logs.some(l => l.includes("Instruction: RegisterAgent"))) {
                    const nameLog = logs.find(l => l.includes("\"name\""));
                    history.push({
                        type: "register_agent",
                        time,
                        tx: sig.signature,
                        agentName: nameLog ? nameLog.match(/"name":"([^"]+)"/)?.[1] : null,
                    });
                }
            }

            return history;
        });
    }

    // ─── Check Agent Expiry ────────────────────────────────────────────────────

    /**
     * Check if an agent is expired
     * @param {string} agentName - Name of the agent
     * @param {PublicKey} [ownerPubkey] - Owner public key (defaults to wallet)
     * @returns {Promise<{expired: boolean, expiresAt: Date, daysRemaining: number}>}
     */
    async checkAgentExpiry(agentName, ownerPubkey) {
        return withPayKitError(async () => {
            const agent = await this.fetchAgent(agentName, ownerPubkey);
            const now = Math.floor(Date.now() / 1000);
            const expiresAt = agent.expiresAt.toNumber();
            const expired = now >= expiresAt;
            const daysRemaining = Math.max(0, Math.floor((expiresAt - now) / 86400));
            return {
                expired,
                expiresAt: new Date(expiresAt * 1000),
                daysRemaining,
            };
        });
    }

    // ─── Estimate Fee ──────────────────────────────────────────────────────────

    /**
     * Estimate the fee for a transaction before executing it
     * @param {string} agentName - Name of the agent
     * @param {number} amountLamports - Payment amount in lamports
     * @param {string} type - "record" | "agent_to_agent"
     * @returns {Promise<{fee: number, feeSOL: string}>}
     */
    async estimateFee(agentName, amountLamports, type = "record") {
        return withPayKitError(async () => {
            const agentPDA = this.getAgentPDA(this.wallet.publicKey, agentName);
            let tx;

            if (type === "record") {
                tx = await this.program.methods
                    .recordPayment(
                        new anchor.BN(amountLamports),
                        this.wallet.publicKey,
                        "fee estimation"
                    )
                    .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                    .transaction();
            } else {
                tx = await this.program.methods
                    .agentToAgentPayment(
                        new anchor.BN(amountLamports),
                        "fee estimation"
                    )
                    .accounts({
                        senderAgent: agentPDA,
                        receiverAgent: agentPDA,
                        owner: this.wallet.publicKey,
                    })
                    .transaction();
            }

            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.feePayer = this.wallet.publicKey;

            const fee = await tx.getEstimatedFee(this.connection);
            return {
                fee,
                feeSOL: (fee / 1_000_000_000).toFixed(9),
            };
        });
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
 * Create a PayKitClient from a keypair file
 * @param {string} keypairPath - Path to Solana keypair JSON file
 * @param {string} [cluster="devnet"] - Solana cluster
 * @param {string} [customRpcUrl=null] - Custom RPC URL
 * @returns {PayKitClient}
 */
function createClient(keypairPath, cluster = "devnet", customRpcUrl = null) {
    const rpcUrl = customRpcUrl || clusterApiUrl(cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    const wallet = loadWalletFromFile(keypairPath);
    return new PayKitClient(connection, wallet);
}

/**
 * Create a PayKit client from a browser wallet adapter (Phantom, Backpack, etc.)
 * @param {object} walletAdapter - Connected wallet adapter with publicKey and signTransaction
 * @param {Connection} connection - Solana connection object
 * @returns {PayKitClient}
 */
function createClientFromWallet(walletAdapter, connection) {
    if (!walletAdapter.publicKey) throw new Error("Wallet not connected");
    if (!walletAdapter.signTransaction) throw new Error("Wallet does not support signTransaction");
    return new PayKitClient(connection, walletAdapter);
}

module.exports = {
    PayKitClient,
    loadWalletFromFile,
    createClient,
    createClientFromWallet,
    PROGRAM_ID,
};