"use client";

import { VisitType } from "@/types";

interface VisitTypeSelectorProps {
  selected: VisitType;
  onSelect: (type: VisitType) => void;
}

const visitTypes: { type: VisitType; emoji: string; label: string; desc: string }[] = [
  { type: "general", emoji: "\u{1F3E5}", label: "General", desc: "Standard visit" },
  { type: "emergency", emoji: "\u{1F6A8}", label: "Emergency", desc: "Urgent care" },
  { type: "primary", emoji: "\u{1FA7A}", label: "Primary Care", desc: "Routine visit" },
  { type: "pharmacy", emoji: "\u{1F48A}", label: "Pharmacy", desc: "Medication" },
  { type: "mental_health", emoji: "\u{1F9E0}", label: "Mental Health", desc: "Behavioral" },
  { type: "pediatric", emoji: "\u{1F476}", label: "Pediatric", desc: "Children" },
];

export default function VisitTypeSelector({ selected, onSelect }: VisitTypeSelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Visit Type</h3>
      <div className="grid grid-cols-3 gap-2">
        {visitTypes.map((vt) => (
          <button
            key={vt.type}
            onClick={() => onSelect(vt.type)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center
              ${
                selected === vt.type
                  ? "border-medical-500 bg-medical-50"
                  : "border-slate-200 bg-white hover:border-medical-300"
              }
            `}
          >
            <span className="text-xl">{vt.emoji}</span>
            <span className="text-xs font-medium text-slate-700">{vt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
