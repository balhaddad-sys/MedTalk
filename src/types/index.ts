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
  audioUrl?: string;
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

export type RecordingState = "idle" | "recording" | "processing";

export type AppMode = "setup" | "conversation" | "intake";

export interface IntakeQuestion {
  id: string;
  emoji: string;
  question: string;
  category: "chief" | "pain" | "history" | "allergy" | "medication";
  followUp?: string[];
}
