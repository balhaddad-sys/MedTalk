"use client";

interface PainScaleProps {
  onSelect: (level: number) => void;
  isProcessing: boolean;
}

const painEmojis = [
  { level: 0, emoji: "\u{1F600}", label: "No pain" },
  { level: 1, emoji: "\u{1F642}", label: "Minimal" },
  { level: 2, emoji: "\u{1F610}", label: "Mild" },
  { level: 3, emoji: "\u{1F615}", label: "Uncomfortable" },
  { level: 4, emoji: "\u{1F61F}", label: "Moderate" },
  { level: 5, emoji: "\u{1F623}", label: "Distracting" },
  { level: 6, emoji: "\u{1F627}", label: "Distressing" },
  { level: 7, emoji: "\u{1F62B}", label: "Unmanageable" },
  { level: 8, emoji: "\u{1F631}", label: "Intense" },
  { level: 9, emoji: "\u{1F62D}", label: "Severe" },
  { level: 10, emoji: "\u{1F635}", label: "Worst possible" },
];

export default function PainScale({ onSelect, isProcessing }: PainScaleProps) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        Pain Scale
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Tap a number to translate the pain level
      </p>
      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
        {painEmojis.map(({ level, emoji, label }) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            disabled={isProcessing}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              ${level <= 3 ? "bg-green-50 hover:bg-green-100" : ""}
              ${level > 3 && level <= 6 ? "bg-yellow-50 hover:bg-yellow-100" : ""}
              ${level > 6 ? "bg-red-50 hover:bg-red-100" : ""}
            `}
            aria-label={`Pain level ${level}: ${label}`}
            title={label}
          >
            <span className="text-lg">{emoji}</span>
            <span className="text-xs font-bold text-slate-600">{level}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-400">
        <span>No pain</span>
        <span>Worst pain</span>
      </div>
    </div>
  );
}
