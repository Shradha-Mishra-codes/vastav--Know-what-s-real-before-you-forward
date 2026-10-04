import { GoogleGenAI } from "@google/genai";
import dns from "node:dns";
import { MODEL, FALLBACK_MODEL } from "./config";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not supported
}
import { PROMPT_A, PROMPT_B, PROMPT_B_NON_GROUNDED } from "./prompts";
import {
  ExtractionResult,
  ClaimVerification,
  GroundingSource,
  ManipulationTactic,
  Verdict,
} from "./types";
import { getCachedVerification, setCachedVerification } from "./cache";

/**
 * Initializes the official Google Gen AI SDK client.
 * Uses server-side environment variable GEMINI_API_KEY.
 */
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please provide a valid Gemini API key in your environment."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 45000 },
  });
}

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```) safely.
 */
export function stripCodeFences(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*\n?/i, "");
  text = text.replace(/\n?```\s*$/i, "");
  return text.trim();
}

/**
 * Safely parse JSON from raw LLM text with code fence stripping
 * and outermost JSON object detection fallback.
 */
export function parseJsonSafely<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // Fall through to fallback
    }
    return fallback;
  }
}

/**
 * Normalizes base64 string and detects mime type if provided as data URL.
 */
function normalizeBase64(
  raw: string,
  providedMime?: string
): { data: string; mimeType: string } {
  const dataUrlMatch = raw.match(
    /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/
  );
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }
  return {
    mimeType: providedMime || "image/jpeg",
    data: raw,
  };
}

interface GenerateCallParams {
  contents: any;
  config?: any;
  isVerifyClaim?: boolean;
}

/**
 * Centralized caller handling 429 backoff retries (4s, 8s -> RATE_LIMITED error),
 * 503 high demand retries (1s, 3s), and GEMINI_MODEL_FALLBACK fallback.
 */
async function callWithRetryAndFallback(
  ai: GoogleGenAI,
  params: GenerateCallParams
): Promise<any> {
  const primaryModel = MODEL;
  const fallbackModel = FALLBACK_MODEL;

  async function executeOnModel(targetModel: string) {
    let attempt429 = 0;
    while (true) {
      try {
        return await ai.models.generateContent({
          model: targetModel,
          contents: params.contents,
          config: params.config,
        });
      } catch (err: any) {
        const errorMsg = err?.message || "";
        const is429 =
          err?.status === 429 ||
          errorMsg.includes("429") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("quota");

        if (params.isVerifyClaim && is429) {
          if (attempt429 === 0) {
            console.warn(`[verifyClaim] Received 429 on ${targetModel}. Waiting 4s before retry 1...`);
            await new Promise((r) => setTimeout(r, 4000));
            attempt429++;
            continue;
          } else if (attempt429 === 1) {
            console.warn(`[verifyClaim] Received 429 on ${targetModel}. Waiting 8s before retry 2...`);
            await new Promise((r) => setTimeout(r, 8000));
            attempt429++;
            continue;
          } else {
            const rateLimitError: any = new Error(
              "Search quota limit reached, please retry in a minute."
            );
            rateLimitError.code = "RATE_LIMITED";
            rateLimitError.status = 429;
            throw rateLimitError;
          }
        }

        throw err;
      }
    }
  }

  async function runWith503Retries(targetModel: string) {
    const delays503 = [1000, 3000];
    for (let attempt503 = 0; attempt503 <= delays503.length; attempt503++) {
      try {
        return await executeOnModel(targetModel);
      } catch (err: any) {
        if ((err as any).code === "RATE_LIMITED") {
          throw err;
        }

        const errorMsg = err?.message || "";
        const is503 =
          err?.status === 503 ||
          errorMsg.includes("503") ||
          errorMsg.includes("UNAVAILABLE") ||
          errorMsg.includes("high demand");

        if (is503 && attempt503 < delays503.length) {
          const delay = delays503[attempt503];
          console.warn(`Received 503 on ${targetModel}. Retrying in ${delay}ms (attempt ${attempt503 + 1})...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  try {
    return await runWith503Retries(primaryModel);
  } catch (err: any) {
    if ((err as any).code === "RATE_LIMITED") {
      throw err;
    }

    const errorMsg = err?.message || "";
    const is503 =
      err?.status === 503 ||
      errorMsg.includes("503") ||
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("high demand");

    if (is503 && fallbackModel && fallbackModel !== primaryModel) {
      console.warn(`Primary model ${primaryModel} failed with 503. Trying fallback model ${fallbackModel} once...`);
      return await executeOnModel(fallbackModel);
    }

    throw err;
  }
}

export type ExtractInput =
  | { type: "text"; content: string; mimeType?: string }
  | { type: "image"; content: string; mimeType?: string }
  | { type: "pdf"; content: string; mimeType?: string }
  | { type: "audio"; content: string; mimeType?: string };

/**
 * Transcribes audio (mp3, ogg, m4a, wav) and detects language using Gemini inline data.
 */
export async function transcribeAudio(
  content: string,
  providedMime?: string
): Promise<{ transcript: string; detectedLanguage: string }> {
  const ai = getAiClient();
  const { data, mimeType } = normalizeBase64(content, providedMime || "audio/mp3");

  const prompt = `You are an expert audio transcription assistant.
1. Transcribe this audio recording accurately word-for-word in its original spoken language (Hindi, English, Hinglish, etc.).
2. Detect the spoken language.
Return ONLY valid JSON:
{
  "transcript": "exact transcription of the voice note or recording",
  "detected_language": "hi|en|hinglish|other"
}`;

  const response = await callWithRetryAndFallback(ai, {
    contents: [
      prompt,
      {
        inlineData: {
          data,
          mimeType,
        },
      },
    ],
  });

  const rawText = response?.text || "";
  const parsed = parseJsonSafely<{ transcript?: string; detected_language?: string }>(
    rawText,
    {
      transcript: rawText,
      detected_language: "en",
    }
  );

  return {
    transcript: parsed.transcript || rawText,
    detectedLanguage: parsed.detected_language || "en",
  };
}

/**
 * Extracts atomic claims and manipulation tactics from text, image, or PDF input.
 */
export async function extractClaims(
  input: ExtractInput
): Promise<ExtractionResult> {
  const ai = getAiClient();

  let contents: any;

  if (input.type === "image" || input.type === "pdf" || input.type === "audio") {
    const defaultMime =
      input.type === "pdf"
        ? "application/pdf"
        : input.type === "audio"
        ? "audio/webm"
        : "image/jpeg";
    const { data, mimeType } = normalizeBase64(input.content, input.mimeType || defaultMime);
    const instruction =
      input.type === "pdf"
        ? "Read all text and tables in the attached PDF document, analyzing only the first 20 pages, and extract the claims following the instructions."
        : input.type === "image"
        ? "Read all visible text in the attached image (in any language) and extract the claims following the instructions."
        : "Transcribe the attached voice note and extract claims from the transcript.";

    const promptText =
      input.type === "audio"
        ? PROMPT_A(instruction, { includeTranscript: true })
        : PROMPT_A(instruction);

    contents = [
      promptText,
      {
        inlineData: {
          data,
          mimeType,
        },
      },
    ];
  } else {
    const promptText = PROMPT_A(input.content);
    contents = promptText;
  }

  const response = await callWithRetryAndFallback(ai, {
    contents,
  });

  const rawText = response?.text || "";
  const fallbackResult: ExtractionResult = {
    detected_language: "en",
    claims: [],
    manipulation_tags: [],
  };

  const parsed = parseJsonSafely<ExtractionResult>(rawText, fallbackResult);

  // Clean and validate claims array (cap to 3 to stay within free-tier limits)
  if (!Array.isArray(parsed.claims)) {
    parsed.claims = [];
  } else {
    parsed.claims = parsed.claims.slice(0, 3).map((c, index) => ({
      id: typeof c.id === "number" ? c.id : index + 1,
      claim: c.claim || "",
      original_span: c.original_span || c.claim || "",
      category: c.category || "other",
    }));
  }

  if (!Array.isArray(parsed.manipulation_tags)) {
    parsed.manipulation_tags = [];
  }

  if (!parsed.detected_language) {
    parsed.detected_language = "en";
  }

  return parsed;
}

interface RawVerificationOutput {
  verdict?: string;
  confidence?: number;
  explanation?: string;
  wrong_part?: string | null;
  what_to_do?: string;
  reply_to_sender?: string;
  tactic?: ManipulationTactic | null;
}

/**
 * Verifies a single claim.
 * 1. Checks local cache first for instant zero-quota response.
 * 2. Attempts live Google Search grounding.
 * 3. Gracefully degrades to non-grounded AI assessment if 429 quota is reached.
 */
export async function verifyClaim(
  claim: string,
  lang: string
): Promise<{
  verdict: Verdict;
  confidence: number;
  explanation: string;
  wrongPart: string | null;
  whatToDo: string;
  replyToSender: string;
  sources: GroundingSource[];
  liveVerified: boolean;
  tactic?: ManipulationTactic | null;
  timesChecked: number;
  fromCache?: boolean;
}> {
  const outputLang = lang || "English";

  // Reuse cache entries only when their response language matches.
  const cached = getCachedVerification(claim, outputLang);
  if (cached) {
    console.log(`[verifyClaim] Cache HIT for claim: "${claim}"`);
    return {
      verdict: cached.verdict,
      confidence: cached.confidence,
      explanation: cached.explanation,
      wrongPart: cached.wrongPart,
      whatToDo: cached.whatToDo,
      replyToSender: cached.replyToSender,
      sources: cached.sources || [],
      liveVerified: Boolean(cached.liveVerified),
      tactic: cached.tactic ?? null,
      timesChecked: cached.timesChecked ?? 2,
      fromCache: true,
    };
  }

  const ai = getAiClient();

  // 2. Try live Google Search grounded verification
  try {
    const prompt = PROMPT_B({
      claim,
      outputLanguage: outputLang,
    });

    const response = await callWithRetryAndFallback(ai, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        httpOptions: { timeout: 45000 },
      },
      isVerifyClaim: true,
    });

    const rawText = response.text || "";

    const parsed = parseJsonSafely<RawVerificationOutput>(rawText, {
      verdict: "UNVERIFIABLE",
      confidence: 0.0,
      explanation: "No verifiable evidence found.",
      wrong_part: null,
      what_to_do: "Exercise caution and do not forward unverified claims.",
      reply_to_sender: "I could not find reliable evidence to confirm this claim.",
    });

    // Extract grounding sources from response candidate's groundingMetadata
    const sources: GroundingSource[] = [];
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata as any;

    if (groundingMetadata && Array.isArray(groundingMetadata.groundingChunks)) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const url = chunk.web?.uri || chunk.uri || "";
        const title = chunk.web?.title || chunk.title || url;
        if (url && typeof url === "string" && !sources.some((s) => s.url === url)) {
          sources.push({ title: title || url, url });
        }
      }
    }

    // If zero sources found from live search, verdict must be UNVERIFIABLE
    let verdictStr = (parsed.verdict || "UNVERIFIABLE").toUpperCase().trim();
    const validVerdicts: Verdict[] = [
      "VERIFIED",
      "FALSE",
      "OUTDATED",
      "PARTLY_TRUE",
      "UNVERIFIABLE",
    ];

    let finalVerdict: Verdict = validVerdicts.includes(verdictStr as Verdict)
      ? (verdictStr as Verdict)
      : "UNVERIFIABLE";

    if (sources.length === 0) {
      finalVerdict = "UNVERIFIABLE";
    }

    let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
    if (isNaN(confidence) || confidence < 0) confidence = 0;
    if (confidence > 1) confidence = 1;
    if (finalVerdict === "UNVERIFIABLE" && sources.length === 0) {
      confidence = Math.min(confidence, 0.4);
    }

    const liveResult = {
      verdict: finalVerdict,
      confidence: Math.round(confidence * 100) / 100,
      explanation: parsed.explanation || "No explanation provided.",
      wrongPart: parsed.wrong_part || null,
      whatToDo:
        parsed.what_to_do || "Check with official authorities before sharing.",
      replyToSender:
        parsed.reply_to_sender ||
        "Please verify this information from official sources before forwarding.",
      sources,
      liveVerified: sources.length > 0,
      tactic: parsed.tactic ?? null,
      timesChecked: 1,
    };

    // Cache successful live result
    setCachedVerification(claim, liveResult, outputLang);

    return {
      ...liveResult,
      fromCache: false,
    };
  } catch (err: any) {
    const errorMessage = err?.message || "";
    const isRateLimit =
      err?.code === "RATE_LIMITED" ||
      err?.status === 429 ||
      errorMessage.includes("429") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.includes("RESOURCE_EXHAUSTED");
    const isServiceUnavailable =
      err?.status === 503 ||
      errorMessage.includes("503") ||
      errorMessage.includes("UNAVAILABLE") ||
      errorMessage.toLowerCase().includes("high demand");
    const isFetchFailure =
      err?.name === "TypeError" &&
      errorMessage.toLowerCase().includes("fetch failed");

    if (isRateLimit || isServiceUnavailable || isFetchFailure) {
      const failureType = isRateLimit
        ? "429"
        : isServiceUnavailable
        ? "503"
        : "network failure";
      console.warn(
        `[verifyClaim] Grounded call failed with ${failureType}. Falling back to conservative non-grounded AI assessment for claim: "${claim}"`
      );

      try {
        // 3. Graceful degradation: Non-grounded Gemini call with model knowledge
        const nonGroundedPrompt = PROMPT_B_NON_GROUNDED({
          claim,
          outputLanguage: outputLang,
          today: new Date().toISOString().slice(0, 10),
        });

        console.info("[verifyClaim] Attempting non-grounded fallback...");
        const fallbackResponse = await callWithRetryAndFallback(ai, {
          contents: nonGroundedPrompt,
          isVerifyClaim: false,
        });
        console.info("[verifyClaim] Non-grounded fallback returned a response.");

        const rawFallbackText = fallbackResponse?.text || "";
        const parsedFallback = parseJsonSafely<RawVerificationOutput>(rawFallbackText, {
          verdict: "UNVERIFIABLE",
          confidence: 0.35,
          explanation: "Based on general knowledge; live source-checking was temporarily unavailable.",
          wrong_part: null,
          what_to_do: "Verify with authoritative sources before forwarding.",
          reply_to_sender: "I could not confirm this through live official records.",
        });

        let verdictStr = (parsedFallback.verdict || "UNVERIFIABLE").toUpperCase().trim();
        const validVerdicts: Verdict[] = [
          "VERIFIED",
          "FALSE",
          "OUTDATED",
          "PARTLY_TRUE",
          "UNVERIFIABLE",
        ];

        let aiVerdict: Verdict = validVerdicts.includes(verdictStr as Verdict)
          ? (verdictStr as Verdict)
          : "UNVERIFIABLE";

        // Confidence capped at 0.40 for non-grounded assessment
        let aiConfidence =
          typeof parsedFallback.confidence === "number" ? parsedFallback.confidence : 0.35;
        if (isNaN(aiConfidence) || aiConfidence < 0) aiConfidence = 0;
        aiConfidence = Math.min(aiConfidence, 0.40);

        // Ensure explanation contains honest note
        let explanation = parsedFallback.explanation || "";
        const normalizedLanguage = outputLang.toLowerCase();
        const honestNote = normalizedLanguage.includes("hindi")
          ? "सामान्य जानकारी के आधार पर; लाइव स्रोत-जाँच अस्थायी रूप से उपलब्ध नहीं थी।"
          : normalizedLanguage.includes("marathi")
          ? "सामान्य माहितीच्या आधारावर; थेट स्रोत-तपासणी तात्पुरती उपलब्ध नव्हती."
          : normalizedLanguage.includes("urdu")
          ? "عمومی معلومات کی بنیاد پر؛ براہِ راست ذرائع کی جانچ عارضی طور پر دستیاب نہیں تھی۔"
          : normalizedLanguage.includes("tamil")
          ? "பொதுவான அறிவின் அடிப்படையில்; நேரடி ஆதாரச் சரிபார்ப்பு தற்காலிகமாகக் கிடைக்கவில்லை."
          : normalizedLanguage.includes("hinglish")
          ? "General knowledge ke basis par; live source-checking temporarily available nahi thi."
          : "Based on general knowledge; live source-checking was temporarily unavailable.";
        if (!explanation.includes(honestNote)) {
          explanation = explanation ? `${explanation.trim()} ${honestNote}` : honestNote;
        }

        const degradedResult = {
          verdict: aiVerdict,
          confidence: Math.round(aiConfidence * 100) / 100,
          explanation,
          wrongPart: parsedFallback.wrong_part || null,
          whatToDo:
            parsedFallback.what_to_do ||
            "Exercise caution and verify from official sources.",
          replyToSender:
            parsedFallback.reply_to_sender ||
            "This was assessed from general knowledge as live source-checking was temporarily unavailable.",
          sources: [],
          liveVerified: false,
          tactic: parsedFallback.tactic ?? null,
          timesChecked: 1,
        };

        // Cache the degraded result so repeat requests are instant
        setCachedVerification(claim, degradedResult, outputLang);

        return {
          ...degradedResult,
          fromCache: false,
        };
      } catch (fallbackErr: any) {
        console.error("[verifyClaim] Non-grounded fallback failed.");
        console.error("[verifyClaim] Fallback error message:", fallbackErr?.message);
        console.error("[verifyClaim] Fallback error stack:", fallbackErr?.stack);
        throw fallbackErr;
      }
    }

    // Re-throw other unrecoverable errors to be handled by route
    throw err;
  }
}
