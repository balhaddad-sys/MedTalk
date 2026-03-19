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
  backTranslation?: string;
  confidence?: "high" | "medium" | "low";
  medicalTerms?: string[];
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  audioUrl?: string;
  isEmergency?: boolean;
  edited?: boolean;
}

export interface TranslateRequest {
  text: string;
  source_lang?: string;
  target_lang: string;
}

export interface TranslateResponse {
  translated_text: string;
  back_translation?: string;
  confidence?: "high" | "medium" | "low";
  medical_terms?: string[];
  is_emergency?: boolean;
  model: string;
}

export type RecordingState = "idle" | "recording" | "processing";

export type AppMode = "setup" | "conversation" | "intake";

export type VisitType = "general" | "emergency" | "primary" | "pharmacy" | "mental_health" | "pediatric";

export interface IntakeQuestion {
  id: string;
  emoji: string;
  question: string;
  category: "chief" | "pain" | "history" | "allergy" | "medication";
  followUp?: string[];
}

export interface ConversationExport {
  messages: Message[];
  patientLang: string;
  providerLang: string;
  startTime: number;
  endTime: number;
  visitType?: VisitType;
}
