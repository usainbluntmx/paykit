import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ─── Agent Account ────────────────────────────────────────────────────────────

export interface AgentAccount {
    owner: PublicKey;
    name: string;
    spendLimit: BN;
    totalSpent: BN;
    paymentCount: BN;
    isActive: boolean;
    bump: number;
}

export interface AgentWithPDA extends AgentAccount {
    pda: PublicKey;
}

// ─── Instruction Params ───────────────────────────────────────────────────────

export interface RegisterAgentParams {
    name: string;
    spendLimitLamports: number;
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