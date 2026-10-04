import { NextRequest, NextResponse } from "next/server";
import { extractClaims, verifyClaim } from "@/lib/gemini";
import { findRelatedCachedClaims } from "@/lib/cache";
import { overallVerdict } from "@/lib/verdict";
import { ClaimVerification } from "@/lib/types";

export const maxDuration = 60; // Allow up to 60s for parallel verification if hosted

/**
 * Strips HTML markup down to plain text and limits to ~8000 characters.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

/**
 * Normalizes user language selection for prompts.
 */
function normalizeLanguage(lang?: string): string {
  if (!lang) return "English";
  const l = lang.toLowerCase().trim();
  if (l === "hi" || l.includes("hindi") || l.includes("हिंदी")) {
    return "Hindi";
  }
  if (l === "hinglish") {
    return "Hinglish (conversational mix of Hindi and English)";
  }
  if (l === "mr" || l.includes("marathi") || l.includes("मराठी")) {
    return "Marathi";
  }
  if (l === "ur" || l.includes("urdu") || l.includes("اردو")) {
    return "Urdu";
  }
  if (l === "ta" || l.includes("tamil") || l.includes("தமிழ்")) {
    return "Tamil";
  }
  return "English";
}

function calculateRiskScore(
  claims: ClaimVerification[],
  manipulationTagCount: number
): { riskScore: number; riskLevel: "Low risk" | "Moderate risk" | "High risk — likely to mislead" } {
  const verdictScore = claims.reduce((score, claim) => {
    if (claim.verdict === "FALSE") return score + 30;
    if (claim.verdict === "PARTLY_TRUE") return score + 15;
    if (claim.verdict === "VERIFIED") return score - 10;
    return score;
  }, 0);
  const tagScore = Math.min(manipulationTagCount * 10, 40);
  const riskScore = Math.max(0, Math.min(100, verdictScore + tagScore));
  const riskLevel =
    riskScore <= 30
      ? "Low risk"
      : riskScore <= 60
      ? "Moderate risk"
      : "High risk — likely to mislead";

  return { riskScore, riskLevel };
}

export async function POST(req: NextRequest) {
  try {
    console.log("GEMINI_API_KEY is present:", Boolean(process.env.GEMINI_API_KEY));
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request payload. Please provide input data." },
        { status: 400 }
      );
    }

    const { type, content, mimeType, language } = body;

    const validTypes = ["text", "image", "url", "audio", "pdf"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Input type must be one of: ${validTypes.join(", ")}.` },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        {
          error:
            type === "image"
              ? "Please select an image file to check."
              : type === "audio"
              ? "Please select or upload an audio voice note (MP3, OGG, M4A, WAV)."
              : type === "pdf"
              ? "Please upload a PDF document (limit 10MB)."
              : type === "url"
              ? "Please enter a valid webpage URL."
              : "Please paste or enter text to verify.",
        },
        { status: 400 }
      );
    }

    let processContent = content.trim();
      let processType: "text" | "image" | "pdf" | "audio" =
        type === "pdf"
          ? "pdf"
          : type === "image"
          ? "image"
          : type === "audio"
          ? "audio"
          : "text";

    // Handle URL: Fetch server-side and extract main text
    if (type === "url") {
      try {
        const parsedUrl = new URL(processContent);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return NextResponse.json(
            { error: "Please enter a valid HTTP or HTTPS URL." },
            { status: 400 }
          );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);

        const pageRes = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SachPrism Fact Checker/1.0",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (!pageRes.ok) {
          return NextResponse.json(
            {
              error: `Could not load page (HTTP ${pageRes.status}). Please verify the link or try pasting the text directly.`,
            },
            { status: 400 }
          );
        }

        const html = await pageRes.text();
        const cleanText = htmlToText(html);

        if (!cleanText || cleanText.length < 30) {
          return NextResponse.json(
            {
              error:
                "Could not extract readable article text from this link. Try copying and pasting the text instead.",
            },
            { status: 400 }
          );
        }

        processContent = cleanText;
        processType = "text";
      } catch (err: any) {
        if (err.name === "AbortError") {
          return NextResponse.json(
            {
              error:
                "The link took too long to respond. Please try pasting the text directly.",
            },
            { status: 408 }
          );
        }
        return NextResponse.json(
          {
            error:
              "Unable to reach the webpage. Please check the URL or paste the text directly.",
          },
          { status: 400 }
        );
      }
    }

    const outputLanguage = normalizeLanguage(language);

    // Step 1: Extract atomic claims using PROMPT_A
    const extraction = await extractClaims({
      type: processType,
      content: processContent,
      mimeType:
        mimeType ||
        (processType === "image"
          ? "image/jpeg"
          : processType === "pdf"
          ? "application/pdf"
          : undefined),
    });

    const claimsToVerify = (extraction.claims || []).slice(0, 3);

    // If no claims were extracted
    if (claimsToVerify.length === 0) {
      const risk = calculateRiskScore([], extraction.manipulation_tags?.length || 0);
      return NextResponse.json({
        detectedLanguage: extraction.detected_language || "unknown",
        manipulationTags: extraction.manipulation_tags || [],
        claims: [],
        overall: "Cannot be confirmed",
        ...risk,
        transcript: extraction.transcript,
        message:
          "No specific factual claims were found in the message to verify.",
      });
    }

    // Step 2: Verify each claim sequentially (one at a time, with 3s gap, max 3 total)
    const verifiedClaims: ClaimVerification[] = [];
    for (let i = 0; i < claimsToVerify.length; i++) {
      const c = claimsToVerify[i];
      if (i > 0) {
        console.log(`[Queue] Waiting 3000ms before claim ${i + 1}/${claimsToVerify.length}...`);
        await new Promise((r) => setTimeout(r, 3000));
      }

      try {
        const relatedClaims = findRelatedCachedClaims(c.claim);
        const verification = await verifyClaim(c.claim, outputLanguage);
        verifiedClaims.push({
          id: c.id,
          claim: c.claim,
          originalSpan: c.original_span || c.claim,
          category: c.category,
          verdict: verification.verdict,
          confidence: verification.confidence,
          explanation: verification.explanation,
          wrongPart: verification.wrongPart,
          whatToDo: verification.whatToDo,
          replyToSender: verification.replyToSender,
          sources: verification.sources,
          liveVerified: verification.liveVerified,
          tactic: verification.tactic,
          timesChecked: verification.timesChecked,
          relatedClaims,
          fromCache: verification.fromCache,
        });
      } catch (verifErr: any) {
        console.error(`Error verifying claim "${c.claim}":`, verifErr?.message || verifErr);
        const errMsg = verifErr?.message || "";
        const isTimeout =
          verifErr?.name === "AbortError" ||
          verifErr?.code === "ETIMEDOUT" ||
          errMsg.toLowerCase().includes("timeout") ||
          errMsg.toLowerCase().includes("timed out");

        let explanation = "Could not verify claim due to an unexpected service error.";
        if (isTimeout) {
          explanation = "Verification timed out, please try again.";
        } else if (verifErr?.message) {
          explanation = `Verification error: ${verifErr.message}`;
        }

        verifiedClaims.push({
          id: c.id,
          claim: c.claim,
          originalSpan: c.original_span || c.claim,
          category: c.category,
          verdict: "UNVERIFIABLE",
          confidence: 0,
          explanation,
          wrongPart: null,
          whatToDo: "Do not forward without verified facts.",
          replyToSender: "I could not verify this claim using reliable sources.",
          sources: [],
          liveVerified: false,
          tactic: null,
          timesChecked: 0,
          relatedClaims: findRelatedCachedClaims(c.claim),
        });
      }
    }

    // Step 3: Compute overall verdict rule-based
    const overall = overallVerdict(verifiedClaims);
    const risk = calculateRiskScore(
      verifiedClaims,
      extraction.manipulation_tags?.length || 0
    );

    return NextResponse.json({
      detectedLanguage: extraction.detected_language || "en",
      manipulationTags: extraction.manipulation_tags || [],
      claims: verifiedClaims,
      overall,
      ...risk,
      transcript: extraction.transcript,
    });
  } catch (error: any) {
    console.error("API /api/verify handler error:", error?.message || error);
    if (error?.stack) {
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
