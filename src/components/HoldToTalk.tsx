"use client";

import { RecordingState } from "@/types";

interface HoldToTalkProps {
  recordingState: RecordingState;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  error?: string | null;
}

export default function HoldToTalk({
  recordingState,
  duration,
  onStart,
  onStop,
  error,
}: HoldToTalkProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";
  const isIdle = recordingState === "idle";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status text */}
      <p className="text-sm font-medium text-slate-500 h-5">
        {isIdle && "Tap and hold to speak"}
        {isRecording && "Listening... Release to translate"}
        {isProcessing && "Translating..."}
      </p>

      {/* Button container with pulse rings */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute w-36 h-36 rounded-full bg-danger/20 animate-pulse-ring" />
            <div
              className="absolute w-36 h-36 rounded-full bg-danger/15 animate-pulse-ring"
              style={{ animationDelay: "0.4s" }}
            />
          </>
        )}

        {/* Gentle pulse when idle */}
        {isIdle && (
          <div className="absolute w-32 h-32 rounded-full bg-medical-400/15 animate-gentle-pulse" />
        )}

        {/* Main button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (isIdle) onStart();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (isRecording) onStop();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            if (isRecording) onStop();
          }}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isProcessing}
          aria-label={
            isIdle
              ? "Hold to talk"
              : isRecording
                ? "Release to send"
                : "Processing"
          }
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none touch-none
            ${
              isIdle
                ? "bg-medical-600 hover:bg-medical-700 active:scale-95 shadow-lg shadow-medical-300"
                : isRecording
                  ? "bg-danger scale-110 shadow-xl shadow-danger/40"
                  : "bg-slate-400 cursor-not-allowed"
            }
          `}
        >
          {isProcessing ? (
            <svg
              className="w-8 h-8 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className={`w-10 h-10 text-white ${isRecording ? "animate-pulse" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}

          {isRecording && (
            <span className="text-white text-xs font-mono font-bold">
              {formatDuration(duration)}
            </span>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-xs text-center px-4 py-2 bg-danger/10 text-danger rounded-xl text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
