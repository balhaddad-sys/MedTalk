import { MedicalIntakeSection } from "@/types";

/**
 * Comprehensive medical intake questionnaire for users who cannot speak or listen.
 * Organized by clinical triage sections. Every question is tap-only — no voice needed.
 */
export const medicalIntakeSections: MedicalIntakeSection[] = [
  // ───────────────────────────── CHIEF COMPLAINT ─────────────────────────────
  {
    id: "chief_complaint",
    title: "What brings you in today?",
    icon: "\u{1FA7A}",
    description: "Tell us your main concern",
    questions: [
      {
        id: "cc_main",
        question: "What is your main problem right now?",
        type: "single",
        required: true,
        options: [
          { label: "Pain", value: "pain", emoji: "\u{1F915}" },
          { label: "Breathing trouble", value: "breathing", emoji: "\u{1FAC1}" },
          { label: "Stomach / digestive", value: "stomach", emoji: "\u{1F922}" },
          { label: "Injury / accident", value: "injury", emoji: "\u{1FA79}" },
          { label: "Fever / infection", value: "fever", emoji: "\u{1F321}\uFE0F" },
          { label: "Mental health", value: "mental_health", emoji: "\u{1F9E0}" },
          { label: "Skin problem", value: "skin", emoji: "\u{1F9F4}" },
          { label: "Follow-up visit", value: "followup", emoji: "\u{1F4CB}" },
        ],
        followUp: {
          pain: [
            {
              id: "cc_pain_location",
              question: "Where is the pain?",
              type: "body-area",
              required: true,
              options: [
                { label: "Head", value: "head", emoji: "\u{1F9E0}" },
                { label: "Neck", value: "neck", emoji: "\u{1F9CD}" },
                { label: "Chest", value: "chest", emoji: "\u{1FAC0}", urgency: "high" },
                { label: "Upper back", value: "upper_back", emoji: "\u2B06\uFE0F" },
                { label: "Lower back", value: "lower_back", emoji: "\u2B07\uFE0F" },
                { label: "Stomach / abdomen", value: "abdomen", emoji: "\u{1F4A5}" },
                { label: "Arm / shoulder", value: "arm", emoji: "\u{1F4AA}" },
                { label: "Leg / knee / hip", value: "leg", emoji: "\u{1F9B5}" },
                { label: "Everywhere", value: "everywhere", emoji: "\u{1F62B}" },
              ],
            },
            {
              id: "cc_pain_severity",
              question: "How bad is the pain? (0 = no pain, 10 = worst ever)",
              type: "scale",
              required: true,
            },
            {
              id: "cc_pain_duration",
              question: "How long have you had this pain?",
              type: "single",
              options: [
                { label: "Just started", value: "just_started", emoji: "\u26A1" },
                { label: "A few hours", value: "hours", emoji: "\u23F0" },
                { label: "1-2 days", value: "days", emoji: "\u{1F4C5}" },
                { label: "Several days", value: "several_days", emoji: "\u{1F4C6}" },
                { label: "1-2 weeks", value: "weeks", emoji: "\u{1F5D3}\uFE0F" },
                { label: "More than a month", value: "months", emoji: "\u{1F4C5}" },
              ],
            },
            {
              id: "cc_pain_type",
              question: "What does the pain feel like?",
              type: "multi",
              options: [
                { label: "Sharp / stabbing", value: "sharp", emoji: "\u{1F52A}" },
                { label: "Dull / aching", value: "dull", emoji: "\u{1F614}" },
                { label: "Burning", value: "burning", emoji: "\u{1F525}" },
                { label: "Pressure / squeezing", value: "pressure", emoji: "\u{1F44A}" },
                { label: "Throbbing / pulsing", value: "throbbing", emoji: "\u{1F4A2}" },
                { label: "Tingling / numbness", value: "tingling", emoji: "\u2728" },
              ],
            },
          ],
          breathing: [
            {
              id: "cc_breathing_severity",
              question: "How bad is the breathing problem?",
              type: "single",
              required: true,
              options: [
                { label: "Mild — slightly short of breath", value: "mild", emoji: "\u{1F4A8}" },
                { label: "Moderate — hard to talk full sentences", value: "moderate", emoji: "\u{1FAC1}", urgency: "moderate" },
                { label: "Severe — struggling to breathe", value: "severe", emoji: "\u{1F6A8}", urgency: "emergency" },
                { label: "Wheezing / whistling sound", value: "wheezing", emoji: "\u{1F32C}\uFE0F" },
                { label: "Coughing a lot", value: "coughing", emoji: "\u{1F637}" },
              ],
            },
          ],
          injury: [
            {
              id: "cc_injury_type",
              question: "What kind of injury?",
              type: "single",
              required: true,
              options: [
                { label: "Fall", value: "fall", emoji: "\u{1FA7C}" },
                { label: "Car / vehicle accident", value: "car_accident", emoji: "\u{1F697}", urgency: "high" },
                { label: "Cut / bleeding", value: "cut", emoji: "\u{1FA78}" },
                { label: "Burn", value: "burn", emoji: "\u{1F525}" },
                { label: "Hit by object", value: "hit", emoji: "\u{1F4A5}" },
                { label: "Twisted / sprained", value: "sprain", emoji: "\u{1F9B6}" },
                { label: "Broken bone", value: "broken", emoji: "\u{1F9B4}", urgency: "high" },
              ],
            },
          ],
        },
      },
    ],
  },

  // ───────────────────────────── EMERGENCY FLAGS ─────────────────────────────
  {
    id: "emergency_flags",
    title: "Emergency check",
    icon: "\u{1F6A8}",
    description: "Important safety questions",
    questions: [
      {
        id: "ef_symptoms",
        question: "Are you experiencing any of these RIGHT NOW?",
        type: "multi",
        required: true,
        options: [
          { label: "Chest pain or pressure", value: "chest_pain", emoji: "\u{1F494}", urgency: "emergency" },
          { label: "Severe difficulty breathing", value: "severe_breathing", emoji: "\u{1FAC1}", urgency: "emergency" },
          { label: "Uncontrolled bleeding", value: "bleeding", emoji: "\u{1FA78}", urgency: "emergency" },
          { label: "Sudden weakness on one side", value: "stroke_signs", emoji: "\u26A0\uFE0F", urgency: "emergency" },
          { label: "Sudden confusion or slurred speech", value: "confusion", emoji: "\u{1F635}\u200D\u{1F4AB}", urgency: "emergency" },
          { label: "Severe allergic reaction (swelling, rash)", value: "anaphylaxis", emoji: "\u{1F198}", urgency: "emergency" },
          { label: "None of these", value: "none", emoji: "\u2705" },
        ],
      },
    ],
  },

  // ───────────────────────────── MEDICAL HISTORY ─────────────────────────────
  {
    id: "medical_history",
    title: "Medical history",
    icon: "\u{1F4CB}",
    description: "Your past and current health",
    questions: [
      {
        id: "mh_conditions",
        question: "Do you have any of these conditions?",
        type: "multi",
        options: [
          { label: "Diabetes", value: "diabetes", emoji: "\u{1F489}" },
          { label: "High blood pressure", value: "hypertension", emoji: "\u{1FAC0}" },
          { label: "Heart disease", value: "heart_disease", emoji: "\u2764\uFE0F" },
          { label: "Asthma / lung disease", value: "asthma", emoji: "\u{1FAC1}" },
          { label: "Cancer", value: "cancer", emoji: "\u{1F3E5}" },
          { label: "Kidney disease", value: "kidney", emoji: "\u{1FA7A}" },
          { label: "Mental health condition", value: "mental_health", emoji: "\u{1F9E0}" },
          { label: "None", value: "none", emoji: "\u2705" },
        ],
      },
      {
        id: "mh_surgeries",
        question: "Have you had surgery before?",
        type: "single",
        options: [
          { label: "No, never", value: "no", emoji: "\u2705" },
          { label: "Yes, within the last year", value: "yes_recent", emoji: "\u{1F4C5}" },
          { label: "Yes, more than a year ago", value: "yes_past", emoji: "\u{1F5D3}\uFE0F" },
        ],
      },
      {
        id: "mh_pregnant",
        question: "Are you pregnant or could you be?",
        type: "single",
        options: [
          { label: "No", value: "no", emoji: "\u274C" },
          { label: "Yes", value: "yes", emoji: "\u{1F930}" },
          { label: "Not sure", value: "unsure", emoji: "\u2753" },
          { label: "Not applicable", value: "na", emoji: "\u2796" },
        ],
      },
    ],
  },

  // ───────────────────────────── MEDICATIONS ─────────────────────────────────
  {
    id: "medications",
    title: "Medications",
    icon: "\u{1F48A}",
    description: "What you are currently taking",
    questions: [
      {
        id: "med_taking",
        question: "Are you taking any medications?",
        type: "single",
        required: true,
        options: [
          { label: "No medications", value: "none", emoji: "\u2705" },
          { label: "Yes, prescription medications", value: "prescription", emoji: "\u{1F48A}" },
          { label: "Yes, over-the-counter only", value: "otc", emoji: "\u{1F3EA}" },
          { label: "Yes, both prescription and OTC", value: "both", emoji: "\u{1F48A}" },
          { label: "I don't know the names", value: "unknown", emoji: "\u2753" },
        ],
      },
      {
        id: "med_type",
        question: "Select any medications you take (if you know):",
        type: "multi",
        options: [
          { label: "Blood pressure medicine", value: "bp_med", emoji: "\u{1FAC0}" },
          { label: "Diabetes / insulin", value: "diabetes_med", emoji: "\u{1F489}" },
          { label: "Blood thinner", value: "blood_thinner", emoji: "\u{1FA78}" },
          { label: "Pain medication", value: "pain_med", emoji: "\u{1F915}" },
          { label: "Inhaler", value: "inhaler", emoji: "\u{1FAC1}" },
          { label: "Antibiotics", value: "antibiotics", emoji: "\u{1F9EA}" },
          { label: "Mental health medication", value: "psych_med", emoji: "\u{1F9E0}" },
          { label: "Other / not listed", value: "other", emoji: "\u{1F4DD}" },
        ],
      },
    ],
  },

  // ───────────────────────────── ALLERGIES ────────────────────────────────────
  {
    id: "allergies",
    title: "Allergies",
    icon: "\u26A0\uFE0F",
    description: "Known allergies and reactions",
    questions: [
      {
        id: "allergy_has",
        question: "Do you have any allergies?",
        type: "single",
        required: true,
        options: [
          { label: "No known allergies", value: "none", emoji: "\u2705" },
          { label: "Yes, to medication", value: "medication", emoji: "\u{1F48A}" },
          { label: "Yes, to food", value: "food", emoji: "\u{1F95C}" },
          { label: "Yes, environmental (pollen, dust)", value: "environmental", emoji: "\u{1F33F}" },
          { label: "Yes, to latex", value: "latex", emoji: "\u{1F9E4}" },
          { label: "Multiple allergies", value: "multiple", emoji: "\u26A0\uFE0F" },
        ],
      },
      {
        id: "allergy_drug",
        question: "Are you allergic to any of these common medications?",
        type: "multi",
        options: [
          { label: "Penicillin / Amoxicillin", value: "penicillin", emoji: "\u{1F48A}", urgency: "high" },
          { label: "Sulfa drugs", value: "sulfa", emoji: "\u{1F48A}", urgency: "high" },
          { label: "Aspirin / Ibuprofen (NSAIDs)", value: "nsaids", emoji: "\u{1F48A}", urgency: "high" },
          { label: "Codeine / Morphine", value: "opioids", emoji: "\u{1F48A}", urgency: "high" },
          { label: "Contrast dye", value: "contrast", emoji: "\u{1F489}", urgency: "high" },
          { label: "None of these", value: "none", emoji: "\u2705" },
        ],
      },
    ],
  },

  // ───────────────────────────── CURRENT SYMPTOMS ────────────────────────────
  {
    id: "current_symptoms",
    title: "Other symptoms",
    icon: "\u{1F321}\uFE0F",
    description: "Anything else you're feeling",
    questions: [
      {
        id: "cs_additional",
        question: "Are you also experiencing any of these?",
        type: "multi",
        options: [
          { label: "Fever or chills", value: "fever", emoji: "\u{1F321}\uFE0F" },
          { label: "Nausea or vomiting", value: "nausea", emoji: "\u{1F922}" },
          { label: "Diarrhea", value: "diarrhea", emoji: "\u{1F6BD}" },
          { label: "Dizziness", value: "dizziness", emoji: "\u{1F4AB}" },
          { label: "Weakness / fatigue", value: "weakness", emoji: "\u{1F62A}" },
          { label: "Headache", value: "headache", emoji: "\u{1F915}" },
          { label: "Swelling", value: "swelling", emoji: "\u{1F4A2}" },
          { label: "Rash or skin changes", value: "rash", emoji: "\u{1F9F4}" },
          { label: "Blurred vision", value: "vision", emoji: "\u{1F441}\uFE0F" },
          { label: "Loss of appetite", value: "appetite", emoji: "\u{1F37D}\uFE0F" },
          { label: "None of these", value: "none", emoji: "\u2705" },
        ],
      },
    ],
  },

  // ───────────────────────────── BASIC NEEDS ─────────────────────────────────
  {
    id: "basic_needs",
    title: "Basic needs",
    icon: "\u{1F64B}",
    description: "Things you need right now",
    questions: [
      {
        id: "bn_needs",
        question: "Do you need anything right now?",
        type: "multi",
        options: [
          { label: "Water", value: "water", emoji: "\u{1F4A7}" },
          { label: "Bathroom", value: "bathroom", emoji: "\u{1F6BB}" },
          { label: "Blanket — I'm cold", value: "blanket", emoji: "\u{1F6CF}\uFE0F" },
          { label: "Call my family", value: "family", emoji: "\u{1F4DE}" },
          { label: "Human interpreter", value: "interpreter", emoji: "\u{1F5E3}\uFE0F" },
          { label: "My medication", value: "medication", emoji: "\u{1F48A}" },
          { label: "Pain relief", value: "pain_relief", emoji: "\u{1F915}" },
          { label: "I'm okay for now", value: "none", emoji: "\u{1F44D}" },
        ],
      },
    ],
  },
];

/**
 * Builds a translated summary string from all intake answers.
 * This produces clear English sentences ready for the /api/translate endpoint.
 */
export function buildIntakeSummary(
  answers: Record<string, string | string[]>,
  sections: MedicalIntakeSection[]
): string {
  const lines: string[] = [];

  for (const section of sections) {
    for (const q of section.questions) {
      const answer = answers[q.id];
      if (!answer) continue;

      if (q.type === "scale" && typeof answer === "string") {
        lines.push(`${q.question} Answer: ${answer}/10.`);
        continue;
      }

      if (q.type === "text" && typeof answer === "string") {
        lines.push(`${q.question} Answer: ${answer}`);
        continue;
      }

      const values = Array.isArray(answer) ? answer : [answer];
      const allOptions = [...(q.options || [])];

      // Include follow-up options
      if (q.followUp) {
        for (const fqs of Object.values(q.followUp)) {
          for (const fq of fqs) {
            const fAnswer = answers[fq.id];
            if (!fAnswer) continue;
            const fValues = Array.isArray(fAnswer) ? fAnswer : [fAnswer];
            const fLabels = fValues.map(
              (v) => fq.options?.find((o) => o.value === v)?.label || v
            );
            if (fq.type === "scale") {
              lines.push(`${fq.question} Answer: ${fAnswer}/10.`);
            } else {
              lines.push(`${fq.question} Answer: ${fLabels.join(", ")}.`);
            }
          }
        }
      }

      const labels = values.map(
        (v) => allOptions.find((o) => o.value === v)?.label || v
      );
      lines.push(`${q.question} Answer: ${labels.join(", ")}.`);
    }
  }

  return lines.join("\n");
}

/**
 * Checks if any selected answers carry emergency urgency.
 */
export function detectEmergency(
  answers: Record<string, string | string[]>,
  sections: MedicalIntakeSection[]
): boolean {
  for (const section of sections) {
    for (const q of section.questions) {
      const answer = answers[q.id];
      if (!answer) continue;
      const values = Array.isArray(answer) ? answer : [answer];
      for (const v of values) {
        const opt = q.options?.find((o) => o.value === v);
        if (opt?.urgency === "emergency") return true;
      }

      // Check follow-ups too
      if (q.followUp) {
        for (const fqs of Object.values(q.followUp)) {
          for (const fq of fqs) {
            const fAnswer = answers[fq.id];
            if (!fAnswer) continue;
            const fValues = Array.isArray(fAnswer) ? fAnswer : [fAnswer];
            for (const v of fValues) {
              const opt = fq.options?.find((o) => o.value === v);
              if (opt?.urgency === "emergency") return true;
            }
          }
        }
      }
    }
  }
  return false;
}
