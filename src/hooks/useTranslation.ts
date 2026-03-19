"use client";

import { useState, useCallback } from "react";
import { TranslateResponse } from "@/types";

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

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            source_lang: sourceLang,
            target_lang: targetLang,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Translation failed");
        }

        return await response.json();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Translation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { translate, isLoading, error };
}
