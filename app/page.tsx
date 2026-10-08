"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  RefreshCw,
  Search,
  Sparkles,
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
  Languages,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  CachedTrendItem,
  Verdict,
  ClaimVerification,
  VerificationResponse,
  SakhiCheckPayload,
} from "@/lib/types";
import VastavLogo from "@/components/VastavLogo";
import AnimatedBackground from "@/components/AnimatedBackground";
import SakhiWidget from "@/components/sakhi/SakhiWidget";

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

// Storage keys with legacy migration
const HISTORY_STORAGE_KEY = "vastav-check-history";
const PREFERENCES_STORAGE_KEY = "vastav-preferences";
const LEGACY_HISTORY_KEY = "truthlens-check-history";
const LEGACY_PREFS_KEY = "truthlens-preferences";
const HISTORY_LIMIT = 50;

const LOADING_STEPS = [
  { id: 1, title: "Reading input", desc: "Parsing text, audio, or document structure" },
  { id: 2, title: "Finding claims", desc: "Extracting atomic factual statements" },
  { id: 3, title: "Checking sources", desc: "Searching official registries & authoritative databases" },
  { id: 4, title: "Writing explanation", desc: "Synthesizing clear, simple fact-checking findings" },
];

const SAMPLE_FORWARDS = [
  {
    label: "Government scheme",
    text: "Govt announces free ₹5000 to every woman from 1 Oct. Forward to 10 groups to register.",
  },
  {
    label: "Health advice",
    text: "Drinking warm boiled water every 15 minutes completely kills viruses in the throat.",
  },
  {
    label: "Science fact",
    text: "The Earth completes one full orbit around the Sun in approximately 365.25 days.",
  },
];

const DAILY_TIPS = [
  "Urgent phrases like ‘forward to 10 people now’ are a warning sign. Pause before sharing.",
  "A screenshot can be edited easily. Look for the original announcement on an official site.",
  "A UPI PIN authorizes an outgoing payment. Never enter it to receive money.",
  "Check the date and primary source before trusting a dramatic headline.",
];

const LEARN_QUIZ = [
  {
    question: "Which is strongest as a source for a government scheme announcement?",
    options: ["A friend's voice note", "The official ministry portal (.gov.in)", "An unknown shortened link"],
    correctIndex: 1,
    explanation: "An official ministry portal is a primary source. Still check its exact date and official circular.",
  },
  {
    question: "A message says you must forward it immediately to avoid losing a benefit. What should you do?",
    options: ["Forward it quickly", "Pause and verify through an official channel", "Share it in more groups"],
    correctIndex: 1,
    explanation: "Artificial pressure or urgency is the single most common manipulation tactic.",
  },
  {
    question: "Someone asks for your UPI PIN to send money to your account. Is that safe?",
    options: ["Yes, to receive the transfer", "Only if they sound official", "No, entering a UPI PIN only pays out"],
    correctIndex: 2,
    explanation: "Never enter or share your UPI PIN or OTP. Receiving money NEVER requires entering your PIN.",
  },
];

const LANGUAGE_LABELS: Record<LanguageOption, string> = {
  en: "English",
  hi: "हिन्दी",
  hinglish: "Hinglish",
  mr: "मराठी",
  ur: "اردو",
  ta: "தமிழ்",
};

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
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function RiskGauge({
  score,
  level,
  reduceMotion,
}: {
  score: number;
  level: string;
  reduceMotion: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const [displayScore, setDisplayScore] = useState(reduceMotion ? clamped : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayScore(clamped);
      return;
    }
    setDisplayScore(0);
    let frame = 0;
    const start = performance.now();
    const duration = 880;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(clamped * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clamped, reduceMotion]);

  const gaugeColor =
    clamped <= 30
      ? "#2FD08F"
      : clamped <= 60
      ? "#FFC83D"
      : "#FF5C6C";

  return (
    <div className="vastav-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <div
        role="meter"
        aria-label="Risk score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full sm:mx-0"
        style={{
          background: `conic-gradient(${gaugeColor} 0% ${displayScore}%, #E8EEFF ${displayScore}% 100%)`,
        }}
      >
        <div className="flex h-[4.75rem] w-[4.75rem] flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="font-heading text-2xl font-black text-ink">{displayScore}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-mut">/ 100</span>
        </div>
      </div>
      <div className="text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <p className="text-xs font-bold uppercase tracking-wider text-mut">Risk level</p>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: `${gaugeColor}22`,
              color: gaugeColor === "#2FD08F" ? "#095a36" : gaugeColor === "#FFC83D" ? "#7c5500" : "#8c0c19",
              border: `1px solid ${gaugeColor}55`,
            }}
          >
            {level}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-ink">
          {clamped <= 30
            ? "Low likelihood of deception or malicious misinformation."
            : clamped <= 60
            ? "Contains unverified claims or emotional forward triggers. Review carefully."
            : "High risk forward — contains debunked claims or common scam tactics."}
        </p>
      </div>
    </div>
  );
}

export default function VastavHome() {
  const reduceMotion = useReducedMotion();

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Settings
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

  // Audio input
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

  // 1. One-time Migration and Data Loading from localStorage
  useEffect(() => {
    try {
      // Migrate history
      let savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!savedHistory) {
        const oldHistory = window.localStorage.getItem(LEGACY_HISTORY_KEY);
        if (oldHistory) {
          savedHistory = oldHistory;
          window.localStorage.setItem(HISTORY_STORAGE_KEY, oldHistory);
          window.localStorage.removeItem(LEGACY_HISTORY_KEY);
        }
      }

      if (savedHistory) {
        const parsed: unknown = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT));
        }
      }

      // Migrate preferences
      let savedPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!savedPreferences) {
        const oldPrefs = window.localStorage.getItem(LEGACY_PREFS_KEY);
        if (oldPrefs) {
          savedPreferences = oldPrefs;
          window.localStorage.setItem(PREFERENCES_STORAGE_KEY, oldPrefs);
          window.localStorage.removeItem(LEGACY_PREFS_KEY);
        }
      }

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
    } catch (err) {
      console.warn("Could not load local data:", err);
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    if (!preferencesLoaded) return;
    const rootFontSize = textSize === "small" ? "14px" : textSize === "large" ? "18px" : "16px";
    document.documentElement.style.fontSize = rootFontSize;

    if (skipNextPreferenceSaveRef.current) {
      skipNextPreferenceSaveRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ language, readAnswersAloud, textSize })
      );
    } catch (e) {
      console.warn("Could not save preferences:", e);
    }
  }, [language, preferencesLoaded, readAnswersAloud, textSize]);

  // Save history
  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(0, HISTORY_LIMIT))
      );
    } catch (e) {
      console.warn("Could not save check history:", e);
    }
  }, [history, preferencesLoaded]);

  // Load trending items
  useEffect(() => {
    if (activeTab !== "trending" || trendingLoaded) return;
    let isCancelled = false;
    setTrendingLoading(true);
    setTrendingError(null);

    fetch("/api/trending")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load trending list.");
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        setTrendingItems(data.items || []);
        setTrendingLoaded(true);
      })
      .catch((err) => {
        if (isCancelled) return;
        setTrendingError(err.message || "Failed to load trending items.");
      })
      .finally(() => {
        if (!isCancelled) setTrendingLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, trendingLoaded]);

  // QR Code generator for Certificate
  useEffect(() => {
    const QRCode = window.QRCode;
    const qrContainer = certificateQrRef.current;
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
      "Vastav proof of check",
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
        colorDark: "#1D2760",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel?.M ?? 0,
      });
      setQrCodeGenerated(true);
    } catch (qrError) {
      console.error("Could not generate certificate QR code:", qrError);
      setQrCodeLibraryFailed(true);
    }
  }, [result, resultCheckedAt, qrCodeLibraryReady]);

  // Read answers aloud
  useEffect(() => {
    if (!result || !readAnswersAloud || !preferencesLoaded || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const answerText = result.claims
      .map((claim, index) => `Claim ${index + 1}. ${claim.claim}. ${claim.verdict}. ${claim.explanation}`)
      .join(" ");
    if (!answerText) return;

    const utterance = new SpeechSynthesisUtterance(answerText);
    utterance.rate = 0.95;
    const langMap: Record<LanguageOption, string> = {
      en: "en-IN",
      hi: "hi-IN",
      hinglish: "hi-IN",
      mr: "mr-IN",
      ur: "ur-IN",
      ta: "ta-IN",
    };
    utterance.lang = langMap[language] || "en-IN";
    utterance.onend = () => setSpeakingClaimId(null);
    utterance.onerror = () => setSpeakingClaimId(null);

    setSpeakingClaimId(-1);
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [language, preferencesLoaded, readAnswersAloud, result]);

  // Loading stepper progress
  useEffect(() => {
    let t1: NodeJS.Timeout | undefined;
    let t2: NodeJS.Timeout | undefined;
    let t3: NodeJS.Timeout | undefined;

    if (isLoading) {
      setCurrentStepIndex(0);
      setVerifyingProgressText("Reading input and parsing claims...");

      t1 = setTimeout(() => {
        setCurrentStepIndex(1);
        setVerifyingProgressText("Extracting atomic factual claims...");
      }, 1800);

      t2 = setTimeout(() => {
        setCurrentStepIndex(2);
        setVerifyingProgressText("Checking claims against trusted registries & Google Search...");
      }, 4200);

      t3 = setTimeout(() => {
        setCurrentStepIndex(3);
        setVerifyingProgressText("Synthesizing verdicts, evidence, and clear explanations...");
      }, 12000);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [isLoading]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handlers for file inputs
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError({ message: "Please select an image file (JPG, PNG, or WebP).", retryable: false });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError({ message: "Screenshot size must be under 8MB.", retryable: false });
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
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError({ message: "Audio file must be under 10MB.", retryable: false });
      return;
    }
    setError(null);
    setAudioFile(file);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      setAudioBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearAudio = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioFile(null);
    setAudioBase64(null);
    setAudioPreviewUrl(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError({ message: "Please select a valid PDF document.", retryable: false });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError({ message: "PDF document exceeds the 10MB limit (max 20 pages).", retryable: false });
      return;
    }
    setError(null);
    setPdfFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPdf = () => {
    setPdfFile(null);
    setPdfBase64(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const isInputEmpty = () => {
    if (["history", "settings", "standards", "trending", "learn"].includes(activeTab)) return true;
    if (activeTab === "text") return !textContent.trim();
    if (activeTab === "image") return !imageBase64;
    if (activeTab === "audio") return !audioBase64;
    if (activeTab === "pdf") return !pdfBase64;
    if (activeTab === "url") return !urlContent.trim();
    return true;
  };

  // Perform Verification
  const executeVerification = async (payload: {
    type: "text" | "image" | "audio" | "pdf" | "url";
    content: string;
    mimeType?: string;
    language: string;
  }) => {
    setIsLoading(true);
    setResult(null);
    setError(null);

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

      // Save to history
      const newEntry: HistoryEntry = {
        id: `check-${checkedAt}-${Math.random().toString(36).slice(2, 6)}`,
        checkedAt,
        result: verificationResult,
      };
      setHistory((prev) => [newEntry, ...prev.slice(0, HISTORY_LIMIT - 1)]);
    } catch (err: any) {
      setError({
        message: err.message || "Network error. Please check your connection and retry.",
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = () => {
    if (isInputEmpty()) return;

    let payload: {
      type: "text" | "image" | "audio" | "pdf" | "url";
      content: string;
      mimeType?: string;
      language: string;
    };

    if (activeTab === "text") {
      payload = { type: "text", content: textContent.trim(), language };
    } else if (activeTab === "image") {
      payload = {
        type: "image",
        content: imageBase64!,
        mimeType: imageFile?.type || "image/jpeg",
        language,
      };
    } else if (activeTab === "audio") {
      payload = {
        type: "audio",
        content: audioBase64!,
        mimeType: audioFile?.type || "audio/mp3",
        language,
      };
    } else if (activeTab === "pdf") {
      payload = {
        type: "pdf",
        content: pdfBase64!,
        mimeType: "application/pdf",
        language,
      };
    } else {
      let finalUrl = urlContent.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }
      payload = { type: "url", content: finalUrl, language };
    }

    executeVerification(payload);
  };

  // Sakhi Handoff: "Run full check in Vastav"
  const handleSakhiRunCheck = (payload: SakhiCheckPayload) => {
    if (payload.type === "url") {
      setActiveTab("url");
      setUrlContent(payload.content);
    } else if (payload.type === "image") {
      setActiveTab("image");
      setImageBase64(payload.content);
    } else if (payload.type === "audio") {
      setActiveTab("audio");
      setAudioBase64(payload.content);
    } else if (payload.type === "pdf") {
      setActiveTab("pdf");
      setPdfBase64(payload.content);
    } else {
      setActiveTab("text");
      setTextContent(payload.content);
    }

    executeVerification({
      type: payload.type,
      content: payload.content,
      mimeType: payload.mimeType,
      language,
    });
  };

  // Download Share Card
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
      link.download = `vastav-factcheck-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate share card image:", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsDownloadingCard(false);
    }
  };

  // Download Certificate
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
      link.download = `vastav-certificate-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate verification certificate:", err);
      alert("Could not generate the certificate image. Please try again.");
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  // Copy text summary
  const handleCopySummary = () => {
    if (!result) return;
    const allLiveVerified =
      result.claims.length > 0 && result.claims.every((claim) => claim.liveVerified);
    const noneLiveVerified =
      result.claims.length > 0 && result.claims.every((claim) => !claim.liveVerified);
    const verificationFooter = allLiveVerified
      ? "Checked using live web sources via Vastav."
      : noneLiveVerified
      ? "Checked using Vastav AI assessment (live source-checking was unavailable)."
      : result.claims.length === 0
      ? "No claims were available for source-checking via Vastav."
      : "Checked using a mix of live web sources and AI assessment via Vastav (see individual claims).";
    const summaryLines = [
      `🔍 *Vastav Verification Summary*`,
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingClaimId(null);
  };

  const handleDeleteBrowserData = () => {
    if (!window.confirm("Delete all check history, preferences, and chat memory from this browser?")) {
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
      window.localStorage.removeItem(LEGACY_HISTORY_KEY);
      window.localStorage.removeItem(LEGACY_PREFS_KEY);
      window.localStorage.removeItem("vastav-sakhi-chat");
      window.localStorage.removeItem("vastav-sakhi-tooltip-opened");
    } catch (storageError) {
      console.warn("Could not completely remove browser data:", storageError);
    }
  };

  const navigateTo = (tab: InputTab) => {
    setActiveTab(tab);
    setResult(null);
    setResultCheckedAt(null);
    setError(null);
    setSidebarOpen(false);
  };

  // Helper for overall verdict
  const getOverallVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "Verified":
        return {
          bg: "verdict-banner-verified",
          icon: <CheckCircle2 className="h-9 w-9 shrink-0 text-[#2FD08F]" />,
          title: "Verified",
          description: "Authoritative sources confirm all key claims in this forward.",
        };
      case "Contains false claims":
        return {
          bg: "verdict-banner-false",
          icon: <XCircle className="h-9 w-9 shrink-0 text-[#FF5C6C]" />,
          title: "Contains False Claims",
          description: "One or more statements contradict verified facts and credible records.",
        };
      case "Cannot be confirmed":
        return {
          bg: "verdict-banner-neutral",
          icon: <HelpCircle className="h-9 w-9 shrink-0 text-[#A9B4C6]" />,
          title: "Cannot Be Confirmed",
          description: "No reliable public sources or official registries verify these statements.",
        };
      case "Partly true / mixed":
      default:
        return {
          bg: "verdict-banner-mixed",
          icon: <AlertTriangle className="h-9 w-9 shrink-0 text-[#FF9A4D]" />,
          title: "Partly True / Mixed",
          description: "Contains some factual basis, but claims are exaggerated, missing context, or outdated.",
        };
    }
  };

  // Helper for claim verdict badge
  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case "VERIFIED":
        return {
          badge: "claim-badge-verified border",
          border: "claim-border-verified",
          indicator: "bg-[#2FD08F]",
          chipBg: "bg-[#2FD08F] text-[#1A1020]",
          label: "VERIFIED",
        };
      case "FALSE":
        return {
          badge: "claim-badge-false border",
          border: "claim-border-false",
          indicator: "bg-[#FF5C6C]",
          chipBg: "bg-[#FF5C6C] text-white",
          label: "FALSE",
        };
      case "OUTDATED":
        return {
          badge: "claim-badge-outdated border",
          border: "claim-border-outdated",
          indicator: "bg-[#FFC83D]",
          chipBg: "bg-[#FFC83D] text-[#1A1020]",
          label: "OUTDATED",
        };
      case "PARTLY_TRUE":
        return {
          badge: "claim-badge-partly border",
          border: "claim-border-partly",
          indicator: "bg-[#FF9A4D]",
          chipBg: "bg-[#FF9A4D] text-[#1A1020]",
          label: "PARTLY TRUE",
        };
      case "UNVERIFIABLE":
      default:
        return {
          badge: "claim-badge-unverified border",
          border: "claim-border-unverified",
          indicator: "bg-[#A9B4C6]",
          chipBg: "bg-[#A9B4C6] text-[#1A1020]",
          label: "UNVERIFIED",
        };
    }
  };

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

  const isCheckView = ["text", "image", "audio", "pdf", "url"].includes(activeTab);
  const dailyTip = DAILY_TIPS[(Math.floor(Date.now() / 86400000) + 2) % DAILY_TIPS.length];
  const spotlightTrend = trendingItems.find((item) => item.verdict === "FALSE") || trendingItems[0];

  const recentChecksForSakhi = history.slice(0, 5).map((entry) => ({
    claim: entry.result.claims[0]?.claim || entry.result.overall,
    verdict: entry.result.claims[0]?.verdict || entry.result.overall,
  }));

  const renderNavigationButton = (
    tab: InputTab,
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        onClick={() => navigateTo(tab)}
        aria-current={isActive ? "page" : undefined}
        className={`vastav-nav-item w-full ${isActive ? "is-active" : ""}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="vastav-app-shell min-h-screen text-ink relative">
      {/* Animated Lavender Sky background rendered once behind everything */}
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-[1600px] relative z-10">
        {/* DESKTOP SIDEBAR (>=1000px, 224px width, glassmorphism) */}
        <aside className="vastav-sidebar hidden shrink-0 flex-col px-3.5 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[224px]">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #3D52D5 0%, #7A4FE0 100%)",
              }}
            >
              <VastavLogo whiteOnly size={24} className="h-6 w-6" />
            </div>
            <div>
              <p className="font-heading text-base font-extrabold tracking-widest text-ink leading-tight">
                VASTAV
              </p>
              <p className="font-devanagari text-xs font-semibold text-mut leading-none mt-0.5">
                वास्तव
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="space-y-1">
              <p className="vastav-sidebar-label px-3">Check</p>
              {renderNavigationButton("text", "Text", FileText)}
              {renderNavigationButton("image", "Screenshot", ImageIcon)}
              {renderNavigationButton("audio", "Voice note", Mic)}
              {renderNavigationButton("pdf", "PDF", FileIcon)}
              {renderNavigationButton("url", "Link", Link2)}
            </div>

            <div className="space-y-1">
              <p className="vastav-sidebar-label px-3">More</p>
              {renderNavigationButton("history", "History", HistoryIcon)}
              {renderNavigationButton("trending", "Trending near you", Bell)}
              {renderNavigationButton("learn", "Learn", GraduationCap)}
              {renderNavigationButton("settings", "Settings", SettingsIcon)}
            </div>
          </div>

          {/* Sidebar footer badge */}
          <div className="mt-auto rounded-xl border border-white/80 bg-white/60 p-3 text-xs text-mut backdrop-blur-sm">
            <p className="font-bold text-ink">Know what&apos;s real.</p>
            <p className="mt-1 text-[11px] leading-tight">
              Check the claim before you hit forward.
            </p>
          </div>
        </aside>

        {/* MOBILE DRAWER / SIDEBAR (When opened via Menu button) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-[#1D2760]/30 backdrop-blur-sm"
            />
            <aside className="vastav-sidebar relative z-10 flex h-full w-[min(18rem,84vw)] flex-col border-r px-4 py-5 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5"
                    style={{
                      background: "linear-gradient(135deg, #3D52D5 0%, #7A4FE0 100%)",
                    }}
                  >
                    <VastavLogo whiteOnly size={24} className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-heading text-base font-extrabold tracking-widest text-ink leading-tight">
                      VASTAV
                    </p>
                    <p className="font-devanagari text-xs font-semibold text-mut">वास्तव</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setSidebarOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-white/80"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5">
                <div className="space-y-1">
                  <p className="vastav-sidebar-label px-3">Check</p>
                  {renderNavigationButton("text", "Text", FileText)}
                  {renderNavigationButton("image", "Screenshot", ImageIcon)}
                  {renderNavigationButton("audio", "Voice note", Mic)}
                  {renderNavigationButton("pdf", "PDF", FileIcon)}
                  {renderNavigationButton("url", "Link", Link2)}
                </div>

                <div className="space-y-1">
                  <p className="vastav-sidebar-label px-3">More</p>
                  {renderNavigationButton("history", "History", HistoryIcon)}
                  {renderNavigationButton("trending", "Trending near you", Bell)}
                  {renderNavigationButton("learn", "Learn", GraduationCap)}
                  {renderNavigationButton("settings", "Settings", SettingsIcon)}
                  {renderNavigationButton("standards", "Standards", BookOpen)}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* MAIN VIEW AREA */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Top Bar for Mobile & Tablet (<1000px) */}
          <div className="vastav-mobile-header flex items-center justify-between px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-1"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <VastavLogo size={28} className="h-7 w-7" />
                <span className="font-heading font-extrabold tracking-wider text-ink text-sm">
                  VASTAV
                </span>
              </div>
            </div>

            {/* Language Selector Chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangDropdown((v) => !v)}
                aria-label="Change language"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur-sm hover:border-brand-1"
              >
                <span>{LANGUAGE_LABELS[language]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-mut" />
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-10 z-50 w-32 rounded-xl border border-border bg-white py-1 shadow-xl text-ink">
                  {(Object.keys(LANGUAGE_LABELS) as LanguageOption[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setLanguage(code);
                        setShowLangDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[#F7F8FF] ${
                        language === code ? "font-bold text-brand-1 bg-[#F7F8FF]" : ""
                      }`}
                    >
                      <span>{LANGUAGE_LABELS[code]}</span>
                      {language === code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Container */}
          <main
            dir={language === "ur" ? "rtl" : "ltr"}
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7 pb-24 sm:pb-12"
          >
            {/* Desktop Top Row (>=1000px): Fact-Check Desk label & Language Chip */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/50 border border-white/80 px-2.5 py-1 text-[11px] font-bold tracking-widest text-mut uppercase shadow-sm backdrop-blur-sm">
                <div className="h-2 w-2 rounded-full bg-brand-1 animate-pulse" />
                <span>FACT-CHECK DESK</span>
              </div>

              {/* Language Chip */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangDropdown((v) => !v)}
                  aria-label="Change language"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/85 px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur-sm hover:bg-white hover:border-brand-1 transition-all"
                >
                  <Languages className="h-3.5 w-3.5 text-brand-1" />
                  <span>{LANGUAGE_LABELS[language]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-mut" />
                </button>
                {showLangDropdown && (
                  <div className="absolute right-0 top-10 z-50 w-36 rounded-xl border border-border bg-white py-1.5 shadow-xl text-ink">
                    {(Object.keys(LANGUAGE_LABELS) as LanguageOption[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setLanguage(code);
                          setShowLangDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[#F7F8FF] ${
                          language === code ? "font-bold text-brand-1 bg-[#F7F8FF]" : ""
                        }`}
                      >
                        <span>{LANGUAGE_LABELS[code]}</span>
                        {language === code && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CHECK VIEW */}
            {isCheckView && !result && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-8 items-start">
                {/* Left Column: Headline, Verdict Key, Check Card */}
                <div className="space-y-6">
                  {/* Headline */}
                  <div>
                    <h1 className="font-heading font-extrabold tracking-tight text-ink text-3xl sm:text-[44px] lg:text-[50px] leading-[1.08]">
                      Know what&apos;s <span className="headline-gradient-word">real</span> before you forward.
                    </h1>
                    <p className="mt-2.5 text-base sm:text-lg text-mut font-normal max-w-xl">
                      Paste, upload or share. Vastav checks it against trusted sources and tells you exactly why.
                    </p>
                  </div>

                  {/* Verdict key row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink">
                    <div className="flex items-center gap-1.5">
                      <span className="verdict-swatch bg-[#2FD08F]" />
                      <span>Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="verdict-swatch bg-[#FF5C6C]" />
                      <span>False</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="verdict-swatch bg-[#FFC83D]" />
                      <span>Outdated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="verdict-swatch bg-[#FF9A4D]" />
                      <span>Partly true</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="verdict-swatch bg-[#A9B4C6]" />
                      <span>Unverified</span>
                    </div>
                  </div>

                  {/* Check Card */}
                  <div className="vastav-card p-5 sm:p-7 space-y-5">
                    {/* Tabs row with 3px indigo underline */}
                    <div className="flex items-center gap-4 sm:gap-6 border-b border-border/80 pb-3 overflow-x-auto scrollbar-none">
                      {[
                        { tab: "text" as const, label: "Text", icon: FileText },
                        { tab: "image" as const, label: "Screenshot", icon: ImageIcon },
                        { tab: "audio" as const, label: "Voice note", icon: Mic },
                        { tab: "pdf" as const, label: "PDF", icon: FileIcon },
                        { tab: "url" as const, label: "Link", icon: Link2 },
                      ].map(({ tab, label }) => {
                        const isTabActive = activeTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab);
                              setError(null);
                            }}
                            className={`relative pb-2 text-sm font-bold transition-colors whitespace-nowrap shrink-0 min-h-[44px] flex items-center ${
                              isTabActive ? "text-brand-1" : "text-mut hover:text-ink"
                            }`}
                          >
                            <span>{label}</span>
                            {isTabActive && (
                              <motion.span
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-1 rounded-full"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Inputs */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* 1. Text Input */}
                        {activeTab === "text" && (
                          <div className="space-y-3">
                            <textarea
                              rows={4}
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              placeholder="Govt announces free ₹5000 to every woman from 1 Oct. Forward to 10 groups to register."
                              className="vastav-input min-h-[7.5rem] resize-y"
                            />
                          </div>
                        )}

                        {/* 2. Screenshot Input */}
                        {activeTab === "image" && (
                          <div className="space-y-3">
                            {!imagePreview ? (
                              <label
                                htmlFor="image-upload"
                                className="sp-dropzone group min-h-[140px]"
                              >
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-1 mb-2 shadow-sm group-hover:scale-105 transition-transform">
                                  <ImageIcon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-bold text-ink">Choose screenshot or photo</p>
                                <p className="text-xs text-mut mt-1">PNG, JPG, or WEBP up to 8MB</p>
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
                              <div className="rounded-xl border border-border bg-[#F7F8FF] p-3 space-y-2">
                                <div className="max-h-56 flex items-center justify-center overflow-hidden rounded-lg bg-black/5">
                                  <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="max-h-56 object-contain"
                                  />
                                </div>
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-xs font-semibold text-ink truncate max-w-[200px]">
                                    {imageFile?.name || "Screenshot"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleClearImage}
                                    className="text-xs font-bold text-rose-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Voice note Input */}
                        {activeTab === "audio" && (
                          <div className="space-y-3">
                            {!audioFile ? (
                              <label
                                htmlFor="audio-upload"
                                className="sp-dropzone group min-h-[140px]"
                              >
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-1 mb-2 shadow-sm group-hover:scale-105 transition-transform">
                                  <Mic className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-bold text-ink">Upload voice note or recording</p>
                                <p className="text-xs text-mut mt-1">MP3, OGG, M4A, WAV, or WebM up to 10MB</p>
                                <input
                                  ref={audioInputRef}
                                  id="audio-upload"
                                  type="file"
                                  accept="audio/*,.mp3,.ogg,.m4a,.wav,.webm"
                                  onChange={handleAudioSelect}
                                  className="hidden"
                                />
                              </label>
                            ) : (
                              <div className="rounded-xl border border-border bg-[#F7F8FF] p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-brand-1/15 flex items-center justify-center text-brand-1">
                                      <Mic className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-ink truncate max-w-[200px]">
                                        {audioFile.name}
                                      </p>
                                      <p className="text-[10px] text-mut">
                                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleClearAudio}
                                    className="text-xs font-bold text-rose-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                {audioPreviewUrl && (
                                  <audio controls src={audioPreviewUrl} className="w-full h-9" />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. PDF Input */}
                        {activeTab === "pdf" && (
                          <div className="space-y-3">
                            {!pdfFile ? (
                              <label
                                htmlFor="pdf-upload"
                                className="sp-dropzone group min-h-[140px]"
                              >
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-1 mb-2 shadow-sm group-hover:scale-105 transition-transform">
                                  <FileIcon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-bold text-ink">Upload PDF circular or document</p>
                                <p className="text-xs text-mut mt-1">PDF up to 10MB (analyzes first ~20 pages)</p>
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
                              <div className="rounded-xl border border-border bg-[#F7F8FF] p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                    <FileIcon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-ink truncate max-w-[200px]">
                                      {pdfFile.name}
                                    </p>
                                    <p className="text-[10px] text-mut">
                                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleClearPdf}
                                  className="text-xs font-bold text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. URL Input */}
                        {activeTab === "url" && (
                          <div className="space-y-2">
                            <div className="relative">
                              <Link2 className="absolute left-3.5 top-3.5 h-4 w-4 text-mut pointer-events-none" />
                              <input
                                type="url"
                                value={urlContent}
                                onChange={(e) => setUrlContent(e.target.value)}
                                placeholder="https://example.com/news-story..."
                                className="vastav-input pl-10"
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Error display */}
                    {error && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{error.message}</p>
                          {error.retryable && (
                            <button
                              type="button"
                              onClick={handleVerify}
                              className="mt-1.5 flex items-center gap-1 font-bold text-rose-900 underline"
                            >
                              <RefreshCw className="h-3 w-3" /> Retry check
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action button row */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                      <button
                        type="button"
                        disabled={isInputEmpty() || isLoading}
                        onClick={handleVerify}
                        className="vastav-btn-primary px-6 py-3.5 text-sm sm:text-base w-full sm:w-auto min-h-[48px]"
                      >
                        <span>Check this forward →</span>
                      </button>

                      <p className="text-xs text-mut font-medium">
                        About 20 seconds. Nothing is posted or shared.
                      </p>
                    </div>

                    {/* Sample forwards for quick testing */}
                    {activeTab === "text" && (
                      <div className="border-t border-border/60 pt-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-mut mb-2">
                          Try an example:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SAMPLE_FORWARDS.map((sample) => (
                            <button
                              key={sample.label}
                              type="button"
                              onClick={() => {
                                setTextContent(sample.text);
                                setError(null);
                              }}
                              className="rounded-lg border border-border bg-[#F7F8FF] px-2.5 py-1.5 text-xs text-left font-medium text-ink hover:border-brand-1 hover:bg-white transition-colors"
                            >
                              <span className="font-bold text-brand-1">{sample.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trust row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-mut font-medium px-2">
                    <span className="h-2 w-2 rounded-full bg-brand-1" />
                    <span>Encrypted in transit</span>
                    <span className="h-1 w-1 rounded-full bg-mut/60" />
                    <span>Nothing stored</span>
                    <span className="h-1 w-1 rounded-full bg-mut/60" />
                    <span>Every source cited</span>
                  </div>
                </div>

                {/* Right Column: 310px Live Result Preview card (Matches Screenshot) */}
                <div className="hidden lg:block w-[310px] shrink-0">
                  <div className="vastav-card p-6 space-y-5">
                    {/* Header */}
                    <div>
                      <p className="text-[10px] font-extrabold tracking-widest text-[#7b86b8] uppercase">
                        RESULT PREVIEW
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <h3 className="font-heading text-xl font-extrabold text-ink">
                          Mostly false
                        </h3>

                        {/* Animated Confidence Ring */}
                        <div className="relative flex h-14 w-14 items-center justify-center">
                          <svg className="h-14 w-14" viewBox="0 0 48 48">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="#CBD5FA"
                              strokeWidth="4"
                              fill="none"
                              opacity="0.5"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="url(#preview-ring-grad)"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray="125.6"
                              strokeDashoffset="10.0"
                              strokeLinecap="round"
                              transform="rotate(-90 24 24)"
                            />
                            <defs>
                              <linearGradient id="preview-ring-grad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#3D52D5" />
                                <stop offset="100%" stopColor="#7A4FE0" />
                              </linearGradient>
                            </defs>
                            <text
                              x="24"
                              y="28"
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="800"
                              fill="#1D2760"
                            >
                              92%
                            </text>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 4 claim rows with verdict chips */}
                    <div className="space-y-3 pt-2 border-t border-border/70">
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-ink truncate pr-2">
                          Free ₹5000 to every woman
                        </span>
                        <span className="verdict-chip verdict-chip-false shrink-0">
                          False
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-ink truncate pr-2">
                          Scheme starts 1 Oct
                        </span>
                        <span className="verdict-chip verdict-chip-outdated shrink-0">
                          Outdated
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-ink truncate pr-2">
                          Hot water cures fever
                        </span>
                        <span className="verdict-chip verdict-chip-partly shrink-0">
                          Partly true
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-ink truncate pr-2">
                          Forward to 10 groups
                        </span>
                        <span className="verdict-chip verdict-chip-unverified shrink-0">
                          Unverified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOADING STATE */}
            {isLoading && (
              <div className="vastav-card p-6 sm:p-10 space-y-6 text-center max-w-2xl mx-auto my-8">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#3D52D5] to-[#7A4FE0] p-3 text-white shadow-glow animate-pulse">
                    <VastavLogo whiteOnly size={40} className="h-10 w-10" />
                  </div>
                </div>

                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink">
                    Examining claims with Vastav
                  </h2>
                  <p className="text-sm font-semibold text-brand-1 mt-1">
                    {verifyingProgressText}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-4">
                  {LOADING_STEPS.map((step, idx) => (
                    <div key={step.id} className="text-center">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx <= currentStepIndex ? "bg-brand-1" : "bg-[#CBD5FA]/40"
                        }`}
                      />
                      <p className="text-[10px] sm:text-xs font-bold text-ink mt-2">
                        {step.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RESULTS VIEW */}
            {result && !isLoading && (() => {
              const badge = getOverallVerdictBadge(result.overall);
              const riskScore = Math.max(0, Math.min(100, result.riskScore ?? 0));
              const riskLevel =
                result.riskLevel ||
                (riskScore <= 30
                  ? "Low risk"
                  : riskScore <= 60
                  ? "Moderate risk"
                  : "High risk — likely to mislead");

              return (
                <div className="space-y-6">
                  {/* Top Bar with 'Check another' and Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="vastav-btn-secondary px-4 py-2 text-xs font-bold"
                    >
                      <span>← Check another forward</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="vastav-btn-secondary px-3 py-2 text-xs"
                      >
                        {copiedSummary ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Copied!
                          </span>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy summary</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadShareCard}
                        disabled={isDownloadingCard}
                        className="vastav-btn-secondary px-3 py-2 text-xs"
                      >
                        <Download className="h-3.5 w-3.5 text-brand-1" />
                        <span>{isDownloadingCard ? "Generating…" : "WhatsApp card"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCertificate}
                        disabled={!qrCodeGenerated || isDownloadingCertificate}
                        className="vastav-btn-secondary px-3 py-2 text-xs"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-2" />
                        <span>Certificate</span>
                      </button>
                    </div>
                  </div>

                  {/* Overall Verdict Banner */}
                  <div className={`verdict-banner ${badge.bg}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {badge.icon}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold tracking-wider uppercase opacity-80">
                              OVERALL VERDICT
                            </span>
                            <span>•</span>
                            <span className="text-xs font-medium">
                              {result.detectedLanguage.toUpperCase()}
                            </span>
                          </div>
                          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold mt-1">
                            {badge.title}
                          </h2>
                          <p className="mt-1 text-sm font-medium opacity-90 max-w-2xl">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detected Manipulation Tactics */}
                    {result.manipulationTags && result.manipulationTags.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-current/15 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold">Tactics detected:</span>
                        {result.manipulationTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-ink shadow-sm backdrop-blur-sm"
                          >
                            <span>{formatTag(tag).icon}</span>
                            <span>{formatTag(tag).label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Risk Gauge */}
                  <RiskGauge score={riskScore} level={riskLevel} reduceMotion={Boolean(reduceMotion)} />

                  {/* Verified Claims List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-lg font-bold text-ink">
                        Extracted Claims ({result.claims.length})
                      </h3>
                      <p className="text-xs text-mut">Verified with citations</p>
                    </div>

                    {result.claims.length === 0 ? (
                      <div className="vastav-card p-6 text-center text-sm text-mut">
                        No specific factual claims were found in the provided forward.
                      </div>
                    ) : (
                      result.claims.map((claim, idx) => {
                        const vStyle = getVerdictStyle(claim.verdict);
                        return (
                          <div
                            key={claim.id || idx}
                            className={`vastav-card p-5 sm:p-6 space-y-4 border ${vStyle.border}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-1/15 font-heading text-xs font-bold text-brand-1">
                                  {idx + 1}
                                </span>
                                <h4 className="font-heading text-base font-bold text-ink">
                                  &ldquo;{claim.claim}&rdquo;
                                </h4>
                              </div>

                              <span className={`inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-extrabold ${vStyle.chipBg}`}>
                                {vStyle.label}
                              </span>
                            </div>

                            {/* Explanation */}
                            <p className="text-sm text-ink leading-relaxed font-medium">
                              {claim.explanation}
                            </p>

                            {/* Action to take */}
                            <div className="rounded-xl bg-[#F7F8FF] p-3 text-xs text-ink flex items-start gap-2 border border-border/70">
                              <span className="font-bold text-brand-1">💡 What to do:</span>
                              <span className="flex-1">{claim.whatToDo}</span>
                            </div>

                            {/* Reply to sender copy helper */}
                            {claim.replyToSender && (
                              <div className="flex items-center justify-between rounded-xl bg-white border border-border p-3 text-xs">
                                <div className="min-w-0 flex-1 pr-3">
                                  <p className="font-bold text-mut text-[10px] uppercase tracking-wider">
                                    Polite reply to sender:
                                  </p>
                                  <p className="text-ink font-medium truncate mt-0.5">
                                    &ldquo;{claim.replyToSender}&rdquo;
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(claim.replyToSender);
                                    setCopiedClaimId(claim.id);
                                    setTimeout(() => setCopiedClaimId(null), 2000);
                                  }}
                                  className="vastav-btn-secondary px-3 py-1.5 text-xs shrink-0"
                                >
                                  {copiedClaimId === claim.id ? "Copied!" : "Copy reply"}
                                </button>
                              </div>
                            )}

                            {/* Sources list */}
                            {claim.sources && claim.sources.length > 0 && (
                              <div className="border-t border-border/60 pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-mut mb-1.5">
                                  Cited sources:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {claim.sources.map((src, srcIdx) => (
                                    <a
                                      key={srcIdx}
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-brand-1 hover:border-brand-1 hover:underline"
                                    >
                                      <span className="max-w-[200px] truncate">{src.title || src.url}</span>
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SUBPAGES: History, Trending, Learn, Settings */}
            {!isCheckView && (
              <div className="space-y-6">
                {activeTab === "history" && (
                  <div className="vastav-card p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-heading text-xl font-bold text-ink">Check History</h2>
                        <p className="text-xs text-mut">Saved privately in this browser</p>
                      </div>

                      <button
                        type="button"
                        disabled={history.length === 0}
                        onClick={() => {
                          if (!window.confirm("Clear all check history?")) return;
                          setHistory([]);
                          window.localStorage.removeItem(HISTORY_STORAGE_KEY);
                        }}
                        className="vastav-btn-secondary text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                      >
                        Clear history
                      </button>
                    </div>

                    <input
                      type="search"
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Search saved claims or verdicts..."
                      className="vastav-input text-xs"
                    />

                    {history.length === 0 ? (
                      <p className="p-8 text-center text-sm text-mut">
                        No checks saved yet. Try checking a forward above!
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {history
                          .filter((h) => {
                            if (!historyQuery.trim()) return true;
                            const q = historyQuery.toLowerCase();
                            return (
                              h.result.overall.toLowerCase().includes(q) ||
                              h.result.claims.some((c) => c.claim.toLowerCase().includes(q))
                            );
                          })
                          .map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => {
                                setResult(entry.result);
                                setResultCheckedAt(entry.checkedAt);
                                setActiveTab("text");
                              }}
                              className="w-full py-3 text-left hover:bg-white/60 transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-ink truncate">
                                  {entry.result.claims[0]?.claim || "Forward check"}
                                </p>
                                <p className="text-xs text-mut">
                                  {formatTimeAgo(entry.checkedAt)} • {entry.result.claims.length} claims
                                </p>
                              </div>
                              <span className="rounded-full px-2.5 py-1 text-xs font-bold bg-[#F7F8FF] border border-border text-ink shrink-0">
                                {entry.result.overall}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "trending" && (
                  <div className="vastav-card p-6 space-y-4">
                    <h2 className="font-heading text-xl font-bold text-ink">Trending near you</h2>
                    <p className="text-xs text-mut">Curated forward patterns and common checks</p>

                    {trendingLoading ? (
                      <p className="text-sm text-mut py-8 text-center">Loading trending forwards…</p>
                    ) : (
                      <div className="space-y-3">
                        {trendingItems.slice(0, 8).map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border bg-white/80 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-sm text-ink">{item.claim}</h4>
                              <span className="verdict-chip verdict-chip-false shrink-0">
                                {item.verdict}
                              </span>
                            </div>
                            <p className="text-xs text-mut">{item.explanation}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setTextContent(item.claim);
                                setActiveTab("text");
                              }}
                              className="text-xs font-bold text-brand-1 hover:underline flex items-center gap-1"
                            >
                              <span>Check this claim</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "learn" && (
                  <div className="vastav-card p-6 space-y-6">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-ink">Fact-Checking Habits</h2>
                      <p className="text-xs text-mut">Simple habits to protect yourself and your family</p>
                    </div>

                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs uppercase text-sky-800">Tip of the day</p>
                        <p className="text-sm text-sky-950 font-medium mt-1">{dailyTip}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-ink">Fact-Check Mini Quiz</h3>
                      {LEARN_QUIZ.map((q, qIdx) => {
                        const answered = learnAnswers[qIdx] !== undefined;
                        const isCorrect = learnAnswers[qIdx] === q.correctIndex;
                        return (
                          <div key={qIdx} className="rounded-xl border border-border bg-white p-4 space-y-3">
                            <p className="text-sm font-bold text-ink">
                              {qIdx + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={answered}
                                  onClick={() => setLearnAnswers((p) => ({ ...p, [qIdx]: optIdx }))}
                                  className={`w-full text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                                    answered
                                      ? optIdx === q.correctIndex
                                        ? "bg-emerald-100 border-emerald-400 font-bold text-emerald-900"
                                        : learnAnswers[qIdx] === optIdx
                                        ? "bg-rose-100 border-rose-400 font-bold text-rose-900"
                                        : "opacity-60"
                                      : "hover:bg-[#F7F8FF] border-border text-ink"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            {answered && (
                              <p className={`text-xs ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>
                                {isCorrect ? "✓ Correct! " : "✗ Not quite. "}
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === "settings" && (
                  <div className="vastav-card p-6 space-y-6">
                    <h2 className="font-heading text-xl font-bold text-ink">Settings</h2>

                    {/* Language Setting */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-mut">Response Language</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(Object.keys(LANGUAGE_LABELS) as LanguageOption[]).map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setLanguage(code)}
                            className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                              language === code
                                ? "border-brand-1 bg-[#F7F8FF] text-brand-1 ring-2 ring-brand-1/20"
                                : "border-border bg-white text-ink hover:bg-[#F7F8FF]"
                            }`}
                          >
                            {LANGUAGE_LABELS[code]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Read Aloud Toggle */}
                    <div className="flex items-center justify-between border-t border-border/70 pt-4">
                      <div>
                        <h4 className="text-sm font-bold text-ink">Read replies aloud</h4>
                        <p className="text-xs text-mut">Automatically speak fact-check verdicts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={readAnswersAloud}
                        onChange={(e) => setReadAnswersAloud(e.target.checked)}
                        className="h-5 w-5 accent-[#3D52D5]"
                      />
                    </div>

                    {/* Text Size */}
                    <div className="space-y-2 border-t border-border/70 pt-4">
                      <label className="text-xs font-bold uppercase text-mut">Text Size</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["small", "medium", "large"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setTextSize(s)}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold capitalize ${
                              textSize === s
                                ? "border-brand-1 bg-[#F7F8FF] text-brand-1"
                                : "border-border bg-white text-ink"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Delete My Data */}
                    <div className="border-t border-rose-200 pt-4 space-y-2">
                      <h4 className="text-sm font-bold text-rose-900">Delete my data</h4>
                      <p className="text-xs text-mut">
                        Remove saved check history, preferences, and Sakhi conversation from this browser.
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteBrowserData}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Delete browser data
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "standards" && (
                  <div className="vastav-card p-6 space-y-4">
                    <h2 className="font-heading text-xl font-bold text-ink">Verification Standards</h2>
                    <p className="text-xs text-mut">How Vastav verifies claims without bias or speculation</p>
                    <div className="space-y-3 text-sm text-ink leading-relaxed">
                      <p>
                        <strong>1. Atomic Claim Breakdown:</strong> We break complicated forwarded texts into individual claims so truths and falsehoods are separated.
                      </p>
                      <p>
                        <strong>2. Trusted Registries:</strong> Claims are checked against official government gazettes, news archives, and authoritative registries.
                      </p>
                      <p>
                        <strong>3. Honest Uncertainty:</strong> If no reliable evidence can be confirmed, Vastav explicitly marks the claim as <em>Unverified</em> rather than guessing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* MOBILE FIXED BOTTOM NAVIGATION (<700px) */}
          <nav
            aria-label="Mobile Navigation"
            className="vastav-bottom-nav fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t px-2 py-2 lg:hidden"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
            }}
          >
            {[
              { tab: "text" as const, label: "Text", icon: FileText },
              { tab: "image" as const, label: "Photo", icon: ImageIcon },
              { tab: "audio" as const, label: "Voice", icon: Mic },
              { tab: "pdf" as const, label: "PDF", icon: FileIcon },
              { tab: "history" as const, label: "History", icon: HistoryIcon },
            ].map(({ tab, label, icon: Icon }) => {
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => navigateTo(tab)}
                  className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 rounded-xl transition-all ${
                    isSelected ? "text-brand-1 font-bold scale-105" : "text-mut hover:text-ink font-medium"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Floating AI Companion Chatbot: Sakhi (Bottom Right) */}
      <SakhiWidget
        currentLanguage={language}
        onLanguageChange={(l) => setLanguage(l as LanguageOption)}
        recentChecks={recentChecksForSakhi}
        onRunCheck={handleSakhiRunCheck}
      />

      {/* OFFSCREEN WHATSAPP SHARE CARD (1080x1350 px, 4:5 ratio) in Lavender Sky theme */}
      {result && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={shareCardRef}
            style={{
              width: "1080px",
              height: "1350px",
              background: "linear-gradient(135deg, #F3F5FF 0%, #E9EDFF 40%, #FDF0F6 100%)",
            }}
            className="relative p-16 flex flex-col justify-between font-sans select-none overflow-hidden text-[#1D2760] border-[3px] border-[#CBD5FA]"
          >
            {/* Ambient Lavender Sky glow orbs */}
            <div
              style={{
                position: "absolute",
                width: "480px",
                height: "480px",
                borderRadius: "50%",
                background: "#B9A5FF",
                filter: "blur(110px)",
                opacity: 0.45,
                top: "-10%",
                left: "-10%",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "440px",
                height: "440px",
                borderRadius: "50%",
                background: "#8FE3D0",
                filter: "blur(100px)",
                opacity: 0.4,
                top: "10%",
                right: "-8%",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "460px",
                height: "460px",
                borderRadius: "50%",
                background: "#FFC6E0",
                filter: "blur(120px)",
                opacity: 0.4,
                bottom: "-10%",
                left: "20%",
                pointerEvents: "none",
              }}
            />

            {/* Header */}
            <div className="relative z-10">
              <div className="flex items-center justify-between border-b-2 border-[#CBD5FA] pb-8">
                <div className="flex items-center gap-5">
                  <VastavLogo className="h-20 w-20 rounded-2xl shadow-[0_8px_20px_rgba(61,82,213,0.2)]" size={80} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-extrabold tracking-tight font-heading text-[#1D2760]">VASTAV</h2>
                      <span className="text-sm font-bold px-3 py-1 rounded-full bg-[#3D52D5]/10 text-[#3D52D5]">वास्तव</span>
                    </div>
                    <p className="text-xl text-[#566099] font-medium mt-1">
                      Know what&apos;s real before you forward.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs uppercase tracking-widest font-black px-4 py-1.5 rounded-full bg-white/90 border border-[#CBD5FA] text-[#3D52D5] shadow-sm">
                    FACT-CHECK DESK
                  </span>
                  <p className="text-base text-[#566099] font-semibold mt-2">
                    {new Date(resultCheckedAt ?? Date.now()).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
              </div>

              {/* Main Overall Verdict Banner */}
              <div className="mt-10 p-10 rounded-[32px] bg-white/95 border-2 border-[#CBD5FA] shadow-[0_20px_45px_rgba(61,82,213,0.14)] backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-[#566099] font-black">
                    OVERALL VERDICT SUMMARY
                  </div>
                  <div className="text-sm font-bold text-[#3D52D5] bg-[#EEF2FF] border border-[#CBD5FA] px-4 py-1.5 rounded-full">
                    Risk Score: {result.riskScore}/100 • {result.riskLevel}
                  </div>
                </div>

                <div className="mt-5 mb-4">
                  {result.overall === "Verified" ? (
                    <span className="inline-flex items-center gap-3 rounded-full border-2 border-[#86EFAC] px-7 py-3 text-4xl font-black bg-[#E8F8F0] text-[#059669]">
                      <CheckCircle2 className="w-9 h-9" />
                      {result.overall}
                    </span>
                  ) : result.overall === "Contains false claims" || result.overall.toLowerCase().includes("false") ? (
                    <span className="inline-flex items-center gap-3 rounded-full border-2 border-[#FCA5A5] px-7 py-3 text-4xl font-black bg-[#FDE8E8] text-[#E11D48]">
                      <XCircle className="w-9 h-9" />
                      {result.overall}
                    </span>
                  ) : result.overall === "Partly true / mixed" ? (
                    <span className="inline-flex items-center gap-3 rounded-full border-2 border-[#FCD34D] px-7 py-3 text-4xl font-black bg-[#FEF3C7] text-[#D97706]">
                      <AlertTriangle className="w-9 h-9" />
                      {result.overall}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3 rounded-full border-2 border-[#CBD5E1] px-7 py-3 text-4xl font-black bg-[#F1F5F9] text-[#475569]">
                      <HelpCircle className="w-9 h-9" />
                      {result.overall}
                    </span>
                  )}
                </div>

                <p className="text-2xl text-[#1D2760] font-medium leading-relaxed mt-4">
                  {getOverallVerdictBadge(result.overall).description}
                </p>
              </div>
            </div>

            {/* Claims Highlight */}
            <div className="relative z-10 space-y-6">
              <div className="text-sm uppercase tracking-widest text-[#566099] font-black border-b-2 border-[#CBD5FA] pb-2">
                Key Findings ({result.claims.length} claims verified)
              </div>
              <div className="space-y-4">
                {result.claims.slice(0, 3).map((claim, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-white/90 border border-[#CBD5FA] shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-lg font-bold text-[#1D2760] leading-snug">
                        Claim {idx + 1}: &ldquo;{claim.claim}&rdquo;
                      </span>
                      <span
                        className={`text-xs font-black px-4 py-1.5 rounded-full uppercase shrink-0 border ${
                          claim.verdict === "VERIFIED"
                            ? "bg-[#E8F8F0] text-[#059669] border-[#86EFAC]"
                            : claim.verdict === "FALSE"
                            ? "bg-[#FDE8E8] text-[#E11D48] border-[#FCA5A5]"
                            : claim.verdict === "OUTDATED" || claim.verdict === "PARTLY_TRUE"
                            ? "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]"
                            : "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]"
                        }`}
                      >
                        {claim.verdict.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-base text-[#566099] leading-relaxed">
                      {claim.explanation}
                    </p>
                    <p className="text-sm text-[#3D52D5] font-semibold flex items-center gap-1.5 pt-1">
                      <span>💡 Action:</span>
                      <span>{claim.whatToDo}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Card Footer */}
            <div className="relative z-10 border-t-2 border-[#CBD5FA] pt-8 flex items-center justify-between text-[#566099] text-base">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="w-5 h-5 text-[#3D52D5]" />
                <span>Grounded with Google Search • Reviewed by Vastav</span>
              </div>
              <span className="text-[#1D2760] font-bold">
                Stop the spread. Verify before forwarding.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* QR Code library script */}
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

      {/* OFFSCREEN VERIFICATION CERTIFICATE (720x900 px) in Lavender Sky theme */}
      {result && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={certificateRef}
            style={{
              width: "720px",
              height: "900px",
              background: "linear-gradient(145deg, #FAFBFD 0%, #FFFFFF 50%, #EFF2FF 100%)",
            }}
            className="relative flex flex-col justify-between p-12 font-sans select-none overflow-hidden text-[#1D2760] border-4 border-[#CBD5FA] rounded-[32px] shadow-2xl"
          >
            {/* Inner security certificate border frame */}
            <div
              style={{
                position: "absolute",
                inset: "16px",
                border: "1.5px solid rgba(61, 82, 213, 0.25)",
                borderRadius: "22px",
                pointerEvents: "none",
              }}
            />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#CBD5FA] pb-6">
                <div className="flex items-center gap-4">
                  <VastavLogo className="h-16 w-16 rounded-2xl shadow-md" size={64} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black font-heading text-[#1D2760]">VASTAV</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#3D52D5]/10 text-[#3D52D5]">वास्तव</span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#566099]">Official Verification Certificate</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[#3D52D5] bg-[#EEF2FF] border border-[#CBD5FA] px-3 py-1 rounded-full">
                    REF: VST-{(resultCheckedAt ?? Date.now()).toString().slice(-8)}
                  </span>
                  <p className="text-xs font-semibold text-[#566099] mt-1.5">
                    {new Date(resultCheckedAt ?? Date.now()).toLocaleDateString("en-IN", {
                      dateStyle: "long",
                    })}
                  </p>
                </div>
              </div>

              {/* Claim Excerpt Box */}
              <div className="mt-8 rounded-2xl border border-[#CBD5FA] bg-[#F7F8FF] p-6 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#566099]">Verified Claim Excerpt</p>
                <p className="mt-2 text-xl font-bold leading-snug text-[#1D2760]">
                  &ldquo;{result.claims[0]?.claim || "No claim text was available."}&rdquo;
                </p>
              </div>

              {/* Verdict & Risk Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {/* Overall Verdict Card */}
                <div className="rounded-2xl border border-[#CBD5FA] bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#566099]">Overall Verdict</p>
                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full px-4 py-1.5 text-base font-black border ${
                        result.overall === "Verified"
                          ? "bg-[#E8F8F0] text-[#059669] border-[#86EFAC]"
                          : result.overall === "Contains false claims" || result.overall.toLowerCase().includes("false")
                          ? "bg-[#FDE8E8] text-[#E11D48] border-[#FCA5A5]"
                          : result.overall === "Partly true / mixed"
                          ? "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]"
                          : "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]"
                      }`}
                    >
                      {result.overall}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#566099]">
                    Reviewed against primary records and fact-check registries.
                  </p>
                </div>

                {/* Risk Score Card */}
                <div className="rounded-2xl border border-[#CBD5FA] bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#566099]">Risk Assessment</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#1D2760] font-heading">{result.riskScore}</span>
                    <span className="text-sm font-bold text-[#566099]">/100</span>
                    <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#3D52D5]/10 text-[#3D52D5]">
                      {result.riskLevel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#566099]">
                    Misinformation vulnerability rating.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer with QR Code */}
            <div className="flex items-end justify-between gap-6 border-t-2 border-[#CBD5FA] pt-6">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#3D52D5]" />
                  <p className="text-sm font-bold text-[#1D2760]">Scan to Verify Online</p>
                </div>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#566099]">
                  This QR contains the claim verdicts, overall verdict, risk score, and date checked.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#3D52D5]/10 px-3 py-1 text-[11px] font-bold text-[#3D52D5]">
                  <span>🛡️ VASTAV CERTIFIED CREDENTIAL</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#1D2760]">
                  Know what&apos;s real before you forward.
                </p>
              </div>
              <div
                ref={certificateQrRef}
                aria-label="QR code containing the verification summary"
                className="grid h-[200px] w-[200px] shrink-0 place-items-center rounded-2xl border-2 border-[#CBD5FA] bg-white p-2 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
