"use client";

interface EmergencyBannerProps {
  onDismiss: () => void;
}

export default function EmergencyBanner({ onDismiss }: EmergencyBannerProps) {
  return (
    <div
      className="w-full bg-red-600 text-white px-4 py-3 rounded-2xl shadow-lg animate-pulse"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{"\u{1F6A8}"}</span>
          <div>
            <p className="font-bold text-sm">Emergency Keywords Detected</p>
            <p className="text-xs text-red-100">
              Verify patient safety immediately. Call emergency services if needed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="tel:112"
            className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
          >
            Call 112
          </a>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-500 rounded-lg transition-colors"
            aria-label="Dismiss emergency banner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
