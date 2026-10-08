"use client";

import React from "react";
import { Volume2, Square, ArrowRight, FileText, Image as ImageIcon, Music } from "lucide-react";
import { SakhiMessage, SakhiCheckPayload } from "@/lib/types";

interface MessageBubbleProps {
  message: SakhiMessage;
  isSpeaking: boolean;
  onSpeak: (text: string, id: string) => void;
  onStopSpeaking: () => void;
  onRunCheck: (payload: SakhiCheckPayload) => void;
}

/**
 * Safely parse simple markdown (bold, lists, linebreaks) into React nodes
 * without dangerouslySetInnerHTML.
 */
function renderSafeMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // Check if line is a bullet
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
    const content = isBullet ? line.trim().slice(2) : line;

    // Split on **bold**
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    const parsedElements = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIdx} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-1.5 my-0.5 ml-1">
          <span className="text-brand-1 font-bold">•</span>
          <span>{parsedElements}</span>
        </div>
      );
    }

    return (
      <React.Fragment key={lineIdx}>
        {parsedElements}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function MessageBubble({
  message,
  isSpeaking,
  onSpeak,
  onStopSpeaking,
  onRunCheck,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-3 transition-opacity`}
    >
      {/* Attachments rendering */}
      {message.attachments && message.attachments.length > 0 && (
        <div className={`flex flex-wrap gap-2 mb-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
          {message.attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white/90 px-2.5 py-1 text-xs text-ink shadow-sm"
            >
              {att.kind === "image" && <ImageIcon className="h-3.5 w-3.5 text-brand-1" />}
              {att.kind === "file" && <FileText className="h-3.5 w-3.5 text-brand-2" />}
              {att.kind === "audio" && <Music className="h-3.5 w-3.5 text-brand-3" />}
              <span className="max-w-[140px] truncate font-medium">
                {att.name || (att.kind === "image" ? "Photo" : "File")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bubble text */}
      <div
        className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-r from-[#3D52D5] to-[#7A4FE0] text-white rounded-br-xs"
            : "border border-border/80 bg-white text-ink rounded-bl-xs"
        }`}
      >
        <div>{renderSafeMarkdown(message.content)}</div>

        {/* Action: Run full check in Vastav */}
        {message.canRunCheck && message.checkPayload && (
          <div className="mt-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => onRunCheck(message.checkPayload!)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3D52D5] to-[#7A4FE0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Run full check in Vastav</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Audio TTS speaker button for bot replies */}
      {!isUser && message.content && (
        <div className="mt-1 flex items-center gap-2 px-1">
          {isSpeaking ? (
            <button
              type="button"
              onClick={onStopSpeaking}
              aria-label="Stop reading aloud"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSpeak(message.content, message.id)}
              aria-label="Read reply aloud"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-mut hover:text-ink hover:bg-white/80 transition-colors"
            >
              <Volume2 className="h-3 w-3" />
              <span>Read aloud</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
