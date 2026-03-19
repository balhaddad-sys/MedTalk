"use client";

import { useEffect, useCallback } from "react";
import { RecordingState } from "@/types";

interface HoldToTalkProps {
  recordingState: RecordingState;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  onCancel?: () => void;
  error?: string | null;
  debugInfo?: string;
}

export default function HoldToTalk({
  recordingState,
  duration,
  onStart,
  onStop,
  onCancel,
  error,
  debugInfo,
}: HoldToTalkProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";
  const isIdle = recordingState === "idle";

  // Tap to toggle: tap once to start, tap again to stop
  const handleClick = useCallback(() => {
    if (isIdle) {
      onStart();
    } else if (isRecording) {
      onStop();
    }
  }, [isIdle, isRecording, onStart, onStop]);

  // Keyboard shortcut: spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (isIdle) onStart();
        else if (isRecording) onStop();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRecording && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isIdle, isRecording, onStart, onStop, onCancel]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status text */}
      <p className="text-sm font-medium text-slate-500 h-5" aria-live="polite">
        {isIdle && "Tap to start recording"}
        {isRecording && "Recording... Tap again to stop"}
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
          <div className="absolute w-32 h-32 rounded-full bg-medical-400/15 animate-gentle-pulse motion-reduce:animate-none" />
        )}

        {/* Main button — simple tap to toggle */}
        <button
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isProcessing}
          aria-label={
            isIdle
              ? "Tap to start recording"
              : isRecording
                ? "Tap to stop and translate"
                : "Processing"
          }
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none
            ${
              isIdle
                ? "bg-medical-600 hover:bg-medical-700 active:scale-95 shadow-lg shadow-medical-300 cursor-pointer"
                : isRecording
                  ? "bg-danger scale-110 shadow-xl shadow-danger/40 cursor-pointer"
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
          ) : isRecording ? (
            /* Stop icon (square) when recording */
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            /* Mic icon when idle */
            <svg
              className="w-10 h-10 text-white"
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
            <span className="text-white text-xs font-mono font-bold" aria-live="off">
              {formatDuration(duration)}
            </span>
          )}
        </button>
      </div>

      {/* Cancel hint when recording */}
      {isRecording && onCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="text-xs text-slate-400 hover:text-danger transition-colors"
        >
          Cancel recording
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="max-w-sm text-center px-4 py-2 bg-danger/10 text-danger rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Debug info */}
      {debugInfo && (
        <div className="max-w-sm text-center px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-mono">
          {debugInfo}
        </div>
      )}
    </div>
  );
}
