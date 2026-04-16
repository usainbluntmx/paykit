const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { withPayKitError } = require("./errors");

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
const IDL_PATH = path.resolve(__dirname, "../../target/idl/paykit.json");
const AGENTS_DIR = path.join(os.homedir(), ".paykit", "agents");

// ─── Keypair Storage ──────────────────────────────────────────────────────────

function getAgentKeypairPath(agentName) {
    return path.join(AGENTS_DIR, `${agentName}.json`);
}

function saveAgentKeypair(agentName, keypair) {
    if (!fs.existsSync(AGENTS_DIR)) {
        fs.mkdirSync(AGENTS_DIR, { recursive: true });
    }
    fs.writeFileSync(
        getAgentKeypairPath(agentName),
        JSON.stringify(Array.from(keypair.secretKey))
    );
}

function loadAgentKeypair(agentName) {
    const keypairPath = getAgentKeypairPath(agentName);
    if (!fs.existsSync(keypairPath)) {
        throw new Error(`Agent keypair not found: ${keypairPath}. Register the agent first with createAutonomousAgent.`);
    }
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function agentKeypairExists(agentName) {
    return fs.existsSync(getAgentKeypairPath(agentName));
}

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

    getAgentPDA(agentPublicKey, name) {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent"), agentPublicKey.toBuffer(), Buffer.from(name)],
            PROGRAM_ID
        );
        return pda;
    }

    // ─── Create Autonomous Agent ───────────────────────────────────────────────

    /**
     * Create an autonomous agent with its own keypair.
     * Generates a new keypair, saves it to ~/.paykit/agents/<name>.json,
     * registers the agent onchain, and funds the agent's wallet.
     * After this call, the agent can sign its own transactions.
     *
     * @param {string} name - Agent name (max 32 chars)
     * @param {number} spendLimitLamports - Maximum total spend in lamports
     * @param {number} [dailyLimitBps=1000] - Daily limit in BPS (1–10000). 1000 = 10%
     * @param {number} [fundingLamports=10000000] - SOL to fund agent wallet (default 0.01 SOL)
     * @returns {Promise<{tx: string, agentPDA: PublicKey, agentPublicKey: PublicKey, keypairPath: string}>}
     */
    async createAutonomousAgent(name, spendLimitLamports, dailyLimitBps = 1000, fundingLamports = 10_000_000) {
        return withPayKitError(async () => {
            // Generate agent keypair
            const agentKeypair = Keypair.generate();
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, name);

            // Save keypair before sending TX — fail early if storage fails
            saveAgentKeypair(name, agentKeypair);

            try {
                const tx = await this.program.methods
                    .registerAgent(
                        name,
                        new anchor.BN(spendLimitLamports),
                        dailyLimitBps,
                        new anchor.BN(fundingLamports)
                    )
                    .accounts({
                        agent: agentPDA,
                        agentSigner: agentKeypair.publicKey,
                        owner: this.wallet.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .rpc();

                return {
                    tx,
                    agentPDA,
                    agentPublicKey: agentKeypair.publicKey,
                    keypairPath: getAgentKeypairPath(name),
                };
            } catch (err) {
                // If TX fails, remove the keypair so state is clean
                try { fs.unlinkSync(getAgentKeypairPath(name)); } catch { }
                throw err;
            }
        });
    }

    // ─── Record Payment (agent signs) ─────────────────────────────────────────

    /**
     * Record a payment. The agent signs with its own keypair.
     * @param {string} agentName - Name of the agent
     * @param {number} amountLamports - Payment amount in lamports
     * @param {PublicKey} recipientPubkey - Recipient public key
     * @param {string} memo - Payment description (max 64 chars)
     * @returns {Promise<{tx: string}>}
     */
    async recordPayment(agentName, amountLamports, recipientPubkey, memo) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .recordPayment(new anchor.BN(amountLamports), recipientPubkey, memo)
                .accounts({
                    agent: agentPDA,
                    agentSigner: agentKeypair.publicKey,
                })
                .signers([agentKeypair])
                .rpc();

            return { tx };
        });
    }

    // ─── Agent-to-Agent Payment (sender agent signs) ──────────────────────────

    /**
     * Execute a payment from one agent to another.
     * The sender agent signs with its own keypair — no owner involvement.
     * @param {string} senderName - Name of the sender agent
     * @param {string} receiverName - Name of the receiver agent
     * @param {number} amountLamports - Payment amount in lamports
     * @param {string} service - Service description (max 64 chars)
     * @returns {Promise<{tx: string}>}
     */
    async agentToAgentPayment(senderName, receiverName, amountLamports, service) {
        return withPayKitError(async () => {
            const senderKeypair = loadAgentKeypair(senderName);
            const receiverKeypair = loadAgentKeypair(receiverName);

            const senderPDA = this.getAgentPDA(senderKeypair.publicKey, senderName);
            const receiverPDA = this.getAgentPDA(receiverKeypair.publicKey, receiverName);

            const tx = await this.program.methods
                .agentToAgentPayment(new anchor.BN(amountLamports), service)
                .accounts({
                    senderAgent: senderPDA,
                    receiverAgent: receiverPDA,
                    agentSigner: senderKeypair.publicKey,
                })
                .signers([senderKeypair])
                .rpc();

            return { tx };
        });
    }

    // ─── Batch Payment (sender agent signs) ───────────────────────────────────

    /**
     * Send payments from one agent to multiple agents in a single transaction.
     * The sender agent signs autonomously — no owner involvement.
     * @param {string} senderName - Name of the sender agent
     * @param {Array<{receiverName: string, amountLamports: number, service: string}>} payments
     * @returns {Promise<{tx: string, count: number}>}
     */
    async batchPayment(senderName, payments) {
        if (!payments || payments.length === 0) throw new Error("Payments array cannot be empty");
        if (payments.length > 5) throw new Error("Maximum 5 payments per batch");

        return withPayKitError(async () => {
            const senderKeypair = loadAgentKeypair(senderName);
            const instructions = [];

            for (const payment of payments) {
                const receiverKeypair = loadAgentKeypair(payment.receiverName);
                const senderPDA = this.getAgentPDA(senderKeypair.publicKey, senderName);
                const receiverPDA = this.getAgentPDA(receiverKeypair.publicKey, payment.receiverName);

                const ix = await this.program.methods
                    .agentToAgentPayment(
                        new anchor.BN(payment.amountLamports),
                        payment.service
                    )
                    .accounts({
                        senderAgent: senderPDA,
                        receiverAgent: receiverPDA,
                        agentSigner: senderKeypair.publicKey,
                    })
                    .instruction();
                instructions.push(ix);
            }

            const tx = new anchor.web3.Transaction();
            instructions.forEach(ix => tx.add(ix));
            tx.feePayer = senderKeypair.publicKey;
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.sign(senderKeypair);

            const txId = await this.connection.sendRawTransaction(tx.serialize());
            await this.connection.confirmTransaction(txId, "confirmed");

            return { tx: txId, count: payments.length };
        });
    }

    // ─── Owner operations ─────────────────────────────────────────────────────

    /**
     * Update the spend limit of an agent. Owner signs.
     */
    async updateSpendLimit(agentName, newLimitLamports) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .updateSpendLimit(new anchor.BN(newLimitLamports))
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx };
        });
    }

    /**
     * Deactivate an agent. Owner signs.
     */
    async deactivateAgent(agentName) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .deactivateAgent()
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx };
        });
    }

    /**
     * Reactivate a deactivated agent. Owner signs.
     */
    async reactivateAgent(agentName) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .reactivateAgent()
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx };
        });
    }

    /**
     * Renew an agent's expiration. Owner signs.
     */
    async renewAgent(agentName, extensionSeconds) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .renewAgent(new anchor.BN(extensionSeconds))
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx };
        });
    }

    // ─── Read operations ──────────────────────────────────────────────────────

    /**
     * Fetch a single agent account by name.
     */
    async fetchAgent(agentName) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);
            const agent = await this.program.account.agentAccount.fetch(agentPDA);
            return { pda: agentPDA, ...agent };
        });
    }

    /**
     * Fetch all current-version agents owned by the wallet.
     * Uses dataSize: 168 to exclude legacy agents.
     */
    async fetchAllAgents() {
        return withPayKitError(async () => {
            const agents = await this.program.account.agentAccount.all([
                { dataSize: AgentAccount.LEN },
                {
                    memcmp: {
                        offset: 8 + 32, // skip discriminator + agent_key
                        bytes: this.wallet.publicKey.toBase58(),
                    },
                },
            ]);
            return agents.map(a => ({ pda: a.publicKey, ...a.account }));
        });
    }

    /**
     * Get payment history across the entire program.
     */
    async getPaymentHistory(limit = 50) {
        return withPayKitError(async () => {
            const signatures = await this.connection.getSignaturesForAddress(PROGRAM_ID, { limit });
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
        });
    }

    /**
     * Get payment history for a specific agent.
     */
    async getAgentHistory(agentName, limit = 50) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);
            const agentPDAStr = agentPDA.toBase58();

            const signatures = await this.connection.getSignaturesForAddress(agentPDA, { limit });
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
                    history.push({ type: "agent_to_agent", agentName, agentPDA: agentPDAStr, time, tx: sig.signature });
                } else if (logs.some(l => l.includes("Instruction: RecordPayment"))) {
                    history.push({ type: "record_payment", agentName, agentPDA: agentPDAStr, time, tx: sig.signature });
                } else if (logs.some(l => l.includes("Instruction: RegisterAgent"))) {
                    history.push({ type: "register_agent", agentName, agentPDA: agentPDAStr, time, tx: sig.signature });
                }
            }

            return history;
        });
    }

    /**
     * Check if an agent is expired.
     */
    async checkAgentExpiry(agentName) {
        return withPayKitError(async () => {
            const agent = await this.fetchAgent(agentName);
            const now = Math.floor(Date.now() / 1000);
            const expiresAt = agent.expiresAt.toNumber();
            return {
                expired: now >= expiresAt,
                expiresAt: new Date(expiresAt * 1000),
                daysRemaining: Math.max(0, Math.floor((expiresAt - now) / 86400)),
            };
        });
    }

    /**
     * Estimate fee for a transaction.
     */
    async estimateFee(agentName, amountLamports, type = "record") {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);
            let tx;

            if (type === "record") {
                tx = await this.program.methods
                    .recordPayment(new anchor.BN(amountLamports), this.wallet.publicKey, "fee estimation")
                    .accounts({ agent: agentPDA, agentSigner: agentKeypair.publicKey })
                    .transaction();
            } else {
                tx = await this.program.methods
                    .agentToAgentPayment(new anchor.BN(amountLamports), "fee estimation")
                    .accounts({ senderAgent: agentPDA, receiverAgent: agentPDA, agentSigner: agentKeypair.publicKey })
                    .transaction();
            }

            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.feePayer = agentKeypair.publicKey;

            const fee = await tx.getEstimatedFee(this.connection);
            return { fee, feeSOL: (fee / 1_000_000_000).toFixed(9) };
        });
    }

    /**
     * Watch an agent for new transactions via polling.
     * @returns {function} Call to stop watching
     */
    watchAgent(agentName, callback, intervalMs = 5000) {
        let lastSignature = null;
        let active = true;

        const poll = async () => {
            if (!active) return;
            try {
                const history = await this.getAgentHistory(agentName, 5);
                if (history.length > 0) {
                    const latest = history[0];
                    if (latest.tx !== lastSignature) {
                        if (lastSignature !== null) {
                            const newEntries = history.filter(h => h.tx !== lastSignature);
                            for (const entry of newEntries.reverse()) callback(null, entry);
                        }
                        lastSignature = latest.tx;
                    }
                }
            } catch (err) {
                const { parsePayKitError } = require("./errors");
                const parsed = parsePayKitError(err);
                callback(parsed || err, null);
            }
            if (active) setTimeout(poll, intervalMs);
        };

        this.getAgentHistory(agentName, 1).then(history => {
            if (history.length > 0) lastSignature = history[0].tx;
            setTimeout(poll, intervalMs);
        }).catch(() => setTimeout(poll, intervalMs));

        return () => { active = false; };
    }

    /**
     * Register a Helius webhook for an agent.
     */
    async createWebhook(agentName, webhookUrl, heliusApiKey, cluster = "devnet") {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);
            const baseUrl = cluster === "mainnet-beta" ? "https://api.helius.xyz" : "https://api-devnet.helius.xyz";

            const response = await fetch(`${baseUrl}/v0/webhooks?api-key=${heliusApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    webhookURL: webhookUrl,
                    transactionTypes: ["Any"],
                    accountAddresses: [agentPDA.toBase58()],
                    webhookType: "enhanced",
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Helius webhook creation failed: ${err.message || response.status}`);
            }

            const data = await response.json();
            return { webhookId: data.webhookID, agentPDA: agentPDA.toBase58(), webhookUrl };
        });
    }

    /**
     * Delete a Helius webhook.
     */
    async deleteWebhook(webhookId, heliusApiKey, cluster = "devnet") {
        return withPayKitError(async () => {
            const baseUrl = cluster === "mainnet-beta" ? "https://api.helius.xyz" : "https://api-devnet.helius.xyz";
            const response = await fetch(`${baseUrl}/v0/webhooks/${webhookId}?api-key=${heliusApiKey}`, { method: "DELETE" });
            if (!response.ok) throw new Error(`Failed to delete webhook: ${response.status}`);
            return { deleted: true };
        });
    }

    /**
     * List all agent keypairs stored locally.
     * @returns {Array<{name: string, publicKey: string, keypairPath: string}>}
     */
    listLocalAgents() {
        if (!fs.existsSync(AGENTS_DIR)) return [];
        return fs.readdirSync(AGENTS_DIR)
            .filter(f => f.endsWith(".json"))
            .map(f => {
                const name = f.replace(".json", "");
                try {
                    const keypair = loadAgentKeypair(name);
                    return { name, publicKey: keypair.publicKey.toBase58(), keypairPath: getAgentKeypairPath(name) };
                } catch { return null; }
            })
            .filter(Boolean);
    }
}

// ─── Constants for dataSize filter ───────────────────────────────────────────

const AgentAccount = {
    LEN: 8 + 32 + 32 + (4 + 32) + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 2, // 168
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadWalletFromFile(keypairPath) {
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    return new anchor.Wallet(keypair);
}

function createClient(keypairPath, cluster = "devnet", customRpcUrl = null) {
    const rpcUrl = customRpcUrl || clusterApiUrl(cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    const wallet = loadWalletFromFile(keypairPath);
    return new PayKitClient(connection, wallet);
}

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
    loadAgentKeypair,
    agentKeypairExists,
    PROGRAM_ID,
    AGENTS_DIR,
};