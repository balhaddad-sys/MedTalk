"use client";

import { InteractionMode } from "@/types";

interface AccessibilityModeSelectorProps {
  onSelect: (mode: InteractionMode) => void;
}

export default function AccessibilityModeSelector({
  onSelect,
}: AccessibilityModeSelectorProps) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-800">How would you like to communicate?</h3>
        <p className="text-sm text-slate-500">Choose the mode that works best for you</p>
      </div>

      <div className="space-y-3">
        {/* Voice mode */}
        <button
          onClick={() => onSelect("voice")}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-medical-400 hover:bg-medical-50/50 transition-all text-left group"
        >
          <div className="w-14 h-14 rounded-2xl bg-medical-100 flex items-center justify-center shrink-0 group-hover:bg-medical-200 transition-colors">
            <svg className="w-7 h-7 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-base">Voice Translation</p>
            <p className="text-sm text-slate-500">
              Speak into the microphone and hear translations aloud
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Questions mode */}
        <button
          onClick={() => onSelect("questions")}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-base">Questions Only</p>
            <p className="text-sm text-slate-500">
              Answer medical questions by tapping — no speaking or listening needed
            </p>
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              Accessible
            </span>
          </div>
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
