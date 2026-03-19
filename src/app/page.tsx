"use client";

import { useState, useCallback, useEffect } from "react";
import { AppMode, Message, VisitType, TranslateResponse } from "@/types";
import { getLanguageByCode } from "@/lib/languages";
import { intakeQuestions } from "@/lib/intake";
import Header from "@/components/Header";
import LanguageSelector from "@/components/LanguageSelector";
import HoldToTalk from "@/components/HoldToTalk";
import ConversationView from "@/components/ConversationView";
import QuickPhrases from "@/components/QuickPhrases";
import IntakeFlow from "@/components/IntakeFlow";
import TextInput from "@/components/TextInput";
import ConsentScreen from "@/components/ConsentScreen";
import EmergencyBanner from "@/components/EmergencyBanner";
import VisitTypeSelector from "@/components/VisitTypeSelector";
import PainScale from "@/components/PainScale";
import BodyDiagram from "@/components/BodyDiagram";
import ClinicalSummary from "@/components/ClinicalSummary";
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
  const [activeTab, setActiveTab] = useState<"conversation" | "intake">("intake");
  const [showConsent, setShowConsent] = useState(true);
  const [showEmergency, setShowEmergency] = useState(false);
  const [visitType, setVisitType] = useState<VisitType>("general");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [showTools, setShowTools] = useState(false);

  const recorder = useAudioRecorder();
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing =
    recorder.recordingState === "processing" ||
    stt.isLoading ||
    translation.isLoading ||
    tts.isLoading;

  // Check session consent
  useEffect(() => {
    const consented = sessionStorage.getItem("medtalk-consent");
    if (consented === "true") {
      setShowConsent(false);
    }
  }, []);

  const handleConsent = useCallback(() => {
    sessionStorage.setItem("medtalk-consent", "true");
    setShowConsent(false);
  }, []);

  // Core: translate text and add to conversation
  const translateAndSpeak = useCallback(
    async (
      text: string,
      fromLang: string,
      toLang: string,
      role: "patient" | "provider"
    ) => {
      setProcessingError(null);
      try {
        const result: TranslateResponse = await translation.translate(text, fromLang, toLang);
        const messageId = Date.now().toString();
        const newMessage: Message = {
          id: messageId,
          role,
          originalText: text,
          translatedText: result.translated_text,
          backTranslation: result.back_translation,
          confidence: result.confidence,
          medicalTerms: result.medical_terms,
          isEmergency: result.is_emergency,
          sourceLang: fromLang,
          targetLang: toLang,
          timestamp: Date.now(),
        };

        // Show emergency banner if detected
        if (result.is_emergency) {
          setShowEmergency(true);
        }

        // Generate TTS audio (non-blocking)
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

  // Process recorded audio: STT -> Translate -> TTS
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!patientLang || !providerLang) return;
      setProcessingError(null);

      try {
        // Pass language hint to improve Whisper accuracy
        const transcript = await stt.transcribe(audioBlob, patientLang);
        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError(
            "Could not understand the audio. Please try speaking again, or use text input."
          );
          return;
        }

        await translateAndSpeak(transcript, patientLang, providerLang, "patient");
        recorder.setRecordingState("idle");
      } catch (err) {
        recorder.setRecordingState("idle");
        const msg = err instanceof Error ? err.message : "Unknown error";
        setProcessingError(`Voice processing failed: ${msg}. Try text input instead.`);
      }
    },
    [patientLang, providerLang, stt, translateAndSpeak, recorder]
  );

  // Handle text input from patient
  const handleTextInput = useCallback(
    async (text: string) => {
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");
      await translateAndSpeak(text, patientLang, providerLang, "patient");
      recorder.setRecordingState("idle");
    },
    [patientLang, providerLang, translateAndSpeak, recorder]
  );

  // Handle guided intake question
  const handleIntakeQuestion = useCallback(
    async (question: string) => {
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");

      await translateAndSpeak(question, "en", patientLang, "provider");

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

  // Handle pain scale selection
  const handlePainScale = useCallback(
    async (level: number) => {
      const text = `My pain level is ${level} out of 10.`;
      if (!patientLang || !providerLang) return;
      recorder.setRecordingState("processing");
      await translateAndSpeak(text, "en", providerLang, "patient");
      recorder.setRecordingState("idle");
    },
    [patientLang, providerLang, translateAndSpeak, recorder]
  );

  // Handle body diagram selection
  const handleBodyArea = useCallback(
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

  const handleCancelRecording = useCallback(() => {
    recorder.cancelRecording();
  }, [recorder]);

  // Swap languages
  const handleSwapLanguages = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  // Start session
  const handleStartSession = useCallback(() => {
    setMode("conversation");
  }, []);

  // Export conversation as text
  const handleExport = useCallback(() => {
    if (messages.length === 0) return;

    const patientName = patientLang ? getLanguageByCode(patientLang)?.label || patientLang : "";
    const providerName = providerLang ? getLanguageByCode(providerLang)?.label || providerLang : "";

    let content = `MedTalk Conversation Transcript\n`;
    content += `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += `Languages: ${patientName} <-> ${providerName}\n`;
    content += `Visit Type: ${visitType}\n`;
    content += `${"=".repeat(50)}\n\n`;
    content += `DISCLAIMER: This transcript was generated using AI translation.\n`;
    content += `Verify all medical information with a qualified interpreter.\n\n`;
    content += `${"=".repeat(50)}\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const role = msg.role === "provider" ? "PROVIDER" : "PATIENT";
      content += `[${time}] ${role}:\n`;
      content += `  Original (${msg.sourceLang}): ${msg.originalText}\n`;
      content += `  Translated (${msg.targetLang}): ${msg.translatedText}\n`;
      if (msg.confidence) {
        content += `  Confidence: ${msg.confidence}\n`;
      }
      if (msg.isEmergency) {
        content += `  *** EMERGENCY DETECTED ***\n`;
      }
      content += `\n`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medtalk-transcript-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, patientLang, providerLang, visitType]);

  const patientLangData = patientLang ? getLanguageByCode(patientLang) : null;
  const providerLangData = providerLang ? getLanguageByCode(providerLang) : null;
  const canStart = patientLang && providerLang;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-medical-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Consent screen */}
      {showConsent && <ConsentScreen onAccept={handleConsent} />}

      <Header />

      <main
        id="main-content"
        className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full"
      >
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
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
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

            {/* Visit type */}
            <VisitTypeSelector selected={visitType} onSelect={setVisitType} />

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
            {/* Emergency banner */}
            {showEmergency && (
              <EmergencyBanner onDismiss={() => setShowEmergency(false)} />
            )}

            {/* Top bar: languages + back */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-2.5 shadow-sm">
              <button
                onClick={() => setMode("setup")}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-medical-600 transition-colors"
                aria-label="Go back to setup"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-2 text-sm font-medium">
                <span>
                  {patientLangData?.flag} {patientLangData?.label}
                </span>
                <svg className="w-4 h-4 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
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
                      Patient responds
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Input mode toggle */}
                  <div className="flex justify-center gap-2 mb-3">
                    <button
                      onClick={() => setInputMode("voice")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5
                        ${inputMode === "voice" ? "bg-medical-100 text-medical-700" : "text-slate-400 hover:text-slate-600"}
                      `}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Voice
                    </button>
                    <button
                      onClick={() => setInputMode("text")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5
                        ${inputMode === "text" ? "bg-medical-100 text-medical-700" : "text-slate-400 hover:text-slate-600"}
                      `}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Text
                    </button>
                  </div>

                  {inputMode === "voice" ? (
                    <div className="py-2">
                      <HoldToTalk
                        recordingState={isProcessing ? "processing" : recorder.recordingState}
                        duration={recorder.duration}
                        onStart={handleStartRecording}
                        onStop={handleStopRecording}
                        onCancel={handleCancelRecording}
                        error={processingError || recorder.error}
                      />
                    </div>
                  ) : (
                    <TextInput
                      onSubmit={handleTextInput}
                      isProcessing={isProcessing}
                      placeholder={`Type in ${patientLangData?.label || "patient's language"}...`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Free Conversation Tab */}
            {activeTab === "conversation" && (
              <div className="space-y-4 fade-in-up">
                {/* Input mode toggle */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setInputMode("voice")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5
                      ${inputMode === "voice" ? "bg-medical-100 text-medical-700" : "text-slate-400 hover:text-slate-600"}
                    `}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Voice
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5
                      ${inputMode === "text" ? "bg-medical-100 text-medical-700" : "text-slate-400 hover:text-slate-600"}
                    `}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Text
                  </button>
                </div>

                {/* Voice or text input */}
                {inputMode === "voice" ? (
                  <div className="py-2">
                    <HoldToTalk
                      recordingState={isProcessing ? "processing" : recorder.recordingState}
                      duration={recorder.duration}
                      onStart={handleStartRecording}
                      onStop={handleStopRecording}
                      onCancel={handleCancelRecording}
                      error={processingError || recorder.error}
                    />
                  </div>
                ) : (
                  <TextInput
                    onSubmit={handleTextInput}
                    isProcessing={isProcessing}
                    placeholder={`Type in ${patientLangData?.label || "patient's language"}...`}
                  />
                )}

                {/* Quick phrases */}
                <QuickPhrases
                  onSelectPhrase={handleQuickPhrase}
                  isTranslating={isProcessing}
                />

                {/* Clinical tools toggle */}
                <button
                  onClick={() => setShowTools(!showTools)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 hover:border-medical-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{"\u{1FA7A}"}</span>
                    <span className="text-sm font-semibold text-slate-700">Clinical Tools</span>
                    <span className="text-xs text-slate-400">Pain scale, body diagram</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${showTools ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showTools && (
                  <div className="space-y-3 step-transition">
                    <PainScale onSelect={handlePainScale} isProcessing={isProcessing} />
                    <BodyDiagram onSelect={handleBodyArea} isProcessing={isProcessing} />
                  </div>
                )}
              </div>
            )}

            {/* Conversation History */}
            <ConversationView
              messages={messages}
              onPlayMessage={handlePlayMessage}
              playingMessageId={playingMessageId}
              onExport={messages.length > 0 ? handleExport : undefined}
            />

            {/* Clinical Summary */}
            <ClinicalSummary messages={messages} />

            {/* Clear */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setIntakeIndex(0);
                  setShowEmergency(false);
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
