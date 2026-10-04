import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Load .env.local if present
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const require = createRequire(import.meta.url);
const typescript = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf-8");
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { verifyClaim } = require("../lib/gemini.ts");

// Default seed list if none provided via CLI args
const DEFAULT_SEED_CLAIMS = [
  "The official PIB release titled 'Jal Jeevan Mission 2.0 Gains further Momentum' was posted on 6 August 2026.",
  "सरकार ने एक नई योजना शुरू की है जिसके तहत सभी को ₹5000 मिलेंगे।",
  "गर्म पानी पीने से कोरोना वायरस (COVID-19) खत्म हो जाता है।",
  "Government of India is offering free laptops to all students in 2025."
];

async function main() {
  const cliArgs = process.argv.slice(2);
  const claims = cliArgs.length > 0 ? cliArgs : DEFAULT_SEED_CLAIMS;
  console.log(`\n========================================`);
  console.log(`TruthLens Cache Seeder: Seeding ${claims.length} claims`);
  console.log(`========================================\n`);

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    console.log(`[${i + 1}/${claims.length}] Processing claim: "${claim}"`);

    const result = await verifyClaim(claim, "English");
    const cacheStatus = result.fromCache ? "Already cached" : "Saved to cache";
    console.log(`  -> ${cacheStatus}. Verdict: ${result.verdict} (liveVerified: ${result.liveVerified})`);

    if (i < claims.length - 1) {
      console.log(`  Waiting 3000ms before next claim to avoid rate limits...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n[Cache Seeder] Finished seeding ${claims.length} claims to data/claim-cache.json.`);
}

main().catch((err) => {
  console.error("Fatal seeder error:", err);
  process.exit(1);
});
