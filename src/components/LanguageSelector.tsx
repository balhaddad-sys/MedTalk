"use client";

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
  const filteredLanguages = excludeCode
    ? languages.filter((l) => l.code !== excludeCode)
    : languages;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">{label}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filteredLanguages.map((lang: Language) => {
          const isSelected = selectedCode === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              aria-label={`Select ${lang.label}`}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-center gap-1 px-3 py-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "border-medical-500 bg-medical-50 shadow-md shadow-medical-200"
                    : "border-slate-200 bg-white hover:border-medical-300 hover:bg-medical-50/50"
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-medical-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
              <span className="text-2xl" role="img" aria-hidden="true">
                {lang.flag}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {lang.nativeLabel}
              </span>
              <span className="text-xs text-slate-400">{lang.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
