"use client";

import { getLanguageByCode } from "@/lib/languages";

interface VisualTranslationCardProps {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export default function VisualTranslationCard({
  originalText,
  translatedText,
  sourceLang,
  targetLang,
}: VisualTranslationCardProps) {
  const source = getLanguageByCode(sourceLang);
  const target = getLanguageByCode(targetLang);
  const isRtl = target?.dir === "rtl";

  return (
    <div className="w-full space-y-4">
      {/* Provider-facing translated card — large, readable */}
      <div className="bg-medical-600 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{target?.flag}</span>
          <span className="text-sm font-semibold text-medical-100">
            {target?.label || targetLang} — For provider
          </span>
        </div>
        <p
          className="text-lg leading-relaxed text-white font-medium whitespace-pre-wrap"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {translatedText}
        </p>
      </div>

      {/* Patient-facing original card — smaller */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{source?.flag}</span>
          <span className="text-xs font-semibold text-slate-500">
            {source?.label || sourceLang} — Original
          </span>
        </div>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
          {originalText}
        </p>
      </div>
    </div>
  );
}
