"use client";

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
  const targetLang = getLanguageByCode(message.targetLang);
  const sourceLang = getLanguageByCode(message.sourceLang);
  const isRtl = targetLang?.dir === "rtl";
  const isProvider = message.role === "provider";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Role indicator */}
      <span
        className={`text-xs font-medium px-1 ${
          isProvider
            ? "text-emerald-600 self-end"
            : "text-medical-600 self-start"
        }`}
      >
        {isProvider ? "Provider" : "Patient"} {sourceLang?.flag}
      </span>

      {/* Original text */}
      <div className={`max-w-[85%] ${isProvider ? "self-end" : "self-start"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isProvider
              ? "bg-emerald-50 border border-emerald-200 rounded-tr-sm"
              : "bg-white border border-slate-200 rounded-tl-sm"
          }`}
        >
          <p className="text-sm text-slate-600">{message.originalText}</p>
        </div>
      </div>

      {/* Translated text */}
      <div className={`max-w-[85%] ${isProvider ? "self-start" : "self-end"}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isProvider
              ? "bg-emerald-600 rounded-tl-sm"
              : "bg-medical-600 rounded-tr-sm"
          }`}
        >
          <p
            className="text-sm text-white"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {message.translatedText}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <span
              className={`text-xs ${
                isProvider ? "text-emerald-200" : "text-medical-200"
              }`}
            >
              {targetLang?.flag} {targetLang?.label}
            </span>
            <button
              onClick={onPlay}
              aria-label={isPlaying ? "Stop audio" : "Play translation"}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-white rounded-full animate-sound-wave"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        height: "8px",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              <span className="text-xs text-white">
                {isPlaying ? "Playing" : "Play"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
