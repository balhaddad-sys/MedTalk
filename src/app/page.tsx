"use client";

import { useState, useCallback } from "react";
import { Message, TranslateResponse } from "@/types";
import { getLanguageByCode } from "@/lib/languages";
import { intakeQuestions } from "@/lib/intake";
import Header from "@/components/Header";
import LanguageSelector from "@/components/LanguageSelector";
import ConversationView from "@/components/ConversationView";
import QuickPhrases from "@/components/QuickPhrases";
import IntakeFlow from "@/components/IntakeFlow";
import TextInput from "@/components/TextInput";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [patientLang, setPatientLang] = useState<string | null>(null);
  const [providerLang, setProviderLang] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [intakeIndex, setIntakeIndex] = useState(0);
  const [activeRole, setActiveRole] = useState<"patient" | "provider">("patient");

  const recorder = useAudioRecorder();
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing =
    recorder.recordingState === "processing" ||
    stt.isLoading ||
    translation.isLoading ||
    tts.isLoading;

  const patientLangData = patientLang ? getLanguageByCode(patientLang) : null;
  const providerLangData = providerLang ? getLanguageByCode(providerLang) : null;
  const isRecording = recorder.recordingState === "recording";

  // Translate + speak + add message
  const translateAndSpeak = useCallback(
    async (text: string, fromLang: string, toLang: string, role: "patient" | "provider") => {
      setProcessingError(null);
      try {
        const result: TranslateResponse = await translation.translate(text, fromLang, toLang);
        const msg: Message = {
          id: Date.now().toString(),
          role,
          originalText: text,
          translatedText: result.translated_text,
          sourceLang: fromLang,
          targetLang: toLang,
          timestamp: Date.now(),
        };
        try {
          const audioUrl = await tts.speak(result.translated_text);
          msg.audioUrl = audioUrl;
        } catch { /* TTS fail is ok */ }
        setMessages((prev) => [...prev, msg]);
        return result.translated_text;
      } catch {
        setProcessingError("Translation failed. Please try again.");
        return null;
      }
    },
    [translation, tts]
  );

  // Record → STT → Translate → TTS
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!patientLang || !providerLang) return;
      setProcessingError(null);
      const fromLang = activeRole === "patient" ? patientLang : providerLang;
      const toLang = activeRole === "patient" ? providerLang : patientLang;
      try {
        const transcript = await stt.transcribe(audioBlob, fromLang);
        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError("Could not hear you. Try again or use text input.");
          return;
        }
        await translateAndSpeak(transcript, fromLang, toLang, activeRole);
        recorder.setRecordingState("idle");
      } catch (err) {
        recorder.setRecordingState("idle");
        const m = err instanceof Error ? err.message : "Error";
        setProcessingError(m);
      }
    },
    [patientLang, providerLang, activeRole, stt, translateAndSpeak, recorder]
  );

  // Tap mic toggle
  const handleTapRecord = useCallback(async () => {
    if (isRecording) {
      const blob = await recorder.stopRecording();
      if (blob) await processAudio(blob);
    } else if (recorder.recordingState === "idle") {
      setProcessingError(null);
      recorder.startRecording();
    }
  }, [isRecording, recorder, processAudio]);

  // Text input
  const handleTextInput = useCallback(
    async (text: string) => {
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");
      const fromLang = activeRole === "patient" ? patientLang : providerLang;
      const toLang = activeRole === "patient" ? providerLang : patientLang;
      await translateAndSpeak(text, fromLang, toLang, activeRole);
      recorder.setRecordingState("idle");
    },
    [patientLang, providerLang, activeRole, translateAndSpeak, recorder]
  );

  // Intake question → translate to patient's language
  const handleIntakeQuestion = useCallback(
    async (question: string) => {
      if (!patientLang) return;
      recorder.setRecordingState("processing");
      await translateAndSpeak(question, "en", patientLang, "provider");
      if (intakeIndex < intakeQuestions.length) setIntakeIndex((i) => i + 1);
      recorder.setRecordingState("idle");
    },
    [patientLang, translateAndSpeak, intakeIndex, recorder]
  );

  // Quick phrase
  const handleQuickPhrase = useCallback(
    async (text: string) => {
      if (!providerLang) return;
      recorder.setRecordingState("processing");
      await translateAndSpeak(text, "en", providerLang, "patient");
      recorder.setRecordingState("idle");
    },
    [providerLang, translateAndSpeak, recorder]
  );

  // Play message
  const handlePlayMessage = useCallback(
    async (msg: Message) => {
      if (playingMessageId === msg.id) { tts.stop(); setPlayingMessageId(null); return; }
      setPlayingMessageId(msg.id);
      try {
        if (msg.audioUrl) await tts.playUrl(msg.audioUrl);
        else {
          const url = await tts.speak(msg.translatedText);
          setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, audioUrl: url } : m));
        }
      } catch { /* ignore */ }
      setPlayingMessageId(null);
    },
    [playingMessageId, tts]
  );

  const handleSwap = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  // ─────────── SETUP SCREEN ───────────
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full">
          <div className="w-full space-y-6 step-transition">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">MedTalk</h2>
              <p className="text-slate-500 text-sm">Medical translation for patients &amp; providers</p>
            </div>

            <LanguageSelector
              label="Patient speaks..."
              subtitle="Select patient's language"
              selectedCode={patientLang}
              onSelect={setPatientLang}
              excludeCode={providerLang}
            />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <button onClick={handleSwap} disabled={!patientLang && !providerLang} className="p-2 rounded-full bg-white border border-slate-200 hover:border-medical-300 disabled:opacity-30" aria-label="Swap">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              </button>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <LanguageSelector
              label="Provider speaks..."
              subtitle="Select provider's language"
              selectedCode={providerLang}
              onSelect={setProviderLang}
              excludeCode={patientLang}
            />

            <button
              onClick={() => setStarted(true)}
              disabled={!patientLang || !providerLang}
              className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all ${
                patientLang && providerLang
                  ? "bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Start Session
            </button>

            <p className="text-xs text-center text-slate-400">
              No data is stored. Audio is processed in real-time only.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ─────────── MAIN SCREEN ───────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-4">

        {/* Language bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-2.5 shadow-sm">
          <button onClick={() => setStarted(false)} className="text-sm text-slate-500 hover:text-medical-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{patientLangData?.flag} {patientLangData?.label}</span>
            <svg className="w-4 h-4 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>{providerLangData?.flag} {providerLangData?.label}</span>
          </div>
          <button onClick={handleSwap} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Swap">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          </button>
        </div>

        {/* Who is speaking toggle */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
          <button
            onClick={() => setActiveRole("patient")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeRole === "patient" ? "bg-medical-600 text-white shadow-sm" : "text-slate-500"
            }`}
          >
            {patientLangData?.flag} Patient Speaking
          </button>
          <button
            onClick={() => setActiveRole("provider")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeRole === "provider" ? "bg-violet-600 text-white shadow-sm" : "text-slate-500"
            }`}
          >
            {providerLangData?.flag} Provider Speaking
          </button>
        </div>

        {/* Record button */}
        <div className="flex flex-col items-center py-4">
          <p className="text-sm text-slate-500 mb-3">
            {isRecording ? "Listening... Tap to stop" : isProcessing ? "Translating..." : "Tap to speak"}
          </p>

          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute inset-[-8px] rounded-full bg-danger/20 animate-pulse-ring" />
                <div className="absolute inset-[-8px] rounded-full bg-danger/15 animate-pulse-ring" style={{ animationDelay: "0.4s" }} />
              </>
            )}
            <button
              onClick={handleTapRecord}
              disabled={isProcessing}
              className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 transition-all select-none
                ${isRecording ? "bg-danger scale-110 shadow-xl shadow-danger/30"
                  : isProcessing ? "bg-slate-400 cursor-not-allowed"
                  : "bg-medical-600 hover:bg-medical-700 shadow-lg shadow-medical-300 active:scale-95"}`}
            >
              {isProcessing ? (
                <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isRecording ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
              {isRecording && (
                <span className="text-white text-xs font-mono font-bold">
                  {Math.floor(recorder.duration / 60)}:{(recorder.duration % 60).toString().padStart(2, "0")}
                </span>
              )}
            </button>
          </div>

          {(processingError || recorder.error) && (
            <p className="mt-3 text-sm text-danger text-center max-w-xs">{processingError || recorder.error}</p>
          )}
          {recorder.debugInfo && (
            <p className="mt-1 text-xs text-slate-400 font-mono text-center">{recorder.debugInfo}</p>
          )}
        </div>

        {/* Text input as alternative */}
        <TextInput
          onSubmit={handleTextInput}
          isProcessing={isProcessing}
          placeholder={`Or type here in ${activeRole === "patient" ? patientLangData?.label : providerLangData?.label}...`}
        />

        {/* Guided Intake Questions */}
        <IntakeFlow
          onAskQuestion={handleIntakeQuestion}
          isProcessing={isProcessing}
          currentQuestionIndex={intakeIndex}
        />

        {/* Quick Phrases */}
        <QuickPhrases
          onSelectPhrase={handleQuickPhrase}
          isTranslating={isProcessing}
        />

        {/* Conversation */}
        <ConversationView
          messages={messages}
          onPlayMessage={handlePlayMessage}
          playingMessageId={playingMessageId}
        />

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setIntakeIndex(0); }}
            className="w-full py-2 text-xs text-slate-400 hover:text-danger"
          >
            Clear conversation
          </button>
        )}
      </main>

      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-slate-400">MedTalk is a communication aid, not a medical device.</p>
      </footer>
    </div>
  );
}
