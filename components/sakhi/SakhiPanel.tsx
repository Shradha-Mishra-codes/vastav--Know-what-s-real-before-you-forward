"use client";

import React, { useRef, useEffect } from "react";
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Languages,
  Sparkles,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import VaastavLogo from "../VaastavLogo";
import { SakhiMessage, SakhiAttachment, SakhiCheckPayload } from "@/lib/types";

interface SakhiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: SakhiMessage[];
  isLoading: boolean;
  readAloud: boolean;
  onToggleReadAloud: () => void;
  speakingMessageId: string | null;
  onSpeak: (text: string, id: string) => void;
  onStopSpeaking: () => void;
  onSendMessage: (text: string, attachments?: SakhiAttachment[]) => void;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: (onTranscript: (t: string) => void) => void;
  onStopRecording: () => void;
  onClearChat: () => void;
  onRunCheck: (payload: SakhiCheckPayload) => void;
  language: string;
  onLanguageChange?: (lang: string) => void;
  isRTL?: boolean;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "hinglish", label: "Hinglish" },
  { code: "mr", label: "मराठी" },
  { code: "ur", label: "اردو" },
  { code: "ta", label: "தமிழ்" },
];

export default function SakhiPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  readAloud,
  onToggleReadAloud,
  speakingMessageId,
  onSpeak,
  onStopSpeaking,
  onSendMessage,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onClearChat,
  onRunCheck,
  language,
  onLanguageChange,
  isRTL = false,
}: SakhiPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = React.useState(false);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap / focus when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active suggestions from latest message if it's from assistant
  const lastMessage = messages[messages.length - 1];
  const activeSuggestions =
    lastMessage && lastMessage.role === "assistant" && lastMessage.suggestions
      ? lastMessage.suggestions
      : [];

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Chat with Sakhi"
      aria-modal="true"
      className="fixed z-50 flex flex-col overflow-hidden bg-white/95 border border-white shadow-2xl backdrop-blur-xl transition-all duration-300
        /* Desktop */
        sm:bottom-24 sm:right-6 sm:w-[380px] sm:h-[560px] sm:rounded-[22px] sm:shadow-[0_22px_50px_rgba(61,82,213,0.28)]
        /* Mobile: Bottom Sheet */
        bottom-0 left-0 right-0 w-full max-h-[85dvh] h-[85dvh] rounded-t-[24px] sm:max-h-none sm:left-auto"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Header */}
      <header className="relative flex items-center justify-between bg-gradient-to-r from-[#3D52D5] to-[#7A4FE0] px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 p-1 ring-2 ring-white/30 backdrop-blur-sm">
            <VaastavLogo className="h-7 w-7 object-contain" size={28} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#3D52D5] bg-[#2FD08F]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold tracking-tight font-heading">
                Sakhi <span className="text-xs font-normal opacity-90">(सखी)</span>
              </h2>
            </div>
            <p className="text-[11px] text-white/80 leading-none mt-0.5 flex items-center gap-1">
              <span>Your friend for fact-checking</span>
              <span>•</span>
              <span className="text-emerald-300 font-medium">online</span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu((v) => !v)}
              aria-label="Change chat language"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <Languages className="h-4 w-4" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 top-10 z-50 w-32 rounded-xl border border-border bg-white py-1 shadow-xl text-ink">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      if (onLanguageChange) onLanguageChange(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[#F7F8FF] ${
                      language === lang.code ? "font-bold text-brand-1 bg-[#F7F8FF]" : ""
                    }`}
                  >
                    <span>{lang.label}</span>
                    {language === lang.code && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Read aloud toggle */}
          <button
            type="button"
            onClick={onToggleReadAloud}
            aria-label={readAloud ? "Disable reading aloud" : "Enable reading aloud"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              readAloud ? "bg-white text-brand-1" : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {readAloud ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Clear chat */}
          <button
            type="button"
            onClick={onClearChat}
            aria-label="Clear chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Container */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F9FAFE]/80"
        aria-live="polite"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSpeaking={speakingMessageId === msg.id}
            onSpeak={onSpeak}
            onStopSpeaking={onStopSpeaking}
            onRunCheck={onRunCheck}
          />
        ))}

        {/* Loading typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs border border-border/80 bg-white px-4 py-3 text-sm text-mut shadow-sm w-fit">
            <span className="h-2 w-2 rounded-full bg-brand-1 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-brand-2 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-brand-3 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {activeSuggestions.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-white/70 border-t border-border/60">
          {activeSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(suggestion)}
              className="inline-flex items-center gap-1 rounded-full border border-border/90 bg-[#F7F8FF] px-2.5 py-1 text-xs font-semibold text-ink transition-all hover:border-brand-1 hover:bg-brand-1 hover:text-white active:scale-95 shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-brand-2" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <Composer
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        language={language}
        isRTL={isRTL}
      />
    </div>
  );
}
