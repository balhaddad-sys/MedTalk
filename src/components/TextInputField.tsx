"use client";

import { useState, useCallback } from "react";

interface TextInputFieldProps {
  placeholder?: string;
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function TextInputField({
  placeholder = "Type your message...",
  onSubmit,
  isLoading,
}: TextInputFieldProps) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    await onSubmit(trimmed);
    setText("");
  }, [text, isLoading, onSubmit]);

  return (
    <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 px-3 py-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none bg-transparent disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || isLoading}
        className="shrink-0 w-9 h-9 rounded-xl bg-medical-600 hover:bg-medical-700 text-white flex items-center justify-center transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}
