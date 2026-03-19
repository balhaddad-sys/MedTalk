"use client";

import { useState } from "react";
import { Message } from "@/types";

interface ClinicalSummaryProps {
  messages: Message[];
}

export default function ClinicalSummary({ messages }: ClinicalSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (messages.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            originalText: m.originalText,
            translatedText: m.translatedText,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch {
      setError("Could not generate clinical summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
    }
  };

  if (messages.length < 2) return null;

  return (
    <div className="w-full">
      {!summary ? (
        <button
          onClick={generateSummary}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-2xl text-sm font-medium text-violet-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Clinical Summary...
            </>
          ) : (
            <>
              <span>{"\u{1F4CB}"}</span>
              Generate AI Clinical Summary
            </>
          )}
        </button>
      ) : (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-800 flex items-center gap-2">
              <span>{"\u{1F4CB}"}</span> Clinical Summary
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={copySummary}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-1 rounded-lg hover:bg-violet-100 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={() => setSummary(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          <div className="text-sm text-violet-900 whitespace-pre-wrap leading-relaxed">
            {summary}
          </div>
          <p className="text-[10px] text-violet-400">
            AI-generated summary. Review and verify before adding to medical records.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
