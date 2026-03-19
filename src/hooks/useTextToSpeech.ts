"use client";

import { useState, useRef, useCallback } from "react";

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (text: string, langCode?: string): Promise<void> => {
    setError(null);

    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      if (langCode) {
        utterance.lang = langCode;
      }

      utterance.rate = 0.9; // Slightly slower for medical clarity
      utterance.pitch = 1;

      setIsPlaying(true);

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        setError("Could not play audio");
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsPlaying(false);
      const message =
        err instanceof Error ? err.message : "Could not generate speech";
      setError(message);
      throw err;
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  return { speak, stop, isPlaying, error };
}
