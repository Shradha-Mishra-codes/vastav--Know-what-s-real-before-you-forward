import { ClaimVerification, Verdict } from "./types";

/**
 * Calculates rule-based overall verdict from verified claims:
 * - Any FALSE -> "Contains false claims"
 * - All VERIFIED -> "Verified"
 * - All UNVERIFIABLE -> "Cannot be confirmed"
 * - Otherwise -> "Partly true / mixed"
 */
export function overallVerdict(
  claims: Array<{ verdict: Verdict | string }>
): string {
  if (!claims || claims.length === 0) {
    return "Cannot be confirmed";
  }

  const verdicts = claims.map((c) => (c.verdict || "").toUpperCase());

  // Rule 1: Any FALSE -> "Contains false claims"
  if (verdicts.includes("FALSE")) {
    return "Contains false claims";
  }

  // Rule 2: All VERIFIED -> "Verified"
  const allVerified = verdicts.every((v) => v === "VERIFIED");
  if (allVerified) {
    return "Verified";
  }

  // Rule 3: All UNVERIFIABLE -> "Cannot be confirmed"
  const allUnverifiable = verdicts.every((v) => v === "UNVERIFIABLE");
  if (allUnverifiable) {
    return "Cannot be confirmed";
  }

  // Rule 4: Otherwise -> "Partly true / mixed"
  return "Partly true / mixed";
}
