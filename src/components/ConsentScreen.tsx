"use client";

interface ConsentScreenProps {
  onAccept: () => void;
}

export default function ConsentScreen({ onAccept }: ConsentScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 step-transition"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-medical-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 id="consent-title" className="text-xl font-bold text-slate-800">
            Important Notice
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Please read and acknowledge before using MedTalk
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600 bg-slate-50 rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="text-lg shrink-0">{"\u26A0\uFE0F"}</span>
            <p>
              <strong>MedTalk is a communication aid, not a certified medical interpreter.</strong>{" "}
              AI translations may contain errors, especially with complex medical terminology.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-lg shrink-0">{"\u{1F50D}"}</span>
            <p>
              <strong>Always verify critical information</strong> (dosages, allergies, diagnoses){" "}
              through a qualified medical interpreter for clinical decisions.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-lg shrink-0">{"\u{1F512}"}</span>
            <p>
              <strong>Privacy:</strong> Conversations are processed in real-time and not stored.
              Audio is immediately discarded after transcription.
            </p>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="w-full py-3.5 bg-medical-600 hover:bg-medical-700 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-medical-300/30"
          autoFocus
        >
          I Understand - Continue
        </button>

        <p className="text-[10px] text-center text-slate-400">
          By continuing, both parties acknowledge this is a communication aid
          and agree to verify critical medical information independently.
        </p>
      </div>
    </div>
  );
}
