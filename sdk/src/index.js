const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { withPayKitError } = require("./errors");

// ─── Capability Constants ─────────────────────────────────────────────────────

const CAPABILITIES = {
    CAN_PAY_AGENTS: 1 << 0,
    CAN_HIRE_BASIC: 1 << 1,
    CAN_HIRE_STANDARD: 1 << 2,
    CAN_HIRE_PREMIUM: 1 << 3,
    CAN_TRANSFER_SOL: 1 << 4,
    CAN_TRANSFER_SPL: 1 << 5,
    CAN_BATCH_PAY: 1 << 6,
    CUSTOM_1: 1 << 8,
    CUSTOM_2: 1 << 9,
    CUSTOM_3: 1 << 10,
    CUSTOM_4: 1 << 11,
    CUSTOM_5: 1 << 12,
    CUSTOM_6: 1 << 13,
    CUSTOM_7: 1 << 14,
    CUSTOM_8: 1 << 15,
};

const CAP_ALL_DEFAULT =
    CAPABILITIES.CAN_PAY_AGENTS |
    CAPABILITIES.CAN_HIRE_BASIC |
    CAPABILITIES.CAN_HIRE_STANDARD |
    CAPABILITIES.CAN_HIRE_PREMIUM |
    CAPABILITIES.CAN_TRANSFER_SOL |
    CAPABILITIES.CAN_TRANSFER_SPL |
    CAPABILITIES.CAN_BATCH_PAY;

// ─── Category Constants ───────────────────────────────────────────────────────

const CATEGORIES = {
    NONE: 0,
    COMPUTE: 1,
    DATA: 2,
    STORAGE: 3,
    INFERENCE: 4,
    RESEARCH: 5,
    CONTENT: 6,
    // 8-255: custom
};

const CATEGORY_NAMES = {
    0: "none",
    1: "compute",
    2: "data",
    3: "storage",
    4: "inference",
    5: "research",
    6: "content",
};

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
    async createAutonomousAgent(name, spendLimitLamports, dailyLimitBps = 1000, fundingLamports = 10_000_000, capabilities = CAP_ALL_DEFAULT, tier = 0) {
        return withPayKitError(async () => {
            const agentKeypair = Keypair.generate();
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, name);

            saveAgentKeypair(name, agentKeypair);

            try {
                const tx = await this.program.methods
                    .registerAgent(
                        name,
                        new anchor.BN(spendLimitLamports),
                        dailyLimitBps,
                        new anchor.BN(fundingLamports),
                        capabilities,
                        tier
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
                    capabilities,
                    tier,
                };
            } catch (err) {
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
    async recordPayment(agentName, amountLamports, recipientPubkey, memo, categoryId = 0) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .recordPayment(new anchor.BN(amountLamports), recipientPubkey, memo, categoryId)
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
    async agentToAgentPayment(senderName, receiverName, amountLamports, service, categoryId = 0) {
        return withPayKitError(async () => {
            const senderKeypair = loadAgentKeypair(senderName);
            const receiverKeypair = loadAgentKeypair(receiverName);

            const senderPDA = this.getAgentPDA(senderKeypair.publicKey, senderName);
            const receiverPDA = this.getAgentPDA(receiverKeypair.publicKey, receiverName);

            const tx = await this.program.methods
                .agentToAgentPayment(new anchor.BN(amountLamports), service, categoryId)
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

    // ─── Token Transfers ──────────────────────────────────────────────────────

    /**
     * Transfer USDC from one agent to another.
     * The sender agent signs with its own keypair — no owner involvement.
     * Also records the payment onchain for accountability.
     * @param {string} fromAgentName - Sender agent name
     * @param {string} toAgentName - Receiver agent name  
     * @param {number} amountUSDC - Amount in USDC (e.g. 1.5 = 1.5 USDC)
     * @param {string} memo - Payment description
     * @returns {Promise<{tx: string, amount: number, mint: string}>}
     */
    async transferUSDC(fromAgentName, toAgentName, amountUSDC, memo) {
        const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
        return this.transferSPL(fromAgentName, toAgentName, amountUSDC, USDC_MINT, 6, memo);
    }

    /**
     * Transfer any SPL token between agents.
     * The sender agent signs autonomously.
     * @param {string} fromAgentName - Sender agent name
     * @param {string} toAgentName - Receiver agent name
     * @param {number} amount - Human-readable amount (e.g. 1.5)
     * @param {PublicKey} mint - SPL token mint address
     * @param {number} decimals - Token decimals (6 for USDC, 9 for most others)
     * @param {string} memo - Payment description
     * @returns {Promise<{tx: string, amount: number, mint: string}>}
     */
    async transferSPL(fromAgentName, toAgentName, amount, mint, decimals, memo) {
        return withPayKitError(async () => {
            const {
                getAssociatedTokenAddress,
                createAssociatedTokenAccountInstruction,
                createTransferInstruction,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
                getAccount,
            } = require("@solana/spl-token");

            const senderKeypair = loadAgentKeypair(fromAgentName);
            const receiverKeypair = loadAgentKeypair(toAgentName);

            const senderATA = await getAssociatedTokenAddress(mint, senderKeypair.publicKey);
            const receiverATA = await getAssociatedTokenAddress(mint, receiverKeypair.publicKey);

            const rawAmount = Math.floor(amount * Math.pow(10, decimals));
            const tx = new anchor.web3.Transaction();

            // Create receiver ATA if it doesn't exist
            try {
                await getAccount(this.connection, receiverATA);
            } catch {
                tx.add(
                    createAssociatedTokenAccountInstruction(
                        senderKeypair.publicKey,   // payer
                        receiverATA,               // ata
                        receiverKeypair.publicKey, // owner
                        mint,
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                );
            }

            // SPL transfer instruction — sender agent signs
            tx.add(
                createTransferInstruction(
                    senderATA,
                    receiverATA,
                    senderKeypair.publicKey,
                    rawAmount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            // Record payment onchain for accountability
            const senderPDA = this.getAgentPDA(senderKeypair.publicKey, fromAgentName);
            const recordIx = await this.program.methods
                .recordPayment(
                    new anchor.BN(rawAmount),
                    receiverKeypair.publicKey,
                    memo,
                    0  // category_id: none
                )
                .accountsPartial({
                    agent: senderPDA,
                    agentSigner: senderKeypair.publicKey,
                })
                .instruction();
            tx.add(recordIx);

            tx.feePayer = senderKeypair.publicKey;
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.sign(senderKeypair);

            const txId = await this.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
                preflightCommitment: "confirmed",
            });
            await this.connection.confirmTransaction(txId, "confirmed");

            return { tx: txId, amount, mint: mint.toBase58() };
        });
    }

    /**
     * Transfer SOL directly between agent wallets.
     * The sender agent signs autonomously.
     * Also records the payment onchain for accountability.
     * @param {string} fromAgentName - Sender agent name
     * @param {string} toAgentName - Receiver agent name
     * @param {number} amountSOL - Amount in SOL (e.g. 0.001)
     * @param {string} memo - Payment description
     * @returns {Promise<{tx: string, amount: number}>}
     */
    async transferSOL(fromAgentName, toAgentName, amountSOL, memo) {
        return withPayKitError(async () => {
            const senderKeypair = loadAgentKeypair(fromAgentName);
            const receiverKeypair = loadAgentKeypair(toAgentName);

            const lamports = Math.floor(amountSOL * 1_000_000_000);
            const senderPDA = this.getAgentPDA(senderKeypair.publicKey, fromAgentName);

            const tx = new anchor.web3.Transaction();

            // SOL transfer
            tx.add(
                anchor.web3.SystemProgram.transfer({
                    fromPubkey: senderKeypair.publicKey,
                    toPubkey: receiverKeypair.publicKey,
                    lamports,
                })
            );

            // Record payment onchain for accountability
            const recordIx = await this.program.methods
                .recordPayment(
                    new anchor.BN(lamports),
                    receiverKeypair.publicKey,
                    memo,
                    0  // category_id: none
                )
                .accountsPartial({
                    agent: senderPDA,
                    agentSigner: senderKeypair.publicKey,
                })
                .instruction();
            tx.add(recordIx);

            tx.feePayer = senderKeypair.publicKey;
            tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tx.sign(senderKeypair);

            const txId = await this.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
                preflightCommitment: "confirmed",
            });
            await this.connection.confirmTransaction(txId, "confirmed");

            return { tx: txId, amount: amountSOL };
        });
    }

    /**
     * Get token balance for an agent's wallet.
     * @param {string} agentName - Agent name
     * @param {PublicKey} mint - SPL token mint address
     * @param {number} [decimals=6] - Token decimals
     * @returns {Promise<{raw: number, ui: number, mint: string}>}
     */
    async getTokenBalance(agentName, mint, decimals = 6) {
        return withPayKitError(async () => {
            const { getAssociatedTokenAddress, getAccount } = require("@solana/spl-token");
            const agentKeypair = loadAgentKeypair(agentName);
            const ata = await getAssociatedTokenAddress(mint, agentKeypair.publicKey);
            try {
                const account = await getAccount(this.connection, ata);
                const raw = Number(account.amount);
                return {
                    raw,
                    ui: raw / Math.pow(10, decimals),
                    mint: mint.toBase58(),
                };
            } catch {
                return { raw: 0, ui: 0, mint: mint.toBase58() };
            }
        });
    }

    /**
     * Get SOL balance for an agent's wallet.
     * @param {string} agentName - Agent name
     * @returns {Promise<{lamports: number, sol: number}>}
     */
    async getSOLBalance(agentName) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const lamports = await this.connection.getBalance(agentKeypair.publicKey);
            return { lamports, sol: lamports / 1_000_000_000 };
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

    // ─── Capabilities ─────────────────────────────────────────────────────────

    /**
     * Set capabilities for an agent. Owner signs.
     * @param {string} agentName
     * @param {number} capabilities - bitmask using CAPABILITIES constants
     */
    async setCapabilities(agentName, capabilities) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .setCapabilities(capabilities)
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx, capabilities };
        });
    }

    /**
     * Set the tier of an agent. Owner signs.
     * @param {string} agentName
     * @param {number} tier - 0=basic, 1=standard, 2=premium
     */
    async setTier(agentName, tier) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .setTier(tier)
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx, tier };
        });
    }

    /**
     * Set a spending limit for a specific category. Owner signs.
     * @param {string} agentName
     * @param {number} categoryId - use CATEGORIES constants or custom ID (8-255)
     * @param {number} limitLamports - max spend per payment in this category
     * @param {string} [customName] - name for custom categories (id >= 8)
     */
    async setCategoryLimit(agentName, categoryId, limitLamports, customName = null) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .setCategoryLimit(categoryId, new anchor.BN(limitLamports), customName)
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx, categoryId, limitLamports };
        });
    }

    /**
     * Define a custom capability in a slot (0-7 maps to bits 8-15).
     * Owner signs.
     * @param {string} agentName
     * @param {number} slot - 0-7
     * @param {string} name - capability name (max 16 chars)
     * @param {boolean} enabled - whether to enable this capability
     */
    async setCustomCapability(agentName, slot, name, enabled = true) {
        return withPayKitError(async () => {
            const agentKeypair = loadAgentKeypair(agentName);
            const agentPDA = this.getAgentPDA(agentKeypair.publicKey, agentName);

            const tx = await this.program.methods
                .setCustomCapability(slot, name, enabled)
                .accounts({ agent: agentPDA, owner: this.wallet.publicKey })
                .rpc();

            return { tx, slot, name, enabled };
        });
    }

    /**
     * Decode a capabilities bitmask into a human-readable object.
     * @param {number} capabilities - bitmask
     * @returns {object}
     */
    decodeCapabilities(capabilities) {
        return {
            canPayAgents: !!(capabilities & CAPABILITIES.CAN_PAY_AGENTS),
            canHireBasic: !!(capabilities & CAPABILITIES.CAN_HIRE_BASIC),
            canHireStandard: !!(capabilities & CAPABILITIES.CAN_HIRE_STANDARD),
            canHirePremium: !!(capabilities & CAPABILITIES.CAN_HIRE_PREMIUM),
            canTransferSOL: !!(capabilities & CAPABILITIES.CAN_TRANSFER_SOL),
            canTransferSPL: !!(capabilities & CAPABILITIES.CAN_TRANSFER_SPL),
            canBatchPay: !!(capabilities & CAPABILITIES.CAN_BATCH_PAY),
            custom: {
                slot1: !!(capabilities & CAPABILITIES.CUSTOM_1),
                slot2: !!(capabilities & CAPABILITIES.CUSTOM_2),
                slot3: !!(capabilities & CAPABILITIES.CUSTOM_3),
                slot4: !!(capabilities & CAPABILITIES.CUSTOM_4),
                slot5: !!(capabilities & CAPABILITIES.CUSTOM_5),
                slot6: !!(capabilities & CAPABILITIES.CUSTOM_6),
                slot7: !!(capabilities & CAPABILITIES.CUSTOM_7),
                slot8: !!(capabilities & CAPABILITIES.CUSTOM_8),
            },
            raw: capabilities,
        };
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
    LEN: 8 + 32 + 32 + (4 + 32) + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 2 + 2 + 1 + (9 * 8) + (16 * 8),
    // discriminator + agent_key + owner + name + spend_limit + total_spent +
    // payment_count + is_active + bump + last_payment_at + daily_spent +
    // daily_reset_at + expires_at + daily_limit_bps + capabilities + tier +
    // category_limits(9*8) + custom_capability_names(16*8)
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
    CAPABILITIES,
    CAP_ALL_DEFAULT,
    CATEGORIES,
    CATEGORY_NAMES,
};