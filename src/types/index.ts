export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  dir?: "ltr" | "rtl";
}

export interface Message {
  id: string;
  role: "patient" | "provider";
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export interface TranslateRequest {
  text: string;
  source_lang?: string;
  target_lang: string;
}

export interface TranslateResponse {
  translated_text: string;
  model: string;
}

export type AppStep = 1 | 2;

export type RecordingState = "idle" | "recording" | "processing";

/** Interaction mode: "voice" is the default, "questions" is for users who cannot speak or listen */
export type InteractionMode = "voice" | "questions";

export interface MedicalIntakeAnswer {
  questionId: string;
  questionText: string;
  answer: string;
  timestamp: number;
}

export interface MedicalIntakeSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: MedicalIntakeQuestion[];
}

export interface MedicalIntakeQuestion {
  id: string;
  question: string;
  type: "single" | "multi" | "scale" | "text" | "body-area";
  options?: MedicalIntakeOption[];
  required?: boolean;
  followUp?: Record<string, MedicalIntakeQuestion[]>;
}

export interface MedicalIntakeOption {
  label: string;
  value: string;
  emoji?: string;
  urgency?: "normal" | "moderate" | "high" | "emergency";
}
