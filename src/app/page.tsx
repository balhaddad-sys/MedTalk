"use client";

import { useState, useCallback } from "react";
import { Message } from "@/types";
import { getLanguageByCode, languages } from "@/lib/languages";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export default function Home() {
  const [patientLang, setPatientLang] = useState("ar");
  const [providerLang, setProviderLang] = useState("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing =
    recorder.recordingState === "processing" ||
    stt.isLoading ||
    translation.isLoading ||
    tts.isLoading;

  const patientLangData = getLanguageByCode(patientLang);
  const providerLangData = getLanguageByCode(providerLang);

  // Core flow: STT → Translate → TTS
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setProcessingError(null);
      try {
        const transcript = await stt.transcribe(audioBlob, patientLang);
        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError("Could not hear you. Please try again.");
          return;
        }

        const result = await translation.translate(transcript, patientLang, providerLang);

        const msg: Message = {
          id: Date.now().toString(),
          role: "patient",
          originalText: transcript,
          translatedText: result.translated_text,
          sourceLang: patientLang,
          targetLang: providerLang,
          timestamp: Date.now(),
        };

        try {
          const audioUrl = await tts.speak(result.translated_text);
          msg.audioUrl = audioUrl;
        } catch { /* TTS fail is ok */ }

        setMessages((prev) => [...prev, msg]);
        recorder.setRecordingState("idle");
      } catch (err) {
        recorder.setRecordingState("idle");
        const m = err instanceof Error ? err.message : "Error";
        setProcessingError(m);
      }
    },
    [patientLang, providerLang, stt, translation, tts, recorder]
  );

  const handleTapRecord = useCallback(async () => {
    if (recorder.recordingState === "idle") {
      setProcessingError(null);
      recorder.startRecording();
    } else if (recorder.recordingState === "recording") {
      const blob = await recorder.stopRecording();
      if (blob) await processAudio(blob);
    }
  }, [recorder, processAudio]);

  const handlePlayMessage = useCallback(
    async (msg: Message) => {
      try {
        if (msg.audioUrl) {
          await tts.playUrl(msg.audioUrl);
        } else {
          await tts.speak(msg.translatedText);
        }
      } catch { /* ignore */ }
    },
    [tts]
  );

  const handleSwap = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  const isRecording = recorder.recordingState === "recording";

  return (
    <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-medical-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-medical-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-medical-800">MedTalk</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Language selectors — simple dropdowns */}
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Patient</label>
            <select
              value={patientLang}
              onChange={(e) => setPatientLang(e.target.value)}
              className="w-full text-sm font-medium bg-medical-50 border border-medical-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-medical-300"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            className="mt-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Swap languages"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Provider</label>
            <select
              value={providerLang}
              onChange={(e) => setProviderLang(e.target.value)}
              className="w-full text-sm font-medium bg-medical-50 border border-medical-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-medical-300"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big record button */}
        <div className="flex flex-col items-center py-6">
          <p className="text-sm text-slate-500 mb-4">
            {isRecording
              ? "Listening... Tap to stop"
              : isProcessing
                ? "Translating..."
                : "Tap the mic to speak"}
          </p>

          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute inset-0 w-32 h-32 -m-2 rounded-full bg-danger/20 animate-pulse-ring" />
                <div className="absolute inset-0 w-32 h-32 -m-2 rounded-full bg-danger/15 animate-pulse-ring" style={{ animationDelay: "0.4s" }} />
              </>
            )}

            <button
              onClick={handleTapRecord}
              disabled={isProcessing}
              className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none
                ${isRecording
                  ? "bg-danger scale-110 shadow-xl shadow-danger/30"
                  : isProcessing
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-medical-600 hover:bg-medical-700 shadow-lg shadow-medical-300 active:scale-95"
                }
              `}
            >
              {isProcessing ? (
                <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isRecording ? (
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {isRecording && (
                <span className="text-white text-xs font-mono font-bold">
                  {Math.floor(recorder.duration / 60)}:{(recorder.duration % 60).toString().padStart(2, "0")}
                </span>
              )}
            </button>
          </div>

          {/* Error */}
          {(processingError || recorder.error) && (
            <p className="mt-3 text-sm text-danger text-center max-w-xs">
              {processingError || recorder.error}
            </p>
          )}

          {/* Debug */}
          {recorder.debugInfo && (
            <p className="mt-2 text-xs text-slate-400 font-mono text-center">
              {recorder.debugInfo}
            </p>
          )}
        </div>

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">Conversation</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {messages.map((msg) => {
                const tLang = getLanguageByCode(msg.targetLang);
                return (
                  <div key={msg.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                    {/* Original */}
                    <p className="text-sm text-slate-500">{msg.originalText}</p>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-xs text-slate-300">{patientLangData?.flag} → {providerLangData?.flag}</span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    {/* Translation */}
                    <p
                      className="text-base font-medium text-slate-800"
                      dir={tLang?.dir === "rtl" ? "rtl" : "ltr"}
                    >
                      {msg.translatedText}
                    </p>

                    {/* Play button */}
                    <button
                      onClick={() => handlePlayMessage(msg)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-medical-50 hover:bg-medical-100 rounded-full transition-colors text-medical-600 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setMessages([])}
              className="w-full py-2 text-xs text-slate-400 hover:text-danger transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
      </main>

      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-slate-400">
          MedTalk is a communication aid, not a medical device.
        </p>
      </footer>
    </div>
  );
}
