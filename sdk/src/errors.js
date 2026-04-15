// ─── PayKit Error Codes ───────────────────────────────────────────────────────

const PAYKIT_ERRORS = {
    6000: { code: "NameTooLong", message: "Agent name exceeds 32 characters." },
    6001: { code: "InvalidSpendLimit", message: "Spend limit must be greater than zero." },
    6002: { code: "InvalidAmount", message: "Payment amount must be greater than zero." },
    6003: { code: "SpendLimitExceeded", message: "Agent has exceeded its total spend limit." },
    6004: { code: "AgentInactive", message: "Agent is inactive and cannot make or receive payments." },
    6005: { code: "MemoTooLong", message: "Memo or service description exceeds 64 characters." },
    6006: { code: "DailyLimitExceeded", message: "Agent has exceeded its daily spend limit (10% of total per 24h)." },
    6007: { code: "AgentExpired", message: "Agent has expired. Use renewAgent() to extend its expiration." },
    6008: { code: "InvalidDailyLimit", message: "Daily limit must be between 1 and 10000 basis points." },
};

// ─── PayKit Error Class ───────────────────────────────────────────────────────

class PayKitError extends Error {
    constructor(code, message, originalError = null) {
        super(message);
        this.name = "PayKitError";
        this.code = code;
        this.originalError = originalError;
    }
}

// ─── Error Parser ─────────────────────────────────────────────────────────────

function parsePayKitError(error) {
    if (!error) return null;

    const message = error.message || "";

    // Anchor error number pattern — e.g. "Error Number: 6003"
    const numMatch = message.match(/Error Number: (\d+)/);
    if (numMatch) {
        const errNum = parseInt(numMatch[1]);
        const known = PAYKIT_ERRORS[errNum];
        if (known) return new PayKitError(known.code, known.message, error);
    }

    // Anchor error code pattern — e.g. "Error Code: SpendLimitExceeded"
    const codeMatch = message.match(/Error Code: (\w+)/);
    if (codeMatch) {
        const codeName = codeMatch[1];
        const known = Object.values(PAYKIT_ERRORS).find(e => e.code === codeName);
        if (known) return new PayKitError(known.code, known.message, error);
    }

    // Named error patterns in message
    for (const err of Object.values(PAYKIT_ERRORS)) {
        if (message.includes(err.code)) {
            return new PayKitError(err.code, err.message, error);
        }
    }

    // Blockhash expired
    if (message.includes("Blockhash not found") || message.includes("BlockhashNotFound")) {
        return new PayKitError("BlockhashExpired", "Transaction blockhash expired. Please retry.", error);
    }

    // Already processed
    if (message.includes("already been processed")) {
        return new PayKitError("AlreadyProcessed", "This transaction was already processed onchain.", error);
    }

    // Account not found
    if (message.includes("AccountNotFound") || message.includes("Account does not exist")) {
        return new PayKitError("AccountNotFound", "Agent account not found. Verify the agent name and owner.", error);
    }

    // Deserialization — legacy agent
    if (message.includes("AccountDidNotDeserialize") || message.includes("Failed to deserialize")) {
        return new PayKitError("LegacyAgent", "This agent was created with an older contract version and is incompatible. Register a new agent with the same name.", error);
    }

    // Insufficient funds
    if (message.includes("insufficient funds") || message.includes("InsufficientFunds")) {
        return new PayKitError("InsufficientFunds", "Insufficient SOL balance to pay transaction fees.", error);
    }

    // Wallet not connected
    if (message.includes("Wallet not connected")) {
        return new PayKitError("WalletNotConnected", "Wallet is not connected.", error);
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