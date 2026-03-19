"use client";

import { useState } from "react";
import { intakeQuestions } from "@/lib/intake";

interface IntakeFlowProps {
  onAskQuestion: (question: string) => void;
  isProcessing: boolean;
  currentQuestionIndex: number;
}

export default function IntakeFlow({
  onAskQuestion,
  isProcessing,
  currentQuestionIndex,
}: IntakeFlowProps) {
  const [showAll, setShowAll] = useState(false);

  const currentQ = intakeQuestions[currentQuestionIndex];
  const progress = Math.round(
    (currentQuestionIndex / intakeQuestions.length) * 100
  );

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Patient Intake</span>
          <span>
            {currentQuestionIndex} / {intakeQuestions.length} questions
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-medical-500 to-medical-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current prompted question */}
      {currentQ && (
        <div className="bg-white rounded-2xl border-2 border-medical-200 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{currentQ.emoji}</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-medical-500 uppercase tracking-wide mb-1">
                Suggested Question
              </p>
              <p className="text-lg font-semibold text-slate-800 leading-snug">
                {currentQ.question}
              </p>
            </div>
          </div>

          <button
            onClick={() => onAskQuestion(currentQ.question)}
            disabled={isProcessing}
            className="mt-4 w-full py-3 bg-medical-600 hover:bg-medical-700 text-white font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
            Translate &amp; Ask Patient
          </button>
        </div>
      )}

      {/* Completed state */}
      {!currentQ && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 text-center">
          <span className="text-3xl block mb-2">{"\u2705"}</span>
          <p className="font-semibold text-emerald-800">
            Intake questions completed
          </p>
          <p className="text-sm text-emerald-600 mt-1">
            Continue the conversation freely below
          </p>
        </div>
      )}

      {/* Show all questions toggle */}
      {currentQ && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? "Hide" : "View all"} intake questions
          <svg
            className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* All questions list */}
      {showAll && (
        <div className="space-y-1.5">
          {intakeQuestions.map((q, i) => {
            const done = i < currentQuestionIndex;
            const active = i === currentQuestionIndex;
            return (
              <button
                key={q.id}
                onClick={() => !done && onAskQuestion(q.question)}
                disabled={done || isProcessing}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm
                  ${done ? "bg-emerald-50 text-emerald-600 opacity-60" : ""}
                  ${active ? "bg-medical-50 border border-medical-200 text-medical-800 font-medium" : ""}
                  ${!done && !active ? "bg-white border border-slate-100 hover:border-medical-200 text-slate-600" : ""}
                  disabled:cursor-not-allowed
                `}
              >
                <span className="text-lg">{done ? "\u2705" : q.emoji}</span>
                <span className="flex-1">{q.question}</span>
                {active && (
                  <span className="text-xs bg-medical-100 text-medical-600 px-2 py-0.5 rounded-full">
                    Next
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
