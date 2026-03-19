export interface QuestionNode {
  id: string;
  question: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  label: string;
  emoji: string;
  /** If set, selecting this option produces this final phrase for translation */
  phrase?: string;
  /** If set, selecting this option navigates to this next question node */
  nextId?: string;
}

export const questionTree: Record<string, QuestionNode> = {
  root: {
    id: "root",
    question: "What do you need help with?",
    options: [
      { label: "Pain", emoji: "\u{1F915}", nextId: "pain" },
      { label: "Breathing", emoji: "\u{1FAC1}", nextId: "breathing" },
      { label: "Stomach", emoji: "\u{1F922}", nextId: "stomach" },
      { label: "Other symptoms", emoji: "\u{1FA7A}", nextId: "other_symptoms" },
      { label: "Basic needs", emoji: "\u{1F64B}", nextId: "basic_needs" },
      { label: "Emergency", emoji: "\u{1F6A8}", nextId: "emergency" },
    ],
  },

  // --- Pain branch ---
  pain: {
    id: "pain",
    question: "Where is the pain?",
    options: [
      { label: "Head", emoji: "\u{1F9E0}", nextId: "pain_head" },
      { label: "Chest", emoji: "\u{1FAC0}", nextId: "pain_chest" },
      { label: "Stomach", emoji: "\u{1F4A5}", nextId: "pain_stomach" },
      { label: "Back", emoji: "\u{1F9B4}", nextId: "pain_back" },
      { label: "Arm / Leg", emoji: "\u{1F9BE}", nextId: "pain_limb" },
      { label: "Everywhere", emoji: "\u{1F62B}", phrase: "I have pain all over my body." },
    ],
  },
  pain_head: {
    id: "pain_head",
    question: "How bad is the headache?",
    options: [
      { label: "Mild", emoji: "\u{1F610}", phrase: "I have a mild headache." },
      { label: "Severe", emoji: "\u{1F616}", phrase: "I have a very severe headache." },
      { label: "With dizziness", emoji: "\u{1F4AB}", phrase: "I have a headache and I feel dizzy." },
      { label: "With vision problems", emoji: "\u{1F441}\uFE0F", phrase: "I have a headache and my vision is blurry." },
    ],
  },
  pain_chest: {
    id: "pain_chest",
    question: "Describe the chest pain:",
    options: [
      { label: "Sharp pain", emoji: "\u26A1", phrase: "I have a sharp pain in my chest." },
      { label: "Pressure / tightness", emoji: "\u{1F44A}", phrase: "I feel pressure and tightness in my chest." },
      { label: "Pain when breathing", emoji: "\u{1FAC1}", phrase: "My chest hurts when I breathe." },
      { label: "Radiates to arm", emoji: "\u{1F9BE}", phrase: "I have chest pain that goes to my arm." },
    ],
  },
  pain_stomach: {
    id: "pain_stomach",
    question: "Describe the stomach pain:",
    options: [
      { label: "Cramping", emoji: "\u{1F616}", phrase: "I have stomach cramps." },
      { label: "Sharp pain", emoji: "\u26A1", phrase: "I have a sharp stomach pain." },
      { label: "After eating", emoji: "\u{1F37D}\uFE0F", phrase: "My stomach hurts after eating." },
      { label: "With nausea", emoji: "\u{1F922}", phrase: "I have stomach pain and I feel nauseous." },
    ],
  },
  pain_back: {
    id: "pain_back",
    question: "Describe the back pain:",
    options: [
      { label: "Upper back", emoji: "\u2B06\uFE0F", phrase: "I have pain in my upper back." },
      { label: "Lower back", emoji: "\u2B07\uFE0F", phrase: "I have pain in my lower back." },
      { label: "Can't move", emoji: "\u{1F6AB}", phrase: "My back hurts so much I cannot move." },
      { label: "Numbness / tingling", emoji: "\u{1F9B6}", phrase: "My back hurts and I feel numbness or tingling." },
    ],
  },
  pain_limb: {
    id: "pain_limb",
    question: "Which area?",
    options: [
      { label: "Right arm", emoji: "\u{1F4AA}", phrase: "I have pain in my right arm." },
      { label: "Left arm", emoji: "\u{1F4AA}", phrase: "I have pain in my left arm." },
      { label: "Right leg", emoji: "\u{1F9B5}", phrase: "I have pain in my right leg." },
      { label: "Left leg", emoji: "\u{1F9B5}", phrase: "I have pain in my left leg." },
    ],
  },

  // --- Breathing branch ---
  breathing: {
    id: "breathing",
    question: "Describe the breathing problem:",
    options: [
      { label: "Hard to breathe", emoji: "\u{1FAC1}", phrase: "I am having difficulty breathing." },
      { label: "Wheezing", emoji: "\u{1F4A8}", phrase: "I am wheezing when I breathe." },
      { label: "Coughing", emoji: "\u{1F637}", nextId: "coughing" },
      { label: "Short of breath", emoji: "\u{1F62E}\u200D\u{1F4A8}", phrase: "I am very short of breath." },
    ],
  },
  coughing: {
    id: "coughing",
    question: "What kind of cough?",
    options: [
      { label: "Dry cough", emoji: "\u{1F637}", phrase: "I have a dry cough." },
      { label: "With mucus", emoji: "\u{1F922}", phrase: "I have a cough with mucus." },
      { label: "With blood", emoji: "\u{1FA78}", phrase: "I am coughing up blood." },
      { label: "Long time", emoji: "\u{1F4C5}", phrase: "I have had a cough for a long time." },
    ],
  },

  // --- Stomach / digestive branch ---
  stomach: {
    id: "stomach",
    question: "What is the stomach problem?",
    options: [
      { label: "Nausea", emoji: "\u{1F922}", phrase: "I feel nauseous." },
      { label: "Vomiting", emoji: "\u{1F92E}", phrase: "I have been vomiting." },
      { label: "Diarrhea", emoji: "\u{1F6BD}", phrase: "I have diarrhea." },
      { label: "Constipation", emoji: "\u{1F614}", phrase: "I am constipated." },
      { label: "Blood in stool", emoji: "\u{1FA78}", phrase: "I have noticed blood in my stool." },
      { label: "Can't eat", emoji: "\u{1F6AB}", phrase: "I cannot eat anything." },
    ],
  },

  // --- Other symptoms branch ---
  other_symptoms: {
    id: "other_symptoms",
    question: "What are you experiencing?",
    options: [
      { label: "Fever", emoji: "\u{1F321}\uFE0F", phrase: "I have a fever." },
      { label: "Dizziness", emoji: "\u{1F4AB}", phrase: "I feel very dizzy." },
      { label: "Weakness", emoji: "\u{1F62A}", phrase: "I feel very weak." },
      { label: "Rash / skin", emoji: "\u{1F9F4}", phrase: "I have a rash or skin problem." },
      { label: "Swelling", emoji: "\u{1F4A2}", phrase: "I have swelling." },
      { label: "Blurred vision", emoji: "\u{1F441}\uFE0F", phrase: "My vision is blurry." },
    ],
  },

  // --- Basic needs branch ---
  basic_needs: {
    id: "basic_needs",
    question: "What do you need?",
    options: [
      { label: "Water", emoji: "\u{1F4A7}", phrase: "I need water please." },
      { label: "Bathroom", emoji: "\u{1F6BB}", phrase: "Where is the bathroom?" },
      { label: "Call family", emoji: "\u{1F4DE}", phrase: "Can you call my family?" },
      { label: "Blanket", emoji: "\u{1F6CF}\uFE0F", phrase: "I need a blanket, I am cold." },
      { label: "Interpreter", emoji: "\u{1F5E3}\uFE0F", phrase: "I need a human interpreter please." },
      { label: "My medication", emoji: "\u{1F48A}", phrase: "I need my medication." },
    ],
  },

  // --- Emergency branch ---
  emergency: {
    id: "emergency",
    question: "What is the emergency?",
    options: [
      { label: "Can't breathe", emoji: "\u{1F6A8}", phrase: "I cannot breathe. This is an emergency." },
      { label: "Chest pain", emoji: "\u{1F494}", phrase: "I have severe chest pain. This is an emergency." },
      { label: "Severe bleeding", emoji: "\u{1FA78}", phrase: "I am bleeding severely. Please help." },
      { label: "Going to faint", emoji: "\u{1F635}", phrase: "I feel like I am going to faint." },
      { label: "Allergic reaction", emoji: "\u26A0\uFE0F", phrase: "I think I am having a severe allergic reaction." },
      { label: "Seizure", emoji: "\u26A1", phrase: "I feel like I am about to have a seizure." },
    ],
  },
};
