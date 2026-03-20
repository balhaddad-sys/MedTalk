"use client";

import { useState, useRef, useCallback } from "react";

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, lang?: string): Promise<string> => {
      setError(null);
      stop();
      setIsLoading(true);

      try {
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
        setIsLoading(false);
        setIsPlaying(false);
        const message =
          err instanceof Error ? err.message : "Could not generate speech";
        setError(message);
        throw err;
      }
    },
    [stop]
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
