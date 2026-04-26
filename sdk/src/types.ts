import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import BN from "bn.js";

// ─── Agent Account ────────────────────────────────────────────────────────────

export interface CategoryLimit {
    categoryId: number;
    limit: BN;
}

export interface AgentAccount {
    agentKey: PublicKey;
    owner: PublicKey;
    name: string;
    spendLimit: BN;
    totalSpent: BN;
    paymentCount: BN;
    isActive: boolean;
    bump: number;
    lastPaymentAt: BN;
    dailySpent: BN;
    dailyResetAt: BN;
    expiresAt: BN;
    dailyLimitBps: number;
    capabilities: number;
    tier: number;                          // 0=basic, 1=standard, 2=premium
    categoryLimits: CategoryLimit[];       // 8 slots
    customCapabilityNames: number[][];     // 8 × [u8; 16]
}

export interface AgentWithPDA extends AgentAccount {
    pda: PublicKey;
}

// ─── Instruction Params ───────────────────────────────────────────────────────

export interface RegisterAgentParams {
    name: string;
    spendLimitLamports: number;
    dailyLimitBps?: number;
}

export interface RecordPaymentParams {
    agentName: string;
    amountLamports: number;
    recipient: PublicKey;
    memo: string;
}

export interface AgentToAgentParams {
    senderName: string;
    receiverName: string;
    amountLamports: number;
    service: string;
}

export interface UpdateSpendLimitParams {
    agentName: string;
    newLimitLamports: number;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface TransactionResult {
    tx: string;
    agentPDA?: PublicKey;
}

export interface RenewAgentParams {
    agentName: string;
    extensionSeconds: number;
}

export interface AgentExpiryInfo {
    expired: boolean;
    expiresAt: Date;
    daysRemaining: number;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface AgentRegisteredEvent {
    owner: PublicKey;
    name: string;
    spendLimit: BN;
}

export interface PaymentRecordedEvent {
    agent: PublicKey;
    owner: PublicKey;
    recipient: PublicKey;
    amount: BN;
    memo: string;
    paymentCount: BN;
}

export interface AgentPaymentSentEvent {
    sender: PublicKey;
    receiver: PublicKey;
    amount: BN;
    service: string;
}

export interface BatchPaymentItem {
    receiverName: string;
    amountLamports: number;
    service: string;
}

export interface BatchPaymentResult {
    tx: string;
    count: number;
}

export interface ReactivateAgentResult {
    tx: string;
}

export interface CloseAgentResult {
    tx: string;
    rentRecovered: string;
}

export interface BrowserWalletAdapter {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
}

export declare class PayKitClient {
    connection: Connection;
    wallet: BrowserWalletAdapter;
    program: any;
    constructor(connection: Connection, wallet: BrowserWalletAdapter);
    getAgentPDA(ownerPubkey: PublicKey, name: string): PublicKey;
    registerAgent(name: string, spendLimitLamports: number): Promise<TransactionResult>;
    recordPayment(agentName: string, amountLamports: number, recipient: PublicKey, memo: string): Promise<TransactionResult>;
    agentToAgentPayment(senderName: string, receiverName: string, amountLamports: number, service: string): Promise<TransactionResult>;
    batchPayment(senderName: string, payments: BatchPaymentItem[]): Promise<BatchPaymentResult>;
    updateSpendLimit(agentName: string, newLimitLamports: number): Promise<TransactionResult>;
    deactivateAgent(agentName: string): Promise<TransactionResult>;
    reactivateAgent(agentName: string): Promise<TransactionResult>;
    renewAgent(agentName: string, extensionSeconds: number): Promise<TransactionResult>;
    closeAgent(agentName: string): Promise<CloseAgentResult>;
    checkAgentExpiry(agentName: string, ownerPubkey?: PublicKey): Promise<AgentExpiryInfo>;
    estimateFee(agentName: string, amountLamports: number, type?: string): Promise<{ fee: number; feeSOL: string }>;
    fetchAgent(agentName: string, ownerPubkey?: PublicKey): Promise<AgentWithPDA>;
    fetchAllAgents(): Promise<AgentWithPDA[]>;
    getPaymentHistory(limit?: number): Promise<{ type: string; time: string; tx: string }[]>;
    getAgentHistory(agentName: string, limit?: number): Promise<AgentHistoryEntry[]>;
    watchAgent(agentName: string, callback: (err: PayKitError | null, entry: AgentHistoryEntry | null) => void, intervalMs?: number): () => void;
    createWebhook(agentName: string, webhookUrl: string, heliusApiKey: string, cluster?: string): Promise<WebhookResult>;
    deleteWebhook(webhookId: string, heliusApiKey: string, cluster?: string): Promise<{ deleted: boolean }>;
}

export interface PayKitClientOptions {
    skipPreflight?: boolean;
}

export declare function createClient(keypairPath: string, cluster?: string, customRpcUrl?: string, options?: PayKitClientOptions): PayKitClient;

export declare function createClientFromWallet(
    walletAdapter: BrowserWalletAdapter,
    connection: Connection
): PayKitClient;

export declare class PayKitError extends Error {
    name: "PayKitError";
    code: string;
    originalError: Error | null;
    constructor(code: string, message: string, originalError?: Error | null);
}

export declare function parsePayKitError(error: Error): PayKitError | null;
export declare function withPayKitError<T>(fn: () => Promise<T>): Promise<T>;

export interface AgentHistoryEntry {
    type: "agent_to_agent" | "record_payment" | "register_agent";
    agentName: string;
    agentPDA: string;
    time: string;
    tx: string;
}

export interface WebhookResult {
    webhookId: string;
    agentPDA: string;
    webhookUrl: string;
}

export interface AgentWatchEntry extends AgentHistoryEntry {
    // Same fields as AgentHistoryEntry
}