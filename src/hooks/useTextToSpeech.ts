"use client";

import { useState, useRef, useCallback } from "react";
import {
  normalizeTextForSpeech,
  shouldEscalateMedicalVerification,
} from "@/lib/medicalSafety";

const SPEECH_LANG_MAP: Record<string, string> = {
  ar: "ar-SA",
  bn: "bn-BD",
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fa: "fa-IR",
  fr: "fr-FR",
  hi: "hi-IN",
  ja: "ja-JP",
  ko: "ko-KR",
  pt: "pt-BR",
  ru: "ru-RU",
  tl: "fil-PH",
  ur: "ur-PK",
  vi: "vi-VN",
  zh: "zh-CN",
  "zh-TW": "zh-TW",
};

// Languages where OpenAI TTS sounds better than browser voices
const PREFER_OPENAI: Set<string> = new Set(["en"]);

function getSpeechLangTag(lang?: string): string {
  if (!lang) return "en-US";
  return SPEECH_LANG_MAP[lang] || SPEECH_LANG_MAP[lang.split("-")[0]] || lang;
}

function hasBrowserVoice(lang?: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const langTag = getSpeechLangTag(lang);
  const voices = window.speechSynthesis.getVoices();
  return voices.some(
    (v) =>
      v.lang.toLowerCase() === langTag.toLowerCase() ||
      v.lang.toLowerCase().startsWith(langTag.slice(0, 2).toLowerCase())
  );
}

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speakWithBrowser = useCallback(
    async (text: string, lang?: string): Promise<string> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        throw new Error("Text-to-speech is not available on this device");
      }

      return new Promise<string>((resolve, reject) => {
        stop();
        const normalizedText = normalizeTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(normalizedText);
        const synth = window.speechSynthesis;
        const langTag = getSpeechLangTag(lang);
        utterance.lang = langTag;
        utterance.rate = shouldEscalateMedicalVerification(text) ? 0.88 : 0.93;

        const voices = synth.getVoices();
        // Prefer higher-quality voices (often labeled "Enhanced", "Premium", or not "compact")
        const exactMatches = voices.filter(
          (v) => v.lang.toLowerCase() === langTag.toLowerCase()
        );
        const prefixMatches = voices.filter(
          (v) => v.lang.toLowerCase().startsWith(langTag.slice(0, 2).toLowerCase())
        );
        const candidates = exactMatches.length > 0 ? exactMatches : prefixMatches;

        // Pick the best quality voice available
        const bestVoice =
          candidates.find((v) => v.name.toLowerCase().includes("premium")) ||
          candidates.find((v) => v.name.toLowerCase().includes("enhanced")) ||
          candidates.find((v) => v.name.toLowerCase().includes("neural")) ||
          candidates.find((v) => !v.name.toLowerCase().includes("compact")) ||
          candidates[0];

        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        utteranceRef.current = utterance;
        setIsLoading(false);
        setIsPlaying(true);

        utterance.onend = () => {
          utteranceRef.current = null;
          setIsPlaying(false);
          resolve("");
        };

        utterance.onerror = () => {
          utteranceRef.current = null;
          setIsPlaying(false);
          reject(new Error("Could not play audio"));
        };

        synth.speak(utterance);
      });
    },
    [stop]
  );

  const speakWithOpenAI = useCallback(
    async (text: string, lang?: string): Promise<string> => {
      const normalizedText = normalizeTextForSpeech(text);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalizedText, lang }),
      });

      if (!response.ok) {
        throw new Error("Text-to-speech failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      setIsLoading(false);
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setError("Could not play audio");
        audioRef.current = null;
      };

      await audio.play();
      return audioUrl;
    },
    []
  );

  const speak = useCallback(
    async (text: string, lang?: string): Promise<string> => {
      setError(null);
      stop();
      setIsLoading(true);

      const baseLang = lang?.split("-")[0] || "en";
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const browserHasVoice = hasBrowserVoice(lang);
      const useOpenAIPrimary = !offline && PREFER_OPENAI.has(baseLang);

      try {
        // Strategy: use browser native for non-English (better accents, instant),
        // OpenAI TTS for English (more natural). Fallback to the other if primary fails.
        if (useOpenAIPrimary) {
          return await speakWithOpenAI(text, lang);
        }
        if (browserHasVoice) {
          return await speakWithBrowser(text, lang);
        }
        if (!offline) {
          return await speakWithOpenAI(text, lang);
        }
        throw new Error("No voice available for this language offline");
      } catch (primaryErr) {
        // Fallback
        try {
          if (useOpenAIPrimary && browserHasVoice) {
            return await speakWithBrowser(text, lang);
          }
          if (!useOpenAIPrimary && !offline) {
            return await speakWithOpenAI(text, lang);
          }
        } catch {
          // Both failed
        }

        setIsLoading(false);
        setIsPlaying(false);
        const message =
          primaryErr instanceof Error ? primaryErr.message : "Could not generate speech";
        setError(message);
        throw primaryErr;
      }
    },
    [speakWithBrowser, speakWithOpenAI, stop]
  );

  const playUrl = useCallback(
    async (url: string) => {
      stop();
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      await audio.play();
    },
    [stop]
  );

  return { speak, playUrl, stop, isPlaying, isLoading, error };
}
