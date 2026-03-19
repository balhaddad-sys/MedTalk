export interface QuickPhrase {
  id: string;
  emoji: string;
  label: string;
  text: string;
  category: "pain" | "allergy" | "basic" | "emergency";
}

export const quickPhrases: QuickPhrase[] = [
  // Pain
  { id: "pain-1", emoji: "\u{1F915}", label: "I have pain", text: "I have pain", category: "pain" },
  { id: "pain-2", emoji: "\u{1F4A5}", label: "Severe pain", text: "The pain is very severe", category: "pain" },
  { id: "pain-3", emoji: "\u{1F9B4}", label: "Pain is here", text: "The pain is right here", category: "pain" },
  { id: "pain-4", emoji: "\u{1F915}", label: "Headache", text: "I have a headache", category: "pain" },
  { id: "pain-5", emoji: "\u{1F4AB}", label: "Chest pain", text: "I have chest pain", category: "pain" },

  // Allergies
  { id: "allergy-1", emoji: "\u26A0\uFE0F", label: "I have allergies", text: "I am allergic", category: "allergy" },
  { id: "allergy-2", emoji: "\u{1F48A}", label: "Penicillin allergy", text: "I am allergic to penicillin", category: "allergy" },
  { id: "allergy-3", emoji: "\u{1F95C}", label: "Food allergy", text: "I have a food allergy", category: "allergy" },
  { id: "allergy-4", emoji: "\u{1F48A}", label: "Taking medication", text: "I am currently taking medication", category: "allergy" },

  // Basic needs
  { id: "basic-1", emoji: "\u{1F6BB}", label: "Bathroom", text: "Where is the bathroom?", category: "basic" },
  { id: "basic-2", emoji: "\u{1F4A7}", label: "Need water", text: "I need water please", category: "basic" },
  { id: "basic-3", emoji: "\u{1F614}", label: "Feel dizzy", text: "I feel dizzy", category: "basic" },
  { id: "basic-4", emoji: "\u{1F912}", label: "Feel nauseous", text: "I feel nauseous", category: "basic" },
  { id: "basic-5", emoji: "\u{1F4DE}", label: "Call family", text: "Can you call my family?", category: "basic" },

  // Emergency
  { id: "emergency-1", emoji: "\u{1F6A8}", label: "Can't breathe", text: "I cannot breathe", category: "emergency" },
  { id: "emergency-2", emoji: "\u{1F198}", label: "Need help", text: "I need help immediately", category: "emergency" },
  { id: "emergency-3", emoji: "\u{1F494}", label: "Heart racing", text: "My heart is racing", category: "emergency" },
  { id: "emergency-4", emoji: "\u{1F635}", label: "Going to faint", text: "I feel like I am going to faint", category: "emergency" },
];

export const categories = [
  { key: "pain" as const, label: "Pain", emoji: "\u{1F915}" },
  { key: "allergy" as const, label: "Allergies", emoji: "\u26A0\uFE0F" },
  { key: "basic" as const, label: "Basic Needs", emoji: "\u{1F64B}" },
  { key: "emergency" as const, label: "Emergency", emoji: "\u{1F6A8}" },
];
