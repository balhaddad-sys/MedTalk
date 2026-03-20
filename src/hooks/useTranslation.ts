"use client";

import { useState, useCallback } from "react";
import { TranslateResponse } from "@/types";
import {
  createPassthroughTranslation,
  getOfflineTranslation,
  storeTranslationMemory,
} from "@/lib/offlineTranslation";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TranslateOptions {
  mode?: "precision" | "fast";
  includeVerification?: boolean;
}

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (
      text: string,
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<TranslateResponse> => {
      setError(null);

      const includeVerification = options?.includeVerification ?? false;
      const getOfflineFallback = () =>
        getOfflineTranslation(text, sourceLang, targetLang, includeVerification);

      if (sourceLang === targetLang) {
        const passthrough = createPassthroughTranslation(text);
        return {
          ...passthrough,
          back_translation: includeVerification ? passthrough.back_translation : undefined,
          medical_terms: includeVerification ? passthrough.medical_terms : [],
        };
      }

      setIsLoading(true);

      let lastError: Error | null = null;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineResult = getOfflineFallback();
        setIsLoading(false);

        if (offlineResult) {
          return offlineResult;
        }

        const offlineError = new Error(
          "Offline translation is limited to saved translations and the emergency phrase pack for supported language pairs."
        );
        setError(offlineError.message);
        throw offlineError;
      }

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
              mode: options?.mode,
              include_verification: includeVerification,
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
          const normalizedData: TranslateResponse = {
            ...data,
            translation_source: data.translation_source || "cloud",
          };
          storeTranslationMemory(text, sourceLang, targetLang, normalizedData);
          setIsLoading(false);
          return normalizedData;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Translation failed");

          // Don't retry on validation errors
          if (
            lastError.message.includes("Missing") ||
            lastError.message.includes("exceeds") ||
            lastError.message.includes("Invalid")
          ) {
            break;
          }
        }
      }

      const offlineResult = getOfflineFallback();
      if (offlineResult) {
        setIsLoading(false);
        return offlineResult;
      }

      setIsLoading(false);
      const message = lastError?.message || "Translation failed";
      setError(message);
      throw lastError || new Error(message);
    },
    []
  );

  return { translate, isLoading, error };
}
