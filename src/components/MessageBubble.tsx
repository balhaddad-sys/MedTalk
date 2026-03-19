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
    <div className={`flex flex-col gap-1.5 w-full slide-in ${isProvider ? "items-start" : "items-end"}`}>
      {/* Role label */}
      <span className={`text-xs font-medium px-2 ${isProvider ? "text-violet-500" : "text-medical-500"}`}>
        {isProvider ? `\u{1F469}\u200D\u2695\uFE0F Provider` : `\u{1F9D1} Patient`}
        {" \u2022 "}
        {sourceLang?.label} {"\u2192"} {targetLang?.label}
      </span>

      {/* Original text */}
      <div className={`max-w-[90%] ${isProvider ? "self-start" : "self-end"}`}>
        <div className={`px-4 py-2 rounded-2xl text-sm ${
          isProvider
            ? "bg-violet-50 border border-violet-100 rounded-tl-sm text-slate-600"
            : "bg-slate-100 border border-slate-200 rounded-tr-sm text-slate-600"
        }`}>
          <p>{message.originalText}</p>
        </div>
      </div>

      {/* Translated text with play button */}
      <div className={`max-w-[90%] ${isProvider ? "self-start" : "self-end"}`}>
        <div className={`px-4 py-2.5 rounded-2xl ${
          isProvider
            ? "bg-violet-600 rounded-tl-sm"
            : "bg-medical-600 rounded-tr-sm"
        }`}>
          <p className="text-sm text-white" dir={isRtl ? "rtl" : "ltr"}>
            {message.translatedText}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-white/60">
              {targetLang?.flag} {targetLang?.nativeLabel}
            </span>
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
    </div>
  );
}
