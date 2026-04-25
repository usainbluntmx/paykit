#!/usr/bin/env node

// Patches the Anchor 0.31 IDL (spec 0.1.0) to include the AgentAccount
// layout so that program.account.agentAccount.fetch() works correctly.

const fs = require("fs");
const path = require("path");

const IDL_PATH = path.resolve(__dirname, "../../target/idl/paykit.json");
const IDL_OUT = path.resolve(__dirname, "../../target/idl/paykit.json");
const FRONTEND_IDL = path.resolve(__dirname, "../../frontend/public/idl/paykit.json");
const SDK_IDL = path.resolve(__dirname, "../idl/paykit.json");

const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

// ─── AgentAccount layout ──────────────────────────────────────────────────────

const agentAccountType = {
    name: "AgentAccount",
    type: {
        kind: "struct",
        fields: [
            { name: "agent_key", type: "pubkey" },
            { name: "owner", type: "pubkey" },
            { name: "name", type: "string" },
            { name: "spend_limit", type: "u64" },
            { name: "total_spent", type: "u64" },
            { name: "payment_count", type: "u64" },
            { name: "is_active", type: "bool" },
            { name: "bump", type: "u8" },
            { name: "last_payment_at", type: "i64" },
            { name: "daily_spent", type: "u64" },
            { name: "daily_reset_at", type: "i64" },
            { name: "expires_at", type: "i64" },
            { name: "daily_limit_bps", type: "u16" },
            { name: "capabilities", type: "u16" },
            { name: "tier", type: "u8" },
            {
                name: "category_limits",
                type: {
                    array: [
                        { defined: { name: "CategoryLimit" } },
                        8
                    ]
                }
            },
            {
                name: "custom_capability_names",
                type: {
                    array: [
                        { array: ["u8", 16] },
                        8
                    ]
                }
            },
        ]
    }
};

const categoryLimitType = {
    name: "CategoryLimit",
    type: {
        kind: "struct",
        fields: [
            { name: "category_id", type: "u8" },
            { name: "limit", type: "u64" },
        ]
    }
};

// ─── Patch ────────────────────────────────────────────────────────────────────

// Add accounts section
idl.accounts = [
    {
        name: "AgentAccount",
        discriminator: computeDiscriminator("account:AgentAccount"),
    }
];

// Add AgentAccount and CategoryLimit to types
const existingTypeNames = idl.types.map(t => t.name);
if (!existingTypeNames.includes("AgentAccount")) {
    idl.types.push(agentAccountType);
}
if (!existingTypeNames.includes("CategoryLimit")) {
    idl.types.push(categoryLimitType);
}

// ─── Write ────────────────────────────────────────────────────────────────────

const patched = JSON.stringify(idl, null, 2);
fs.writeFileSync(IDL_OUT, patched);
fs.writeFileSync(FRONTEND_IDL, patched);
fs.writeFileSync(SDK_IDL, patched);

console.log("✓ IDL patched — AgentAccount and CategoryLimit added");
console.log("✓ Frontend IDL updated");
console.log("✓ SDK IDL updated");

// ─── Discriminator ────────────────────────────────────────────────────────────

function computeDiscriminator(preimage) {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(preimage).digest();
    return Array.from(hash.slice(0, 8));
}