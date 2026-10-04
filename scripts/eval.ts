import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { Verdict } from "../lib/types";

const verdicts: Verdict[] = [
  "VERIFIED",
  "FALSE",
  "OUTDATED",
  "PARTLY_TRUE",
  "UNVERIFIABLE",
];

interface EvaluationCase {
  claim: string;
  expectedVerdict: Verdict;
}

interface EvaluationResult extends EvaluationCase {
  actualVerdict: Verdict | "ERROR";
  error?: string;
}

interface AccuracyRow {
  ExpectedVerdict: Verdict | "OVERALL";
  Correct: number;
  Total: number;
  Accuracy: string;
}

function loadLocalEnvironment(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadVerifyClaim(): (
  claim: string,
  language: string
) => Promise<{ verdict: Verdict }> {
  const require = createRequire(import.meta.url);
  const typescript = require("typescript") as typeof import("typescript");

  require.extensions[".ts"] = (loadedModule, filename) => {
    const source = fs.readFileSync(filename, "utf-8");
    const { outputText } = typescript.transpileModule(source, {
      compilerOptions: {
        module: typescript.ModuleKind.CommonJS,
        target: typescript.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    const compiledModule = loadedModule as NodeJS.Module & {
      _compile(code: string, fileName: string): void;
    };
    compiledModule._compile(outputText, filename);
  };

  return (require("../lib/gemini.ts") as {
    verifyClaim: (claim: string, language: string) => Promise<{ verdict: Verdict }>;
  }).verifyClaim;
}

function readEvaluationCases(filePath: string): EvaluationCase[] {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(parsed)) {
    throw new Error("test_forwards.json must contain an array of test cases.");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Test case ${index + 1} must be an object.`);
    }

    const testCase = entry as Record<string, unknown>;
    if (typeof testCase.claim !== "string") {
      throw new Error(`Test case ${index + 1} must have a string "claim".`);
    }
    if (
      typeof testCase.expectedVerdict !== "string" ||
      !verdicts.includes(testCase.expectedVerdict as Verdict)
    ) {
      throw new Error(
        `Test case ${index + 1} must have an expectedVerdict from: ${verdicts.join(", ")}.`
      );
    }

    return {
      claim: testCase.claim,
      expectedVerdict: testCase.expectedVerdict as Verdict,
    };
  });
}

async function main(): Promise<void> {
  const filePath = path.resolve(process.cwd(), "test_forwards.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Could not find ${filePath}.`);
  }

  const allCases = readEvaluationCases(filePath);
  const activeCases = allCases.filter(
    ({ claim }) => claim.trim() && !claim.trim().startsWith("REPLACE_WITH_")
  );
  const skippedCount = allCases.length - activeCases.length;

  if (activeCases.length === 0) {
    console.log(
      `No active test cases found. Fill in claim text for the ${skippedCount} placeholder entr${skippedCount === 1 ? "y" : "ies"} in test_forwards.json.`
    );
    return;
  }

  loadLocalEnvironment();
  const verifyClaim = loadVerifyClaim();
  const results: EvaluationResult[] = [];

  console.log(`Evaluating ${activeCases.length} claim(s) sequentially...`);
  for (let index = 0; index < activeCases.length; index++) {
    const testCase = activeCases[index];
    console.log(`[${index + 1}/${activeCases.length}] ${testCase.claim}`);

    try {
      const result = await verifyClaim(testCase.claim, "English");
      results.push({ ...testCase, actualVerdict: result.verdict });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ ...testCase, actualVerdict: "ERROR", error: message });
    }

    if (index < activeCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const accuracyRows: AccuracyRow[] = verdicts.map((expectedVerdict) => {
    const group = results.filter((result) => result.expectedVerdict === expectedVerdict);
    const correct = group.filter(
      (result) => result.actualVerdict === result.expectedVerdict
    ).length;
    return {
      ExpectedVerdict: expectedVerdict,
      Correct: correct,
      Total: group.length,
      Accuracy:
        group.length === 0 ? "n/a" : `${((correct / group.length) * 100).toFixed(1)}%`,
    };
  });

  const correctTotal = results.filter(
    (result) => result.actualVerdict === result.expectedVerdict
  ).length;
  accuracyRows.push({
    ExpectedVerdict: "OVERALL",
    Correct: correctTotal,
    Total: results.length,
    Accuracy: `${((correctTotal / results.length) * 100).toFixed(1)}%`,
  });

  console.log("\nAccuracy by expected verdict:");
  console.table(accuracyRows);

  const mismatches = results.filter(
    (result) => result.actualVerdict !== result.expectedVerdict
  );
  console.log("\nMismatches:");
  if (mismatches.length === 0) {
    console.log("None.");
  } else {
    for (const mismatch of mismatches) {
      console.log(`- Claim: ${mismatch.claim}`);
      console.log(`  Expected: ${mismatch.expectedVerdict}`);
      console.log(`  Actual: ${mismatch.actualVerdict}`);
      if (mismatch.error) console.log(`  Error: ${mismatch.error}`);
    }
  }

  if (mismatches.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("Evaluation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});