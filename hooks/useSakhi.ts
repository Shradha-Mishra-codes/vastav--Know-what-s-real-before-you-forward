"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SakhiMessage,
  SakhiAttachment,
  SakhiCheckPayload,
  SakhiResponse,
} from "@/lib/types";

const SAKHI_STORAGE_KEY = "Vaastav-sakhi-chat";
const SAKHI_PREFS_KEY = "Vaastav-sakhi-prefs";
const MAX_MESSAGES = 40;

const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  hinglish: "hi-IN",
  mr: "mr-IN",
  ur: "ur-IN",
  ta: "ta-IN",
};

const WELCOME_MESSAGES: Record<string, { text: string; chips: string[] }> = {
  en: {
    text: "Hey! I'm Sakhi, your friend for fact-checking. Received a WhatsApp forward or news link you're unsure about? Share it with me, and we'll see what's really going on!",
    chips: ["Check a forward for me", "What do the verdicts mean?", "Is this message a scam?"],
  },
  hi: {
    text: "नमस्ते! मैं सखी हूँ, आपकी फ़ैक्ट-चेकिंग दोस्त। क्या कोई ऐसा व्हाट्सऐप फ़ॉरवर्ड या दावा मिला है जिसपर शक है? मुझे भेजिए, हम मिलकर सच जानेंगे!",
    chips: ["एक मैसेज चेक करो", "फैसलों का मतलब क्या है?", "क्या यह मैसेज स्कैम है?"],
  },
  hinglish: {
    text: "Hey! Main Sakhi hoon, aapki fact-checking dost. WhatsApp pe koi forward ya link aaya jispe doubt hai? Mujhe share karo, check karte hain kya scene hai!",
    chips: ["Ye forward check karo", "Verdicts ka kya matlab hai?", "Kya ye scam hai?"],
  },
  mr: {
    text: "नमस्कार! मी सखी, तुमची फॅक्ट-चेकिंग मैत्रीण. व्हॉट्सॲपवर आलेला मेसेज किंवा बातमी खोटी वाटतेय का? मला सांगा, आपण मिळून सत्य तपासूया!",
    chips: ["हा मेसेज तपासा", "निकालांचा अर्थ काय?", "हा मेसेज घोटाळा आहे का?"],
  },
  ur: {
    text: "سلام! میں سکھی ہوں، آپ کی فیکٹ چیکنگ دوست۔ کیا کوئی ایسا واٹس ایپ میسج یا خبر ہے جس پر شک ہے؟ مجھے بتائیں، ہم مل کر سچ جانیں گے!",
    chips: ["یہ میسج چیک کریں", "فیصلوں کا کیا مطلب ہے؟", "کیا یہ میسج دھوکہ ہے؟"],
  },
  ta: {
    text: "வணக்கம்! நான் சகி, உங்கள் உண்மை அறியும் தோழி. வாட்ஸ்அப் ஃபார்வர்டு அல்லது செய்தியில் சந்தேகம் உள்ளதா? என்னிடம் பகிருங்கள், உண்மை என்னவென்று பார்ப்போம்!",
    chips: ["இதை சரிபார்க்கவும்", "முடிவுகளின் பொருள் என்ன?", "இது மோசடியா?"],
  },
};

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, "")
    .replace(/[*_#`~[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface UseSakhiProps {
  currentLanguage: string;
  onLanguageChange?: (lang: string) => void;
  recentChecks?: Array<{ claim: string; verdict: string }>;
  onRunCheck?: (payload: SakhiCheckPayload) => void;
}

export function useSakhi({
  currentLanguage,
  onLanguageChange,
  recentChecks = [],
  onRunCheck,
}: UseSakhiProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SakhiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Speech Recognition
  const speechRecognitionRef = useRef<any>(null);

  // Speech synthesis
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load chat & preferences from localStorage
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(SAKHI_STORAGE_KEY);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not load Sakhi chat from storage:", e);
    }

    // Initialize with welcome message
    const welcome = WELCOME_MESSAGES[currentLanguage] || WELCOME_MESSAGES.en;
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: welcome.text,
        suggestions: welcome.chips,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Save chat to localStorage whenever it changes (strip raw base64 data to save storage quota)
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const lightweightMessages = messages.slice(-MAX_MESSAGES).map((msg) => ({
        ...msg,
        attachments: msg.attachments?.map((att) => ({
          kind: att.kind,
          mimeType: att.mimeType,
          name: att.name,
          // Exclude large data property
        })),
      }));
      localStorage.setItem(SAKHI_STORAGE_KEY, JSON.stringify(lightweightMessages));
    } catch (e) {
      console.warn("Could not persist Sakhi chat:", e);
    }
  }, [messages]);

  // Handle TTS
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  const speakText = useCallback(
    (text: string, messageId: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      stopSpeaking();
      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.95;
      utterance.lang = SPEECH_LANG_MAP[currentLanguage] || "en-IN";

      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };

      speechRef.current = utterance;
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [currentLanguage, stopSpeaking]
  );

  // Send message
  const sendMessage = useCallback(
    async (text: string, attachments?: SakhiAttachment[]) => {
      if (!text.trim() && (!attachments || attachments.length === 0)) return;

      const userMsgId = `user-${Date.now()}`;
      const userMessage: SakhiMessage = {
        id: userMsgId,
        role: "user",
        content: text.trim(),
        attachments: attachments || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const payloadMessages = [...messages, userMessage].slice(-15).map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

        const res = await fetch("/api/sakhi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            language: currentLanguage,
            context: {
              recentChecks: recentChecks.slice(0, 5),
            },
          }),
        });

        const data: SakhiResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get reply from Sakhi");
        }

        const botMsgId = `bot-${Date.now()}`;
        const botMessage: SakhiMessage = {
          id: botMsgId,
          role: "assistant",
          content: data.reply,
          suggestions: data.suggestions || [],
          canRunCheck: data.canRunCheck,
          checkPayload: data.checkPayload,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, botMessage]);

        if (readAloud) {
          speakText(data.reply, botMsgId);
        }
      } catch (err: any) {
        console.error("Error communicating with Sakhi:", err);
        const errMsgId = `error-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errMsgId,
            role: "assistant",
            content:
              "Sorry, I had trouble connecting for a moment. Please tap to try again or ask in a different way!",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, currentLanguage, recentChecks, readAloud, speakText]
  );

  // Voice input handling
  const startRecording = useCallback(
    (onTranscript?: (transcript: string) => void) => {
      // Check for browser SpeechRecognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = SPEECH_LANG_MAP[currentLanguage] || "hi-IN";

          recognition.onresult = (event: any) => {
            let fullTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript;
            }
            if (onTranscript && fullTranscript) {
              onTranscript(fullTranscript);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("SpeechRecognition error:", e);
            stopRecording();
          };

          recognition.onend = () => {
            setIsRecording(false);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
          setIsRecording(true);
          setRecordingSeconds(0);

          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds((s) => s + 1);
          }, 1000);

          return;
        } catch (e) {
          console.warn("Could not start SpeechRecognition, falling back to MediaRecorder", e);
        }
      }

      // MediaRecorder fallback
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                audioChunksRef.current.push(e.data);
              }
            };

            recorder.onstop = async () => {
              stream.getTracks().forEach((track) => track.stop());
              const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Audio = reader.result as string;
                sendMessage("Voice note attached", [
                  {
                    kind: "audio",
                    mimeType: "audio/webm",
                    name: `Voice note (${recordingSeconds}s)`,
                    data: base64Audio,
                  },
                ]);
              };
              reader.readAsDataURL(audioBlob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingSeconds(0);

            recordingTimerRef.current = setInterval(() => {
              setRecordingSeconds((s) => s + 1);
            }, 1000);
          })
          .catch((err) => {
            console.error("Microphone access denied:", err);
            alert("Microphone permission was denied or is not supported in this browser.");
          });
      }
    },
    [currentLanguage, recordingSeconds, sendMessage]
  );

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const clearChat = useCallback(() => {
    stopSpeaking();
    const welcome = WELCOME_MESSAGES[currentLanguage] || WELCOME_MESSAGES.en;
    const initial = [
      {
        id: `welcome-${Date.now()}`,
        role: "assistant" as const,
        content: welcome.text,
        suggestions: welcome.chips,
        timestamp: Date.now(),
      },
    ];
    setMessages(initial);
    try {
      localStorage.setItem(SAKHI_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}
  }, [currentLanguage, stopSpeaking]);

  const runFullCheck = useCallback(
    (payload: SakhiCheckPayload) => {
      setIsOpen(false);
      if (onRunCheck) {
        onRunCheck(payload);
      }
    },
    [onRunCheck]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopRecording();
    };
  }, [stopSpeaking, stopRecording]);

  return {
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
    isRTL: currentLanguage === "ur",
  };
}
