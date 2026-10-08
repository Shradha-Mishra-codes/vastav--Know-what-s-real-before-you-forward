export type Verdict = "VERIFIED" | "FALSE" | "OUTDATED" | "PARTLY_TRUE" | "UNVERIFIABLE";

export interface GroundingSource {
  title: string;
  url: string;
}

export interface ManipulationTactic {
  label: string;
  explanation: string;
}

export interface RelatedClaim {
  claim: string;
  verdict: Verdict;
  similarity: number;
}

export interface CachedTrendItem {
  claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  liveVerified: boolean;
  timesChecked: number;
}

export interface ExtractedClaim {
  id: number;
  claim: string;
  original_span: string;
  category?: string;
}

export interface ExtractionResult {
  detected_language: string;
  claims: ExtractedClaim[];
  manipulation_tags: string[];
  transcript?: string;
}

export interface ClaimVerification {
  id: number;
  claim: string;
  originalSpan: string;
  category?: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  wrongPart: string | null;
  whatToDo: string;
  replyToSender: string;
  sources: GroundingSource[];
  liveVerified: boolean;
  tactic?: ManipulationTactic | null;
  timesChecked?: number;
  relatedClaims?: RelatedClaim[];
  fromCache?: boolean;
}

export interface VerificationResponse {
  detectedLanguage: string;
  manipulationTags: string[];
  claims: ClaimVerification[];
  overall: string;
  riskScore: number;
  riskLevel: "Low risk" | "Moderate risk" | "High risk — likely to mislead";
  transcript?: string;
}

/* ================= SAKHI CHATBOT TYPES ================= */

export interface SakhiAttachment {
  kind: "image" | "file" | "audio";
  mimeType: string;
  name?: string;
  data?: string; // base64 string
}

export interface SakhiCheckPayload {
  type: "text" | "image" | "pdf" | "audio" | "url";
  content: string;
  mimeType?: string;
}

export interface SakhiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: SakhiAttachment[];
  timestamp?: number;
  canRunCheck?: boolean;
  checkPayload?: SakhiCheckPayload | null;
  suggestions?: string[];
}

export interface SakhiRequest {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    attachments?: SakhiAttachment[];
  }>;
  language: string;
  context?: {
    recentChecks?: Array<{
      claim: string;
      verdict: string;
    }>;
  };
}

export interface SakhiResponse {
  reply: string;
  suggestions?: string[];
  canRunCheck?: boolean;
  checkPayload?: SakhiCheckPayload | null;
  error?: string;
  retryable?: boolean;
}
