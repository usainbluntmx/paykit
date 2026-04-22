// ─── PayKit Error Codes ───────────────────────────────────────────────────────

const PAYKIT_ERRORS = {
    6000: { code: "NameTooLong", message: "Agent name exceeds 32 characters." },
    6001: { code: "InvalidSpendLimit", message: "Spend limit must be greater than zero." },
    6002: { code: "InvalidAmount", message: "Payment amount must be greater than zero." },
    6003: { code: "SpendLimitExceeded", message: "Agent has exceeded its total spend limit." },
    6004: { code: "AgentInactive", message: "Agent is inactive and cannot make or receive payments." },
    6005: { code: "MemoTooLong", message: "Memo or service description exceeds 64 characters." },
    6006: { code: "DailyLimitExceeded", message: "Agent has exceeded its daily spend limit." },
    6007: { code: "AgentExpired", message: "Agent has expired. Use renewAgent() to extend." },
    6008: { code: "InvalidDailyLimit", message: "Daily limit must be between 1 and 10000 basis points." },
    6009: { code: "CapabilityDenied", message: "Agent does not have the required capability for this operation." },
    6010: { code: "TierNotAllowed", message: "Agent cannot hire agents of this tier." },
    6011: { code: "InvalidTier", message: "Invalid tier — must be 0 (basic), 1 (standard), or 2 (premium)." },
    6012: { code: "CategoryLimitExceeded", message: "Payment exceeds the category spend limit for this agent." },
    6013: { code: "InvalidCategory", message: "Invalid category ID." },
    6014: { code: "CategorySlotsFull", message: "All category limit slots are in use (max 8)." },
    6015: { code: "InvalidCapabilitySlot", message: "Invalid capability slot — must be 0-7." },
};

// ─── PayKit Error Class ───────────────────────────────────────────────────────

class PayKitError extends Error {
    constructor(code, message, errorNumber = null, originalError = null) {
        super(message);
        this.name = "PayKitError";
        this.code = code;
        this.errorNumber = errorNumber;
        this.originalError = originalError;
    }
}

// ─── Error Parser ─────────────────────────────────────────────────────────────

function parsePayKitError(error) {
    if (!error) return null;

    const message = error.message || "";

    // Hex pattern — e.g. "custom program error: 0x1773"
    const hexMatch = message.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (hexMatch) {
        const errNum = parseInt(hexMatch[1], 16);
        const known = PAYKIT_ERRORS[errNum];
        if (known) return new PayKitError(known.code, known.message, errNum, error);
    }

    // Decimal pattern — e.g. "Error Number: 6003"
    const numMatch = message.match(/Error Number: (\d+)/);
    if (numMatch) {
        const errNum = parseInt(numMatch[1]);
        const known = PAYKIT_ERRORS[errNum];
        if (known) return new PayKitError(known.code, known.message, errNum, error);
    }

    // Anchor error code pattern — e.g. "Error Code: SpendLimitExceeded"
    const codeMatch = message.match(/Error Code: (\w+)/);
    if (codeMatch) {
        const known = Object.values(PAYKIT_ERRORS).find(e => e.code === codeMatch[1]);
        if (known) return new PayKitError(known.code, known.message, null, error);
    }

    // Named error patterns in message
    for (const [num, err] of Object.entries(PAYKIT_ERRORS)) {
        if (message.includes(err.code)) {
            return new PayKitError(err.code, err.message, parseInt(num), error);
        }
    }

    // Blockhash expired
    if (message.includes("Blockhash not found") || message.includes("BlockhashNotFound")) {
        return new PayKitError("BlockhashExpired", "Transaction blockhash expired. Please retry.", null, error);
    }

    // Already processed
    if (message.includes("already been processed")) {
        return new PayKitError("AlreadyProcessed", "This transaction was already processed onchain.", null, error);
    }

    // Account not found
    if (message.includes("AccountNotFound") || message.includes("Account does not exist")) {
        return new PayKitError("AccountNotFound", "Agent account not found. Verify the agent name and owner.", null, error);
    }

    // Legacy agent — deserialization or buffer overflow
    if (
        message.includes("AccountDidNotDeserialize") ||
        message.includes("Failed to deserialize") ||
        message.includes("beyond buffer length") ||
        message.includes("out of range")
    ) {
        return new PayKitError("LegacyAgent", "This agent was created with an older contract version and is incompatible.", null, error);
    }

    // Insufficient funds
    if (
        message.includes("insufficient funds") ||
        message.includes("Insufficient funds") ||
        message.includes("InsufficientFunds")
    ) {
        return new PayKitError("InsufficientFunds", "Insufficient SOL balance to pay transaction fees.", null, error);
    }

    // Wallet not connected
    if (message.includes("Wallet not connected")) {
        return new PayKitError("WalletNotConnected", "Wallet is not connected.", null, error);
    }

    return null;
}

// ─── Wrap function with granular error handling ───────────────────────────────

async function withPayKitError(fn) {
    try {
        return await fn();
    } catch (error) {
        const parsed = parsePayKitError(error);
        if (parsed) throw parsed;
        throw error;
    }
}

module.exports = { PayKitError, parsePayKitError, withPayKitError, PAYKIT_ERRORS };