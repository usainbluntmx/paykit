/**
 * Tests unitarios — corren en cualquier máquina limpia (CI incluido).
 *
 * No tocan la red ni el HOME real del usuario:
 *  - os.homedir() se sustituye por un directorio temporal ANTES de cargar el SDK,
 *    así que AGENTS_DIR (~/.paykit/agents) apunta a un lugar desechable.
 *  - El owner es un keypair generado en el momento y guardado en ese mismo temporal.
 *
 * Los tests que necesitan devnet y agentes ya registrados viven en
 * integration.test.js y se corren a mano con `npm run test:integration`.
 */

const os = require("os");
const fs = require("fs");
const path = require("path");

const REAL_HOME = os.homedir();
const TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "paykit-unit-"));
// OJO: cambiar process.env.HOME NO sirve dentro de Jest (os.homedir() sigue
// devolviendo el HOME real). Hay que sustituir la función, y hacerlo ANTES de
// cargar el SDK, porque AGENTS_DIR se calcula al importar index.js.
jest.spyOn(os, "homedir").mockReturnValue(TMP_HOME);

const { Keypair, PublicKey, Connection, clusterApiUrl } = require("@solana/web3.js");
const {
    createClient,
    createClientFromWallet,
    PayKitClient,
    loadAgentKeypair,
    agentKeypairExists,
    solToLamports,
    PROGRAM_ID,
    AGENTS_DIR,
} = require("../index");
const { PayKitError, parsePayKitError, withPayKitError, PAYKIT_ERRORS } = require("../errors");

const OWNER_PATH = path.join(TMP_HOME, "owner.json");
let client;

beforeAll(() => {
    // Freno de seguridad: si el aislamiento falla, no escribimos NADA en el HOME real.
    if (!AGENTS_DIR.startsWith(TMP_HOME) || AGENTS_DIR.startsWith(REAL_HOME + path.sep)) {
        throw new Error(`Aislamiento roto: AGENTS_DIR=${AGENTS_DIR} no está bajo ${TMP_HOME}`);
    }
    const owner = Keypair.generate();
    fs.writeFileSync(OWNER_PATH, JSON.stringify(Array.from(owner.secretKey)), { mode: 0o600 });
    client = createClient(OWNER_PATH, "devnet");
});

afterAll(() => {
    jest.restoreAllMocks();
    fs.rmSync(TMP_HOME, { recursive: true, force: true });
});

function writeLocalAgent(name) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
    const kp = Keypair.generate();
    fs.writeFileSync(path.join(AGENTS_DIR, `${name}.json`), JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
    return kp;
}

describe("Aislamiento del entorno de tests", () => {
    test("AGENTS_DIR apunta al HOME temporal, nunca al real", () => {
        expect(AGENTS_DIR.startsWith(TMP_HOME)).toBe(true);
        expect(AGENTS_DIR.startsWith(REAL_HOME + path.sep)).toBe(false);
    });
});

describe("Cliente", () => {
    test("createClient devuelve un PayKitClient", () => {
        expect(client).toBeInstanceOf(PayKitClient);
    });

    test("la wallet del cliente tiene una PublicKey válida", () => {
        expect(client.wallet.publicKey).toBeInstanceOf(PublicKey);
    });

    test("PROGRAM_ID es el programa de PayKit en devnet", () => {
        expect(PROGRAM_ID.toBase58()).toBe("F27DrerUQGnkmVhqkEy9m46zDkni2m37Df4ogxkoDhUF");
    });

    test("createClient falla con un mensaje claro si no existe el keypair", () => {
        expect(() => createClient(path.join(TMP_HOME, "no-existe.json"), "devnet")).toThrow("Wallet not found");
    });
});

describe("Resolución del RPC (createClient)", () => {
    let previousKey;
    beforeEach(() => { previousKey = process.env.HELIUS_API_KEY; });
    afterEach(() => {
        if (previousKey === undefined) delete process.env.HELIUS_API_KEY;
        else process.env.HELIUS_API_KEY = previousKey;
    });

    test("sin HELIUS_API_KEY usa el RPC público del cluster", () => {
        delete process.env.HELIUS_API_KEY;
        const c = createClient(OWNER_PATH, "devnet");
        expect(c.connection.rpcEndpoint).toBe(clusterApiUrl("devnet"));
    });

    test("con HELIUS_API_KEY usa Helius, con la key como único valor del parámetro", () => {
        process.env.HELIUS_API_KEY = "clave-de-prueba";
        const c = createClient(OWNER_PATH, "devnet");
        expect(c.connection.rpcEndpoint).toBe("https://devnet.helius-rpc.com/?api-key=clave-de-prueba");
    });

    test("una URL explícita tiene prioridad sobre HELIUS_API_KEY", () => {
        process.env.HELIUS_API_KEY = "clave-de-prueba";
        const c = createClient(OWNER_PATH, "devnet", "https://mi-rpc.example.com");
        expect(c.connection.rpcEndpoint).toBe("https://mi-rpc.example.com");
    });
});

describe("solToLamports", () => {
    test("1.001 SOL son exactamente 1001000000 lamports (regresión PAYKIT-BUG-001)", () => {
        expect(solToLamports(1.001)).toBe(1_001_000_000);
    });

    test("valores comunes", () => {
        expect(solToLamports(0)).toBe(0);
        expect(solToLamports(1)).toBe(1_000_000_000);
        expect(solToLamports(0.05)).toBe(50_000_000);
        expect(solToLamports(0.29)).toBe(290_000_000);
        expect(solToLamports(0.000000001)).toBe(1);
    });

    test("absorbe el error de suma en coma flotante (0.1 + 0.2)", () => {
        expect(solToLamports(0.1 + 0.2)).toBe(300_000_000);
    });

    test("es exacto para todos los múltiplos de 0.001 SOL hasta 5 SOL", () => {
        for (let n = 1; n <= 5000; n++) {
            expect(solToLamports(n / 1000)).toBe(n * 1_000_000);
        }
    });

    test("rechaza valores inválidos", () => {
        expect(() => solToLamports(-1)).toThrow("negative");
        expect(() => solToLamports(NaN)).toThrow("Invalid SOL amount");
        expect(() => solToLamports(Infinity)).toThrow("Invalid SOL amount");
        expect(() => solToLamports("1")).toThrow("Invalid SOL amount");
        expect(() => solToLamports(undefined)).toThrow("Invalid SOL amount");
    });
});

describe("PDA del agente", () => {
    test("devuelve una PublicKey", () => {
        expect(client.getAgentPDA(client.wallet.publicKey, "test-agent")).toBeInstanceOf(PublicKey);
    });

    test("es determinista", () => {
        const key = client.wallet.publicKey;
        expect(client.getAgentPDA(key, "test-agent").toBase58()).toBe(client.getAgentPDA(key, "test-agent").toBase58());
    });

    test("cambia con la clave del agente", () => {
        const a = client.getAgentPDA(Keypair.generate().publicKey, "test-agent");
        const b = client.getAgentPDA(Keypair.generate().publicKey, "test-agent");
        expect(a.toBase58()).not.toBe(b.toBase58());
    });

    test("cambia con el nombre del agente", () => {
        const key = client.wallet.publicKey;
        expect(client.getAgentPDA(key, "agent-alpha").toBase58()).not.toBe(client.getAgentPDA(key, "agent-beta").toBase58());
    });

    test("usa las seeds [\"agent\", agent_key, name] que declara el contrato", () => {
        const key = Keypair.generate().publicKey;
        const [expected] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent"), key.toBuffer(), Buffer.from("mi-agente")],
            PROGRAM_ID
        );
        expect(client.getAgentPDA(key, "mi-agente").toBase58()).toBe(expected.toBase58());
    });
});

describe("Almacén local de keypairs", () => {
    test("agentKeypairExists es false para un agente desconocido", () => {
        expect(agentKeypairExists("agente-que-no-existe")).toBe(false);
    });

    test("agentKeypairExists es true y loadAgentKeypair devuelve la misma clave", () => {
        const kp = writeLocalAgent("agente-local-1");
        expect(agentKeypairExists("agente-local-1")).toBe(true);
        expect(loadAgentKeypair("agente-local-1").publicKey.toBase58()).toBe(kp.publicKey.toBase58());
    });

    test("loadAgentKeypair lanza error para un agente desconocido", () => {
        expect(() => loadAgentKeypair("agente-que-no-existe")).toThrow();
    });

    test("listLocalAgents devuelve los agentes guardados con sus campos", () => {
        const kp = writeLocalAgent("agente-local-2");
        const agents = client.listLocalAgents();
        const found = agents.find(a => a.name === "agente-local-2");
        expect(found).toBeDefined();
        expect(found.publicKey).toBe(kp.publicKey.toBase58());
        expect(found.keypairPath).toBe(path.join(AGENTS_DIR, "agente-local-2.json"));
    });

    test("listLocalAgents ignora archivos corruptos en lugar de fallar", () => {
        fs.mkdirSync(AGENTS_DIR, { recursive: true });
        fs.writeFileSync(path.join(AGENTS_DIR, "corrupto.json"), "esto no es json");
        const names = client.listLocalAgents().map(a => a.name);
        expect(names).not.toContain("corrupto");
    });
});

describe("batchPayment (validaciones previas a cualquier llamada de red)", () => {
    test("rechaza un arreglo vacío", async () => {
        await expect(client.batchPayment("cualquiera", [])).rejects.toThrow("Payments array cannot be empty");
    });

    test("rechaza más de 5 pagos", async () => {
        const payments = Array(6).fill({ receiverName: "otro", amountLamports: 1000, service: "test" });
        await expect(client.batchPayment("cualquiera", payments)).rejects.toThrow("Maximum 5 payments per batch");
    });
});

describe("createClientFromWallet", () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    test("falla si la wallet no está conectada", () => {
        expect(() => createClientFromWallet({ publicKey: null }, connection)).toThrow("Wallet not connected");
    });

    test("falla si la wallet no puede firmar", () => {
        expect(() => createClientFromWallet({ publicKey: Keypair.generate().publicKey }, connection)).toThrow("signTransaction");
    });

    test("devuelve un PayKitClient con un adaptador válido", () => {
        const wallet = {
            publicKey: Keypair.generate().publicKey,
            signTransaction: async (tx) => tx,
            signAllTransactions: async (txs) => txs,
        };
        expect(createClientFromWallet(wallet, connection)).toBeInstanceOf(PayKitClient);
    });
});

describe("Manejo de errores", () => {
    test("PayKitError tiene la estructura esperada", () => {
        const err = new PayKitError("SpendLimitExceeded", "Agent exceeded spend limit", 6003, null);
        expect(err.code).toBe("SpendLimitExceeded");
        expect(err.message).toBe("Agent exceeded spend limit");
        expect(err.errorNumber).toBe(6003);
        expect(err instanceof Error).toBe(true);
    });

    test.each([
        ["custom program error: 0x1773", "SpendLimitExceeded"],
        ["custom program error: 0x1776", "DailyLimitExceeded"],
        ["custom program error: 0x1777", "AgentExpired"],
        ["custom program error: 0x1780", "UnauthorizedSigner"],
        ["Trying to access beyond buffer length", "LegacyAgent"],
        ["Blockhash not found", "BlockhashExpired"],
        ["Insufficient funds for transaction", "InsufficientFunds"],
    ])("parsePayKitError reconoce %j como %s", (message, code) => {
        const err = parsePayKitError({ message });
        expect(err).not.toBeNull();
        expect(err.code).toBe(code);
    });

    test("parsePayKitError traduce el rechazo del contrato a un firmante que no es el agente (PAYKIT-ARCH-001)", () => {
        // Mensaje real que devolvió devnet en la prueba de suplantación
        const raw = {
            message: "AnchorError caused by account: agent. Error Code: UnauthorizedSigner. Error Number: 6016. " +
                "Error Message: Signer does not match this agent's registered key.",
        };
        const err = parsePayKitError(raw);
        expect(err).not.toBeNull();
        expect(err.code).toBe("UnauthorizedSigner");
        expect(err.errorNumber).toBe(6016);
    });

    test("parsePayKitError devuelve null para errores desconocidos", () => {
        expect(parsePayKitError({ message: "some completely unknown error xyz" })).toBeNull();
    });

    test("withPayKitError relanza un PayKitError con el código correcto", async () => {
        const raw = { message: "custom program error: 0x1773" };
        await expect(withPayKitError(async () => { throw raw; })).rejects.toMatchObject({ code: "SpendLimitExceeded" });
    });

    test("withPayKitError relanza los errores desconocidos tal cual", async () => {
        await expect(withPayKitError(async () => { throw new Error("unknown random error"); })).rejects.toThrow("unknown random error");
    });
});

describe("errors.js y el IDL del contrato", () => {
    // Si el contrato gana o cambia un error y errors.js no se entera, los usuarios del SDK
    // ven un error de Anchor sin traducir. Esta prueba lo detecta antes de publicar.
    const idl = require("../../idl/paykit.json");
    const idlErrors = idl.errors || [];

    test("el IDL declara errores", () => {
        expect(idlErrors.length).toBeGreaterThan(0);
    });

    test("cada error del IDL está en errors.js con el mismo nombre", () => {
        for (const e of idlErrors) {
            expect(PAYKIT_ERRORS[e.code]).toBeDefined();
            expect(PAYKIT_ERRORS[e.code].code).toBe(e.name);
        }
    });

    test("errors.js no declara errores que el IDL no tiene", () => {
        const idlCodes = new Set(idlErrors.map(e => e.code));
        for (const num of Object.keys(PAYKIT_ERRORS)) {
            expect(idlCodes.has(Number(num))).toBe(true);
        }
    });
});
