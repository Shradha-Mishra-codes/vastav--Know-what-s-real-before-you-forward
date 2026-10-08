"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Send, X, Square } from "lucide-react";
import { SakhiAttachment } from "@/lib/types";

interface ComposerProps {
  onSendMessage: (text: string, attachments?: SakhiAttachment[]) => void;
  isLoading: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: (onTranscript: (t: string) => void) => void;
  onStopRecording: () => void;
  language: string;
  isRTL?: boolean;
}

const PLACEHOLDERS: Record<string, string> = {
  en: "Ask Sakhi anything or paste a forward...",
  hi: "सखी से कुछ भी पूछें या मैसेज पेस्ट करें...",
  hinglish: "Sakhi se poocho ya forward paste karo...",
  mr: "सखीला काहीही विचारा किंवा मेसेज पेस्ट करा...",
  ur: "سکھی سے کچھ بھی پوچھیں یا میسج پیسٹ کریں...",
  ta: "சகியிடம் எதையும் கேளுங்கள்...",
};

export default function Composer({
  onSendMessage,
  isLoading,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  language,
  isRTL = false,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<SakhiAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea up to ~4 lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(text, attachments);
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 3) {
      alert("You can attach up to 3 files per message.");
      return;
    }

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isTxt = file.type === "text/plain";

      if (!isImg && !isPdf && !isTxt) {
        alert(`File format "${file.name}" is not supported. Please attach JPG, PNG, WebP, PDF or TXT.`);
        return;
      }

      if (isImg && file.size > 8 * 1024 * 1024) {
        alert(`Image "${file.name}" exceeds the 8MB limit.`);
        return;
      }

      if ((isPdf || isTxt) && file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            kind: isImg ? "image" : "file",
            mimeType: file.type || (isPdf ? "application/pdf" : "text/plain"),
            name: file.name,
            data: base64Data,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const placeholder = PLACEHOLDERS[language] || PLACEHOLDERS.en;

  return (
    <div className="border-t border-border/80 bg-white/95 p-3 backdrop-blur-md">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="group relative flex items-center gap-1.5 rounded-lg border border-border bg-[#F7F8FF] px-2 py-1 text-xs text-ink"
            >
              {att.kind === "image" && att.data && (
                <img
                  src={att.data}
                  alt={att.name || "Preview"}
                  className="h-5 w-5 rounded object-cover"
                />
              )}
              <span className="max-w-[120px] truncate font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                aria-label={`Remove ${att.name}`}
                className="ml-1 rounded-full p-0.5 text-mut hover:bg-rose-100 hover:text-rose-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording status pill */}
      {isRecording && (
        <div className="flex items-center justify-between mb-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
            <span className="font-semibold">
              Recording voice ({recordingSeconds}s)... Speak clearly
            </span>
          </div>
          <button
            type="button"
            onClick={onStopRecording}
            className="flex items-center gap-1 font-bold text-rose-800 hover:underline"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Done</span>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
          multiple
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || attachments.length >= 3}
          aria-label="Attach file or photo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 text-mut transition-colors hover:border-brand-1 hover:bg-[#F7F8FF] hover:text-brand-1 disabled:opacity-40"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Text Input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            dir={isRTL ? "rtl" : "ltr"}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-border/80 bg-[#F7F8FF] px-3 py-2 text-sm text-ink placeholder:text-mut/70 focus:border-brand-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-1/20 transition-all max-h-28"
          />
        </div>

        {/* Mic Button */}
        <button
          type="button"
          onClick={() => {
            if (isRecording) {
              onStopRecording();
            } else {
              onStartRecording((transcript) => {
                setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
              });
            }
          }}
          disabled={isLoading}
          aria-label={isRecording ? "Stop recording voice" : "Record voice note"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
            isRecording
              ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-300"
              : "border-border/80 text-mut hover:border-brand-1 hover:bg-[#F7F8FF] hover:text-brand-1"
          } disabled:opacity-40`}
        >
          <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && attachments.length === 0)}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#3D52D5] to-[#7A4FE0] text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
