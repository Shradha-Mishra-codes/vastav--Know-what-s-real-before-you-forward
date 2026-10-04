"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Link2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Mic,
  Volume2,
  VolumeX,
  History as HistoryIcon,
  BookOpen,
  Settings as SettingsIcon,
  Menu,
  X as CloseIcon,
  File as FileIcon,
  Download,
  Bell,
  GraduationCap,
  MapPin,
  Lightbulb,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  CachedTrendItem,
  Verdict,
  ClaimVerification,
  VerificationResponse,
} from "@/lib/types";

type InputTab =
  | "text"
  | "image"
  | "audio"
  | "pdf"
  | "url"
  | "history"
  | "trending"
  | "learn"
  | "settings"
  | "standards";
type LanguageOption = "en" | "hi" | "hinglish" | "mr" | "ur" | "ta";
type HistoryVerdictFilter = "ALL" | Verdict;
type TextSizeOption = "small" | "medium" | "large";

interface HistoryEntry {
  id: string;
  checkedAt: number;
  result: VerificationResponse;
}

interface QRCodeConstructor {
  new (
    element: HTMLElement,
    options: {
      text: string;
      width: number;
      height: number;
      colorDark: string;
      colorLight: string;
      correctLevel: number;
    }
  ): unknown;
  CorrectLevel?: { M?: number };
}

declare global {
  interface Window {
    QRCode?: QRCodeConstructor;
  }
}

const HISTORY_STORAGE_KEY = "truthlens-check-history";
const PREFERENCES_STORAGE_KEY = "truthlens-preferences";
const HISTORY_LIMIT = 50;

const LOADING_STEPS = [
  { id: 1, title: "Reading input", desc: "Parsing text, audio, or document structure" },
  { id: 2, title: "Finding claims", desc: "Extracting atomic factual statements" },
  { id: 3, title: "Checking sources", desc: "Searching official registries & authoritative databases" },
  { id: 4, title: "Writing explanation", desc: "Synthesizing clear, simple fact-checking findings" },
];

const SAMPLE_FORWARDS = [
  {
    label: "Health claim",
    text: "Drinking warm water every 15 minutes kills viruses in your throat and prevents the flu.",
  },
  {
    label: "Science fact",
    text: "The Earth completes one orbit around the Sun in about 365 days.",
  },
  {
    label: "Public announcement",
    text: "A new government benefit was announced today. Every household can claim a payment by registering online.",
  },
];

const DAILY_TIPS = [
  "Urgent phrases like ‘forward to 10 people now’ are a warning sign. Pause before sharing.",
  "A screenshot can be edited. Look for the original announcement on an official site.",
  "A UPI PIN authorizes a payment. Never enter it to receive money.",
  "Check the date and original source before trusting a dramatic headline.",
];

const LEARN_QUIZ = [
  {
    question: "Which is strongest as a source for a government scheme announcement?",
    options: ["A friend's voice note", "The official ministry website", "An unknown shortened link"],
    correctIndex: 1,
    explanation: "An official ministry website is a primary source. Still check its date and details.",
  },
  {
    question: "A message says you must forward it immediately to avoid losing a benefit. What should you do?",
    options: ["Forward it quickly", "Pause and verify through an official channel", "Share it in more groups"],
    correctIndex: 1,
    explanation: "Pressure to act or forward immediately is a common manipulation signal.",
  },
  {
    question: "Someone asks for your UPI PIN to send you money. Is that safe?",
    options: ["Yes, to receive the transfer", "Only if they sound official", "No, a UPI PIN authorizes a payment"],
    correctIndex: 2,
    explanation: "Never share your UPI PIN or OTP. Receiving money does not require entering your PIN.",
  },
];

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.checkedAt === "number" &&
    !!entry.result &&
    Array.isArray(entry.result.claims)
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString();
}
function normalizeHistoryClaim(claim: string): string {
  return claim.toLowerCase().trim().replace(/\s+/g, " ");
}

function SachPrismMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="sachprism-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#176e78" />
          <stop offset="0.58" stopColor="#347d9c" />
          <stop offset="1" stopColor="#e26f68" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="url(#sachprism-tile)" />
      <path d="M10 46 28 14 46 46H10Z" fill="none" stroke="#f8fbfa" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M5 32h30" fill="none" stroke="#f8fbfa" strokeWidth="3.2" strokeLinecap="round" />
      <path d="m35 32 19-17" fill="none" stroke="#66d4ae" strokeWidth="3.4" strokeLinecap="round" />
      <path d="m35 32 22-7" fill="none" stroke="#ef8172" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M35 32h23" fill="none" stroke="#f4c95d" strokeWidth="3.4" strokeLinecap="round" />
      <path d="m35 32 22 8" fill="none" stroke="#e9edf0" strokeWidth="3.4" strokeLinecap="round" />
      <path d="m35 32 19 17" fill="none" stroke="#83d2dc" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export default function SachPrismHome() {
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageOption>("en");
  const [readAnswersAloud, setReadAnswersAloud] = useState(false);
  const [textSize, setTextSize] = useState<TextSizeOption>("medium");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Inputs
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");

  // Image input
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Audio input (Voice Note)
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // PDF input
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Status & Results
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [verifyingProgressText, setVerifyingProgressText] = useState<string>("");
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [resultCheckedAt, setResultCheckedAt] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string; retryable?: boolean } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyVerdictFilter, setHistoryVerdictFilter] = useState<HistoryVerdictFilter>("ALL");
  const [learnAnswers, setLearnAnswers] = useState<Record<number, number>>({});
  const [trendingItems, setTrendingItems] = useState<CachedTrendItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  // UI state
  const [copiedClaimId, setCopiedClaimId] = useState<number | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});
  const [speakingClaimId, setSpeakingClaimId] = useState<number | null>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [qrCodeLibraryReady, setQrCodeLibraryReady] = useState(false);
  const [qrCodeLibraryFailed, setQrCodeLibraryFailed] = useState(false);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const certificateQrRef = useRef<HTMLDivElement>(null);
  const skipNextPreferenceSaveRef = useRef(false);

  useEffect(() => {
    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        const parsed: unknown = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT));
        }
      }
      const savedPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences) as {
          language?: LanguageOption;
          readAnswersAloud?: boolean;
          textSize?: TextSizeOption;
        };
        if (["en", "hi", "hinglish", "mr", "ur", "ta"].includes(parsed.language || "")) {
          setLanguage(parsed.language as LanguageOption);
        }
        if (typeof parsed.readAnswersAloud === "boolean") {
          setReadAnswersAloud(parsed.readAnswersAloud);
        }
        if (["small", "medium", "large"].includes(parsed.textSize || "")) {
          setTextSize(parsed.textSize as TextSizeOption);
        }
      }
    } catch (historyError) {
      console.warn("Could not load local check history:", historyError);
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const rootFontSize = textSize === "small" ? "14px" : textSize === "large" ? "18px" : "16px";
    document.documentElement.style.fontSize = rootFontSize;
    if (skipNextPreferenceSaveRef.current) {
      skipNextPreferenceSaveRef.current = false;
      window.setTimeout(() => {
        skipNextPreferenceSaveRef.current = false;
      }, 0);
      return;
    }
    try {
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ language, readAnswersAloud, textSize })
      );
    } catch (preferenceError) {
      console.warn("Could not save preferences:", preferenceError);
    }
  }, [language, preferencesLoaded, readAnswersAloud, textSize]);

  useEffect(() => {
    if (activeTab !== "trending" || trendingLoaded) return;
    let cancelled = false;
    setTrendingLoading(true);
    setTrendingError(null);

    fetch("/api/trending")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load cached trend examples.");
        return (await response.json()) as { items?: CachedTrendItem[] };
      })
      .then((data) => {
        if (!cancelled) setTrendingItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setTrendingError(
            loadError instanceof Error ? loadError.message : "Could not load trend examples."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTrendingLoading(false);
          setTrendingLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, trendingLoaded]);

  useEffect(() => {
    const QRCode = window.QRCode;
    const qrContainer = certificateQrRef.current;
    setQrCodeGenerated(false);
    if (!result || !QRCode || !qrContainer || !qrCodeLibraryReady) return;

    qrContainer.replaceChildren();
    const checkedAt = resultCheckedAt ?? Date.now();
    const checkedDate = new Date(checkedAt).toLocaleDateString("en-IN", {
      dateStyle: "long",
    });
    const claimSummary = result.claims
      .map((claim, index) => `${index + 1}. [${claim.verdict}] ${claim.claim}`)
      .join("\n");
    const certificateSummary = [
      "SachPrism proof of check",
      claimSummary || `Result: ${result.overall}`,
      `Overall verdict: ${result.overall}`,
      `Risk score: ${result.riskScore}/100 (${result.riskLevel})`,
      `Date checked: ${checkedDate}`,
    ].join("\n");

    try {
      new QRCode(qrContainer, {
        text: certificateSummary,
        width: 190,
        height: 190,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel?.M ?? 0,
      });
      setQrCodeGenerated(true);
    } catch (qrError) {
      console.error("Could not generate certificate QR code:", qrError);
      setQrCodeLibraryFailed(true);
    }
  }, [result, resultCheckedAt, qrCodeLibraryReady]);

  useEffect(() => {
    if (!result || !readAnswersAloud || !preferencesLoaded || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const answerText = result.claims
      .map((claim, index) => `Claim ${index + 1}. ${claim.claim}. ${claim.verdict}. ${claim.explanation}`)
      .join(" ");
    if (!answerText) return;

    const utterance = new SpeechSynthesisUtterance(answerText);
    utterance.lang =
      language === "hi" ? "hi-IN" :
      language === "mr" ? "mr-IN" :
      language === "ur" ? "ur-IN" :
      language === "ta" ? "ta-IN" : "en-IN";
    utterance.onend = () => setSpeakingClaimId(null);
    utterance.onerror = () => setSpeakingClaimId(null);
    setSpeakingClaimId(-1);
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [language, preferencesLoaded, readAnswersAloud, result]);

  // Animated loading step progression with per-claim feedback
  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;
    let timer4: NodeJS.Timeout;
    let timer5: NodeJS.Timeout;

    if (isLoading) {
      setCurrentStepIndex(0);
      setVerifyingProgressText("Analyzing input structure and detecting language...");

      timer1 = setTimeout(() => {
        setCurrentStepIndex(1);
        setVerifyingProgressText("Extracting factual claims to verify...");
      }, 1600);

      timer2 = setTimeout(() => {
        setCurrentStepIndex(2);
        setVerifyingProgressText("Checking claim 1 against verified sources...");
      }, 3600);

      timer3 = setTimeout(() => {
        setVerifyingProgressText("Checking claim 2 against verified sources...");
      }, 7600);

      timer4 = setTimeout(() => {
        setVerifyingProgressText("Checking claim 3 against verified sources...");
      }, 12500);

      timer5 = setTimeout(() => {
        setCurrentStepIndex(3);
        setVerifyingProgressText("Synthesizing verdicts, explanations, and citations...");
      }, 17000);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [isLoading]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle Image Upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError({
        message: "Please choose an image file (e.g. JPG, PNG, WEBP).",
        retryable: false,
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError({
        message: "Screenshot size must be under 8MB.",
        retryable: false,
      });
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Handle Audio Upload (Voice note)
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validAudioExtension = /\.(mp3|ogg|m4a|wav|webm)$/i.test(file.name);
    const validAudioMime =
      !file.type ||
      [
        "audio/mpeg",
        "audio/mp3",
        "audio/ogg",
        "application/ogg",
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/vnd.wave",
        "audio/webm",
        "application/octet-stream",
      ].includes(file.type);

    if (!validAudioExtension || !validAudioMime) {
      setError({
        message: "Please choose an MP3, OGG, M4A, WAV, or WebM audio file.",
        retryable: false,
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError({
        message: "Audio file must be 10MB or smaller.",
        retryable: false,
      });
      return;
    }

    setError(null);
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAudioBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClearAudio = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioFile(null);
    setAudioBase64(null);
    setAudioPreviewUrl(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  // Handle PDF Upload
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError({
        message: "Please choose a valid PDF document.",
        retryable: false,
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError({
        message: "PDF document exceeds the 10MB limit (max 20 pages).",
        retryable: false,
      });
      return;
    }

    setError(null);
    setPdfFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPdfBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPdf = () => {
    setPdfFile(null);
    setPdfBase64(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  const isInputEmpty = () => {
    if (activeTab === "history" || activeTab === "settings" || activeTab === "standards") return true;
    if (activeTab === "text") return !textContent.trim();
    if (activeTab === "image") return !imageBase64;
    if (activeTab === "audio") return !audioBase64;
    if (activeTab === "pdf") return !pdfBase64;
    if (activeTab === "url") return !urlContent.trim();
    return true;
  };

  // Perform Fact Check
  const handleVerify = async () => {
    if (activeTab === "history" || activeTab === "settings" || activeTab === "standards") return;
    setError(null);

    let payload: {
      type: "text" | "image" | "audio" | "pdf" | "url";
      content: string;
      mimeType?: string;
      language: string;
    };

    if (activeTab === "text") {
      if (!textContent.trim()) {
        setError({ message: "Please paste or type the text you want to check." });
        return;
      }
      payload = {
        type: "text",
        content: textContent.trim(),
        language,
      };
    } else if (activeTab === "image") {
      if (!imageBase64) {
        setError({ message: "Please select or upload a screenshot to check." });
        return;
      }
      payload = {
        type: "image",
        content: imageBase64,
        mimeType: imageFile?.type || "image/jpeg",
        language,
      };
    } else if (activeTab === "audio") {
      if (!audioBase64) {
        setError({ message: "Please select or upload an audio voice note to check." });
        return;
      }
      payload = {
        type: "audio",
        content: audioBase64,
        mimeType: audioFile?.type || "audio/mp3",
        language,
      };
    } else if (activeTab === "pdf") {
      if (!pdfBase64) {
        setError({ message: "Please select or upload a PDF document (under 10MB)." });
        return;
      }
      payload = {
        type: "pdf",
        content: pdfBase64,
        mimeType: "application/pdf",
        language,
      };
    } else {
      if (!urlContent.trim()) {
        setError({ message: "Please enter a valid webpage URL to check." });
        return;
      }
      let finalUrl = urlContent.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }
      payload = {
        type: "url",
        content: finalUrl,
        language,
      };
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || "Failed to complete verification. Please try again.",
          retryable: data.retryable || res.status === 429,
        });
        return;
      }

      const verificationResult = data as VerificationResponse;
      const checkedAt = Date.now();
      setResult(verificationResult);
      setResultCheckedAt(checkedAt);
      const entry: HistoryEntry = {
        id: `${checkedAt}-${Math.random().toString(36).slice(2)}`,
        checkedAt,
        result: verificationResult,
      };
      const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
      setHistory(nextHistory);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch (historyError) {
        console.warn("Could not save local check history:", historyError);
      }
    } catch (err: any) {
      setError({
        message: "Network error. Please check your internet connection and try again.",
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEvidence = (claimId: number) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [claimId]: !prev[claimId],
    }));
  };

  const handleCopyReply = (claim: ClaimVerification) => {
    navigator.clipboard.writeText(claim.replyToSender);
    setCopiedClaimId(claim.id);
    setTimeout(() => setCopiedClaimId(null), 2500);
  };

  // Listen using browser speechSynthesis API
  const handleListen = (claimId: number, textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingClaimId === claimId) {
      window.speechSynthesis.cancel();
      setSpeakingClaimId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang =
      language === "hi" ? "hi-IN" :
      language === "mr" ? "mr-IN" :
      language === "ur" ? "ur-IN" :
      language === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingClaimId(null);
    utterance.onerror = () => setSpeakingClaimId(null);

    setSpeakingClaimId(claimId);
    window.speechSynthesis.speak(utterance);
  };

  // Download Share Card as image (1080x1350 for WhatsApp)
  const handleDownloadShareCard = async () => {
    if (!shareCardRef.current || !result) return;
    setIsDownloadingCard(true);

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 0.95,
        pixelRatio: 1,
        width: 1080,
        height: 1350,
      });

      const link = document.createElement("a");
      link.download = `sachprism-factcheck-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate share card image:", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsDownloadingCard(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current || !result || !qrCodeGenerated) return;
    setIsDownloadingCertificate(true);

    try {
      const dataUrl = await toPng(certificateRef.current, {
        quality: 0.95,
        pixelRatio: 1.5,
        width: 720,
        height: 900,
      });
      const link = document.createElement("a");
      link.download = `sachprism-certificate-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate verification certificate:", err);
      alert("Could not generate the certificate image. Please try again.");
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const allLiveVerified =
      result.claims.length > 0 && result.claims.every((claim) => claim.liveVerified);
    const noneLiveVerified =
      result.claims.length > 0 && result.claims.every((claim) => !claim.liveVerified);
    const verificationFooter = allLiveVerified
      ? "Checked using live web sources via SachPrism."
      : noneLiveVerified
      ? "Checked using SachPrism AI assessment (live source-checking was unavailable)."
      : result.claims.length === 0
      ? "No claims were available for source-checking via SachPrism."
      : "Checked using a mix of live web sources and AI assessment via SachPrism (see individual claims).";
    const summaryLines = [
      `🔍 *SachPrism Verification Summary*`,
      `Overall Verdict: *${result.overall}*`,
      "",
      ...result.claims.map((c, i) =>
        `${i + 1}. [${c.verdict}] ${c.claim}\n   • ${c.explanation}\n   • Action: ${c.whatToDo}`
      ),
      "",
      verificationFooter,
    ];

    navigator.clipboard.writeText(summaryLines.join("\n"));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleReset = () => {
    setResult(null);
    setResultCheckedAt(null);
    setError(null);
    setTextContent("");
    setUrlContent("");
    handleClearImage();
    handleClearAudio();
    handleClearPdf();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingClaimId(null);
  };

  const handleDeleteBrowserData = () => {
    if (!window.confirm("Delete saved check history, preferences, and current inputs from this browser? Curated trend examples are shared app data and will remain.")) {
      return;
    }

    skipNextPreferenceSaveRef.current = true;
    window.speechSynthesis?.cancel();
    setHistory([]);
    setHistoryQuery("");
    setHistoryVerdictFilter("ALL");
    setTextContent("");
    setUrlContent("");
    setResult(null);
    setResultCheckedAt(null);
    setError(null);
    handleClearImage();
    handleClearAudio();
    handleClearPdf();
    setLanguage("en");
    setReadAnswersAloud(false);
    setTextSize("medium");
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch (storageError) {
      console.warn("Could not completely remove browser-local data:", storageError);
    }
  };

  const navigateTo = (tab: InputTab) => {
    setActiveTab(tab);
    setResult(null);
    setResultCheckedAt(null);
    setError(null);
    setSidebarOpen(false);
  };

  // Helper for overall verdict styling
  const getOverallVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "Verified":
        return {
          bg: "bg-emerald-50 border-emerald-300 text-emerald-900",
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />,
          title: "Verified",
          description: "Authoritative sources confirm all key claims in this forward.",
        };
      case "Contains false claims":
        return {
          bg: "bg-rose-50 border-rose-300 text-rose-900",
          icon: <XCircle className="w-8 h-8 text-rose-600 shrink-0" />,
          title: "Contains False Claims",
          description: "One or more statements contradict verified facts and credible records.",
        };
      case "Cannot be confirmed":
        return {
          bg: "bg-slate-100 border-slate-300 text-slate-800",
          icon: <HelpCircle className="w-8 h-8 text-slate-600 shrink-0" />,
          title: "Cannot Be Confirmed",
          description: "No reliable public sources or official registries verify these statements.",
        };
      case "Partly true / mixed":
      default:
        return {
          bg: "bg-amber-50 border-amber-300 text-amber-900",
          icon: <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />,
          title: "Partly True / Mixed",
          description: "Contains some facts, but other claims are exaggerated, missing context, or outdated.",
        };
    }
  };

  // Helper for claim verdict badge
  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case "VERIFIED":
        return {
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          border: "border-emerald-200",
          indicator: "bg-emerald-500",
          label: "VERIFIED",
        };
      case "FALSE":
        return {
          badge: "bg-rose-100 text-rose-800 border-rose-300",
          border: "border-rose-200",
          indicator: "bg-rose-500",
          label: "FALSE",
        };
      case "OUTDATED":
        return {
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          border: "border-amber-200",
          indicator: "bg-amber-500",
          label: "OUTDATED",
        };
      case "PARTLY_TRUE":
        return {
          badge: "bg-orange-100 text-orange-800 border-orange-300",
          border: "border-orange-200",
          indicator: "bg-orange-500",
          label: "PARTLY TRUE",
        };
      case "UNVERIFIABLE":
      default:
        return {
          badge: "bg-slate-100 text-slate-700 border-slate-300",
          border: "border-slate-200",
          indicator: "bg-slate-400",
          label: "UNVERIFIABLE",
        };
    }
  };

  // Helper for manipulation tags
  const formatTag = (tag: string) => {
    const cleaned = tag.replace(/_/g, " ").toLowerCase();
    const tagMap: Record<string, { label: string; icon: string }> = {
      urgency: { label: "Urgency Pressure", icon: "⏳" },
      fake_authority: { label: "Fake Authority Claim", icon: "🏛️" },
      miracle_cure: { label: "Miracle Cure Claim", icon: "💊" },
      fear: { label: "Fear Mongering", icon: "⚠️" },
      forward_pressure: { label: "Forward Chain Pressure", icon: "🔄" },
    };
    return tagMap[tag] || { label: cleaned, icon: "🏷️" };
  };

  // Highlight wrong parts inside text
  const renderHighlightedText = (originalText: string, claims: ClaimVerification[]) => {
    const wrongParts = claims
      .map((c) => c.wrongPart)
      .filter((wp): wp is string => Boolean(wp && wp.trim() && originalText.includes(wp)));

    if (wrongParts.length === 0) {
      return <span>{originalText}</span>;
    }

    const escaped = wrongParts
      .map((wp) => wp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);

    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = originalText.split(regex);

    return (
      <span>
        {parts.map((part, index) => {
          const isWrong = wrongParts.some(
            (wp) => wp.toLowerCase() === part.toLowerCase()
          );
          if (isWrong) {
            return (
              <mark
                key={index}
                className="highlight-wrong"
                title="Identified inaccurate or outdated claim"
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  const renderNavigationButton = (
    tab: InputTab,
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => (
    <button
      key={tab}
      type="button"
      onClick={() => navigateTo(tab)}
      aria-current={activeTab === tab ? "page" : undefined}
      className={`sachprism-nav-item flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#173d45] ${activeTab === tab ? "is-active" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );

  const renderSidebarNavigation = () => (
    <nav aria-label="Main navigation" className="space-y-6">
      <div className="space-y-1">
        <p className="sachprism-sidebar-label px-3 text-[11px] font-bold uppercase tracking-wider">Check</p>
        {renderNavigationButton("text", "Text", FileText)}
        {renderNavigationButton("image", "Screenshot", ImageIcon)}
        {renderNavigationButton("audio", "Voice note", Mic)}
        {renderNavigationButton("pdf", "PDF", FileIcon)}
        {renderNavigationButton("url", "Link", Link2)}
      </div>
      <div className="space-y-1">
        <p className="sachprism-sidebar-label px-3 text-[11px] font-bold uppercase tracking-wider">History</p>
        {renderNavigationButton("history", "History", HistoryIcon)}
      </div>
      <div className="space-y-1">
        <p className="sachprism-sidebar-label px-3 text-[11px] font-bold uppercase tracking-wider">Discover</p>
        {renderNavigationButton("trending", "Trending near you", Bell)}
        {renderNavigationButton("learn", "Learn", GraduationCap)}
      </div>
      <div className="space-y-1">
        <p className="sachprism-sidebar-label px-3 text-[11px] font-bold uppercase tracking-wider">Settings</p>
        {renderNavigationButton("settings", "Settings", SettingsIcon)}
      </div>
      <div className="space-y-1">
        <p className="sachprism-sidebar-label px-3 text-[11px] font-bold uppercase tracking-wider">About</p>
        {renderNavigationButton("standards", "Verification standards", BookOpen)}
      </div>
    </nav>
  );

  const viewTitles: Record<InputTab, string> = {
    text: "Check a forward",
    image: "Check a screenshot",
    audio: "Check a voice note",
    pdf: "Check a PDF",
    url: "Check a link",
    history: "History",
    trending: "Trending near you",
    learn: "Learn",
    settings: "Settings",
    standards: "Verification standards",
  };

  const viewDescriptions: Record<InputTab, string> = {
    text: "Review a message before you pass it along.",
    image: "Read a claim from a screenshot or photo.",
    audio: "Transcribe a voice note and inspect its claims.",
    pdf: "Review claims in a document or circular.",
    url: "Check claims from a public webpage.",
    history: "Revisit checks saved in this browser.",
    trending: "Review common forward patterns from the cached myth list.",
    learn: "Build quick habits for checking claims and avoiding scams.",
    settings: "Choose how SachPrism presents your checks.",
    standards: "See what each verdict and score means.",
  };
  const isCheckView = ["text", "image", "audio", "pdf", "url"].includes(activeTab);
  const dailyTip = DAILY_TIPS[(Math.floor(Date.now() / 86400000) + 2) % DAILY_TIPS.length];
  const spotlightTrend = trendingItems.find((item) => item.verdict === "FALSE") || trendingItems[0];
  const trendingEntries = trendingItems.slice(0, 5);

  return (
    <div className="sachprism-app-shell min-h-screen text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sachprism-sidebar hidden w-64 shrink-0 flex-col border-r px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="flex items-center gap-3 px-2">
            <SachPrismMark />
            <div>
              <p className="text-base font-extrabold text-white">SachPrism</p>
              <p className="text-xs font-medium text-teal-100">See every side of a forward.</p>
            </div>
          </div>
          <div className="mt-8 flex-1 overflow-y-auto pb-4">{renderSidebarNavigation()}</div>
          <div className="sachprism-side-note rounded-lg p-3">
            <p className="text-xs font-bold text-white">A second look, before you forward.</p>
            <p className="mt-1 text-xs leading-relaxed text-teal-100">
              Check the source. Keep the context. Then decide.
            </p>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-slate-950/40"
            />
            <aside className="sachprism-sidebar relative z-10 flex h-full w-[min(18rem,86vw)] flex-col border-r px-4 py-5 shadow-xl">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SachPrismMark />
                  <div>
                    <p className="text-base font-extrabold text-white">SachPrism</p>
                    <p className="text-xs font-medium text-teal-100">See every side of a forward.</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setSidebarOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{renderSidebarNavigation()}</div>
              <div className="sachprism-side-note mt-5 rounded-lg p-3">
                <p className="text-xs font-bold text-white">A second look, before you forward.</p>
                <p className="mt-1 text-xs leading-relaxed text-teal-100">Check the source. Keep the context. Then decide.</p>
              </div>
            </aside>
          </div>
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <div className="sachprism-mobile-header flex items-center justify-between border-b px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-800 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-950">SachPrism</p>
              <p className="text-xs text-slate-600">{viewTitles[activeTab]}</p>
            </div>
          </div>

          <main
            dir={language === "ur" ? "rtl" : "ltr"}
            className="mx-auto w-full max-w-5xl flex-1 space-y-7 px-4 py-5 sm:px-6 sm:py-8"
          >
            {activeTab === "text" ? (
              <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
  <div className="flex min-w-0 items-center gap-4 sm:gap-5">
    <SachPrismMark className="h-16 w-16 shrink-0 rounded-2xl shadow-lg sm:h-20 sm:w-20" />
    <div className="min-w-0">
      <p className="sachprism-hero-kicker">SachPrism</p>
      <h1 className="sachprism-hero-title mt-1">See every side of a forward.</h1>
      <p className="sachprism-hero-sub">Paste, upload or share. Get verdicts with proof.</p>
    </div>
  </div>
  <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end" aria-label="Verdict categories">
    <span className="verdict-pill verdict-verified">Verified</span>
    <span className="verdict-pill verdict-false">False</span>
    <span className="verdict-pill verdict-outdated">Outdated</span>
    <span className="verdict-pill verdict-partly">Partly true</span>
    <span className="verdict-pill verdict-unverified">Unverified</span>
  </div>
</header>
            ) : (
              <header className="border-b border-slate-200 pb-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  {activeTab === "history"
                    ? "History"
                    : activeTab === "settings"
                    ? "Settings"
                    : activeTab === "standards"
                    ? "Guide"
                    : activeTab === "trending"
                    ? "Discover"
                    : activeTab === "learn"
                    ? "Learn"
                    : "Check"}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold text-slate-950">{viewTitles[activeTab]}</h1>
                <p className="mt-1 text-sm text-slate-700">{viewDescriptions[activeTab]}</p>
              </header>
            )}

        {/* Input Section */}
        {!result && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
            {/* Tabs (scrollable on mobile) */}
            <div aria-hidden="true" className="hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("text");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "text"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("image");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "image"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Screenshot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("audio");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "audio"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span>Voice note</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("pdf");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "pdf"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileIcon className="w-3.5 h-3.5 shrink-0" />
                <span>PDF file</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("url");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "url"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  setError(null);
                }}
                aria-current={activeTab === "history" ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 sm:shrink ${
                  activeTab === "history"
                    ? "bg-white text-indigo-800 shadow-sm"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                <span>History</span>
              </button>

            </div>

            {isCheckView ? (
              <>
            {/* Tab 1: Text */}
            {activeTab === "text" && (
              <div className="space-y-2">
                <label
                  htmlFor="text-input"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Forward Message or Post Text
                </label>
                <textarea
                  id="text-input"
                  rows={5}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste WhatsApp forward, tweet, or message here... (e.g. 'Government giving free laptops to all students via this link...')"
                  className="w-full text-sm text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Tab 2: Image */}
            {activeTab === "image" && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Upload Screenshot or Photo
                </label>

                {!imagePreview ? (
                  <label
                    htmlFor="image-upload"
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Tap to choose screenshot
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, or WEBP up to 8MB
                    </p>
                    <input
                      ref={imageInputRef}
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2">
                    <div className="max-h-60 overflow-hidden flex items-center justify-center rounded-lg bg-black/5">
                      <img
                        src={imagePreview}
                        alt="Screenshot preview"
                        className="object-contain max-h-60 w-auto rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                        {imageFile?.name || "Selected screenshot"}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Voice Note */}
            {activeTab === "audio" && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Upload WhatsApp / Telegram Audio Note
                </label>

                {!audioFile ? (
                  <label
                    htmlFor="audio-upload"
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition mb-3">
                      <Mic className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Tap to choose audio note
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      MP3, OGG, M4A, WAV, or WebM (up to 10MB)
                    </p>
                    <input
                      ref={audioInputRef}
                      id="audio-upload"
                      type="file"
                      accept="audio/mpeg,audio/ogg,audio/mp4,audio/wav,audio/webm,.mp3,.ogg,.m4a,.wav,.webm"
                      onChange={handleAudioSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {audioFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • Audio recording
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAudio}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                      >
                        Remove
                      </button>
                    </div>

                    {audioPreviewUrl && (
                      <audio
                        controls
                        src={audioPreviewUrl}
                        className="w-full h-10 rounded"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: PDF Document */}
            {activeTab === "pdf" && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Upload PDF Document / Circular
                </label>

                {!pdfFile ? (
                  <label
                    htmlFor="pdf-upload"
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition mb-3">
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Tap to choose PDF document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF up to 10MB. Longer documents: only the first ~20 pages are analyzed.
                    </p>
                    <input
                      ref={pdfInputRef}
                      id="pdf-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {pdfFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • PDF document
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearPdf}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: URL */}
            {activeTab === "url" && (
              <div className="space-y-2">
                <label
                  htmlFor="url-input"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Article or Post Web Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    id="url-input"
                    type="url"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    placeholder="https://example.com/news-story..."
                    className="w-full text-sm text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error.message}</p>
                  {error.retryable && (
                    <button
                      type="button"
                      onClick={handleVerify}
                      className="mt-2 text-xs font-bold text-rose-700 underline hover:text-rose-900 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Verification
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div>
              <button
                type="button"
                disabled={isInputEmpty() || isLoading}
                onClick={handleVerify}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Check now</span>
              </button>
            </div>

            {activeTab === "text" && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="text-sm font-bold text-slate-900">Try an example</h2>
                  <p className="text-xs text-slate-600">Prefills the text box; nothing is submitted.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_FORWARDS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setActiveTab("text");
                        setTextContent(sample.text);
                        setError(null);
                      }}
                      className="min-h-11 text-left p-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 transition-colors"
                    >
                      <span className="block text-xs font-bold text-indigo-800">{sample.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-700 line-clamp-2">{sample.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
              </>
            ) : activeTab === "trending" ? (
              <section aria-labelledby="trending-heading" className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="trending-heading" className="text-xl font-bold text-slate-950">Trending near you</h2>
                    <p className="mt-1 text-sm text-slate-700">Common forward patterns from the SachPrism cache.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-teal-800" /> India · curated sample
                  </span>
                </div>
                <p className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                  This is a curated sample, not a live location feed or measure of current message volume.
                </p>

                {trendingLoading ? (
                  <p role="status" className="rounded-lg bg-white px-4 py-7 text-center text-sm text-slate-700">Loading cached items…</p>
                ) : trendingError ? (
                  <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950">
                    <p>{trendingError}</p>
                    <button type="button" onClick={() => setTrendingLoaded(false)} className="mt-3 font-semibold underline">Try again</button>
                  </div>
                ) : trendingItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-700">No cached trend examples are available.</p>
                ) : (
                  <>
                    {spotlightTrend && (
                      <article className="rounded-xl border border-rose-300 bg-rose-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-800">
                            <CircleAlert className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-rose-900">Forward alert · cached example</p>
                            <p className="mt-1 text-sm font-bold leading-relaxed text-rose-950">{spotlightTrend.claim}</p>
                            <p className="mt-1 text-sm leading-relaxed text-rose-950">{spotlightTrend.explanation}</p>
                            <span className="mt-3 inline-flex rounded-full border border-rose-400 bg-white px-2.5 py-1 text-xs font-bold text-rose-900">{spotlightTrend.verdict}</span>
                          </div>
                        </div>
                      </article>
                    )}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-950">Commonly forwarded</h3>
                      {trendingEntries.map((item) => {
                        const verdictStyle = getVerdictStyle(item.verdict);
                        return (
                          <article key={item.claim} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h4 className="min-w-0 break-words text-sm font-semibold text-slate-950">{item.claim}</h4>
                            <span className={`row-span-2 self-start rounded-full border px-2.5 py-1 text-[11px] font-bold ${verdictStyle.badge}`}>{verdictStyle.label}</span>
                            <p className="text-xs leading-relaxed text-slate-700">{item.explanation}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setTextContent(item.claim);
                                navigateTo("text");
                              }}
                              className="col-span-2 inline-flex min-h-10 items-center gap-1.5 justify-self-start rounded-md text-xs font-bold text-teal-800 hover:text-teal-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                            >
                              Check this claim <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            ) : activeTab === "learn" ? (
              <section aria-labelledby="learn-heading" className="space-y-6">
                <div>
                  <h2 id="learn-heading" className="text-xl font-bold text-slate-950">Learn to check a forward</h2>
                  <p className="mt-1 text-sm text-slate-700">Small habits that help you pause, verify, and share responsibly.</p>
                </div>

                <article className="rounded-xl border border-sky-300 bg-sky-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-900">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">Tip of the day</p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-sky-950">{dailyTip}</p>
                    </div>
                  </div>
                </article>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-950">Mini quiz</h3>
                  {LEARN_QUIZ.map((question, questionIndex) => {
                    const selectedAnswer = learnAnswers[questionIndex];
                    return (
                      <article key={question.question} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                        <p className="text-sm font-bold text-slate-950">{questionIndex + 1}. {question.question}</p>
                        <div role="group" aria-label={`Question ${questionIndex + 1} answers`} className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const answered = selectedAnswer !== undefined;
                            const isCorrect = optionIndex === question.correctIndex;
                            const isSelected = optionIndex === selectedAnswer;
                            const answerStyle = !answered
                              ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                              : isCorrect
                              ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                              : isSelected
                              ? "border-rose-400 bg-rose-50 text-rose-950"
                              : "border-slate-200 bg-slate-50 text-slate-700";
                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={answered}
                                aria-pressed={isSelected}
                                onClick={() => setLearnAnswers((previous) => ({ ...previous, [questionIndex]: optionIndex }))}
                                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${answerStyle}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {selectedAnswer !== undefined && (
                          <p role="status" className={`mt-3 text-sm leading-relaxed ${selectedAnswer === question.correctIndex ? "text-emerald-900" : "text-rose-900"}`}>
                            {selectedAnswer === question.correctIndex ? "Correct. " : "Not quite. "}{question.explanation}
                          </p>
                        )}
                      </article>
                    );
                  })}
                  {Object.keys(learnAnswers).length > 0 && (
                    <button type="button" onClick={() => setLearnAnswers({})} className="min-h-10 rounded-md px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
                      Try the quiz again
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-950">How we checked this</h3>
                  <details className="group rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950">
                      Spot a fake screenshot <ChevronDown className="h-4 w-4 shrink-0 text-teal-800 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">Search for the exact headline on the named organization’s official site. Check the URL, date, and whether the same notice appears in a trusted source.</p>
                  </details>
                  <details className="group rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950">
                      Old news, new date <ChevronDown className="h-4 w-4 shrink-0 text-teal-800 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">Look for the original publication date and compare it with the date in the forward. A genuine old story can be recirculated with a misleading new caption.</p>
                  </details>
                </div>
              </section>
            ) : activeTab === "history" ? (
              <section aria-labelledby="history-heading" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="history-heading" className="text-lg font-bold text-slate-950">Check history</h2>
                    <p className="mt-1 text-sm text-slate-700">Stored only in this browser.</p>
                  </div>
                  <button
                    type="button"
                    disabled={history.length === 0}
                    onClick={() => {
                      if (!window.confirm("Clear all saved check history from this browser?")) return;
                      setHistory([]);
                      try {
                        window.localStorage.removeItem(HISTORY_STORAGE_KEY);
                      } catch (historyError) {
                        console.warn("Could not clear local check history:", historyError);
                      }
                    }}
                    className="min-h-11 px-3 py-2 rounded-lg border border-rose-300 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
                  >
                    Clear history
                  </button>
                </div>
                <label className="block">
                  <span className="sr-only">Search history by claim text or verdict</span>
                  <input
                    type="search"
                    value={historyQuery}
                    onChange={(event) => setHistoryQuery(event.target.value)}
                    placeholder="Filter by claim text or verdict"
                    className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700/20"
                  />
                </label>
                <div role="group" aria-label="Filter history by verdict" className="flex gap-2 overflow-x-auto pb-1">
                  {([
                    ["ALL", "All"],
                    ["VERIFIED", "True"],
                    ["FALSE", "False"],
                    ["PARTLY_TRUE", "Partly true"],
                    ["UNVERIFIABLE", "Unverified"],
                    ["OUTDATED", "Outdated"],
                  ] as const).map(([filter, label]) => {
                    const count = history.reduce((total, entry) => {
                      const includesFilter =
                        filter === "ALL" ||
                        entry.result.claims.some((claim) => claim.verdict === filter) ||
                        (filter === "UNVERIFIABLE" &&
                          entry.result.claims.length === 0 &&
                          entry.result.overall === "Cannot be confirmed");
                      return total + (includesFilter ? 1 : 0);
                    }, 0);

                    return (
                      <button
                        key={filter}
                        type="button"
                        aria-pressed={historyVerdictFilter === filter}
                        onClick={() => setHistoryVerdictFilter(filter)}
                        className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${
                          historyVerdictFilter === filter
                            ? "border-indigo-800 bg-indigo-800 text-white"
                            : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {label} <span className="ml-1 opacity-80">{count}</span>
                      </button>
                    );
                  })}
                </div>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-700">
                    No checks yet — your verified forwards will appear here.
                  </div>
                ) : (() => {
                  const query = historyQuery.trim().toLowerCase();
                  const filteredHistory = history.filter((entry) => {
                    const searchableText = [
                      entry.result.overall,
                      ...entry.result.claims.map((claim) => `${claim.verdict} ${claim.claim}`),
                    ].join(" ").toLowerCase();
                    const matchesVerdict =
                      historyVerdictFilter === "ALL" ||
                      entry.result.claims.some((claim) => claim.verdict === historyVerdictFilter) ||
                      (historyVerdictFilter === "UNVERIFIABLE" &&
                        entry.result.claims.length === 0 &&
                        entry.result.overall === "Cannot be confirmed");
                    return matchesVerdict && searchableText.includes(query);
                  });

                  return filteredHistory.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-700">
                      No checks match that filter.
                    </p>
                  ) : (
                    <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                      {filteredHistory.map((entry) => {
                        const score = entry.result.riskScore ?? 0;
                        const overall = entry.result.overall;
                        const verdictColor = overall.toLowerCase().includes("false")
                          ? "bg-rose-100 text-rose-900 border-rose-300"
                          : overall === "Verified"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-amber-100 text-amber-900 border-amber-300";
                        const excerpt = entry.result.claims[0]?.claim || "No claims extracted";

                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setResult(entry.result);
                                setResultCheckedAt(entry.checkedAt);
                                setActiveTab("history");
                                setError(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 p-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-700"
                            >
                              <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{excerpt}</span>
                              <span className={`row-span-2 self-start rounded-full border px-2 py-1 text-[11px] font-bold ${verdictColor}`}>
                                {overall}
                              </span>
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
                                <span>Risk {score}/100</span>
                                <time dateTime={new Date(entry.checkedAt).toISOString()}>{formatTimeAgo(entry.checkedAt)}</time>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  );
                })()}
              </section>
            ) : activeTab === "settings" ? (
              <section aria-labelledby="settings-heading" className="space-y-7">
                <div>
                  <h2 id="settings-heading" className="text-lg font-bold text-slate-950">Response language</h2>
                  <p className="mt-1 text-sm text-slate-700">New checks ask Gemini to write explanations in your selected language.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {([
                    ["en", "English", "Clear explanations in English."],
                    ["hi", "हिंदी", "हिंदी में जवाब और वाचन।"],
                    ["hinglish", "Hinglish", "Conversational Hindi and English."],
                    ["mr", "मराठी", "मराठीत स्पष्टीकरण आणि वाचन."],
                    ["ur", "اردو", "اردو میں جواب اور مطالعہ۔"],
                    ["ta", "தமிழ்", "தமிழில் பதில்களும் வாசிப்பும்."],
                  ] as const).map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={language === value}
                      onClick={() => setLanguage(value)}
                      className={`min-h-14 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${
                        language === value
                          ? "border-indigo-700 bg-indigo-50 text-indigo-950"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="mt-1 block text-xs text-slate-700">{description}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">Read answers aloud</h3>
                    <p className="mt-1 text-sm text-slate-700">Automatically speak each new result using your selected language.</p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={readAnswersAloud}
                      onChange={(event) => setReadAnswersAloud(event.target.checked)}
                      aria-label="Read answers aloud"
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-400 transition-colors peer-checked:bg-indigo-800 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-700 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold text-slate-950">Text size</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["small", "Small", "A"],
                      ["medium", "Medium", "A"],
                      ["large", "Large", "A"],
                    ] as const).map(([value, label, sample]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={textSize === value}
                        onClick={() => setTextSize(value)}
                        className={`min-h-14 rounded-lg border px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${
                          textSize === value
                            ? "border-indigo-800 bg-indigo-50 text-indigo-950"
                            : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`${value === "small" ? "text-xs" : value === "large" ? "text-xl" : "text-base"}`}>{sample}</span>
                        <span className="ml-2 text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-950">History storage</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    Your last 50 full check results are stored in this browser. Use History to review or clear them.
                  </p>
                </div>

                <section aria-labelledby="scam-alerts-heading" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                    <div>
                      <h3 id="scam-alerts-heading" className="text-sm font-bold text-amber-950">Scam alerts</h3>
                      <p className="mt-1 text-sm leading-relaxed text-amber-950">Pause before acting on urgent money, identity, or account warnings. Never share an OTP, UPI PIN, CVV, or screen-share access with a caller or forwarded link.</p>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-8 text-sm text-amber-950">
                    <li>Verify bank, courier, and government notices in their official app or website.</li>
                    <li>A UPI PIN authorizes a payment; entering it does not receive money.</li>
                    <li>Do not install remote-access apps at the request of an unknown caller.</li>
                  </ul>
                </section>

                <section aria-labelledby="whatsapp-bot-heading" className="rounded-xl border border-slate-300 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 id="whatsapp-bot-heading" className="text-sm font-bold text-slate-950">WhatsApp bot</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">No WhatsApp bot is connected to this app yet. A real connection needs a WhatsApp Business Platform number, verified webhook, and server-side credentials.</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">Not connected</span>
                  </div>
                </section>

                <section aria-labelledby="delete-data-heading" className="rounded-xl border border-rose-300 bg-rose-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 id="delete-data-heading" className="text-sm font-bold text-rose-950">Delete my data</h3>
                      <p className="mt-1 text-sm text-rose-950">Remove local history, preferences, and current inputs from this browser.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteBrowserData}
                      className="min-h-11 rounded-lg border border-rose-500 bg-white px-4 py-2 text-sm font-bold text-rose-900 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2"
                    >
                      Delete browser data
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-rose-900">This cannot erase shared, pre-seeded myth examples or server cache entries; no personal account data is stored by this app.</p>
                </section>
              </section>
            ) : (
              <section aria-labelledby="standards-heading" className="space-y-5">
                <div>
                  <h2 id="standards-heading" className="text-lg font-bold text-slate-950">How to read a check</h2>
                  <p className="mt-1 text-sm text-slate-700">SachPrism separates what its evidence can support from what still needs a human decision.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <article className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                    <h3 className="text-sm font-bold text-emerald-950">Source-verified</h3>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-950">Live web search returned source material. Open the citations and judge whether they support the claim.</p>
                  </article>
                  <article className="rounded-lg border border-slate-300 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-950">AI assessment</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">Live source-checking was unavailable. This is a cautious model assessment, not a verified finding.</p>
                  </article>
                </div>
                <article className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-950">Risk score</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    The score is a triage signal, not a probability: false claims add 30, partly true claims add 15, detected tactics add up to 40, and verified claims subtract 10. The final score is clamped from 0 to 100.
                  </p>
                </article>
                <p className="text-xs leading-relaxed text-slate-700">Check important claims against primary sources. A verdict or score is not a substitute for medical, legal, or financial advice.</p>
              </section>
            )}
          </section>
        )}

        {!result && !isLoading && isCheckView && (
          <section aria-labelledby="how-it-works-heading" className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 id="how-it-works-heading" className="text-sm font-bold text-slate-900 whitespace-nowrap">
                How it works
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ["01", "Add a forward", "Paste text or choose a screenshot, voice note, PDF, or link."],
                ["02", "Find the claims", "SachPrism separates checkable facts from opinion and context."],
                ["03", "Review the evidence", "See each assessment, confidence, and available sources."],
              ].map(([step, title, description]) => (
                <li key={step} className="flex sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-lg border border-slate-200 bg-white">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-900">
                    {step}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Loading State with 4 Animated Steps */}
        {isLoading && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6 animate-loading-enter">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-800 animate-step-pulse mb-2">
                <Sparkles className="w-6 h-6 animate-loading-mark" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Examining claims against verified sources
              </h2>
              <p aria-live="polite" className="text-xs sm:text-sm font-medium text-indigo-800 min-h-5">
                {verifyingProgressText ||
                  (activeTab === "audio"
                    ? "Transcribing voice note & checking facts with Google Search..."
                    : activeTab === "pdf"
                    ? "Reading PDF pages & checking claims with live web search..."
                    : "Examining claims against official databases & live search...")}
              </p>
            </div>

            {/* Step progress list */}
            <div className="space-y-3 max-w-md mx-auto pt-2">
              {LOADING_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const stepDesc =
                  isCurrent && idx === 2 && verifyingProgressText.startsWith("Checking claim")
                    ? verifyingProgressText
                    : isCurrent && idx === 3 && verifyingProgressText.startsWith("Synthesizing")
                    ? verifyingProgressText
                    : step.desc;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-indigo-50/60 border-indigo-200"
                        : isCompleted
                        ? "bg-slate-50/80 border-slate-200 text-slate-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-indigo-700 text-white animate-pulse"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <div>
                      <h3
                        className={`text-xs sm:text-sm font-semibold ${
                          isCurrent ? "text-indigo-950 font-bold" : "text-slate-800"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-xs ${
                          isCurrent && (idx === 2 || idx === 3)
                            ? "text-indigo-700 font-medium animate-pulse"
                            : "text-slate-500"
                        }`}
                      >
                        {stepDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Results View */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Overall Verdict Card */}
            {(() => {
              const badge = getOverallVerdictBadge(result.overall);
              const riskScore = Math.max(0, Math.min(100, result.riskScore ?? 0));
              const riskLevel =
                result.riskLevel ||
                (riskScore <= 30
                  ? "Low risk"
                  : riskScore <= 60
                  ? "Moderate risk"
                  : "High risk — likely to mislead");
              const riskColor =
                riskScore <= 30 ? "#15803d" : riskScore <= 60 ? "#b45309" : "#b91c1c";
              return (
                <div
                  className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${badge.bg}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      {badge.icon}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 border border-slate-300">
                            Overall Assessment
                          </span>
                          <span className="text-xs text-slate-600 font-medium">
                            Language: {result.detectedLanguage.toUpperCase()}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black mt-1">
                          {badge.title}
                        </h2>
                        <p className="text-xs sm:text-sm mt-0.5 opacity-90 max-w-xl">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-xs flex items-center gap-1.5"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy summary</span>
                          </>
                        )}
                      </button>

                      {/* Download as image (WhatsApp card 1080x1350) */}
                      <button
                        type="button"
                        onClick={handleDownloadShareCard}
                        disabled={isDownloadingCard}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        title="Download 1080x1350 shareable image for WhatsApp"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isDownloadingCard ? "Generating..." : "Download card"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCertificate}
                        disabled={!qrCodeGenerated || isDownloadingCertificate}
                        title={
                          qrCodeLibraryFailed
                            ? "The QR code library could not be loaded"
                            : "Download a QR-encoded proof of check"
                        }
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-indigo-300 text-indigo-900 hover:bg-indigo-50 transition shadow-xs flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-60"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-800" />
                        <span>
                          {isDownloadingCertificate
                            ? "Generating certificate..."
                            : qrCodeLibraryFailed
                            ? "Certificate unavailable"
                            : "Generate verification certificate"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check another</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-3 sm:p-4">
                    <div
                      role="meter"
                      aria-label="Risk score"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={riskScore}
                      aria-valuetext={`${riskScore} out of 100, ${riskLevel}`}
                      className="grid h-20 w-20 shrink-0 place-items-center rounded-full p-1.5"
                      style={{
                        background: `conic-gradient(${riskColor} 0 ${riskScore}%, #e2e8f0 ${riskScore}% 100%)`,
                      }}
                    >
                      <div className="grid h-full w-full place-content-center rounded-full bg-white text-center">
                        <span className="text-2xl font-black leading-none text-slate-950">{riskScore}</span>
                        <span className="mt-0.5 text-[10px] font-bold uppercase text-slate-700">of 100</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Forward risk</p>
                      <p className="mt-1 text-base font-bold" style={{ color: riskColor }}>{riskLevel}</p>
                      <p className="mt-0.5 text-xs text-slate-700">Based on claim verdicts and detected tactics.</p>
                    </div>
                  </div>

                  {/* Manipulation Tags Chips */}
                  {result.manipulationTags && result.manipulationTags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600 mr-1">
                          Emotional Tactics Detected:
                        </span>
                        {result.manipulationTags.map((tag, idx) => {
                          const formatted = formatTag(tag);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/80 border border-slate-300 text-slate-700 shadow-2xs"
                            >
                              <span>{formatted.icon}</span>
                              <span>{formatted.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Audio Transcript Card (when audio was uploaded) */}
            {result.transcript && (
              <div className="bg-white rounded-2xl border border-indigo-200 p-4 sm:p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-600" />
                    Transcribed Voice Note
                  </h3>
                  <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Auto-transcribed with Gemini
                  </span>
                </div>
                <div className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 italic">
                  &ldquo;{renderHighlightedText(result.transcript, result.claims)}&rdquo;
                </div>
              </div>
            )}

            {/* Original Text with Highlighted Wrong Part (when text was input) */}
            {activeTab === "text" && textContent.trim() && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Original Forward with Inaccuracies Highlighted
                  </h3>
                  <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Red dashed = Disputed/False phrase
                  </span>
                </div>
                <div className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {renderHighlightedText(textContent, result.claims)}
                </div>
              </div>
            )}

            {/* Claims Breakdown List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Detailed Claim Verification ({result.claims.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Grounded with Google Search
                </span>
              </div>

              {result.claims.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-600 text-sm">
                  No check-worthy factual claims could be extracted from this message.
                </div>
              ) : (
                result.claims.map((claim) => {
                  const style = getVerdictStyle(claim.verdict);
                  const isExpanded = Boolean(expandedEvidence[claim.id]);
                  const confidencePct = Math.round(claim.confidence * 100);
                  const isSpeaking = speakingClaimId === claim.id;
                  const timesChecked = claim.timesChecked ?? 0;

                  return (
                    <article
                      key={claim.id}
                      className={`bg-white rounded-2xl border ${style.border} shadow-xs p-5 sm:p-6 space-y-4 transition-all`}
                    >
                      {/* Claim Header & Verdict Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${style.badge}`}
                            >
                              {style.label}
                            </span>
                            {claim.liveVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Source-verified</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300"
                                title="Assessed using Gemini general knowledge when live search is unavailable"
                              >
                                <Sparkles className="w-3 h-3 text-slate-500" />
                                <span>AI assessment</span>
                              </span>
                            )}
                            {claim.category && (
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                                #{claim.category}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 pt-1 leading-snug">
                            &ldquo;{claim.claim}&rdquo;
                          </h4>
                        </div>

                        {/* Confidence Meter */}
                        <div className="sm:text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                            Confidence
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${style.indicator}`}
                                style={{ width: `${confidencePct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              {confidencePct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700 leading-relaxed font-normal">
                          {claim.explanation}
                        </p>
                        {claim.tactic?.label && claim.tactic.explanation && (
                          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                            <span className="font-bold">{claim.tactic.label}:</span>{" "}
                            {claim.tactic.explanation}
                          </div>
                        )}
                        {claim.wrongPart && (
                          <p className="text-xs text-rose-700 font-medium">
                            <span className="font-bold">Inaccurate part:</span>{" "}
                            &ldquo;{claim.wrongPart}&rdquo;
                          </p>
                        )}
                        {timesChecked > 1 && (
                          <p className="text-xs text-slate-700">
                            Checked {timesChecked} times
                            {timesChecked > 3 && (
                              <span className="ml-2 font-semibold text-amber-900">This forward is spreading</span>
                            )}
                          </p>
                        )}
                        {claim.relatedClaims && claim.relatedClaims.length > 0 && (
                          <aside className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
                            <p className="text-xs font-semibold">
                              This looks similar to a claim we&apos;ve already checked
                            </p>
                            <ul className="space-y-1.5">
                              {claim.relatedClaims.map((relatedClaim) => {
                                const relatedHistoryEntry = history.find((entry) =>
                                  entry.result.claims.some(
                                    (previousClaim) =>
                                      normalizeHistoryClaim(previousClaim.claim) ===
                                      normalizeHistoryClaim(relatedClaim.claim)
                                  )
                                );

                                return (
                                  <li key={`${relatedClaim.claim}-${relatedClaim.verdict}`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setError(null);
                                        if (relatedHistoryEntry) {
                                          setResult(relatedHistoryEntry.result);
                                          setResultCheckedAt(relatedHistoryEntry.checkedAt);
                                          setActiveTab("history");
                                          window.scrollTo({ top: 0, behavior: "smooth" });
                                        } else {
                                          setResult(null);
                                          setActiveTab("history");
                                          setHistoryQuery(relatedClaim.claim);
                                        }
                                      }}
                                      className="w-full rounded-md px-2 py-1.5 text-left hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
                                    >
                                      <span className="block break-words text-xs font-medium">{relatedClaim.claim}</span>
                                      <span className="mt-1 block text-[11px] text-amber-900">
                                        {relatedClaim.verdict} · {Math.round(relatedClaim.similarity * 100)}% similar
                                        <span className="ml-2 font-semibold text-indigo-800 underline">
                                          {relatedHistoryEntry ? "View earlier result" : "Find in history"}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </aside>
                        )}
                      </div>

                      {/* What to do Card */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                          <span className="font-bold text-slate-900">
                            What to do:
                          </span>{" "}
                          {claim.whatToDo}
                        </div>
                      </div>

                      {/* Actions: Expand Sources, Listen button & Copy Reply */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        {/* Expand Evidence Button */}
                        <div>
                          {claim.sources && claim.sources.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleEvidence(claim.id)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1"
                            >
                              <span>
                                {isExpanded ? "Hide" : "Show"} Evidence & Sources (
                                {claim.sources.length})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No web citations available (unverified)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          {/* Listen Button (SpeechSynthesis API) */}
                          <button
                            type="button"
                            onClick={() =>
                              handleListen(
                                claim.id,
                                `${claim.claim}. ${claim.explanation}. Action: ${claim.whatToDo}`
                              )
                            }
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                              isSpeaking
                                ? "bg-indigo-600 text-white shadow-xs animate-pulse"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                            }`}
                            title="Listen to this explanation (speech synthesis)"
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          {/* Copy Reply to Sender Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyReply(claim)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 transition flex items-center gap-1.5"
                          >
                            {copiedClaimId === claim.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">
                                  Reply copied!
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy reply to sender</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Evidence Sources List */}
                      {isExpanded && claim.sources && claim.sources.length > 0 && (
                        <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Verified Web Evidence
                          </h5>
                          <ul className="space-y-1.5">
                            {claim.sources.map((source, sIdx) => (
                              <li key={sIdx} className="text-xs">
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium break-all"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span>{source.title || source.url}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Offscreen WhatsApp Share Card (1080x1350 px, 4:5 ratio) */}
      {result && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={shareCardRef}
            style={{ width: "1080px", height: "1350px" }}
            className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-16 flex flex-col justify-between font-sans select-none"
          >
            {/* Share Card Header */}
            <div>
              <div className="flex items-center justify-between border-b border-white/20 pb-8">
                <div className="flex items-center gap-4">
                  <SachPrismMark className="h-16 w-16 rounded-2xl shadow-lg" />
                  <div>
                    <h2 className="text-4xl font-extrabold tracking-tight">SachPrism</h2>
                    <p className="text-lg text-indigo-200 font-medium">Don&apos;t just forward. Verify.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm uppercase tracking-widest text-slate-400 font-semibold">
                    Fact-Check Verification
                  </span>
                  <p className="text-base text-slate-300">
                    {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
              </div>

              {/* Big Overall Verdict Block */}
              <div className="mt-10 p-10 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md">
                <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-2">
                  VERDICT SUMMARY
                </div>
                <h1
                  className={`inline-flex max-w-full items-center rounded-full border px-5 py-3 mt-4 mb-4 text-4xl font-black tracking-tight ${getOverallVerdictBadge(result.overall).bg}`}
                >
                  {result.overall}
                </h1>
                <p className="text-2xl text-slate-200 font-normal leading-relaxed">
                  {getOverallVerdictBadge(result.overall).description}
                </p>

                {/* Emotional / Pressure Tactics */}
                {result.manipulationTags && result.manipulationTags.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/15 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-slate-300">
                      Tactics Detected:
                    </span>
                    {result.manipulationTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-white/15 border border-white/20 text-white"
                      >
                        {formatTag(tag).icon} {formatTag(tag).label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Claims Highlight */}
            <div className="space-y-6">
              <div className="text-sm uppercase tracking-widest text-slate-400 font-bold border-b border-white/15 pb-2">
                Key Findings ({result.claims.length} claims verified)
              </div>
              <div className="space-y-4">
                {result.claims.slice(0, 3).map((claim, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-100">
                        Claim {idx + 1}: &ldquo;{claim.claim}&rdquo;
                      </span>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full uppercase ${
                          claim.verdict === "VERIFIED"
                            ? "bg-emerald-500 text-white"
                            : claim.verdict === "FALSE"
                            ? "bg-rose-500 text-white"
                            : claim.verdict === "OUTDATED"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-600 text-white"
                        }`}
                      >
                        {claim.verdict}
                      </span>
                    </div>
                    <p className="text-base text-slate-300 leading-snug">
                      {claim.explanation}
                    </p>
                    <p className="text-sm text-indigo-300 font-medium">
                      💡 Action: {claim.whatToDo}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Card Footer */}
            <div className="border-t border-white/20 pt-8 flex items-center justify-between text-slate-400 text-base">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Grounded with Google Search • Reviewed by SachPrism</span>
              </div>
              <span className="text-slate-300 font-semibold">
                Stop the spread. Verify before forwarding.
              </span>
            </div>
          </div>
        </div>
      )}

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
        strategy="afterInteractive"
        onReady={() => {
          const isLoaded = typeof window.QRCode === "function";
          setQrCodeLibraryReady(isLoaded);
          setQrCodeLibraryFailed(!isLoaded);
        }}
        onError={() => setQrCodeLibraryFailed(true)}
      />

      {result && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={certificateRef}
            style={{ width: "720px", height: "900px" }}
            className="flex flex-col justify-between bg-white p-12 font-sans text-slate-950"
          >
            <div>
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                  <SachPrismMark className="h-14 w-14 rounded-xl" />
                  <div>
                    <p className="text-2xl font-black">SachPrism</p>
                    <p className="text-sm font-medium text-slate-700">Proof of check</p>
                  </div>
                </div>
                <p className="text-right text-sm font-semibold text-slate-700">
                  {new Date(resultCheckedAt ?? Date.now()).toLocaleDateString("en-IN", {
                    dateStyle: "long",
                  })}
                </p>
              </div>

              <div className="mt-10">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Claim excerpt</p>
                <p className="mt-3 text-2xl font-semibold leading-snug text-slate-950">
                  {result.claims[0]?.claim || "No claim text was available."}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <span className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-950">
                  {result.claims[0]?.verdict || result.overall}
                </span>
                <span className="text-sm font-semibold text-slate-700">{result.overall}</span>
              </div>

              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Risk score</p>
                <p className="mt-1 text-4xl font-black text-slate-950">
                  {result.riskScore}<span className="ml-1 text-lg font-bold text-slate-600">/100</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{result.riskLevel}</p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6 border-t-2 border-slate-200 pt-6">
              <div>
                <p className="text-sm font-bold text-slate-900">Scan for the text summary</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-700">
                  This QR contains the claim verdicts, overall verdict, risk score, and date checked.
                </p>
                <p className="mt-5 text-sm font-semibold text-slate-800">Don&apos;t just forward. Verify.</p>
              </div>
              <div
                ref={certificateQrRef}
                aria-label="QR code containing the verification summary"
                className="grid h-[210px] w-[210px] shrink-0 place-items-center rounded-lg border border-slate-300 bg-white p-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
        <p className="text-sm font-semibold text-slate-800">
          AI can make mistakes. Always verify important decisions.
        </p>
        <p>
          SachPrism is designed to curb misinformation in messaging forwards
          without panic.
        </p>
        <p>
          Always verify critical medical, financial, and legal advisories
          directly with authorized government portals.
        </p>
      </footer>
        </div>
      </div>
    </div>
  );
}
