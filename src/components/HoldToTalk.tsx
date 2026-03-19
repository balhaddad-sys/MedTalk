"use client";

import { useState, useEffect, useCallback } from "react";
import { RecordingState } from "@/types";

interface HoldToTalkProps {
  recordingState: RecordingState;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  onCancel?: () => void;
  error?: string | null;
}

export default function HoldToTalk({
  recordingState,
  duration,
  onStart,
  onStop,
  onCancel,
  error,
}: HoldToTalkProps) {
  const [mode, setMode] = useState<"hold" | "toggle">("hold");

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";
  const isIdle = recordingState === "idle";

  // Toggle mode click handler
  const handleToggleClick = useCallback(() => {
    if (mode !== "toggle") return;
    if (isIdle) {
      onStart();
    } else if (isRecording) {
      onStop();
    }
  }, [mode, isIdle, isRecording, onStart, onStop]);

  // Keyboard shortcut: spacebar for push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        isIdle &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        onStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isRecording && mode === "hold") {
        e.preventDefault();
        onStop();
      }
    };

    // Escape to cancel
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRecording && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isIdle, isRecording, mode, onStart, onStop, onCancel]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setMode("hold")}
          className={`px-3 py-1 rounded-full transition-colors ${
            mode === "hold"
              ? "bg-medical-100 text-medical-700 font-medium"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Hold to talk
        </button>
        <button
          onClick={() => setMode("toggle")}
          className={`px-3 py-1 rounded-full transition-colors ${
            mode === "toggle"
              ? "bg-medical-100 text-medical-700 font-medium"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Tap to toggle
        </button>
      </div>

      {/* Status text */}
      <p className="text-sm font-medium text-slate-500 h-5" aria-live="polite">
        {isIdle &&
          (mode === "hold"
            ? "Hold to speak \u2022 Spacebar shortcut"
            : "Tap to start recording")}
        {isRecording && "Listening... " + (mode === "hold" ? "Release to translate" : "Tap to stop")}
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

        {/* Main button */}
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (mode === "hold" && isIdle) onStart();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (mode === "hold" && isRecording) onStop();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            if (mode === "hold" && isRecording) onStop();
          }}
          onClick={(e) => {
            e.preventDefault();
            if (mode === "toggle") handleToggleClick();
          }}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isProcessing}
          aria-label={
            isIdle
              ? mode === "hold"
                ? "Hold to talk"
                : "Tap to start recording"
              : isRecording
                ? mode === "hold"
                  ? "Release to send"
                  : "Tap to stop recording"
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
            <span className="text-white text-xs font-mono font-bold" aria-live="off">
              {formatDuration(duration)}
            </span>
          )}
        </button>
      </div>

      {/* Cancel hint when recording */}
      {isRecording && onCancel && (
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-danger transition-colors"
        >
          Press Escape or tap here to cancel
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="max-w-xs text-center px-4 py-2 bg-danger/10 text-danger rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
