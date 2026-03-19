"use client";

import { useState, useCallback } from "react";
import { TranslateResponse } from "@/types";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (
      text: string,
      sourceLang: string,
      targetLang: string
    ): Promise<TranslateResponse> => {
      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
          }

          const response = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              source_lang: sourceLang,
              target_lang: targetLang,
            }),
          });

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            const data = await response.json();
            throw new Error(data.error || "Translation failed");
          }

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const data = await response.json();
          setIsLoading(false);
          return data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Translation failed");

          // Don't retry on validation errors
          if (lastError.message.includes("Missing") || lastError.message.includes("exceeds") || lastError.message.includes("Invalid")) {
            break;
          }
        }
      }

      setIsLoading(false);
      const message = lastError?.message || "Translation failed";
      setError(message);
      throw lastError;
    },
    []
  );

  return { translate, isLoading, error };
}
