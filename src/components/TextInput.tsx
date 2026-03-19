"use client";

import { useState, useRef, useEffect } from "react";

interface TextInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  placeholder?: string;
}

export default function TextInput({
  onSubmit,
  isProcessing,
  placeholder = "Type a message...",
}: TextInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;
    onSubmit(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [text]);

  return (
    <div className="flex items-end gap-2 w-full">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isProcessing}
          rows={1}
          className="w-full px-4 py-3 bg-white rounded-2xl border border-slate-200 focus:border-medical-400 focus:ring-2 focus:ring-medical-100 outline-none resize-none text-sm text-slate-700 placeholder:text-slate-400 disabled:opacity-50 transition-colors"
          aria-label="Type a message"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || isProcessing}
        className="p-3 bg-medical-600 hover:bg-medical-700 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        aria-label="Send message"
      >
        {isProcessing ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}
