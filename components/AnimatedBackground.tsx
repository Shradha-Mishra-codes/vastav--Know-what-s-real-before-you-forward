"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Lock, AlertTriangle, Search, CheckCircle2 } from "lucide-react";

interface RoamingItemConfig {
  id: number;
  type: "card" | "stamp" | "icon";
  text?: string;
  subtext?: string;
  iconName?: string;
  topPercent: number;
  leftPercent: number;
  roamClass: string;
  durationSec: number;
  delaySec: number;
  isBackgroundLayer: boolean;
}

const ITEMS_POOL = [
  {
    type: "card" as const,
    text: "Free ₹5000 to every woman! Forward to 10 groups to register.",
    subtext: "⚠️ Suspicious forward",
    top: 68,
    left: 42,
  },
  {
    type: "card" as const,
    text: "Your account will be blocked within 24h. Click here to verify.",
    subtext: "⚠️ Suspicious forward",
    top: 80,
    left: 22,
  },
  {
    type: "card" as const,
    text: "Click link to claim your tax refund immediately.",
    subtext: "⚠️ Suspicious forward",
    top: 15,
    left: 36,
  },
  {
    type: "card" as const,
    text: "Forward to 10 contacts to claim 3 months free recharge.",
    subtext: "⚠️ Suspicious forward",
    top: 32,
    left: 82,
  },
  {
    type: "card" as const,
    text: "Govt announces free laptops for all students. Apply tonight.",
    subtext: "⚠️ Suspicious forward",
    top: 86,
    left: 55,
  },
  {
    type: "card" as const,
    text: "Hot water with lemon cures virus permanently! Forward to save lives.",
    subtext: "⚠️ Suspicious forward",
    top: 48,
    left: 12,
  },
  {
    type: "stamp" as const,
    text: "ENCRYPTED",
    top: 24,
    left: 66,
  },
  {
    type: "stamp" as const,
    text: "THREAT BLOCKED",
    top: 88,
    left: 78,
  },
  {
    type: "stamp" as const,
    text: "ENCRYPTED",
    top: 72,
    left: 16,
  },
  {
    type: "stamp" as const,
    text: "VERIFIED",
    top: 58,
    left: 85,
  },
  {
    type: "stamp" as const,
    text: "SECURE",
    top: 8,
    left: 84,
  },
  {
    type: "icon" as const,
    iconName: "search",
    top: 6,
    left: 52,
  },
  {
    type: "icon" as const,
    iconName: "shield",
    top: 42,
    left: 5,
  },
  {
    type: "icon" as const,
    iconName: "lock",
    top: 92,
    left: 4,
  },
];

const WAVE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'><path d='M0,0 C150,80 350,-30 500,45 C650,120 900,-10 1200,35 L1200,120 L0,120 Z' fill='%23ffffff'/></svg>";

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [items, setItems] = useState<RoamingItemConfig[]>([]);

  useEffect(() => {
    setMounted(true);

    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const isMobile = window.innerWidth < 768;
    const selectedPool = isMobile ? ITEMS_POOL.slice(0, 8) : ITEMS_POOL;

    const roamingItems: RoamingItemConfig[] = selectedPool.map((item, index) => {
      const roamNum = (index % 6) + 1;
      const duration = 22 + ((index * 3.7) % 14);
      const delay = (index * 2.1) % 8;
      const isBg = index % 2 === 1;

      return {
        id: index,
        type: item.type,
        text: item.text,
        subtext: item.subtext,
        iconName: item.iconName,
        topPercent: item.top,
        leftPercent: item.left,
        roamClass: `roam-${roamNum}`,
        durationSec: duration,
        delaySec: delay,
        isBackgroundLayer: isBg,
      };
    });

    setItems(roamingItems);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const animationStyle = isPaused ? { animationPlayState: "paused" } : undefined;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Layer A: 3 blurred drifting color blobs */}
      <div
        className="absolute rounded-full pointer-events-none filter blur-[95px] opacity-75 motion-reduce:opacity-40 motion-reduce:animate-none"
        style={{
          width: "560px",
          height: "560px",
          background: "#B9A5FF",
          top: "-12%",
          left: "-10%",
          animation: "blob-drift-1 18s ease-in-out infinite alternate",
          ...animationStyle,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none filter blur-[95px] opacity-65 motion-reduce:opacity-40 motion-reduce:animate-none"
        style={{
          width: "520px",
          height: "520px",
          background: "#8FE3D0",
          top: "15%",
          right: "-8%",
          animation: "blob-drift-2 15s ease-in-out infinite alternate",
          ...animationStyle,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none filter blur-[100px] opacity-70 motion-reduce:opacity-40 motion-reduce:animate-none"
        style={{
          width: "600px",
          height: "600px",
          background: "#FFC6E0",
          bottom: "-15%",
          left: "25%",
          animation: "blob-drift-3 22s ease-in-out infinite alternate",
          ...animationStyle,
        }}
      />

      {/* Layer B: Roaming background messages and badges moving all around screen */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden motion-reduce:hidden">
          {items.map((item) => {
            const sizeStyle = item.isBackgroundLayer
              ? "scale-90 opacity-40 blur-[0.5px]"
              : "scale-100 opacity-75";

            return (
              <div
                key={item.id}
                className={`absolute pointer-events-none transition-opacity ${sizeStyle}`}
                style={{
                  top: `${item.topPercent}%`,
                  left: `${item.leftPercent}%`,
                  animation: `${item.roamClass} ${item.durationSec}s ease-in-out infinite alternate`,
                  animationDelay: `${item.delaySec}s`,
                  ...animationStyle,
                }}
              >
                {item.type === "card" && (
                  <div className="rounded-2xl border border-white/90 bg-white/80 px-3.5 py-2.5 shadow-[0_10px_28px_rgba(61,82,213,0.13)] backdrop-blur-md max-w-[210px]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600">
                      <span>{item.subtext}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#1D2760] leading-snug line-clamp-2">
                      &ldquo;{item.text}&rdquo;
                    </p>
                  </div>
                )}

                {item.type === "stamp" && (
                  <div>
                    {item.text === "THREAT BLOCKED" && (
                      <div className="rounded-full border border-rose-400 bg-rose-50/90 px-3.5 py-1 text-[11px] font-mono font-bold tracking-wider text-rose-600 shadow-sm backdrop-blur-sm uppercase">
                        {item.text}
                      </div>
                    )}
                    {item.text === "ENCRYPTED" && (
                      <div className="flex items-center gap-1.5 rounded-full border border-[#CBD5FA] bg-white/80 px-3.5 py-1 text-[11px] font-mono font-bold tracking-wider text-[#3D52D5] shadow-sm backdrop-blur-sm uppercase">
                        <Lock className="h-3 w-3 text-[#3D52D5]" />
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.text === "VERIFIED" && (
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50/90 px-3.5 py-1 text-[11px] font-mono font-bold tracking-wider text-emerald-600 shadow-sm backdrop-blur-sm uppercase">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.text === "SECURE" && (
                      <div className="flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50/90 px-3.5 py-1 text-[11px] font-mono font-bold tracking-wider text-[#7A4FE0] shadow-sm backdrop-blur-sm uppercase">
                        <ShieldCheck className="h-3 w-3 text-[#7A4FE0]" />
                        <span>{item.text}</span>
                      </div>
                    )}
                  </div>
                )}

                {item.type === "icon" && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/90 bg-white/70 shadow-sm backdrop-blur-sm text-[#3D52D5]">
                    {item.iconName === "shield" && <ShieldCheck className="h-5 w-5" />}
                    {item.iconName === "lock" && <Lock className="h-5 w-5" />}
                    {item.iconName === "search" && <Search className="h-5 w-5 text-[#3D52D5]" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Layer C: Three wave layers along the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-36 overflow-hidden pointer-events-none motion-reduce:hidden">
        {/* Wave 1: opacity .55, 20s */}
        <div
          className="absolute bottom-0 h-full w-[200%]"
          style={{
            backgroundImage: `url("${WAVE_SVG}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "50% 100%",
            opacity: 0.55,
            animation: "wave-scroll 20s linear infinite",
            ...animationStyle,
          }}
        />

        {/* Wave 2: opacity .40, 13s reverse */}
        <div
          className="absolute bottom-0 h-full w-[200%]"
          style={{
            backgroundImage: `url("${WAVE_SVG}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "50% 100%",
            opacity: 0.4,
            animation: "wave-scroll-reverse 13s linear infinite",
            ...animationStyle,
          }}
        />

        {/* Wave 3: opacity .28, 8s */}
        <div
          className="absolute bottom-0 h-full w-[200%]"
          style={{
            backgroundImage: `url("${WAVE_SVG}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "50% 100%",
            opacity: 0.28,
            animation: "wave-scroll 8s linear infinite",
            ...animationStyle,
          }}
        />
      </div>
    </div>
  );
}
