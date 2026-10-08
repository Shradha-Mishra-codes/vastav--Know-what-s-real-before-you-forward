import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import dns from "node:dns";
import { MODEL, FALLBACK_MODEL } from "@/lib/config";
import { getSakhiSystemInstruction } from "@/lib/sakhi-prompt";
import { SakhiRequest, SakhiResponse } from "@/lib/types";
import { parseJsonSafely } from "@/lib/gemini";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not supported
}

export const maxDuration = 60;

// In-memory per-IP rate limiter: 20 requests per minute
interface RateLimitEntry {
  timestamps: number[];
}
const ipRateLimitMap = new Map<string, RateLimitEntry>();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  ipRateLimitMap.forEach((entry, ip) => {
    entry.timestamps = entry.timestamps.filter((t: number) => now - t < 60000);
    if (entry.timestamps.length === 0) {
      ipRateLimitMap.delete(ip);
    }
  });
}, 300000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t: number) => now - t < 60000);
  if (entry.timestamps.length >= 20) {
    return false;
  }
  entry.timestamps.push(now);
  ipRateLimitMap.set(ip, entry);
  return true;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 45000 },
  });
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_FILE_MIMES = ["application/pdf", "text/plain"];
const ALLOWED_AUDIO_MIMES = [
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/m4a",
  "audio/x-m4a",
];

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error: "Too many messages in a short time. Please wait a moment before sending another.",
          retryable: true,
        },
        { status: 429 }
      );
    }

    // 2. Parse & Validate Payload
    const body: SakhiRequest = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Please provide messages." },
        { status: 400 }
      );
    }

    // Cap at 20 messages
    if (body.messages.length > 20) {
      body.messages = body.messages.slice(-20);
    }

    // Validate attachments
    for (const msg of body.messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        if (msg.attachments.length > 3) {
          return NextResponse.json(
            { error: "Maximum 3 attachments allowed per message." },
            { status: 400 }
          );
        }

        for (const att of msg.attachments) {
          const mime = (att.mimeType || "").toLowerCase();
          const isImg = ALLOWED_IMAGE_MIMES.includes(mime);
          const isFile = ALLOWED_FILE_MIMES.includes(mime);
          const isAudio = ALLOWED_AUDIO_MIMES.includes(mime);

          if (!isImg && !isFile && !isAudio) {
            return NextResponse.json(
              { error: `File type ${att.mimeType || "unknown"} is not supported.` },
              { status: 400 }
            );
          }

          if (att.data) {
            const sizeInBytes = (att.data.length * 3) / 4;
            if (isImg && sizeInBytes > 8 * 1024 * 1024) {
              return NextResponse.json(
                { error: "Image size exceeds 8MB limit." },
                { status: 400 }
              );
            }
            if ((isFile || isAudio) && sizeInBytes > 10 * 1024 * 1024) {
              return NextResponse.json(
                { error: "Attachment size exceeds 10MB limit." },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    const language = body.language || "English";
    const systemPrompt = getSakhiSystemInstruction(language);

    // Context from local history if provided
    let contextNote = "";
    if (body.context?.recentChecks && body.context.recentChecks.length > 0) {
      const checksSummary = body.context.recentChecks
        .slice(0, 5)
        .map((c, i) => `${i + 1}. Claim: "${c.claim}" | Verdict: ${c.verdict}`)
        .join("\n");
      contextNote = `\n[User's recent checks in this session]:\n${checksSummary}\n`;
    }

    // Prepare contents for Gemini
    const contents: any[] = [];

    // Add conversation history
    for (const msg of body.messages) {
      const role = msg.role === "assistant" ? "model" : "user";
      const parts: any[] = [];

      const text = (msg.content || "").slice(0, 6000);
      if (text) {
        parts.push({ text });
      }

      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data) {
            const cleanData = att.data.replace(/^data:[^;]+;base64,/, "");
            parts.push({
              inlineData: {
                data: cleanData,
                mimeType: att.mimeType,
              },
            });
          }
        }
      }

      if (parts.length > 0) {
        contents.push({
          role,
          parts,
        });
      }
    }

    if (contextNote && contents.length > 0) {
      const lastUser = [...contents].reverse().find((c) => c.role === "user");
      if (lastUser && lastUser.parts) {
        lastUser.parts.push({ text: contextNote });
      }
    }

    const ai = getAiClient();

    const executeModel = async (modelName: string) => {
      return await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          httpOptions: { timeout: 45000 },
        },
      });
    };

    let response: any;
    try {
      response = await executeModel(MODEL);
    } catch (primaryErr: any) {
      const errMsg = primaryErr?.message || "";
      const is429 =
        primaryErr?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED");
      const is503 =
        primaryErr?.status === 503 ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE");

      if (is429) {
        console.warn("[Sakhi] 429 received on primary model. Backing off 3s...");
        await new Promise((r) => setTimeout(r, 3000));
        try {
          response = await executeModel(MODEL);
        } catch {
          return NextResponse.json(
            {
              error: "Sakhi is a bit busy right now. Please try again in a few seconds.",
              retryable: true,
            },
            { status: 429 }
          );
        }
      } else if (is503 && FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
        console.warn("[Sakhi] 503 on primary model. Switching to fallback model...");
        try {
          response = await executeModel(FALLBACK_MODEL);
        } catch (fallbackErr: any) {
          return NextResponse.json(
            {
              error: "Sakhi could not connect right now. Please try again.",
              retryable: true,
            },
            { status: 503 }
          );
        }
      } else {
        throw primaryErr;
      }
    }

    const rawText = response?.text || "";
    const parsed = parseJsonSafely<SakhiResponse>(rawText, {
      reply: rawText || "I'm right here with you! Could you tell me a little more about what you want to check?",
      suggestions: ["Check a forward for me", "What do verdicts mean?", "Is this a scam?"],
      canRunCheck: false,
      checkPayload: null,
    });

    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");
    if (parsed.canRunCheck && !parsed.checkPayload && lastUserMessage) {
      const att = lastUserMessage.attachments?.[0];
      if (att && att.data) {
        const payloadType =
          att.kind === "image"
            ? "image"
            : att.kind === "audio"
            ? "audio"
            : att.mimeType.includes("pdf")
            ? "pdf"
            : "text";
        parsed.checkPayload = {
          type: payloadType as any,
          content: att.data,
          mimeType: att.mimeType,
        };
      } else if (lastUserMessage.content) {
        parsed.checkPayload = {
          type: lastUserMessage.content.trim().startsWith("http") ? "url" : "text",
          content: lastUserMessage.content,
        };
      }
    }

    return NextResponse.json({
      reply: parsed.reply || "I'm here to help you check forwards and claims!",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
      canRunCheck: Boolean(parsed.canRunCheck),
      checkPayload: parsed.checkPayload || null,
    });
  } catch (err: any) {
    console.error("API /api/sakhi error:", err?.message || err);
    const isRetryable =
      err?.status === 429 ||
      err?.status === 503 ||
      err?.message?.includes("429") ||
      err?.message?.includes("503");

    return NextResponse.json(
      {
        error: "Sakhi encountered an issue processing your request. Please try again.",
        retryable: Boolean(isRetryable),
      },
      { status: isRetryable ? 429 : 500 }
    );
  }
}
