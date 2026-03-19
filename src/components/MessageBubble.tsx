"use client";

import { useState } from "react";
import { Message } from "@/types";
import { getLanguageByCode } from "@/lib/languages";

interface MessageBubbleProps {
  message: Message;
  onPlay: () => void;
  isPlaying: boolean;
}

export default function MessageBubble({
  message,
  onPlay,
  isPlaying,
}: MessageBubbleProps) {
  const [showBackTranslation, setShowBackTranslation] = useState(false);
  const targetLang = getLanguageByCode(message.targetLang);
  const sourceLang = getLanguageByCode(message.sourceLang);
  const isRtl = targetLang?.dir === "rtl";
  const isProvider = message.role === "provider";

  const confidenceColor =
    message.confidence === "high"
      ? "bg-green-500"
      : message.confidence === "low"
        ? "bg-red-500"
        : "bg-yellow-500";

  const confidenceLabel =
    message.confidence === "high"
      ? "High confidence"
      : message.confidence === "low"
        ? "Low confidence"
        : "Medium confidence";

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex flex-col gap-1.5 w-full slide-in ${isProvider ? "items-start" : "items-end"}`}
      role="article"
      aria-label={`${message.role} message`}
    >
      {/* Role label + timestamp */}
      <div className={`flex items-center gap-2 px-2 ${isProvider ? "" : "flex-row-reverse"}`}>
        <span className={`text-xs font-medium ${isProvider ? "text-violet-500" : "text-medical-500"}`}>
          {isProvider ? "\u{1F469}\u200D\u2695\uFE0F Provider" : "\u{1F9D1} Patient"}
        </span>
        <span className="text-xs text-slate-300">{"\u2022"}</span>
        <span className="text-xs text-slate-400">
          {sourceLang?.label} {"\u2192"} {targetLang?.label}
        </span>
        <span className="text-xs text-slate-300">{"\u2022"}</span>
        <span className="text-xs text-slate-400">{timestamp}</span>
        {message.edited && (
          <span className="text-xs text-slate-400 italic">(edited)</span>
        )}
      </div>

      {/* Emergency banner */}
      {message.isEmergency && (
        <div className={`max-w-[90%] ${isProvider ? "self-start" : "self-end"}`}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold animate-pulse">
            <span>{"\u{1F6A8}"}</span>
            EMERGENCY DETECTED - Verify patient safety immediately
          </div>
        </div>
      )}

      {/* Original text */}
      <div className={`max-w-[90%] ${isProvider ? "self-start" : "self-end"}`}>
        <div
          className={`px-4 py-2 rounded-2xl text-sm ${
            isProvider
              ? "bg-violet-50 border border-violet-100 rounded-tl-sm text-slate-600"
              : "bg-slate-100 border border-slate-200 rounded-tr-sm text-slate-600"
          }`}
          lang={sourceLang?.code}
          dir={sourceLang?.dir === "rtl" ? "rtl" : "ltr"}
        >
          <p>{message.originalText}</p>
        </div>
      </div>

      {/* Translated text with play button */}
      <div className={`max-w-[90%] ${isProvider ? "self-start" : "self-end"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isProvider
              ? "bg-violet-600 rounded-tl-sm"
              : "bg-medical-600 rounded-tr-sm"
          }`}
        >
          <p
            className="text-sm text-white"
            dir={isRtl ? "rtl" : "ltr"}
            lang={targetLang?.code}
          >
            {highlightMedicalTerms(message.translatedText, message.medicalTerms)}
          </p>

          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">
                {targetLang?.flag} {targetLang?.nativeLabel}
              </span>

              {/* Confidence indicator */}
              {message.confidence && (
                <div className="flex items-center gap-1" title={confidenceLabel}>
                  <div className={`w-2 h-2 rounded-full ${confidenceColor}`} />
                  <span className="text-xs text-white/50">{confidenceLabel}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Back-translation toggle */}
              {message.backTranslation && (
                <button
                  onClick={() => setShowBackTranslation(!showBackTranslation)}
                  className="px-2 py-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-xs text-white/80"
                  aria-label="Toggle back-translation verification"
                  title="Verify translation"
                >
                  {showBackTranslation ? "\u2716" : "\u21C4"} Verify
                </button>
              )}

              {/* Play button */}
              <button
                onClick={onPlay}
                aria-label={isPlaying ? "Stop audio" : "Play translation"}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <div className="flex items-center gap-0.5 h-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-white rounded-full animate-sound-wave"
                        style={{ animationDelay: `${i * 0.12}s`, height: "6px" }}
                      />
                    ))}
                  </div>
                ) : (
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                <span className="text-xs text-white font-medium">
                  {isPlaying ? "Playing..." : "Play"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Back-translation panel */}
        {showBackTranslation && message.backTranslation && (
          <div className="mt-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <p className="text-amber-700 font-medium mb-0.5">
              {"\u21C4"} Back-translation verification:
            </p>
            <p className="text-amber-800">{message.backTranslation}</p>
            <p className="text-amber-500 mt-1 text-[10px]">
              Compare with original to verify translation accuracy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMedicalTerms(
  text: string,
  medicalTerms?: string[]
): React.ReactNode {
  if (!medicalTerms || medicalTerms.length === 0) return text;

  // Simple term highlighting - wrap known medical terms in bold
  let result = text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort by length descending to match longer terms first
  const sorted = [...medicalTerms].sort((a, b) => b.length - a.length);
  const regex = new RegExp(
    `(${sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );

  let match;
  while ((match = regex.exec(result)) !== null) {
    if (match.index > lastIndex) {
      parts.push(result.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-bold underline decoration-white/40">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return text;
  if (lastIndex < result.length) {
    parts.push(result.slice(lastIndex));
  }

  return <>{parts}</>;
}
