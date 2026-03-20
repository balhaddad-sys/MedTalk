"use client";

import { useState, useRef, useCallback } from "react";

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

function getSpeechLangTag(lang?: string): string {
  if (!lang) return "en-US";
  return SPEECH_LANG_MAP[lang] || SPEECH_LANG_MAP[lang.split("-")[0]] || lang;
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
      // Revoke blob URL to prevent memory leaks
      const src = audioRef.current.src;
      if (src && src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
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
        const utterance = new SpeechSynthesisUtterance(text);
        const synth = window.speechSynthesis;
        const langTag = getSpeechLangTag(lang);
        utterance.lang = langTag;

        const voices = synth.getVoices();
        const matchingVoice =
          voices.find((voice) => voice.lang.toLowerCase() === langTag.toLowerCase()) ||
          voices.find((voice) => voice.lang.toLowerCase().startsWith(langTag.slice(0, 2).toLowerCase()));

        if (matchingVoice) {
          utterance.voice = matchingVoice;
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

  const speak = useCallback(
    async (text: string, lang?: string): Promise<string> => {
      setError(null);
      stop();
      setIsLoading(true);

      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return await speakWithBrowser(text, lang);
        }

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
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
      } catch (err) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            return await speakWithBrowser(text, lang);
          } catch (browserErr) {
            err = browserErr;
          }
        }

        setIsLoading(false);
        setIsPlaying(false);
        const message =
          err instanceof Error ? err.message : "Could not generate speech";
        setError(message);
        throw err;
      }
    },
    [speakWithBrowser, stop]
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
