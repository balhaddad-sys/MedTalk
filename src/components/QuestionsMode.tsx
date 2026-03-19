"use client";

import { useState, useCallback, useMemo } from "react";
import { MedicalIntakeSection, MedicalIntakeQuestion } from "@/types";
import {
  medicalIntakeSections,
  buildIntakeSummary,
  detectEmergency,
} from "@/lib/medicalIntake";
import TextInputField from "./TextInputField";
import VisualTranslationCard from "./VisualTranslationCard";

interface QuestionsModeProps {
  patientLang: string;
  providerLang: string;
  onTranslate: (text: string, sourceLang: string, targetLang: string) => Promise<{ translated_text: string }>;
  onBack: () => void;
}

type StepState =
  | { kind: "sections" }
  | { kind: "questions"; sectionIdx: number; questionIdx: number }
  | { kind: "followup"; sectionIdx: number; parentQuestionIdx: number; followUpIdx: number }
  | { kind: "review" }
  | { kind: "translated"; summary: string; translatedSummary: string };

export default function QuestionsMode({
  patientLang,
  providerLang,
  onTranslate,
  onBack,
}: QuestionsModeProps) {
  const [step, setStep] = useState<StepState>({ kind: "sections" });
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [emergencyDetected, setEmergencyDetected] = useState(false);

  const sections = medicalIntakeSections;

  // Get the current question based on step state
  const currentQuestion: MedicalIntakeQuestion | null = useMemo(() => {
    if (step.kind === "questions") {
      return sections[step.sectionIdx]?.questions[step.questionIdx] || null;
    }
    if (step.kind === "followup") {
      const parentQ = sections[step.sectionIdx]?.questions[step.parentQuestionIdx];
      if (!parentQ?.followUp) return null;
      const parentAnswer = answers[parentQ.id];
      const key = Array.isArray(parentAnswer) ? parentAnswer[0] : parentAnswer;
      if (!key || !parentQ.followUp[key]) return null;
      return parentQ.followUp[key][step.followUpIdx] || null;
    }
    return null;
  }, [step, sections, answers]);

  // Handle single-select answer
  const handleSingleSelect = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  // Handle multi-select toggle
  const handleMultiToggle = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => {
        const current = (prev[questionId] as string[]) || [];
        // "none" clears all others; selecting anything else clears "none"
        if (value === "none") return { ...prev, [questionId]: ["none"] };
        const withoutNone = current.filter((v) => v !== "none");
        const updated = withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value];
        return { ...prev, [questionId]: updated };
      });
    },
    []
  );

  // Handle scale answer
  const handleScale = useCallback(
    (questionId: string, value: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: String(value) }));
    },
    []
  );

  // Handle text answer
  const handleText = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  // Advance to next question or finish section
  const advanceFromQuestion = useCallback(() => {
    if (step.kind === "questions") {
      const section = sections[step.sectionIdx];
      const currentQ = section.questions[step.questionIdx];

      // Check if this question has follow-ups for the selected answer
      if (currentQ.followUp) {
        const answer = answers[currentQ.id];
        const key = Array.isArray(answer) ? answer[0] : answer;
        if (key && currentQ.followUp[key] && currentQ.followUp[key].length > 0) {
          setStep({ kind: "followup", sectionIdx: step.sectionIdx, parentQuestionIdx: step.questionIdx, followUpIdx: 0 });
          return;
        }
      }

      // Move to next question in section
      if (step.questionIdx + 1 < section.questions.length) {
        setStep({ ...step, questionIdx: step.questionIdx + 1 });
      } else {
        // Section complete
        setCompletedSections((prev) => new Set([...prev, section.id]));
        setStep({ kind: "sections" });
      }
    } else if (step.kind === "followup") {
      const parentQ = sections[step.sectionIdx].questions[step.parentQuestionIdx];
      const answer = answers[parentQ.id];
      const key = Array.isArray(answer) ? answer[0] : answer;
      const followUps = key && parentQ.followUp ? parentQ.followUp[key] : [];

      if (step.followUpIdx + 1 < (followUps?.length || 0)) {
        setStep({ ...step, followUpIdx: step.followUpIdx + 1 });
      } else {
        // Done with follow-ups, continue to next question in section
        const section = sections[step.sectionIdx];
        if (step.parentQuestionIdx + 1 < section.questions.length) {
          setStep({ kind: "questions", sectionIdx: step.sectionIdx, questionIdx: step.parentQuestionIdx + 1 });
        } else {
          setCompletedSections((prev) => new Set([...prev, section.id]));
          setStep({ kind: "sections" });
        }
      }
    }
  }, [step, sections, answers]);

  // Check if current question has an answer
  const canAdvance = useMemo(() => {
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (!answer) return !currentQuestion.required;
    if (Array.isArray(answer)) return answer.length > 0;
    return answer.length > 0;
  }, [currentQuestion, answers]);

  // Generate summary and translate
  const handleFinish = useCallback(async () => {
    setIsTranslating(true);
    setTranslationError(null);

    const isEmergency = detectEmergency(answers, sections);
    setEmergencyDetected(isEmergency);

    const summary = buildIntakeSummary(answers, sections);
    const prefix = isEmergency
      ? "EMERGENCY — IMMEDIATE ATTENTION REQUIRED.\n\n"
      : "";
    const fullSummary = prefix + summary;

    try {
      const result = await onTranslate(fullSummary, "en", providerLang);
      setStep({ kind: "translated", summary: fullSummary, translatedSummary: result.translated_text });
    } catch {
      setTranslationError("Translation failed. Showing English summary to provider.");
      setStep({ kind: "translated", summary: fullSummary, translatedSummary: fullSummary });
    } finally {
      setIsTranslating(false);
    }
  }, [answers, sections, onTranslate, providerLang]);

  // Reset everything
  const handleStartOver = useCallback(() => {
    setAnswers({});
    setCompletedSections(new Set());
    setStep({ kind: "sections" });
    setEmergencyDetected(false);
    setTranslationError(null);
  }, []);

  // ────────────── RENDER: Section picker ──────────────
  if (step.kind === "sections") {
    const answeredCount = completedSections.size;
    const totalSections = sections.length;
    const progress = totalSections > 0 ? (answeredCount / totalSections) * 100 : 0;

    return (
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-medical-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-400">Progress</p>
            <p className="text-sm font-bold text-medical-700">{answeredCount}/{totalSections} sections</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-medical-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-slate-800">Medical Questions</h2>
          <p className="text-sm text-slate-500">
            Tap each section to answer. No speaking or listening needed.
          </p>
        </div>

        {/* Section cards */}
        <div className="space-y-3">
          {sections.map((section, idx) => {
            const isDone = completedSections.has(section.id);
            return (
              <button
                key={section.id}
                onClick={() => setStep({ kind: "questions", sectionIdx: idx, questionIdx: 0 })}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left
                  ${isDone
                    ? "border-green-300 bg-green-50"
                    : "border-slate-200 bg-white hover:border-medical-300 hover:bg-medical-50/50"
                  }`}
              >
                <span className="text-2xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{section.title}</p>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
                {isDone ? (
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Finish / Review */}
        {answeredCount >= 2 && (
          <button
            onClick={() => setStep({ kind: "review" })}
            className="w-full py-4 rounded-2xl text-lg font-semibold bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98] transition-all"
          >
            Review &amp; Translate for Provider
          </button>
        )}

        {/* Free text fallback */}
        <div className="pt-2">
          <TextInputField
            placeholder="Or type anything here to translate..."
            onSubmit={async (text) => {
              setIsTranslating(true);
              try {
                const result = await onTranslate(text, patientLang, providerLang);
                setStep({ kind: "translated", summary: text, translatedSummary: result.translated_text });
              } catch {
                setTranslationError("Translation failed.");
              } finally {
                setIsTranslating(false);
              }
            }}
            isLoading={isTranslating}
          />
        </div>
      </div>
    );
  }

  // ────────────── RENDER: Question card ──────────────
  if ((step.kind === "questions" || step.kind === "followup") && currentQuestion) {
    const sectionTitle = sections[step.kind === "questions" ? step.sectionIdx : step.sectionIdx]?.title || "";
    return (
      <div className="w-full space-y-5">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep({ kind: "sections" })}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-medical-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Sections
          </button>
          <span className="text-xs text-slate-400 font-medium">{sectionTitle}</span>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">{currentQuestion.question}</h3>

          {/* Single select */}
          {currentQuestion.type === "single" && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.value;
                const isUrgent = opt.urgency === "emergency" || opt.urgency === "high";
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSingleSelect(currentQuestion.id, opt.value)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? isUrgent
                          ? "border-red-400 bg-red-50"
                          : "border-medical-500 bg-medical-50"
                        : "border-slate-200 bg-white hover:border-medical-300"
                      }`}
                  >
                    {opt.emoji && <span className="text-xl shrink-0">{opt.emoji}</span>}
                    <span className="text-sm font-medium text-slate-700 flex-1">{opt.label}</span>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-500" : "bg-medical-500"}`}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi select */}
          {currentQuestion.type === "multi" && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-2">
              {currentQuestion.options.map((opt) => {
                const selected = ((answers[currentQuestion.id] as string[]) || []);
                const isSelected = selected.includes(opt.value);
                const isUrgent = opt.urgency === "emergency" || opt.urgency === "high";
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiToggle(currentQuestion.id, opt.value)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? isUrgent
                          ? "border-red-400 bg-red-50"
                          : "border-medical-500 bg-medical-50"
                        : "border-slate-200 bg-white hover:border-medical-300"
                      }`}
                  >
                    {opt.emoji && <span className="text-xl shrink-0">{opt.emoji}</span>}
                    <span className="text-sm font-medium text-slate-700 flex-1">{opt.label}</span>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                      ${isSelected ? (isUrgent ? "border-red-500 bg-red-500" : "border-medical-500 bg-medical-500") : "border-slate-300"}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
              <p className="text-xs text-slate-400 text-center">Select all that apply</p>
            </div>
          )}

          {/* Body area (rendered same as single, but with a grid layout) */}
          {currentQuestion.type === "body-area" && currentQuestion.options && (
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSingleSelect(currentQuestion.id, opt.value)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? "border-medical-500 bg-medical-50"
                        : "border-slate-200 bg-white hover:border-medical-300"
                      }`}
                  >
                    {opt.emoji && <span className="text-xl shrink-0">{opt.emoji}</span>}
                    <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pain scale */}
          {currentQuestion.type === "scale" && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>No pain</span>
                <span>Worst pain</span>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => {
                  const isSelected = answers[currentQuestion.id] === String(i);
                  const color = i <= 3 ? "green" : i <= 6 ? "yellow" : "red";
                  const bgClass = isSelected
                    ? color === "green"
                      ? "bg-green-500 text-white border-green-500"
                      : color === "yellow"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-red-500 text-white border-red-500"
                    : "bg-white border-slate-200 hover:border-medical-300";
                  return (
                    <button
                      key={i}
                      onClick={() => handleScale(currentQuestion.id, i)}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all ${bgClass}`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              {answers[currentQuestion.id] && (
                <p className="text-center text-sm font-semibold text-slate-700">
                  Pain level: {answers[currentQuestion.id]}/10
                </p>
              )}
            </div>
          )}

          {/* Free text */}
          {currentQuestion.type === "text" && (
            <textarea
              value={(answers[currentQuestion.id] as string) || ""}
              onChange={(e) => handleText(currentQuestion.id, e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-medical-500 focus:ring-1 focus:ring-medical-500 outline-none text-sm resize-none"
              rows={3}
              placeholder="Type your answer here..."
            />
          )}
        </div>

        {/* Next button */}
        <button
          onClick={advanceFromQuestion}
          disabled={!canAdvance}
          className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all
            ${canAdvance
              ? "bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
        >
          Next
        </button>

        {/* Skip if not required */}
        {!currentQuestion.required && (
          <button
            onClick={advanceFromQuestion}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip this question
          </button>
        )}
      </div>
    );
  }

  // ────────────── RENDER: Review ──────────────
  if (step.kind === "review") {
    const summary = buildIntakeSummary(answers, sections);
    const isEmergency = detectEmergency(answers, sections);

    return (
      <div className="w-full space-y-5">
        <button
          onClick={() => setStep({ kind: "sections" })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-medical-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Edit answers
        </button>

        {isEmergency && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center">
            <p className="text-lg font-bold text-red-700">Emergency Detected</p>
            <p className="text-sm text-red-600 mt-1">
              Your answers indicate you may need immediate medical attention.
              Show this screen to a healthcare provider NOW.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-slate-800">Your answers (English):</h3>
          <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {summary || "No answers recorded yet."}
          </div>
        </div>

        <button
          onClick={handleFinish}
          disabled={isTranslating}
          className="w-full py-4 rounded-2xl text-lg font-semibold bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isTranslating ? "Translating..." : "Translate & Show to Provider"}
        </button>

        {translationError && (
          <p className="text-sm text-red-600 text-center">{translationError}</p>
        )}
      </div>
    );
  }

  // ────────────── RENDER: Translated summary ──────────────
  if (step.kind === "translated") {
    return (
      <div className="w-full space-y-5">
        {emergencyDetected && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 text-center animate-pulse">
            <p className="text-xl font-bold text-red-700">EMERGENCY</p>
            <p className="text-sm text-red-600 mt-1">
              This patient may need immediate attention. Please review urgently.
            </p>
          </div>
        )}

        <VisualTranslationCard
          originalText={step.summary}
          translatedText={step.translatedSummary}
          sourceLang={patientLang}
          targetLang={providerLang}
        />

        {translationError && (
          <p className="text-sm text-amber-600 text-center">{translationError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleStartOver}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={() => setStep({ kind: "sections" })}
            className="flex-1 py-3 rounded-xl bg-medical-600 text-white text-sm font-medium hover:bg-medical-700 transition-colors"
          >
            Edit Answers
          </button>
        </div>
      </div>
    );
  }

  return null;
}
