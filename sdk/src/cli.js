#!/usr/bin/env node

// ─── PayKit CLI ───────────────────────────────────────────────────────────────

const readline = require("readline");
const path = require("path");
const os = require("os");
const {
    createClient,
    CAPABILITIES,
    CAP_ALL_DEFAULT,
    CATEGORIES,
    CATEGORY_NAMES,
    agentKeypairExists,
} = require("./index");

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
};

// ─── readline helper ──────────────────────────────────────────────────────────

function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

function ask(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}

// ─── Header ───────────────────────────────────────────────────────────────────

function printHeader() {
    console.log();
    console.log(C.green(C.bold("  ⚡ PAYKIT CLI")));
    console.log(C.dim("  Autonomous AI Agent Payment Protocol · Solana"));
    console.log();
}

function printDivider() {
    console.log(C.dim("  " + "─".repeat(56)));
}

// ─── Capabilities Wizard ──────────────────────────────────────────────────────

const CAPABILITY_LABELS = [
    { key: "CAN_PAY_AGENTS", label: "CAN_PAY_AGENTS    — pay other agents" },
    { key: "CAN_HIRE_BASIC", label: "CAN_HIRE_BASIC    — hire tier 0 agents" },
    { key: "CAN_HIRE_STANDARD", label: "CAN_HIRE_STANDARD — hire tier 1 agents" },
    { key: "CAN_HIRE_PREMIUM", label: "CAN_HIRE_PREMIUM  — hire tier 2 agents" },
    { key: "CAN_TRANSFER_SOL", label: "CAN_TRANSFER_SOL  — transfer SOL" },
    { key: "CAN_TRANSFER_SPL", label: "CAN_TRANSFER_SPL  — transfer SPL tokens" },
    { key: "CAN_BATCH_PAY", label: "CAN_BATCH_PAY     — batch payments (up to 5)" },
];

async function capabilitiesWizard(rl) {
    console.log();
    console.log(C.cyan(C.bold("  CAPABILITIES")));
    console.log(C.dim("  All 7 predefined capabilities are enabled by default."));
    console.log();

    CAPABILITY_LABELS.forEach((cap, i) => {
        console.log(`  ${C.dim(`[${i + 1}]`)} ${C.green("✓")} ${cap.label}`);
    });

    console.log();
    const keepAll = await ask(rl, C.yellow("  Keep all defaults? [Y/n]: "));

    let capabilities = CAP_ALL_DEFAULT;

    if (keepAll.toLowerCase() === "n") {
        console.log();
        console.log(C.dim("  Enter numbers to toggle OFF (comma-separated, e.g. 3,4):"));
        const toggle = await ask(rl, C.yellow("  Toggle: "));

        if (toggle.trim()) {
            const indices = toggle.split(",").map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < 7);
            for (const i of indices) {
                const bit = CAPABILITIES[CAPABILITY_LABELS[i].key];
                capabilities &= ~bit;
                console.log(`  ${C.red("✗")} ${CAPABILITY_LABELS[i].label} ${C.dim("— disabled")}`);
            }
        }
    }

    // Custom capabilities
    console.log();
    const addCustom = await ask(rl, C.yellow("  Add custom capabilities? [y/N]: "));
    const customNames = [];

    if (addCustom.toLowerCase() === "y") {
        console.log(C.dim("  You can define up to 8 custom capability slots (bits 8-15)."));
        for (let slot = 0; slot < 8; slot++) {
            const name = await ask(rl, C.yellow(`  Custom slot ${slot + 1} name (Enter to skip): `));
            if (!name.trim()) break;
            const enabled = await ask(rl, C.yellow(`  Enable "${name}"? [Y/n]: `));
            const isEnabled = enabled.toLowerCase() !== "n";
            customNames.push({ slot, name: name.trim(), enabled: isEnabled });
            if (isEnabled) {
                capabilities |= (1 << (8 + slot));
                console.log(`  ${C.green("✓")} Custom slot ${slot + 1}: ${C.cyan(name.trim())} enabled`);
            } else {
                console.log(`  ${C.dim(`○ Custom slot ${slot + 1}: ${name.trim()} defined but disabled`)}`);
            }
        }
    }

    return { capabilities, customNames };
}

// ─── Category Wizard ──────────────────────────────────────────────────────────

async function categoryWizard(rl) {
    console.log();
    console.log(C.cyan(C.bold("  CATEGORY LIMITS")));
    console.log(C.dim("  Set max spending per payment category (0 = no limit)."));
    console.log();

    const predefined = ["compute", "data", "storage", "inference", "research", "content"];
    predefined.forEach((cat, i) => {
        console.log(`  ${C.dim(`[${i + 1}]`)} ${cat.padEnd(12)} ${C.dim("— no limit")}`);
    });

    console.log();
    const setLimits = await ask(rl, C.yellow("  Set category limits? [y/N]: "));
    const categoryLimits = [];

    if (setLimits.toLowerCase() === "y") {
        const catMap = { compute: 1, data: 2, storage: 3, inference: 4, research: 5, content: 6 };

        for (const cat of predefined) {
            const limitStr = await ask(rl, C.yellow(`  ${cat} limit in SOL (Enter to skip): `));
            if (!limitStr.trim()) continue;
            const limitSOL = parseFloat(limitStr);
            if (isNaN(limitSOL) || limitSOL <= 0) continue;
            const limitLamports = Math.floor(limitSOL * 1_000_000_000);
            categoryLimits.push({ categoryId: catMap[cat], limitLamports, name: cat });
            console.log(`  ${C.green("✓")} ${cat}: ${C.cyan(limitSOL + " SOL")} max per payment`);
        }

        // Custom categories
        console.log();
        const addCustomCat = await ask(rl, C.yellow("  Add custom categories? [y/N]: "));
        if (addCustomCat.toLowerCase() === "y") {
            let customId = 8;
            while (customId < 16) {
                const catName = await ask(rl, C.yellow(`  Custom category name (Enter to stop): `));
                if (!catName.trim()) break;
                const limitStr = await ask(rl, C.yellow(`  ${catName} limit in SOL: `));
                const limitSOL = parseFloat(limitStr);
                if (isNaN(limitSOL) || limitSOL <= 0) { customId++; continue; }
                const limitLamports = Math.floor(limitSOL * 1_000_000_000);
                categoryLimits.push({ categoryId: customId, limitLamports, name: catName.trim() });
                console.log(`  ${C.green("✓")} ${catName}: ${C.cyan(limitSOL + " SOL")} max per payment`);
                customId++;
            }
        }
    }

    return categoryLimits;
}

// ─── Tier Wizard ──────────────────────────────────────────────────────────────

async function tierWizard(rl) {
    console.log();
    console.log(C.cyan(C.bold("  AGENT TIER")));
    console.log(C.dim("  Tier determines which agents can hire this one."));
    console.log();
    console.log(`  ${C.dim("[0]")} basic    — hirable by any agent with CAN_HIRE_BASIC`);
    console.log(`  ${C.dim("[1]")} standard — hirable by agents with CAN_HIRE_STANDARD`);
    console.log(`  ${C.dim("[2]")} premium  — hirable only by agents with CAN_HIRE_PREMIUM`);
    console.log();

    const tierStr = await ask(rl, C.yellow("  Tier [0/1/2] (default 0): "));
    const tier = parseInt(tierStr.trim());
    return isNaN(tier) || tier < 0 || tier > 2 ? 0 : tier;
}

// ─── Create Agent Command ─────────────────────────────────────────────────────

async function cmdCreateAgent(args) {
    const rl = createRL();

    printHeader();
    printDivider();
    console.log(C.bold("  CREATE AUTONOMOUS AGENT"));
    printDivider();

    // Agent name
    let agentName = args[0];
    if (!agentName) {
        agentName = await ask(rl, C.yellow("\n  Agent name: "));
        agentName = agentName.trim();
    }

    if (!agentName || agentName.length > 32) {
        console.log(C.red("  ✗ Agent name required (max 32 chars)"));
        rl.close(); process.exit(1);
    }

    if (agentKeypairExists(agentName)) {
        console.log(C.yellow(`\n  ⚠ Agent "${agentName}" already has a local keypair.`));
        const overwrite = await ask(rl, C.yellow("  Overwrite and re-register? [y/N]: "));
        if (overwrite.toLowerCase() !== "y") { rl.close(); return; }
    }

    // Spend limit
    const spendStr = await ask(rl, C.yellow("\n  Spend limit in SOL (default 1): "));
    const spendSOL = parseFloat(spendStr.trim()) || 1;
    const spendLimitLamports = Math.floor(spendSOL * 1_000_000_000);

    // Daily limit BPS
    const bpsStr = await ask(rl, C.yellow("  Daily limit BPS 1-10000 (default 1000 = 10%): "));
    const dailyLimitBps = parseInt(bpsStr.trim()) || 1000;

    // Funding
    const fundStr = await ask(rl, C.yellow("  Fund agent wallet in SOL (default 0.01): "));
    const fundSOL = parseFloat(fundStr.trim()) || 0.01;
    const fundingLamports = Math.floor(fundSOL * 1_000_000_000);

    // Tier
    const tier = await tierWizard(rl);

    // Capabilities
    const { capabilities, customNames } = await capabilitiesWizard(rl);

    // Category limits
    const categoryLimits = await categoryWizard(rl);

    // Keypair path
    const keypairPath = args[1] || path.join(os.homedir(), ".config/solana/id.json");

    // Confirm
    console.log();
    printDivider();
    console.log(C.bold("  SUMMARY"));
    printDivider();
    console.log(`  Name:         ${C.cyan(agentName)}`);
    console.log(`  Spend limit:  ${C.cyan(spendSOL + " SOL")}`);
    console.log(`  Daily limit:  ${C.cyan(dailyLimitBps + " BPS (" + (dailyLimitBps / 100).toFixed(0) + "%)")}`);
    console.log(`  Funding:      ${C.cyan(fundSOL + " SOL → agent wallet")}`);
    console.log(`  Tier:         ${C.cyan(["basic", "standard", "premium"][tier])}`);
    console.log(`  Capabilities: ${C.cyan(capabilities.toString(2).padStart(16, "0"))} (${countBits(capabilities)} active)`);
    if (categoryLimits.length > 0) {
        console.log(`  Categories:   ${categoryLimits.map(c => `${c.name}=${c.limitLamports / 1e9}SOL`).join(", ")}`);
    }
    console.log();

    const confirm = await ask(rl, C.yellow("  Deploy agent? [Y/n]: "));
    if (confirm.toLowerCase() === "n") {
        console.log(C.dim("  Cancelled."));
        rl.close(); return;
    }

    rl.close();

    // Deploy
    console.log();
    console.log(C.dim("  Connecting to Devnet..."));

    const client = createClient(keypairPath, "devnet");

    try {
        process.stdout.write("  Generating keypair and deploying...");
        const result = await client.createAutonomousAgent(
            agentName,
            spendLimitLamports,
            dailyLimitBps,
            fundingLamports,
            capabilities,
            tier
        );
        console.log(" " + C.green("✓"));

        // Apply custom capability names
        for (const custom of customNames) {
            process.stdout.write(`  Setting custom capability "${custom.name}"...`);
            await client.setCustomCapability(agentName, custom.slot, custom.name, custom.enabled);
            console.log(" " + C.green("✓"));
        }

        // Apply category limits
        for (const cat of categoryLimits) {
            process.stdout.write(`  Setting category limit: ${cat.name}...`);
            await client.setCategoryLimit(agentName, cat.categoryId, cat.limitLamports, cat.name);
            console.log(" " + C.green("✓"));
        }

        console.log();
        printDivider();
        console.log(C.green(C.bold("  AGENT DEPLOYED")));
        printDivider();
        console.log(`  TX:           ${C.dim(result.tx)}`);
        console.log(`  Agent PDA:    ${C.cyan(result.agentPDA.toBase58())}`);
        console.log(`  Agent key:    ${C.cyan(result.agentPublicKey.toBase58())}`);
        console.log(`  Keypair:      ${C.dim(result.keypairPath)}`);
        console.log();
        console.log(C.green("  Agent is live and can sign its own transactions."));
        console.log();

    } catch (err) {
        console.log(" " + C.red("✗"));
        console.log(C.red(`\n  Error: ${err.message || err.code || err}`));
        process.exit(1);
    }
}

// ─── List Agents Command ──────────────────────────────────────────────────────

async function cmdListAgents(args) {
    const keypairPath = args[0] || path.join(os.homedir(), ".config/solana/id.json");
    const client = createClient(keypairPath, "devnet");

    printHeader();
    printDivider();
    console.log(C.bold("  LOCAL AGENTS"));
    printDivider();

    const local = client.listLocalAgents();
    if (local.length === 0) {
        console.log(C.dim("  No agents found. Run: paykit agent create <name>"));
        return;
    }

    for (const a of local) {
        console.log();
        console.log(`  ${C.cyan(C.bold(a.name))}`);
        console.log(`  ${C.dim("key:")} ${a.publicKey}`);
        console.log(`  ${C.dim("file:")} ${a.keypairPath}`);
        try {
            const expiry = await client.checkAgentExpiry(a.name);
            const agent = await client.fetchAgent(a.name);
            const decoded = client.decodeCapabilities(agent.capabilities);
            const activeCaps = Object.entries(decoded)
                .filter(([k, v]) => k !== "raw" && k !== "custom" && v)
                .map(([k]) => k);
            console.log(`  ${C.dim("status:")} ${agent.isActive ? C.green("active") : C.red("inactive")} · expires in ${expiry.daysRemaining} days`);
            console.log(`  ${C.dim("tier:")} ${["basic", "standard", "premium"][agent.tier] || "basic"}`);
            console.log(`  ${C.dim("caps:")} ${activeCaps.join(", ")}`);
            console.log(`  ${C.dim("spent:")} ${agent.totalSpent.toNumber() / 1e9} / ${agent.spendLimit.toNumber() / 1e9} SOL`);
        } catch {
            console.log(`  ${C.dim("(onchain data unavailable)")}`);
        }
    }
    console.log();
}

// ─── Inspect Agent Command ────────────────────────────────────────────────────

async function cmdInspect(args) {
    const agentName = args[0];
    const keypairPath = args[1] || path.join(os.homedir(), ".config/solana/id.json");

    if (!agentName) {
        console.log(C.red("  Usage: paykit agent inspect <name>"));
        process.exit(1);
    }

    const client = createClient(keypairPath, "devnet");

    printHeader();
    printDivider();
    console.log(C.bold(`  AGENT: ${agentName}`));
    printDivider();

    try {
        const agent = await client.fetchAgent(agentName);
        const expiry = await client.checkAgentExpiry(agentName);
        const decoded = client.decodeCapabilities(agent.capabilities);
        const balance = await client.getSOLBalance(agentName);

        console.log(`  ${C.dim("Status:")}    ${agent.isActive ? C.green("● ACTIVE") : C.red("● INACTIVE")}`);
        console.log(`  ${C.dim("Tier:")}      ${["basic", "standard", "premium"][agent.tier] || "basic"}`);
        console.log(`  ${C.dim("Expires:")}   ${expiry.expiresAt.toLocaleDateString()} (${expiry.daysRemaining} days)`);
        console.log(`  ${C.dim("Wallet:")}    ${balance.sol.toFixed(6)} SOL`);
        console.log(`  ${C.dim("Spent:")}     ${agent.totalSpent.toNumber() / 1e9} / ${agent.spendLimit.toNumber() / 1e9} SOL`);
        console.log(`  ${C.dim("Payments:")}  ${agent.paymentCount.toNumber()}`);
        console.log(`  ${C.dim("Daily BPS:")} ${agent.dailyLimitBps} (${(agent.dailyLimitBps / 100).toFixed(0)}%)`);
        console.log();
        console.log(C.cyan("  CAPABILITIES"));
        Object.entries(decoded).forEach(([k, v]) => {
            if (k === "raw" || k === "custom") return;
            console.log(`  ${v ? C.green("✓") : C.dim("○")} ${k}`);
        });
        console.log();
    } catch (err) {
        console.log(C.red(`  Error: ${err.message}`));
        process.exit(1);
    }
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
    printHeader();
    console.log("  USAGE");
    printDivider();
    console.log(`  ${C.cyan("paykit agent create")} ${C.dim("[name] [keypair-path]")}`);
    console.log(`  ${C.dim("  Interactive wizard to create an autonomous agent")}`);
    console.log();
    console.log(`  ${C.cyan("paykit agent list")} ${C.dim("[keypair-path]")}`);
    console.log(`  ${C.dim("  List all local agents with onchain status")}`);
    console.log();
    console.log(`  ${C.cyan("paykit agent inspect")} ${C.dim("<name> [keypair-path]")}`);
    console.log(`  ${C.dim("  Inspect a single agent's full details")}`);
    console.log();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBits(n) {
    let count = 0;
    while (n) { count += n & 1; n >>= 1; }
    return count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const [, , cmd, sub, ...args] = process.argv;

    if (cmd === "agent") {
        if (sub === "create") return cmdCreateAgent(args);
        if (sub === "list") return cmdListAgents(args);
        if (sub === "inspect") return cmdInspect(args);
    }

    printHelp();
}

main().catch(err => {
    console.error(C.red("  Error: " + err.message));
    process.exit(1);
});