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

export type AppStep = 1 | 2;

export type RecordingState = "idle" | "recording" | "processing";
