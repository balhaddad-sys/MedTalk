"use client";

import { useState } from "react";
import { quickPhrases, categories } from "@/lib/quickPhrases";

interface QuickPhrasesProps {
  onSelectPhrase: (text: string) => void;
  isTranslating: boolean;
}

export default function QuickPhrases({
  onSelectPhrase,
  isTranslating,
}: QuickPhrasesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("pain");

  const filtered = quickPhrases.filter((p) => p.category === activeCategory);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 hover:border-medical-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x26A1;</span>
          <span className="text-sm font-semibold text-slate-700">
            Quick Phrases
          </span>
          <span className="text-xs text-slate-400">
            Common medical phrases
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-white rounded-2xl border border-slate-200 step-transition">
          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${
                    activeCategory === cat.key
                      ? "bg-medical-100 text-medical-700 border border-medical-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                  }
                `}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Phrase grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => onSelectPhrase(phrase.text)}
                disabled={isTranslating}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-medical-50 hover:bg-medical-100 border border-medical-100 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg shrink-0">{phrase.emoji}</span>
                <span className="text-sm text-slate-700 font-medium">
                  {phrase.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
