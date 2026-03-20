"use client";

import {
  AssessmentData,
  ClinicalReasoningData,
  CoverageItem,
  DifferentialItem,
  Message,
  TranscriptEvidence,
} from "@/types";

interface EncounterInsightsProps {
  messages: Message[];
  reasoning: ClinicalReasoningData | null;
  assessment: AssessmentData | null;
}

export default function EncounterInsights({
  messages,
  reasoning,
  assessment,
}: EncounterInsightsProps) {
  const emergencyCount = messages.filter((message) => message.isEmergency).length;
  const lowConfidenceCount = messages.filter((message) => message.confidence === "low").length;
  const mediumConfidenceCount = messages.filter((message) => message.confidence === "medium").length;
  const uniqueMedicalTerms = Array.from(
    new Set(messages.flatMap((message) => message.medicalTerms ?? []))
  ).slice(0, 12);

  if (messages.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricCard
          title="Patient Safety"
          tone={emergencyCount > 0 ? "danger" : "safe"}
          value={emergencyCount > 0 ? "Urgent review" : "No urgent keywords"}
          detail={
            emergencyCount > 0
              ? `${emergencyCount} message${emergencyCount === 1 ? "" : "s"} flagged for immediate safety review`
              : "Still verify concerning symptoms clinically"
          }
        />
        <MetricCard
          title="Translation Check"
          tone={lowConfidenceCount > 0 ? "warning" : "info"}
          value={
            lowConfidenceCount > 0
              ? `${lowConfidenceCount} low-confidence`
              : mediumConfidenceCount > 0
                ? `${mediumConfidenceCount} medium-confidence`
                : "Stable so far"
          }
          detail="Use back-translation and clarification for critical details"
        />
        <MetricCard
          title="Interview Status"
          tone={reasoning?.readyForAssessment ? "safe" : "info"}
          value={reasoning?.readyForAssessment ? "Assessment-ready" : "History in progress"}
          detail={reasoning?.highestPriorityGap.label || "Start the interview to generate a prioritized gap"}
        />
      </div>

      {reasoning && (
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-500">
                Clinical Insight
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                {reasoning.chiefComplaint}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {reasoning.oneLineSummary}
              </p>
            </div>
            <StatusPill
              label={reasoning.readyForAssessment ? "Ready" : "Needs more data"}
              tone={reasoning.readyForAssessment ? "safe" : "info"}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">
              Priority Gap
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {reasoning.highestPriorityGap.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {reasoning.highestPriorityGap.rationale}
            </p>
            {!assessment && (
              <div className="mt-3 rounded-2xl bg-white px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Suggested Next Question
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {reasoning.nextQuestion}
                </p>
              </div>
            )}
          </div>

          {reasoning.protocols.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Active Protocols
              </p>
              <div className="mt-2 space-y-2">
                {reasoning.protocols.map((protocol) => (
                  <ProtocolCard key={protocol.id} protocol={protocol} />
                ))}
              </div>
            </div>
          )}

          {reasoning.differential.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Working Differential
              </p>
              <div className="mt-2 space-y-2">
                {reasoning.differential.map((item) => (
                  <DifferentialCard key={item.diagnosis} item={item} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Red Flags
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <EvidenceList
                  title="Present"
                  tone="danger"
                  items={reasoning.redFlags.present}
                  emptyLabel="None documented"
                />
                <EvidenceList
                  title="Absent"
                  tone="safe"
                  items={reasoning.redFlags.absent}
                  emptyLabel="None explicitly screened"
                />
                <StringList
                  title="Unscreened"
                  tone="warning"
                  items={reasoning.redFlags.unscreened}
                  emptyLabel="No major gaps listed"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Coverage
              </p>
              <CoverageGroup title="HPI" items={reasoning.hpiCoverage} />
              <CoverageGroup title="History" items={reasoning.historyCoverage} />
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {reasoning.readinessRationale}
              </p>
            </div>
          </div>

          {assessment && (
            <div className="mt-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">
                    Provisional Triage Summary
                  </p>
                  <h4 className="mt-1 text-lg font-extrabold text-amber-900">
                    ESI {assessment.esiLevel}
                  </h4>
                </div>
                <StatusPill label="Clinician review required" tone="warning" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                {assessment.rationale}
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <StringList
                  title="Recommended Workup"
                  tone="info"
                  items={assessment.recommendedWorkup}
                  emptyLabel="No workup suggested"
                />
                <StringList
                  title="Critical Actions"
                  tone="danger"
                  items={assessment.criticalActions}
                  emptyLabel="No immediate actions suggested"
                />
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-xs font-semibold text-slate-500">Disposition</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {assessment.disposition || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {uniqueMedicalTerms.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Key Medical Terms Seen In Translation
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uniqueMedicalTerms.map((term) => (
              <span
                key={term}
                className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "safe" | "warning" | "danger" | "info";
}) {
  const toneStyles = {
    safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-primary-200 bg-primary-50 text-primary-700",
  } as const;

  return (
    <div className={`rounded-2xl border p-3 ${toneStyles[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
        {title}
      </p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
      <p className="mt-1 text-xs leading-relaxed opacity-85">{detail}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "safe" | "warning" | "danger" | "info";
}) {
  const toneStyles = {
    safe: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-primary-100 text-primary-700",
  } as const;

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneStyles[tone]}`}>
      {label}
    </span>
  );
}

function DifferentialCard({ item }: { item: DifferentialItem }) {
  const likelihoodStyles: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600",
    excluded: "bg-emerald-100 text-emerald-700",
  };

  const urgencyStyles = {
    critical: "bg-red-600 text-white",
    urgent: "bg-amber-500 text-white",
    routine: "bg-slate-700 text-white",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-slate-900">{item.diagnosis}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${likelihoodStyles[item.likelihood]}`}>
          {item.likelihood}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${urgencyStyles[item.urgency]}`}>
          {item.urgency}
        </span>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <StringList title="Supporting" tone="info" items={item.supportingEvidence} emptyLabel="None listed" />
        <StringList title="Against" tone="safe" items={item.againstEvidence} emptyLabel="None listed" />
        <StringList title="Still Missing" tone="warning" items={item.missingInformation} emptyLabel="No gap listed" />
      </div>
    </div>
  );
}

function ProtocolCard({ protocol }: { protocol: ClinicalReasoningData["protocols"][number] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{protocol.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {protocol.matchReason}
          </p>
        </div>
        <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-bold text-primary-700">
          {protocol.completion}% complete
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
          style={{ width: `${protocol.completion}%` }}
        />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <StringList
          title="Critical Gaps"
          tone="danger"
          items={protocol.criticalGaps}
          emptyLabel="No critical gaps still open"
        />
        <StringList
          title="Urgent Gaps"
          tone="warning"
          items={protocol.urgentGaps}
          emptyLabel="No urgent gaps still open"
        />
      </div>

      {protocol.nextPriorityQuestion && (
        <div className="mt-2 rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold text-slate-500">Next protocol question</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {protocol.nextPriorityQuestion}
          </p>
        </div>
      )}
    </div>
  );
}

function CoverageGroup({ title, items }: { title: string; items: CoverageItem[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={`${title}-${item.label}`}
            className="min-w-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              <CoverageBadge status={item.status} />
            </div>
            {item.note && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {item.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageBadge({ status }: { status: CoverageItem["status"] }) {
  const styles = {
    done: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    missing: "bg-red-100 text-red-700",
    not_applicable: "bg-slate-100 text-slate-600",
  } as const;

  const labels = {
    done: "Done",
    partial: "Partial",
    missing: "Missing",
    not_applicable: "N/A",
  } as const;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function EvidenceList({
  title,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  items: TranscriptEvidence[];
  emptyLabel: string;
  tone: "safe" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className={`text-xs font-semibold ${toneToTextColor(tone)}`}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div key={`${title}-${item.label}`} className="rounded-xl bg-slate-50 px-2.5 py-2">
              <p className="text-xs font-semibold text-slate-800">{item.label}</p>
              {item.evidence && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {item.evidence}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StringList({
  title,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  tone: "safe" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className={`text-xs font-semibold ${toneToTextColor(tone)}`}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <p key={`${title}-${item}`} className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function toneToTextColor(tone: "safe" | "warning" | "danger" | "info") {
  const styles = {
    safe: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    info: "text-primary-700",
  } as const;

  return styles[tone];
}
