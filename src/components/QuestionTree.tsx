"use client";

import { useState, useCallback } from "react";
import { questionTree } from "@/lib/questionTree";

interface QuestionTreeProps {
  onSelectPhrase: (phrase: string) => void;
  isTranslating: boolean;
  onClose: () => void;
}

export default function QuestionTree({
  onSelectPhrase,
  isTranslating,
  onClose,
}: QuestionTreeProps) {
  const [currentId, setCurrentId] = useState("root");
  const [history, setHistory] = useState<string[]>([]);

  const node = questionTree[currentId];

  const handleOption = useCallback(
    (option: { phrase?: string; nextId?: string }) => {
      if (option.phrase) {
        onSelectPhrase(option.phrase);
      } else if (option.nextId) {
        setHistory((prev) => [...prev, currentId]);
        setCurrentId(option.nextId);
      }
    },
    [currentId, onSelectPhrase]
  );

  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setCurrentId(prev);
    }
  }, [history]);

  if (!node) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleBack}
              className="p-1 rounded-lg hover:bg-amber-100 transition-colors"
              aria-label="Go back"
            >
              <svg
                className="w-4 h-4 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <span className="text-sm font-semibold text-amber-800">
            {node.question}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-amber-100 transition-colors"
          aria-label="Close question tree"
        >
          <svg
            className="w-4 h-4 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {node.options.map((option, i) => (
          <button
            key={`${node.id}-${i}`}
            onClick={() => handleOption(option)}
            disabled={isTranslating}
            className="flex items-center gap-2 px-3 py-3 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <span className="text-xl shrink-0">{option.emoji}</span>
            <span className="text-sm font-medium text-slate-700">
              {option.label}
            </span>
            {option.nextId && (
              <svg
                className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Breadcrumb trail */}
      {history.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-1 text-xs text-amber-600">
          <span>Start</span>
          {history.map((id) => (
            <span key={id} className="flex items-center gap-1">
              <span>&rsaquo;</span>
              <span>
                {questionTree[id]?.options.find((o) => o.nextId === (history[history.indexOf(id) + 1] || currentId))?.label || "..."}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
