"use client";

import { useState, useRef, useCallback } from "react";
import { RecordingState } from "@/types";

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

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
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDebugInfo("Requesting microphone...");
      chunksRef.current = [];
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,           // mono — better for speech
          sampleRate: 16000,         // 16kHz is Whisper's native rate
          echoCancellation: true,
          noiseSuppression: true,    // reduce background noise
          autoGainControl: true,     // normalize volume levels
        },
      });
      streamRef.current = stream;
      setDebugInfo("Microphone granted. Setting up recorder...");

      // Determine supported MIME type
      let mimeType = "";
      for (const type of [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ]) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const msg = (event as ErrorEvent).message || "Unknown recorder error";
        setError(`Recorder error: ${msg}`);
        setDebugInfo(`Error: ${msg}`);
        cleanup();
        setRecordingState("idle");
      };

      recorder.start(500);
      setRecordingState("recording");
      setDebugInfo(
        `Recording started. Format: ${recorder.mimeType || "default"}. Speak now!`
      );

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch (err) {
      cleanup();
      setRecordingState("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone blocked. Please allow microphone access in browser settings.");
        setDebugInfo("Permission denied");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
        setDebugInfo("No microphone device");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Microphone error: ${msg}`);
        setDebugInfo(`Error: ${msg}`);
      }
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        setRecordingState("idle");
        setDebugInfo("No active recorder found");
        resolve(null);
        return;
      }

      setDebugInfo(
        `Stopping... State: ${recorder.state}, Chunks so far: ${chunksRef.current.length}`
      );

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const chunkCount = chunksRef.current.length;
        cleanup();

        setDebugInfo(
          `Stopped. Chunks: ${chunkCount}, Size: ${blob.size} bytes, Type: ${mimeType}`
        );

        if (blob.size < 50) {
          setRecordingState("idle");
          setError(
            "Recording was empty. Make sure your microphone is working."
          );
          resolve(null);
        } else {
          setRecordingState("processing");
          resolve(blob);
        }
      };

      try {
        recorder.requestData();
      } catch {
        // some browsers don't support this
      }
      recorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    chunksRef.current = [];
    cleanup();
    setRecordingState("idle");
    setDuration(0);
    setDebugInfo("Cancelled");
  }, [cleanup]);

  return {
    recordingState,
    setRecordingState,
    duration,
    error,
    debugInfo,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
