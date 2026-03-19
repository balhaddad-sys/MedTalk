"use client";

interface BodyDiagramProps {
  onSelect: (area: string) => void;
  isProcessing: boolean;
}

const bodyAreas = [
  { id: "head", label: "Head", emoji: "\u{1F9E0}", text: "I have pain in my head" },
  { id: "chest", label: "Chest", emoji: "\u{1FAC1}", text: "I have pain in my chest" },
  { id: "stomach", label: "Stomach", emoji: "\u{1F922}", text: "I have pain in my stomach" },
  { id: "back", label: "Back", emoji: "\u{1F9B4}", text: "I have pain in my back" },
  { id: "arm-left", label: "Left Arm", emoji: "\u{1F4AA}", text: "I have pain in my left arm" },
  { id: "arm-right", label: "Right Arm", emoji: "\u{1F4AA}", text: "I have pain in my right arm" },
  { id: "leg-left", label: "Left Leg", emoji: "\u{1F9B5}", text: "I have pain in my left leg" },
  { id: "leg-right", label: "Right Leg", emoji: "\u{1F9B5}", text: "I have pain in my right leg" },
  { id: "throat", label: "Throat", emoji: "\u{1F910}", text: "I have pain in my throat" },
  { id: "neck", label: "Neck", emoji: "\u{1F9E3}", text: "I have pain in my neck" },
  { id: "eye", label: "Eyes", emoji: "\u{1F441}\uFE0F", text: "I have pain in my eyes" },
  { id: "ear", label: "Ears", emoji: "\u{1F442}", text: "I have pain in my ears" },
];

export default function BodyDiagram({ onSelect, isProcessing }: BodyDiagramProps) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">
        Where does it hurt?
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Tap a body area to translate the pain location
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {bodyAreas.map((area) => (
          <button
            key={area.id}
            onClick={() => onSelect(area.text)}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-medical-50 hover:bg-medical-100 border border-medical-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Pain in ${area.label}`}
          >
            <span className="text-xl">{area.emoji}</span>
            <span className="text-xs font-medium text-slate-600">{area.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
