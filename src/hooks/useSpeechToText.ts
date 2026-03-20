"use client";

import { useState, useCallback } from "react";

export function useSpeechToText() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(
    async (audioBlob: Blob, languageHint?: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          throw new Error(
            "Voice transcription needs connectivity. Type or use quick phrases while offline."
          );
        }

        const formData = new FormData();
        const mime = audioBlob.type || "audio/webm";
        const ext = mime.includes("mp4") ? "mp4"
          : mime.includes("ogg") ? "ogg"
          : mime.includes("wav") ? "wav"
          : mime.includes("mpeg") || mime.includes("mp3") ? "mp3"
          : "webm";
        formData.append("file", audioBlob, `recording.${ext}`);

        // Pass language hint to improve Whisper accuracy
        if (languageHint) {
          formData.append("language", languageHint);
        }

        const response = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Transcription failed");
        }

        const data = await response.json();
        return data.text;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not transcribe audio";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { transcribe, isLoading, error };
}
