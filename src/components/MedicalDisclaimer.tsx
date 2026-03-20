"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "medtalk.disclaimer-accepted.v1";
const CONSENT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours — re-prompt daily

interface ConsentRecord {
  acceptedAt: number;
}

function hasValidConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as ConsentRecord;
    return Date.now() - record.acceptedAt < CONSENT_EXPIRY_MS;
  } catch {
    return false;
  }
}

function saveConsent() {
  try {
    const record: ConsentRecord = { acceptedAt: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // Storage failure is non-blocking
  }
}

export default function MedicalDisclaimer({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasValidConsent()) setAccepted(true);
  }, []);

  if (!mounted) return null;

  if (accepted) return <>{children}</>;

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-white px-4 safe-top safe-bottom">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">MedTalk</h1>
            <p className="text-xs text-slate-400 font-medium">Medical Translation</p>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 mb-4">
          <p className="text-sm font-extrabold text-amber-900 uppercase tracking-wider mb-3">
            Important Medical Disclaimer
          </p>
          <div className="space-y-2.5 text-sm leading-relaxed text-amber-900">
            <p>
              MedTalk is an <strong>AI-assisted translation aid</strong>. It is <strong>NOT</strong> a
              certified medical interpreter and does <strong>NOT</strong> replace qualified human
              interpreters for clinical decision-making.
            </p>
            <p>
              Translations may contain errors, especially for rare medical terms, complex
              instructions, dosages, or nuanced symptoms. <strong>Always verify critical medical
              information</strong> through a qualified interpreter or bilingual clinician before
              acting on any translation.
            </p>
            <p>
              Clinical suggestions, differential diagnoses, and triage levels are
              AI-generated drafts for clinician reference only. They are <strong>not medical
              diagnoses</strong> and must be independently verified.
            </p>
            <p>
              Patient data entered into this app is processed by third-party AI services
              (OpenAI). Do not enter data beyond what is necessary for the clinical encounter.
              This application has <strong>not been evaluated or cleared by the FDA</strong> or
              equivalent regulatory bodies.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 mb-6">
          <p className="text-xs font-bold text-red-700 leading-relaxed">
            In any medical emergency, follow your facility&apos;s emergency protocols
            immediately. Do not delay care to wait for a translation.
          </p>
        </div>

        <button
          onClick={() => { saveConsent(); setAccepted(true); }}
          className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-base font-bold shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
        >
          I understand — continue to MedTalk
        </button>

        <p className="mt-3 text-[11px] text-center text-slate-400 leading-relaxed">
          This acknowledgment expires every 24 hours. By continuing, you confirm you have
          read and understood the limitations described above.
        </p>
      </div>
    </div>
  );
}
