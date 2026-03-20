export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  dir?: "ltr" | "rtl";
}

export type ConfidenceLevel = "high" | "medium" | "low";
export type CoverageStatus = "done" | "partial" | "missing" | "not_applicable";
export type DifferentialLikelihood = ConfidenceLevel | "excluded";
export type DifferentialUrgency = "critical" | "urgent" | "routine";
export type ProtocolScreeningStatus = "addressed" | "missing";

export interface Message {
  id: string;
  role: "patient" | "provider";
  originalText: string;
  translatedText: string;
  backTranslation?: string;
  confidence?: ConfidenceLevel;
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
  confidence?: ConfidenceLevel;
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

export interface TranscriptEvidence {
  label: string;
  evidence?: string;
}

export interface CoverageItem {
  label: string;
  status: CoverageStatus;
  note?: string;
}

export interface DifferentialItem {
  diagnosis: string;
  likelihood: DifferentialLikelihood;
  urgency: DifferentialUrgency;
  supportingEvidence: string[];
  againstEvidence: string[];
  missingInformation: string[];
}

export interface ProtocolScreeningItem {
  id: string;
  label: string;
  priority: DifferentialUrgency;
  question: string;
  rationale: string;
  status: ProtocolScreeningStatus;
  evidence?: string;
}

export interface ProtocolSummary {
  id: string;
  label: string;
  matchReason: string;
  completion: number;
  nextPriorityQuestion?: string;
  criticalGaps: string[];
  urgentGaps: string[];
  screening: ProtocolScreeningItem[];
}

export interface AnswerOption {
  label: string;
  emoji: string;
}

export interface ClinicalReasoningData {
  chiefComplaint: string;
  oneLineSummary: string;
  differential: DifferentialItem[];
  redFlags: {
    present: TranscriptEvidence[];
    absent: TranscriptEvidence[];
    unscreened: string[];
  };
  hpiCoverage: CoverageItem[];
  historyCoverage: CoverageItem[];
  highestPriorityGap: {
    label: string;
    rationale: string;
  };
  protocols: ProtocolSummary[];
  nextQuestion: string;
  answerOptions: AnswerOption[];
  readyForAssessment: boolean;
  readinessRationale: string;
}

export interface AssessmentData {
  esiLevel: "1" | "2" | "3" | "4" | "5" | "undetermined";
  rationale: string;
  recommendedWorkup: string[];
  criticalActions: string[];
  disposition: string;
}

export interface InterviewResponse {
  question: string;
  isAssessment: boolean;
  reasoning: ClinicalReasoningData | null;
  assessment: AssessmentData | null;
}

export interface ClinicalSummaryData {
  chiefComplaint: string;
  hpi: string;
  allergies: string[];
  currentMedications: string[];
  assessmentNotes: string[];
  followUpNeeded: string[];
  verificationChecklist: string[];
}
