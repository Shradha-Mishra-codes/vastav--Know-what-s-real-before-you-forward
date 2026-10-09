"use client";

import React, { useState, useEffect, useRef } from "react";
import SakhiPanel from "./SakhiPanel";
import { useSakhi } from "@/hooks/useSakhi";
import { SakhiCheckPayload } from "@/lib/types";

interface SakhiWidgetProps {
  currentLanguage: string;
  onLanguageChange?: (lang: string) => void;
  recentChecks?: Array<{ claim: string; verdict: string }>;
  onRunCheck?: (payload: SakhiCheckPayload) => void;
}

const TOOLTIP_STORAGE_KEY = "Vaastav-sakhi-tooltip-opened";

export default function SakhiWidget({
  currentLanguage,
  onLanguageChange,
  recentChecks = [],
  onRunCheck,
}: SakhiWidgetProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    readAloud,
    setReadAloud,
    speakingMessageId,
    speakText,
    stopSpeaking,
    sendMessage,
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    clearChat,
    runFullCheck,
    isRTL,
  } = useSakhi({
    currentLanguage,
    onLanguageChange,
    recentChecks,
    onRunCheck,
  });

  // Tooltip lifecycle: appear 1s after load for 6s, then fade (unless already opened before)
  useEffect(() => {
    try {
      const alreadyOpened = localStorage.getItem(TOOLTIP_STORAGE_KEY);
      if (alreadyOpened) return;
    } catch (e) {}

    const showTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);

    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 7000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      setShowTooltip(false);
      try {
        localStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
      } catch (e) {}
      setIsOpen(true);
    } else {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      {/* Floating Sakhi Button & Tooltip Container */}
      <div
        className="fixed z-40 flex items-center gap-3
          /* Desktop */
          right-[22px] bottom-[22px]
          /* Mobile (<700px): elevated above bottom nav */
          max-[700px]:right-4 max-[700px]:bottom-20"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {/* Tooltip bubble (Desktop only, hidden on mobile) */}
        {showTooltip && !isOpen && (
          <div
            className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-semibold text-ink shadow-[0_10px_25px_rgba(61,82,213,0.18)] backdrop-blur-md animate-fade-in transition-all duration-300"
            role="status"
          >
            <span>Ask Sakhi anything</span>
            <span className="text-sm">✨</span>
          </div>
        )}

        {/* 62px circular button (56px on mobile) */}
        <div className="relative">
          {/* Pulsing ring */}
          <div className="sakhi-pulse-ring absolute inset-0 rounded-full bg-[#3D52D5]/35 pointer-events-none" />

          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggle}
            aria-label={isOpen ? "Close chat with Sakhi" : "Chat with Sakhi AI companion"}
            aria-expanded={isOpen}
            className="relative flex items-center justify-center rounded-full text-white shadow-[0_12px_32px_rgba(61,82,213,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-1/40
              w-[62px] h-[62px] max-[700px]:w-[56px] max-[700px]:h-[56px]"
            style={{
              background: "linear-gradient(135deg, #3D52D5 0%, #7A4FE0 100%)",
            }}
          >
            {/* Chat bubble with check icon */}
            <svg
              className="w-7 h-7 max-[700px]:w-6 max-[700px]:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              <polyline points="9 11 11 13 15 9" />
            </svg>

            {/* Online indicator dot */}
            <span
              className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2FD08F]"
              title="Online"
            />
          </button>
        </div>
      </div>

      {/* Floating Chat Panel */}
      <SakhiPanel
        isOpen={isOpen}
        onClose={handleClose}
        messages={messages}
        isLoading={isLoading}
        readAloud={readAloud}
        onToggleReadAloud={() => setReadAloud((v) => !v)}
        speakingMessageId={speakingMessageId}
        onSpeak={speakText}
        onStopSpeaking={stopSpeaking}
        onSendMessage={sendMessage}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onClearChat={clearChat}
        onRunCheck={runFullCheck}
        language={currentLanguage}
        onLanguageChange={onLanguageChange}
        isRTL={isRTL}
      />
    </>
  );
}
