"use client";

import { useState } from "react";
import { Language } from "@/types";
import { languages } from "@/lib/languages";

interface LanguageSelectorProps {
  label: string;
  subtitle: string;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  excludeCode?: string | null;
}

export default function LanguageSelector({
  label,
  subtitle,
  selectedCode,
  onSelect,
  excludeCode,
}: LanguageSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredLanguages = languages.filter((l) => {
    if (l.code === excludeCode) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.label.toLowerCase().includes(q) ||
      l.nativeLabel.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="text-xl font-bold text-slate-800">{label}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Search box */}
      <div className="mb-3 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search languages..."
          className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:border-medical-400 focus:ring-2 focus:ring-medical-100 outline-none text-sm text-slate-700 placeholder:text-slate-400 transition-colors"
          aria-label="Search languages"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto custom-scroll pr-1">
        {filteredLanguages.map((lang: Language) => {
          const isSelected = selectedCode === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              aria-label={`Select ${lang.label}`}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-center gap-1 px-3 py-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[76px]
                ${
                  isSelected
                    ? "border-medical-500 bg-medical-50 shadow-md shadow-medical-200"
                    : "border-slate-200 bg-white hover:border-medical-300 hover:bg-medical-50/50"
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-medical-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl" role="img" aria-hidden="true">
                {lang.flag}
              </span>
              <span className="text-sm font-semibold text-slate-700 text-center leading-tight">
                {lang.nativeLabel}
              </span>
              <span className="text-xs text-slate-400">{lang.label}</span>
            </button>
          );
        })}
        {filteredLanguages.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-400 py-4">
            No languages found for &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
