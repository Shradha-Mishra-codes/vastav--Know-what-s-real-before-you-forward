import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  GroundingSource,
  CachedTrendItem,
  ManipulationTactic,
  RelatedClaim,
  Verdict,
} from "./types";

export type CachedClaimData = {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  wrongPart: string | null;
  whatToDo: string;
  replyToSender: string;
  sources: GroundingSource[];
  liveVerified: boolean;
  language?: string;
  languageResults?: Record<string, CachedLanguageResult>;
  tactic?: ManipulationTactic | null;
  timesChecked?: number;
  isCommonMyth?: boolean;
  timestamp?: number;
  originalClaim?: string;
};

export type CachedLanguageResult = Pick<
  CachedClaimData,
  | "verdict"
  | "confidence"
  | "explanation"
  | "wrongPart"
  | "whatToDo"
  | "replyToSender"
  | "sources"
  | "liveVerified"
  | "tactic"
>;

const CACHE_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");

const CACHE_FILE = path.join(CACHE_DIR, "claim-cache.json");
const CLAIM_STOPWORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "between", "both", "but", "by", "can", "could",
  "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if",
  "in", "into", "is", "it", "its", "just", "me", "more", "most", "my", "no", "nor", "not", "of",
  "off", "on", "once", "only", "or", "other", "our", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "them", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "why", "will", "with", "would", "you", "your",
]);

/**
 * Normalizes text: lowercase, trimmed, whitespace-collapsed.
 */
export function normalizeClaimText(text: string): string {
  return (text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Produces a stable hash key for a normalized claim string.
 */
export function getClaimCacheKey(text: string): string {
  const norm = normalizeClaimText(text);
  return crypto.createHash("sha256").update(norm).digest("hex");
}

/** Returns curated trend examples without incrementing their cache counters. */
export function getCachedTrendItems(): CachedTrendItem[] {
  return Object.values(loadCache())
    .filter((entry) => entry.isCommonMyth && entry.originalClaim)
    .map((entry) => ({
      claim: entry.originalClaim as string,
      verdict: entry.verdict,
      confidence: entry.confidence,
      explanation: entry.explanation,
      liveVerified: entry.liveVerified,
      timesChecked: entry.timesChecked ?? 1,
    }));
}

function getNormalizedWordSet(text: string): Set<string> {
  const words = normalizeClaimText(text).match(
    new RegExp("[\\p{L}\\p{N}]+", "gu")
  ) || [];
  return new Set(
    words.filter((word) => !CLAIM_STOPWORDS.has(word))
  );
}

/** Finds cached claims with Jaccard similarity greater than 0.5. */
export function findRelatedCachedClaims(claim: string): RelatedClaim[] {
  const claimKey = getClaimCacheKey(claim);
  const cache = loadCache();
  if (cache[claimKey]) return [];

  const claimWords = getNormalizedWordSet(claim);
  if (claimWords.size === 0) return [];

  const relatedClaims: RelatedClaim[] = [];
  for (const cached of Object.values(cache)) {
    if (!cached.originalClaim) continue;

    const cachedWords = getNormalizedWordSet(cached.originalClaim);
    if (cachedWords.size === 0) continue;

    let intersectionSize = 0;
    claimWords.forEach((word) => {
      if (cachedWords.has(word)) intersectionSize++;
    });
    const unionSize = claimWords.size + cachedWords.size - intersectionSize;
    const similarity = intersectionSize / unionSize;

    if (similarity > 0.5) {
      relatedClaims.push({
        claim: cached.originalClaim,
        verdict: cached.verdict,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }
  }

  return relatedClaims.sort((left, right) => right.similarity - left.similarity);
}

let inMemoryCache: Record<string, CachedClaimData> | null = null;

function loadCache(): Record<string, CachedClaimData> {
  if (inMemoryCache !== null) {
    return inMemoryCache;
  }
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      inMemoryCache = JSON.parse(raw);
      return inMemoryCache || {};
    }
  } catch (err) {
    console.warn("[Cache] Could not read claim-cache.json, starting empty:", err);
  }
  inMemoryCache = {};
  return inMemoryCache;
}

function saveCache(cache: Record<string, CachedClaimData>): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    inMemoryCache = cache;
  } catch (err) {
    console.error("[Cache] Failed to save claim-cache.json:", err);
  }
}

/**
 * Retrieves a cached verification result if present.
 */
export function getCachedVerification(
  claim: string,
  language = "English"
): (CachedClaimData & { fromCache: true }) | null {
  const key = getClaimCacheKey(claim);
  const cache = loadCache();
  const hit = cache[key];
  const requestedLanguage = language.trim().toLowerCase();
  const cachedLanguage = (hit?.language || "English").trim().toLowerCase();
  const localizedResult =
    hit && cachedLanguage === requestedLanguage
      ? hit
      : hit?.languageResults?.[requestedLanguage];

  if (hit && localizedResult) {
    const updatedHit = {
      ...hit,
      timesChecked: (hit.timesChecked ?? 1) + 1,
    };
    cache[key] = updatedHit;
    saveCache(cache);
    return {
      ...localizedResult,
      language,
      originalClaim: updatedHit.originalClaim || claim,
      timestamp: updatedHit.timestamp,
      timesChecked: updatedHit.timesChecked,
      isCommonMyth: updatedHit.isCommonMyth,
      fromCache: true,
    };
  }
  return null;
}

/**
 * Saves a verification result to the persistent cache.
 */
export function setCachedVerification(
  claim: string,
  result: CachedClaimData,
  language = "English"
): void {
  const key = getClaimCacheKey(claim);
  const cache = loadCache();
  const existing = cache[key];
  const normalizedLanguage = language.trim().toLowerCase();
  const existingLanguage = (existing?.language || "English").trim().toLowerCase();
  const localizedResult: CachedLanguageResult = {
    verdict: result.verdict,
    confidence: result.confidence,
    explanation: result.explanation,
    wrongPart: result.wrongPart,
    whatToDo: result.whatToDo,
    replyToSender: result.replyToSender,
    sources: result.sources,
    liveVerified: result.liveVerified,
    tactic: result.tactic,
  };

  if (!existing || existingLanguage === normalizedLanguage) {
    cache[key] = {
      ...existing,
      ...localizedResult,
      language: existing?.language || language,
      originalClaim: existing?.originalClaim || claim,
      timestamp: Date.now(),
      timesChecked: existing?.timesChecked ?? result.timesChecked ?? 1,
      isCommonMyth: existing?.isCommonMyth ?? result.isCommonMyth,
      languageResults: existing?.languageResults,
    };
  } else {
    cache[key] = {
      ...existing,
      originalClaim: existing.originalClaim || claim,
      timestamp: Date.now(),
      timesChecked: existing.timesChecked ?? result.timesChecked ?? 1,
      languageResults: {
        ...existing.languageResults,
        [normalizedLanguage]: localizedResult,
      },
    };
  }
  saveCache(cache);
}
