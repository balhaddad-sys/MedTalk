"use client";

import { useState, useRef, useCallback } from "react";
import { RecordingState } from "@/types";

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setRecordingState("recording");

      // Duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch (err) {
      cleanup();
      setRecordingState("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Microphone access was denied. Please allow microphone access to use voice translation."
        );
      } else {
        setError("Could not access microphone. Please check your device settings.");
      }
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        setRecordingState("idle");
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        if (blob.size < 100) {
          setRecordingState("idle");
          setError("Recording was too short. Please hold the button longer.");
          resolve(null);
        } else {
          setRecordingState("processing");
          resolve(blob);
        }
      };

      recorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setRecordingState("idle");
    setDuration(0);
  }, [cleanup]);

  return {
    recordingState,
    setRecordingState,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
