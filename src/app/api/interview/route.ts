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

const INTERVIEW_PROMPT = `You are a conservative emergency medicine clinical interview assistant inside a translation app.

Analyze the conversation transcript and return JSON only. Use ONLY facts from the transcript. Do not invent negatives, exam findings, vitals, or test results.

Goals:
1. Keep the clinician oriented to the most dangerous plausible diagnoses first.
2. Track what has and has not been asked.
3. Ask one concrete next question in plain language when more information is needed.
4. Produce an assessment only when the history is mature enough for a provisional triage-oriented summary.
5. Respect the supplied symptom protocol guidance when a protocol is active.

Rules:
- All narrative fields you generate should be in English.
- Supporting and against evidence must be short phrases taken from or tightly grounded in the transcript.
- If a red flag was not asked, put it in unscreened. Never mark it absent unless it was clearly denied.
- next_question must be one sentence at about a 6th-grade reading level.
- ready_for_assessment is true only when the immediate dangerous diagnoses for the leading differential have been reasonably screened and the basic HPI is mostly complete.
- Set assessment to null unless ready_for_assessment is true.
- If the patient may be unstable, say so in rationale/critical actions.

Repetition avoidance (CRITICAL — read carefully):
- Before generating next_question, review ALL prior CLINICIAN turns in the transcript.
- NEVER ask the same question or a question on the same topic if the CLINICIAN has already asked about it TWO or more times. Count the CLINICIAN lines that address the same clinical topic (onset, location, medications, etc.). If there are already 2+ attempts, that topic is EXHAUSTED — mark it "partial" and move to a completely different topic.
- If the patient gave a vague or off-topic answer to the MOST RECENT clinician question, you may rephrase ONCE using simpler words, a yes/no reframe, or a concrete example. But if the clinician already rephrased once before (i.e., this would be the third ask on the same topic), STOP and move on.
- Examples of acceptable single rephrase:
  "When did the pain start?" -> Patient: "It hurts a lot" -> Rephrase: "Was it today that it started, or before today?"
  "Do you take any medicines?" -> Patient: "The doctor gave me some" -> Rephrase: "Do you remember the names? For example, anything for blood pressure or sugar?"
- When moving on from an exhausted topic, mark it "partial" in coverage and pick the NEXT highest-priority gap that has NOT been asked about yet.
- NEVER generate a next_question that is semantically identical to any prior CLINICIAN turn. If you catch yourself about to repeat, pick a different topic entirely.

Answer options (for non-verbal / questionnaire mode):
- For EVERY next_question, also generate 3-6 tappable answer_options that cover the most clinically useful responses.
- Each option has a short "label" (max 5 words, plain language) and an "emoji" icon.
- Options MUST be mutually exclusive and clinically discriminating — not just "Yes"/"No". Include specific descriptors.
- Always include a "Something else" or "I'm not sure" option as the last choice.
- Examples:
  Q: "When did the pain start?" -> Options: [{"label":"Today","emoji":"📅"},{"label":"Yesterday","emoji":"⬅️"},{"label":"A few days ago","emoji":"📆"},{"label":"More than a week","emoji":"🗓️"},{"label":"I'm not sure","emoji":"❓"}]
  Q: "What does the pain feel like?" -> Options: [{"label":"Sharp, stabbing","emoji":"🔪"},{"label":"Dull, aching","emoji":"😣"},{"label":"Burning","emoji":"🔥"},{"label":"Pressure, squeezing","emoji":"✊"},{"label":"Comes and goes","emoji":"🔄"},{"label":"Something else","emoji":"❓"}]
  Q: "How bad is the pain, from 1 to 10?" -> Options: [{"label":"Mild (1-3)","emoji":"🟢"},{"label":"Moderate (4-6)","emoji":"🟡"},{"label":"Severe (7-8)","emoji":"🟠"},{"label":"Worst ever (9-10)","emoji":"🔴"}]
- For yes/no red flag questions, still provide nuance: [{"label":"Yes","emoji":"✅"},{"label":"No","emoji":"❌"},{"label":"I'm not sure","emoji":"❓"}]

Return this exact JSON shape:
{
  "chief_complaint": "string",
  "one_line_summary": "string",
  "differential": [
    {
      "diagnosis": "string",
      "likelihood": "high|moderate|low|excluded",
      "urgency": "critical|urgent|routine",
      "supporting_evidence": ["string"],
      "against_evidence": ["string"],
      "missing_information": ["string"]
    }
  ],
  "red_flags": {
    "present": [{ "label": "string", "evidence": "string" }],
    "absent": [{ "label": "string", "evidence": "string" }],
    "unscreened": ["string"]
  },
  "hpi_coverage": [
    { "label": "Onset", "status": "done|partial|missing", "note": "string" },
    { "label": "Location", "status": "done|partial|missing", "note": "string" },
    { "label": "Duration", "status": "done|partial|missing", "note": "string" },
    { "label": "Character", "status": "done|partial|missing", "note": "string" },
    { "label": "Aggravating", "status": "done|partial|missing", "note": "string" },
    { "label": "Relieving", "status": "done|partial|missing", "note": "string" },
    { "label": "Temporal", "status": "done|partial|missing", "note": "string" },
    { "label": "Severity", "status": "done|partial|missing", "note": "string" }
  ],
  "history_coverage": [
    { "label": "Medications", "status": "done|partial|missing", "note": "string" },
    { "label": "Allergies", "status": "done|partial|missing", "note": "string" },
    { "label": "Medical history", "status": "done|partial|missing", "note": "string" },
    { "label": "Surgical history", "status": "done|partial|missing", "note": "string" },
    { "label": "LMP", "status": "done|missing|not_applicable", "note": "string" },
    { "label": "Social history", "status": "done|partial|missing", "note": "string" }
  ],
  "highest_priority_gap": {
    "label": "string",
    "rationale": "string"
  },
  "next_question": "string",
  "answer_options": [
    { "label": "string", "emoji": "string" }
  ],
  "ready_for_assessment": true,
  "readiness_rationale": "string",
  "assessment": {
    "esi_level": "1|2|3|4|5|undetermined",
    "rationale": "string",
    "recommended_workup": ["string"],
    "critical_actions": ["string"],
    "disposition": "string"
  }
}`;

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
        reasoning: null,
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

    const openai = getOpenAI();
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTERVIEW_PROMPT },
        {
          role: "user",
          content: `INTERVIEW TRANSCRIPT:\n${transcript}\n\n${protocolAnalysis.promptBlock}`,
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
