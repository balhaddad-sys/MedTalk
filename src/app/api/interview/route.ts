import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { analyzeInterviewProtocols, applyProtocolGuidance } from "@/lib/interviewProtocols";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { parseJsonObject } from "@/lib/json";
import {
  AnswerOption,
  AssessmentData,
  ClinicalReasoningData,
  CoverageItem,
  CoverageStatus,
  DifferentialItem,
  DifferentialLikelihood,
  DifferentialUrgency,
  TranscriptEvidence,
} from "@/types";

interface ConversationMessage {
  role: "patient" | "provider";
  text: string;
}

interface ModelCoverageItem {
  label?: unknown;
  status?: unknown;
  note?: unknown;
}

interface ModelReasoningOutput {
  chief_complaint?: unknown;
  one_line_summary?: unknown;
  differential?: unknown;
  red_flags?: {
    present?: unknown;
    absent?: unknown;
    unscreened?: unknown;
  };
  hpi_coverage?: unknown;
  history_coverage?: unknown;
  highest_priority_gap?: {
    label?: unknown;
    rationale?: unknown;
  };
  next_question?: unknown;
  answer_options?: unknown;
  ready_for_assessment?: unknown;
  readiness_rationale?: unknown;
  assessment?: unknown;
}

const HPI_COVERAGE_ORDER = [
  { label: "Onset", aliases: ["onset", "start"] },
  { label: "Location", aliases: ["location", "site"] },
  { label: "Duration", aliases: ["duration", "how long"] },
  { label: "Character", aliases: ["character", "quality", "type"] },
  { label: "Aggravating", aliases: ["aggravating", "worse", "provoking"] },
  { label: "Relieving", aliases: ["relieving", "better", "easing"] },
  { label: "Temporal", aliases: ["temporal", "timing", "course"] },
  { label: "Severity", aliases: ["severity", "intensity", "pain score"] },
] as const;

const HISTORY_COVERAGE_ORDER = [
  { label: "Medications", aliases: ["medications", "meds", "current medications"] },
  { label: "Allergies", aliases: ["allergies", "allergy"] },
  { label: "Medical history", aliases: ["medical history", "pmh", "past medical history"] },
  { label: "Surgical history", aliases: ["surgical history", "surgery", "past surgical history"] },
  { label: "LMP", aliases: ["lmp", "last menstrual period", "pregnancy history"] },
  { label: "Social history", aliases: ["social history", "smoking", "alcohol", "drugs"] },
] as const;

const INTERVIEW_PROMPT = `You are an ER clinical interview AI. Return JSON only. Use ONLY stated facts — never invent negatives, exam findings, or results.

Goals: Screen life-threats first. Track asked vs not asked. Ask ONE clear next question (6th-grade reading level). Assess when critical red flags screened and basic HPI done.

PACING: 4-6 patient answers. After 5, wrap up unless question changes management. Skip low-yield social/surgical history.

REPETITION (CRITICAL): If topic asked 2+ times = EXHAUSTED, mark "partial", move on. May rephrase ONCE with simpler words/yes-no. Never repeat semantically identical question.

ANSWER OPTIONS: 3-6 tappable options per question. Short label (max 5 words) + emoji. Clinically discriminating. Last option = "Not sure".

JSON: {"chief_complaint":"","one_line_summary":"","differential":[{"diagnosis":"","likelihood":"high|moderate|low|excluded","urgency":"critical|urgent|routine","supporting_evidence":[],"against_evidence":[],"missing_information":[]}],"red_flags":{"present":[{"label":"","evidence":""}],"absent":[{"label":"","evidence":""}],"unscreened":[]},"hpi_coverage":[{"label":"Onset|Location|Duration|Character|Aggravating|Relieving|Temporal|Severity","status":"done|partial|missing","note":""}],"history_coverage":[{"label":"Medications|Allergies|Medical history|Surgical history|LMP|Social history","status":"done|partial|missing|not_applicable","note":""}],"highest_priority_gap":{"label":"","rationale":""},"next_question":"","answer_options":[{"label":"","emoji":""}],"ready_for_assessment":false,"readiness_rationale":"","assessment":null}
When ready_for_assessment=true: assessment={"esi_level":"1-5","rationale":"","recommended_workup":[],"critical_actions":[],"disposition":""}`;


function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeLikelihood(value: unknown): DifferentialLikelihood {
  if (value === "high" || value === "low" || value === "excluded") return value;
  if (value === "moderate" || value === "medium") return "medium";
  return "low";
}

function normalizeUrgency(value: unknown): DifferentialUrgency {
  return value === "critical" || value === "urgent" || value === "routine"
    ? value
    : "urgent";
}

function normalizeCoverageStatus(value: unknown, allowNotApplicable = false): CoverageStatus {
  if (value === "done" || value === "partial" || value === "missing") {
    return value;
  }

  if (allowNotApplicable && value === "not_applicable") {
    return value;
  }

  return "missing";
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function normalizeAnswerOptions(value: unknown): AnswerOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const label = asString(raw.label);
      const emoji = asString(raw.emoji);
      if (!label) return null;
      return { label, emoji: emoji || "💬" };
    })
    .filter((item): item is AnswerOption => Boolean(item))
    .slice(0, 8);
}

function normalizeTextEvidence(value: unknown): TranscriptEvidence[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        return label ? { label } : null;
      }

      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const label = asString(raw.label);
      const evidence = asString(raw.evidence);

      if (!label) return null;

      return {
        label,
        evidence: evidence || undefined,
      };
    })
    .filter((item): item is TranscriptEvidence => Boolean(item))
    .slice(0, 8);
}

function normalizeDifferential(value: unknown): DifferentialItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const diagnosis = asString(raw.diagnosis);

      if (!diagnosis) return null;

      return {
        diagnosis,
        likelihood: normalizeLikelihood(raw.likelihood),
        urgency: normalizeUrgency(raw.urgency),
        supportingEvidence: asStringArray(raw.supporting_evidence),
        againstEvidence: asStringArray(raw.against_evidence),
        missingInformation: asStringArray(raw.missing_information),
      };
    })
    .filter((item): item is DifferentialItem => Boolean(item))
    .slice(0, 5);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeCoverageList(
  value: unknown,
  definitions: readonly { label: string; aliases: readonly string[] }[],
  allowNotApplicable = false
): CoverageItem[] {
  const items = Array.isArray(value)
    ? value.filter((item): item is ModelCoverageItem => Boolean(item) && typeof item === "object")
    : [];

  return definitions.map((definition) => {
    const match = items.find((item) => {
      const label = normalizeKey(asString(item.label));
      if (!label) return false;

      return definition.aliases.some((alias) => {
        const aliasKey = normalizeKey(alias);
        return label.includes(aliasKey) || aliasKey.includes(label);
      });
    });

    return {
      label: definition.label,
      status: normalizeCoverageStatus(match?.status, allowNotApplicable),
      note: asString(match?.note) || undefined,
    };
  });
}

function normalizeAssessment(value: unknown): AssessmentData | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const esiLevel = asString(raw.esi_level);
  const normalizedEsiLevel = esiLevel === "1" || esiLevel === "2" || esiLevel === "3" || esiLevel === "4" || esiLevel === "5"
    ? esiLevel
    : "undetermined";
  const rationale = asString(raw.rationale);
  const recommendedWorkup = asStringArray(raw.recommended_workup, 8);
  const criticalActions = asStringArray(raw.critical_actions, 8);
  const disposition = asString(raw.disposition);

  if (!rationale && recommendedWorkup.length === 0 && criticalActions.length === 0 && !disposition) {
    return null;
  }

  return {
    esiLevel: normalizedEsiLevel,
    rationale,
    recommendedWorkup,
    criticalActions,
    disposition,
  };
}

// ─── Server-side topic repetition detection ───
// Categorize clinician questions into clinical topics so we can tell the model
// which topics are exhausted (asked 2+ times) and must not be asked again.
const TOPIC_PATTERNS: { topic: string; patterns: string[] }[] = [
  { topic: "onset/timing", patterns: ["when did", "how long", "when was", "start", "began", "begin", "first notice"] },
  { topic: "location", patterns: ["where does", "where is", "which part", "point to", "location", "where exactly"] },
  { topic: "character/quality", patterns: ["what does it feel", "describe the", "type of pain", "sharp", "dull", "burning", "pressure", "what kind"] },
  { topic: "severity", patterns: ["how bad", "how severe", "scale of", "1 to 10", "pain score", "intensity", "how much does"] },
  { topic: "aggravating factors", patterns: ["make it worse", "aggravat", "worsen", "trigger", "what makes"] },
  { topic: "relieving factors", patterns: ["make it better", "reliev", "help with", "ease", "anything that helps"] },
  { topic: "radiation", patterns: ["spread", "radiat", "move to", "go to your", "travel", "into your arm", "into your back", "into your jaw"] },
  { topic: "medications", patterns: ["medic", "taking any", "prescri", "drug", "pill", "tablet", "medicine"] },
  { topic: "allergies", patterns: ["allerg", "react to", "sensitive to"] },
  { topic: "medical history", patterns: ["medical history", "past medical", "health condition", "diagnosed with", "chronic", "pmh"] },
  { topic: "surgical history", patterns: ["surg", "operation", "procedure"] },
  { topic: "pregnancy/LMP", patterns: ["pregnan", "last period", "menstrual", "lmp", "could you be pregnant"] },
  { topic: "social history", patterns: ["smok", "alcohol", "drink", "drug use", "recreational"] },
  { topic: "breathing", patterns: ["breath", "breathing", "short of breath", "respiratory"] },
  { topic: "chest pain", patterns: ["chest pain", "chest pressure", "chest tight"] },
  { topic: "fever", patterns: ["fever", "temperature", "chills"] },
  { topic: "nausea/vomiting", patterns: ["nausea", "vomit", "throw up", "sick to your stomach"] },
  { topic: "syncope", patterns: ["pass out", "faint", "black out", "lose consciousness", "dizz"] },
  { topic: "neurologic", patterns: ["weakness", "numb", "tingl", "vision", "speech", "trouble speaking", "trouble seeing"] },
  { topic: "bleeding", patterns: ["bleed", "blood in", "bloody", "black stool"] },
];

function classifyTopics(text: string): string[] {
  const lower = text.toLowerCase();
  return TOPIC_PATTERNS
    .filter(({ patterns }) => patterns.some(p => lower.includes(p)))
    .map(({ topic }) => topic);
}

function buildExhaustedTopicsBlock(messages: ConversationMessage[]): string {
  const topicCounts = new Map<string, number>();

  for (const msg of messages) {
    if (msg.role !== "provider") continue;
    const topics = classifyTopics(msg.text);
    for (const topic of topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  const exhausted = [...topicCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([topic]) => topic);

  if (exhausted.length === 0) return "";

  return `EXHAUSTED TOPICS (asked 2+ times — DO NOT ask about these again, mark them "partial" in coverage and move on):\n${exhausted.map(t => `- ${t}`).join("\n")}`;
}

function normalizeReasoning(value: ModelReasoningOutput): ClinicalReasoningData {
  const nextQuestion = asString(value.next_question) || "What worries you the most right now?";

  return {
    chiefComplaint: asString(value.chief_complaint) || "Undifferentiated complaint",
    oneLineSummary: asString(value.one_line_summary) || "History is still limited and needs clinician review.",
    differential: normalizeDifferential(value.differential),
    redFlags: {
      present: normalizeTextEvidence(value.red_flags?.present),
      absent: normalizeTextEvidence(value.red_flags?.absent),
      unscreened: asStringArray(value.red_flags?.unscreened, 8),
    },
    hpiCoverage: normalizeCoverageList(value.hpi_coverage, HPI_COVERAGE_ORDER),
    historyCoverage: normalizeCoverageList(value.history_coverage, HISTORY_COVERAGE_ORDER, true),
    highestPriorityGap: {
      label: asString(value.highest_priority_gap?.label) || "Clarify the highest-risk missing detail",
      rationale: asString(value.highest_priority_gap?.rationale) || "The app still needs more information before a safe triage summary.",
    },
    protocols: [],
    nextQuestion,
    answerOptions: normalizeAnswerOptions(value.answer_options),
    readyForAssessment: normalizeBoolean(value.ready_for_assessment),
    readinessRationale: asString(value.readiness_rationale) || "Critical history elements still need review.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "interview");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const { messages } = (await request.json()) as {
      messages: ConversationMessage[];
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({
        question: "What brings you to the emergency department today?",
        isAssessment: false,
        reasoning: {
          chiefComplaint: "",
          oneLineSummary: "Awaiting patient's chief complaint.",
          differential: [],
          redFlags: { present: [], absent: [], unscreened: [] },
          hpiCoverage: [],
          historyCoverage: [],
          highestPriorityGap: { label: "Chief complaint", rationale: "Need to identify the presenting complaint." },
          protocols: [],
          nextQuestion: "What brings you to the emergency department today?",
          answerOptions: [
            { label: "Pain", emoji: "😣" },
            { label: "Trouble breathing", emoji: "🫁" },
            { label: "Chest pain", emoji: "💔" },
            { label: "Stomach problem", emoji: "🤢" },
            { label: "Fever or infection", emoji: "🤒" },
            { label: "Injury or fall", emoji: "🩹" },
            { label: "Dizziness or fainting", emoji: "💫" },
            { label: "Something else", emoji: "❓" },
          ],
          readyForAssessment: false,
          readinessRationale: "Awaiting chief complaint.",
        },
        assessment: null,
      });
    }

    const transcript = messages
      .map((message, index) => {
        const speaker = message.role === "patient" ? "PATIENT" : "CLINICIAN";
        return `[${index + 1}] ${speaker}: ${message.text}`;
      })
      .join("\n");
    const protocolAnalysis = analyzeInterviewProtocols(messages);
    const exhaustedBlock = buildExhaustedTopicsBlock(messages);

    const openai = getOpenAI();
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.05,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTERVIEW_PROMPT },
        {
          role: "user",
          content: `INTERVIEW TRANSCRIPT:\n${transcript}\n\n${protocolAnalysis.promptBlock}\n\n${exhaustedBlock}`,
        },
      ],
    });

    const rawOutput = result.choices[0]?.message?.content?.trim() || "";
    const parsed = parseJsonObject<ModelReasoningOutput>(rawOutput);
    const reasoning = applyProtocolGuidance(normalizeReasoning(parsed), protocolAnalysis);
    const assessment = reasoning.readyForAssessment
      ? normalizeAssessment(parsed.assessment)
      : null;

    return NextResponse.json({
      question: assessment ? "" : reasoning.nextQuestion,
      isAssessment: Boolean(assessment),
      reasoning,
      assessment,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Interview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
