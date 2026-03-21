"use client";

import { useState } from "react";
import { ClinicalSummaryData, Message } from "@/types";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface ClinicalSummaryProps {
  messages: Message[];
}

function hasSummaryContent(summary: ClinicalSummaryData) {
  return Boolean(
    summary.chiefComplaint ||
      summary.hpi ||
      summary.allergies.length ||
      summary.currentMedications.length ||
      summary.assessmentNotes.length ||
      summary.followUpNeeded.length ||
      summary.verificationChecklist.length
  );
}

function formatSummaryForClipboard(summary: ClinicalSummaryData) {
  const lines = [
    summary.chiefComplaint ? `Chief Complaint: ${summary.chiefComplaint}` : "",
    summary.hpi ? `History of Present Illness: ${summary.hpi}` : "",
    summary.allergies.length ? `Allergies: ${summary.allergies.join(", ")}` : "",
    summary.currentMedications.length
      ? `Current Medications: ${summary.currentMedications.join(", ")}`
      : "",
    summary.assessmentNotes.length
      ? `Assessment Notes:\n- ${summary.assessmentNotes.join("\n- ")}`
      : "",
    summary.followUpNeeded.length
      ? `Follow-up Needed:\n- ${summary.followUpNeeded.join("\n- ")}`
      : "",
    summary.verificationChecklist.length
      ? `Verification Checklist:\n- ${summary.verificationChecklist.join("\n- ")}`
      : "",
  ].filter(Boolean);

  return lines.join("\n\n");
}

export default function ClinicalSummary({ messages }: ClinicalSummaryProps) {
  const [summary, setSummary] = useState<ClinicalSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useNetworkStatus();

  const generateSummary = async () => {
    if (messages.length === 0) return;
    if (!isOnline) {
      setError("Structured summary needs connectivity. Translation and saved notes remain available offline.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((message) => ({
            role: message.role,
            originalText: message.originalText,
            translatedText: message.translatedText,
            confidence: message.confidence,
            requiresHumanReview: message.requiresHumanReview,
            verificationItems: message.verificationItems,
            possibleMismatches: message.possibleMismatches,
            criticalDetails: message.criticalDetails,
            speechConfidence: message.speechConfidence,
            speechReviewItems: message.speechReviewItems,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = (await response.json()) as { summary?: ClinicalSummaryData };
      const nextSummary = data.summary;

      if (!nextSummary || !hasSummaryContent(nextSummary)) {
        throw new Error("Summary returned no useful content");
      }

      setSummary(nextSummary);
    } catch {
      setError("Could not generate the structured summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(formatSummaryForClipboard(summary));
  };

  if (messages.length < 2) return null;

  return (
    <div className="w-full">
      {!summary ? (
        <button
          onClick={generateSummary}
          disabled={isLoading || !isOnline}
          className="w-full rounded-3xl border border-primary-200 bg-white/90 px-4 py-3 text-left shadow-[0_10px_24px_rgba(79,70,229,0.08)] transition-colors hover:bg-primary-50/60 disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
              <span>{"\u{1F4CB}"}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">
                Generate structured chart summary
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                {isOnline
                  ? "Draft a concise note plus a verification checklist before charting."
                  : "Summary generation pauses offline, but the encounter transcript stays on this device."}
              </p>
            </div>
            {isLoading && (
              <svg className="h-5 w-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </button>
      ) : (
        <div className="rounded-3xl border border-primary-200 bg-white/95 p-4 shadow-[0_16px_36px_rgba(79,70,229,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-500">
                Structured Summary
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                Ready for clinician review
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySummary}
                className="rounded-full bg-primary-100 px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-200"
              >
                Copy
              </button>
              <button
                onClick={() => setSummary(null)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SummaryPanel title="Chief Complaint" content={summary.chiefComplaint || "Not captured yet"} />
            <SummaryPanel title="History Of Present Illness" content={summary.hpi || "Needs more detail"} />
            <SummaryList title="Allergies" items={summary.allergies} emptyLabel="No allergies documented" />
            <SummaryList title="Current Medications" items={summary.currentMedications} emptyLabel="No medications documented" />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SummaryList title="Assessment Notes" items={summary.assessmentNotes} emptyLabel="No assessment notes generated" />
            <SummaryList title="Follow-up Needed" items={summary.followUpNeeded} emptyLabel="No follow-up items generated" />
          </div>

          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Verification Checklist
            </p>
            {summary.verificationChecklist.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700">
                No checklist items returned. Verify the summary before charting.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {summary.verificationChecklist.map((item) => (
                  <p key={item} className="rounded-xl bg-white/80 px-2.5 py-2 text-xs text-amber-900">
                    {item}
                  </p>
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            AI-generated draft. Confirm critical details with the patient, interpreter, and clinician before using it in the chart.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}

function SummaryPanel({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{content}</p>
    </div>
  );
}

function SummaryList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <p key={`${title}-${item}`} className="rounded-xl bg-white px-2.5 py-2 text-xs text-slate-700">
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
