#!/usr/bin/env node
/**
 * Verifica el contenido del tarball que se publicaría en npm (PAYKIT-API-001).
 * Falla si se cuela un archivo interno o si falta uno que el consumidor necesita.
 *
 * Uso: npm run check:pack
 */
const { execSync } = require("child_process");

const FORBIDDEN = [
    { re: /(^|\/)__tests__\//, why: "tests" },
    { re: /^src\/server\.js$/, why: "sidecar HTTP (sin autenticación, solo uso local)" },
    { re: /^src\/agent-demo\.js$/, why: "demo del agente" },
    { re: /^src\/patch-idl\.js$/, why: "herramienta interna de build" },
    { re: /^src\/test-auth-fix\.js$/, why: "script de prueba de ataque" },
    { re: /(^|\/)\.env(\.|$)/, why: "archivo de entorno (posibles secretos)" },
    { re: /\.(pem|key)$/, why: "material de claves" },
];

const REQUIRED = [
    "package.json",
    "README.md",
    "LICENSE",
    "src/index.js",
    "src/errors.js",
    "src/cli.js",
    "src/types.ts",
    "idl/paykit.json",
];

const out = execSync("npm pack --dry-run --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const info = JSON.parse(out)[0];
const files = info.files.map(f => f.path);

const problems = [];
for (const f of files) {
    for (const { re, why } of FORBIDDEN) {
        if (re.test(f)) problems.push(`NO debe publicarse: ${f} (${why})`);
    }
}
for (const r of REQUIRED) {
    if (!files.includes(r)) problems.push(`Falta en el paquete: ${r}`);
}

console.log(`${info.name}@${info.version} — ${files.length} archivos, ${info.size} bytes comprimidos`);
files.forEach(f => console.log(`  ${f}`));

if (problems.length) {
    console.error("\nEl contenido del paquete no es válido:");
    problems.forEach(p => console.error(`  ✗ ${p}`));
    process.exit(1);
}
console.log("\n✓ Contenido del paquete correcto");
