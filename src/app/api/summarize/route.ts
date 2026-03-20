import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { parseJsonObject } from "@/lib/json";
import { ClinicalSummaryData } from "@/types";

interface SummaryMessage {
  role?: unknown;
  originalText?: unknown;
  translatedText?: unknown;
}

interface SummaryModelOutput {
  chief_complaint?: unknown;
  hpi?: unknown;
  allergies?: unknown;
  current_medications?: unknown;
  assessment_notes?: unknown;
  follow_up_needed?: unknown;
  verification_checklist?: unknown;
}

const SUMMARY_PROMPT = `You are a clinical documentation assistant preparing a draft note from a bilingual patient-provider conversation.

Use only facts stated in the conversation. Do not invent findings, diagnoses, vitals, or exam details. Keep the output concise and chart-friendly.

Return JSON only with this exact shape:
{
  "chief_complaint": "string",
  "hpi": "string",
  "allergies": ["string"],
  "current_medications": ["string"],
  "assessment_notes": ["string"],
  "follow_up_needed": ["string"],
  "verification_checklist": ["string"]
}

Guidance:
- assessment_notes should capture key clinically relevant facts already mentioned.
- follow_up_needed should list unresolved items worth clarifying.
- verification_checklist should call out the most important facts to verify before charting or acting on the summary.
- Use empty strings or empty arrays when information is missing.`;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeSummary(value: SummaryModelOutput): ClinicalSummaryData {
  return {
    chiefComplaint: asString(value.chief_complaint),
    hpi: asString(value.hpi),
    allergies: asStringArray(value.allergies, 6),
    currentMedications: asStringArray(value.current_medications, 6),
    assessmentNotes: asStringArray(value.assessment_notes),
    followUpNeeded: asStringArray(value.follow_up_needed),
    verificationChecklist: asStringArray(value.verification_checklist),
  };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "summarize");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const { messages } = (await request.json()) as { messages: SummaryMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const conversation = messages
      .map((message, index) => {
        const role = typeof message.role === "string" ? message.role.toUpperCase() : "UNKNOWN";
        const originalText = asString(message.originalText);
        const translatedText = asString(message.translatedText);

        return [
          `[${index + 1}] ${role}`,
          originalText ? `Original: ${originalText}` : "",
          translatedText ? `Provider translation: ${translatedText}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const openai = getOpenAI();
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: `CONVERSATION:\n${conversation}` },
      ],
    });

    const rawOutput = result.choices[0]?.message?.content?.trim() || "";
    const summary = normalizeSummary(parseJsonObject<SummaryModelOutput>(rawOutput));

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
