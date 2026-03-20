import { AssessmentData, ClinicalReasoningData, Message } from "@/types";

export interface PersistedEncounterState {
  patientLang: string;
  providerLang: string;
  messages: Message[];
  assessment: AssessmentData | null;
  reasoning: ClinicalReasoningData | null;
  activeSide: "patient" | "provider";
  autoInterview: boolean;
  nonVerbal: boolean;
  interviewHistory: { role: "patient" | "provider"; text: string }[];
  savedAt?: number;
}

const ENCOUNTER_STORAGE_KEY = "medtalk.encounter.v1";
const ENCOUNTER_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours — auto-expire stale encounters

function stripTransientMessageFields(message: Message): Message {
  const { audioUrl, ...rest } = message;
  return rest;
}

export function loadEncounterState(): PersistedEncounterState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ENCOUNTER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEncounterState;
    if (!parsed || !Array.isArray(parsed.messages)) return null;

    // Auto-expire encounters older than 8 hours to prevent stale PHI
    if (parsed.savedAt && Date.now() - parsed.savedAt > ENCOUNTER_MAX_AGE_MS) {
      window.localStorage.removeItem(ENCOUNTER_STORAGE_KEY);
      return null;
    }

    return {
      ...parsed,
      messages: parsed.messages.map(stripTransientMessageFields),
      interviewHistory: Array.isArray(parsed.interviewHistory)
        ? parsed.interviewHistory
        : [],
    };
  } catch {
    return null;
  }
}

export function saveEncounterState(state: PersistedEncounterState) {
  if (typeof window === "undefined") return;

  try {
    const safeState: PersistedEncounterState = {
      ...state,
      messages: state.messages.map(stripTransientMessageFields),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(ENCOUNTER_STORAGE_KEY, JSON.stringify(safeState));
  } catch {
    // Ignore storage write failures to preserve the live encounter experience.
  }
}

export function clearEncounterState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ENCOUNTER_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
