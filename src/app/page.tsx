"use client";

import { useState, useCallback } from "react";
import { AppMode, Message } from "@/types";
import { getLanguageByCode } from "@/lib/languages";
import { intakeQuestions } from "@/lib/intake";
import Header from "@/components/Header";
import LanguageSelector from "@/components/LanguageSelector";
import HoldToTalk from "@/components/HoldToTalk";
import ConversationView from "@/components/ConversationView";
import QuickPhrases from "@/components/QuickPhrases";
import IntakeFlow from "@/components/IntakeFlow";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("setup");
  const [patientLang, setPatientLang] = useState<string | null>(null);
  const [providerLang, setProviderLang] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [intakeIndex, setIntakeIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"conversation" | "intake">(
    "intake"
  );

  const recorder = useAudioRecorder();
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing =
    recorder.recordingState === "processing" ||
    stt.isLoading ||
    translation.isLoading ||
    tts.isLoading;

  // Core: translate text and add to conversation
  const translateAndSpeak = useCallback(
    async (text: string, fromLang: string, toLang: string, role: "patient" | "provider") => {
      setProcessingError(null);
      try {
        const result = await translation.translate(text, fromLang, toLang);
        const messageId = Date.now().toString();
        const newMessage: Message = {
          id: messageId,
          role,
          originalText: text,
          translatedText: result.translated_text,
          sourceLang: fromLang,
          targetLang: toLang,
          timestamp: Date.now(),
        };

        // Generate TTS audio
        try {
          const audioUrl = await tts.speak(result.translated_text);
          newMessage.audioUrl = audioUrl;
        } catch {
          // TTS failure is non-critical
        }

        setMessages((prev) => [...prev, newMessage]);
        return result.translated_text;
      } catch {
        setProcessingError("Translation failed. Please try again.");
        return null;
      }
    },
    [translation, tts]
  );

  // Process recorded audio: STT → Translate → TTS
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!patientLang || !providerLang) return;
      setProcessingError(null);

      try {
        const transcript = await stt.transcribe(audioBlob);
        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError(
            "Could not understand the audio. Please try speaking again."
          );
          return;
        }

        await translateAndSpeak(transcript, patientLang, providerLang, "patient");
        recorder.setRecordingState("idle");
      } catch {
        recorder.setRecordingState("idle");
        setProcessingError("Something went wrong. Please try again.");
      }
    },
    [patientLang, providerLang, stt, translateAndSpeak, recorder]
  );

  // Handle guided intake question — translate question to patient's language
  const handleIntakeQuestion = useCallback(
    async (question: string) => {
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");

      await translateAndSpeak(question, "en", patientLang, "provider");

      // Advance to next question
      if (intakeIndex < intakeQuestions.length) {
        setIntakeIndex((prev) => prev + 1);
      }
      recorder.setRecordingState("idle");
    },
    [patientLang, providerLang, translateAndSpeak, intakeIndex, recorder]
  );

  // Handle quick phrase
  const handleQuickPhrase = useCallback(
    async (text: string) => {
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");

      await translateAndSpeak(text, "en", providerLang, "patient");
      recorder.setRecordingState("idle");
    },
    [patientLang, providerLang, translateAndSpeak, recorder]
  );

  // Play a message's audio
  const handlePlayMessage = useCallback(
    async (message: Message) => {
      if (playingMessageId === message.id) {
        tts.stop();
        setPlayingMessageId(null);
        return;
      }

      setPlayingMessageId(message.id);
      try {
        if (message.audioUrl) {
          await tts.playUrl(message.audioUrl);
        } else {
          const audioUrl = await tts.speak(message.translatedText);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...m, audioUrl } : m
            )
          );
        }
      } catch {
        // Silent fail
      }
      setPlayingMessageId(null);
    },
    [playingMessageId, tts]
  );

  // Recording handlers
  const handleStartRecording = useCallback(() => {
    setProcessingError(null);
    recorder.startRecording();
  }, [recorder]);

  const handleStopRecording = useCallback(async () => {
    const blob = await recorder.stopRecording();
    if (blob) {
      await processAudio(blob);
    }
  }, [recorder, processAudio]);

  // Swap languages
  const handleSwapLanguages = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  // Start session
  const handleStartSession = useCallback(() => {
    setMode("conversation");
  }, []);

  const patientLangData = patientLang ? getLanguageByCode(patientLang) : null;
  const providerLangData = providerLang ? getLanguageByCode(providerLang) : null;
  const canStart = patientLang && providerLang;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full">
        {/* ======================== SETUP ======================== */}
        {mode === "setup" && (
          <div className="w-full space-y-6 step-transition">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">
                Welcome to MedTalk
              </h2>
              <p className="text-slate-500 text-sm">
                Real-time medical translation for patients &amp; providers
              </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: "1", icon: "\u{1F30D}", text: "Choose languages" },
                { n: "2", icon: "\u{1F399}\uFE0F", text: "Speak or type" },
                { n: "3", icon: "\u{1F50A}", text: "Hear translation" },
              ].map((s) => (
                <div
                  key={s.n}
                  className="bg-white rounded-xl p-3 text-center border border-slate-100"
                >
                  <span className="text-2xl block">{s.icon}</span>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <LanguageSelector
                label="Patient speaks..."
                subtitle="Select the patient's language"
                selectedCode={patientLang}
                onSelect={setPatientLang}
                excludeCode={providerLang}
              />

              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-slate-200" />
                <button
                  onClick={handleSwapLanguages}
                  disabled={!patientLang && !providerLang}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:border-medical-300 transition-colors disabled:opacity-30"
                  aria-label="Swap languages"
                >
                  <svg
                    className="w-5 h-5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </button>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <LanguageSelector
                label="Provider speaks..."
                subtitle="Select the provider's language"
                selectedCode={providerLang}
                onSelect={setProviderLang}
                excludeCode={patientLang}
              />
            </div>

            <button
              onClick={handleStartSession}
              disabled={!canStart}
              className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all
                ${
                  canStart
                    ? "bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              Start Session
            </button>

            <p className="text-xs text-center text-slate-400 leading-relaxed">
              Conversations are not stored. Audio is processed in real-time and
              immediately discarded for your privacy.
            </p>
          </div>
        )}

        {/* ======================== CONVERSATION / INTAKE ======================== */}
        {mode === "conversation" && (
          <div className="w-full space-y-4 step-transition">
            {/* Top bar: languages + back */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-2.5 shadow-sm">
              <button
                onClick={() => setMode("setup")}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-medical-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-2 text-sm font-medium">
                <span>
                  {patientLangData?.flag} {patientLangData?.label}
                </span>
                <svg
                  className="w-4 h-4 text-medical-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                <span>
                  {providerLangData?.flag} {providerLangData?.label}
                </span>
              </div>

              <button
                onClick={handleSwapLanguages}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Swap languages"
              >
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab("intake")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${
                    activeTab === "intake"
                      ? "bg-medical-600 text-white shadow-md mode-active"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                <span>{"\u{1F4CB}"}</span>
                Guided Intake
              </button>
              <button
                onClick={() => setActiveTab("conversation")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${
                    activeTab === "conversation"
                      ? "bg-medical-600 text-white shadow-md mode-active"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                <span>{"\u{1F4AC}"}</span>
                Free Conversation
              </button>
            </div>

            {/* Guided Intake Tab */}
            {activeTab === "intake" && (
              <div className="space-y-4 fade-in-up">
                <IntakeFlow
                  onAskQuestion={handleIntakeQuestion}
                  isProcessing={isProcessing}
                  currentQuestionIndex={intakeIndex}
                />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-400">
                      Patient responds by voice
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Hold to talk for patient response */}
                  <div className="py-2">
                    <HoldToTalk
                      recordingState={
                        isProcessing ? "processing" : recorder.recordingState
                      }
                      duration={recorder.duration}
                      onStart={handleStartRecording}
                      onStop={handleStopRecording}
                      error={processingError || recorder.error}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Free Conversation Tab */}
            {activeTab === "conversation" && (
              <div className="space-y-4 fade-in-up">
                {/* Voice input */}
                <div className="py-2">
                  <HoldToTalk
                    recordingState={
                      isProcessing ? "processing" : recorder.recordingState
                    }
                    duration={recorder.duration}
                    onStart={handleStartRecording}
                    onStop={handleStopRecording}
                    error={processingError || recorder.error}
                  />
                </div>

                {/* Quick phrases */}
                <QuickPhrases
                  onSelectPhrase={handleQuickPhrase}
                  isTranslating={isProcessing}
                />
              </div>
            )}

            {/* Conversation History (always visible) */}
            <ConversationView
              messages={messages}
              onPlayMessage={handlePlayMessage}
              playingMessageId={playingMessageId}
            />

            {/* Clear */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setIntakeIndex(0);
                }}
                className="w-full py-2 text-sm text-slate-400 hover:text-danger transition-colors"
              >
                Clear conversation &amp; restart
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-slate-400">
          MedTalk is a communication aid, not a medical device. Always verify
          critical medical information with a qualified interpreter.
        </p>
      </footer>
    </div>
  );
}
