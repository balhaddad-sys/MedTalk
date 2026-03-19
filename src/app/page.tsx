"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AppStep, Message } from "@/types";
import { getLanguageByCode } from "@/lib/languages";
import Header from "@/components/Header";
import LanguageSelector from "@/components/LanguageSelector";
import HoldToTalk from "@/components/HoldToTalk";
import ConversationView from "@/components/ConversationView";
import QuickPhrases from "@/components/QuickPhrases";
import QuestionTree from "@/components/QuestionTree";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

function loadSession<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [step, setStep] = useState<AppStep>(() => loadSession("medtalk_step", 1));
  const [patientLang, setPatientLang] = useState<string | null>(() => loadSession("medtalk_patientLang", null));
  const [providerLang, setProviderLang] = useState<string | null>(() => loadSession("medtalk_providerLang", null));
  const [messages, setMessages] = useState<Message[]>(() => loadSession("medtalk_messages", []));
  const [activeRole, setActiveRole] = useState<"patient" | "provider">("patient");
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [showQuestionTree, setShowQuestionTree] = useState(false);

  const processAudioRef = useRef<((blob: Blob) => void) | undefined>(undefined);
  const recorder = useAudioRecorder((blob) => processAudioRef.current?.(blob));
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing =
    recorder.recordingState === "processing" ||
    stt.isLoading ||
    translation.isLoading;

  // Persist session state
  useEffect(() => { sessionStorage.setItem("medtalk_step", JSON.stringify(step)); }, [step]);
  useEffect(() => { sessionStorage.setItem("medtalk_patientLang", JSON.stringify(patientLang)); }, [patientLang]);
  useEffect(() => { sessionStorage.setItem("medtalk_providerLang", JSON.stringify(providerLang)); }, [providerLang]);
  useEffect(() => { sessionStorage.setItem("medtalk_messages", JSON.stringify(messages)); }, [messages]);

  // Process recorded audio: STT → Translate → TTS → add message
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!patientLang || !providerLang) return;

      const sourceLang = activeRole === "patient" ? patientLang : providerLang;
      const targetLang = activeRole === "patient" ? providerLang : patientLang;

      setProcessingError(null);
      try {
        // Step 1: Speech to text
        const transcript = await stt.transcribe(audioBlob);

        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError("Could not understand the audio. Try the question tree below.");
          setShowQuestionTree(true);
          return;
        }

        // Step 2: Translate
        const result = await translation.translate(
          transcript,
          sourceLang,
          targetLang
        );

        // Step 3: Create message
        const messageId = Date.now().toString();
        const newMessage: Message = {
          id: messageId,
          role: activeRole,
          originalText: transcript,
          translatedText: result.translated_text,
          sourceLang,
          targetLang,
          timestamp: Date.now(),
        };

        // Step 4: TTS (browser-based, free)
        try {
          await tts.speak(result.translated_text, targetLang);
        } catch {
          // TTS failure is non-critical, still show the translation
        }

        setMessages((prev) => [...prev, newMessage]);
        recorder.setRecordingState("idle");
      } catch {
        recorder.setRecordingState("idle");
        setProcessingError(
          "Something went wrong. Try the question tree below."
        );
        setShowQuestionTree(true);
      }
    },
    [patientLang, providerLang, activeRole, stt, translation, tts, recorder]
  );
  processAudioRef.current = processAudio;

  // Handle quick phrase selection
  const handleQuickPhrase = useCallback(
    async (text: string) => {
      if (!patientLang || !providerLang) return;
      setProcessingError(null);
      recorder.setRecordingState("processing");

      try {
        const result = await translation.translate(
          text,
          "en", // Quick phrases are in English
          providerLang
        );

        const messageId = Date.now().toString();
        const newMessage: Message = {
          id: messageId,
          role: "patient",
          originalText: text,
          translatedText: result.translated_text,
          sourceLang: "en",
          targetLang: providerLang,
          timestamp: Date.now(),
        };

        try {
          await tts.speak(result.translated_text, providerLang);
        } catch {
          // TTS failure is non-critical
        }

        setMessages((prev) => [...prev, newMessage]);
      } catch {
        setProcessingError("Could not translate phrase. Please try again.");
      } finally {
        recorder.setRecordingState("idle");
      }
    },
    [patientLang, providerLang, translation, tts, recorder]
  );

  // Handle question tree phrase selection
  const handleTreePhrase = useCallback(
    async (phrase: string) => {
      setShowQuestionTree(false);
      await handleQuickPhrase(phrase);
    },
    [handleQuickPhrase]
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
        await tts.speak(message.translatedText, message.targetLang);
      } catch {
        // Silent fail for replay
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

  // Switch languages
  const handleSwapLanguages = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  const patientLangData = patientLang ? getLanguageByCode(patientLang) : null;
  const providerLangData = providerLang ? getLanguageByCode(providerLang) : null;
  const canContinue = patientLang && providerLang;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-2xl mx-auto w-full">
        {/* STEP 1: Language Selection */}
        {step === 1 && (
          <div className="w-full space-y-8">
            {/* Welcome */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">
                Welcome to MedTalk
              </h2>
              <p className="text-slate-500">
                Select languages to start translating
              </p>
            </div>

            {/* Language selectors */}
            <div className="space-y-6">
              <LanguageSelector
                label="I speak..."
                subtitle="Select your language"
                selectedCode={patientLang}
                onSelect={setPatientLang}
                excludeCode={providerLang}
              />

              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-slate-200" />
                <button
                  onClick={handleSwapLanguages}
                  disabled={!patientLang || !providerLang}
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
                label="Doctor speaks..."
                subtitle="Select the provider's language"
                selectedCode={providerLang}
                onSelect={setProviderLang}
                excludeCode={patientLang}
              />
            </div>

            {/* Continue button */}
            <button
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all
                ${
                  canContinue
                    ? "bg-medical-600 hover:bg-medical-700 text-white shadow-lg shadow-medical-300/40 active:scale-[0.98]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              Start Translating
            </button>

            {/* Privacy notice */}
            <p className="text-xs text-center text-slate-400 leading-relaxed">
              Your conversations are not stored. Audio is processed in real-time
              and immediately discarded for your privacy.
            </p>
          </div>
        )}

        {/* STEP 2: Conversation */}
        {step === 2 && (
          <div className="w-full space-y-6">
            {/* Language bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-medical-600 transition-colors"
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
                Change
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
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
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {providerLangData?.flag} {providerLangData?.label}
                </span>
              </div>

              <button
                onClick={handleSwapLanguages}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Swap languages"
              >
                <svg
                  className="w-4 h-4 text-slate-500"
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

            {/* Role Toggle */}
            <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1">
              <button
                onClick={() => setActiveRole("patient")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeRole === "patient"
                    ? "bg-medical-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {patientLangData?.flag} Patient Speaking
              </button>
              <button
                onClick={() => setActiveRole("provider")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeRole === "provider"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {providerLangData?.flag} Provider Speaking
              </button>
            </div>

            {/* Hold to Talk */}
            <div className="py-4">
              <HoldToTalk
                recordingState={isProcessing ? "processing" : recorder.recordingState}
                duration={recorder.duration}
                onStart={handleStartRecording}
                onStop={handleStopRecording}
                error={processingError || recorder.error}
              />
            </div>

            {/* Can't use voice? button */}
            {!showQuestionTree && (
              <button
                onClick={() => setShowQuestionTree(true)}
                className="text-sm text-medical-600 hover:text-medical-700 font-medium transition-colors"
              >
                Can&apos;t use voice? Tap to answer questions instead
              </button>
            )}

            {/* Question Tree (fallback for voice failure) */}
            {showQuestionTree && (
              <QuestionTree
                onSelectPhrase={handleTreePhrase}
                isTranslating={isProcessing}
                onClose={() => setShowQuestionTree(false)}
              />
            )}

            {/* Quick Phrases */}
            <QuickPhrases
              onSelectPhrase={handleQuickPhrase}
              isTranslating={isProcessing}
            />

            {/* Conversation History */}
            <ConversationView
              messages={messages}
              onPlayMessage={handlePlayMessage}
              playingMessageId={playingMessageId}
            />

            {/* Clear conversation */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="w-full py-2.5 text-sm text-slate-400 hover:text-danger transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer disclaimer */}
      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-slate-400">
          MedTalk is a communication aid, not a medical device. Always verify
          critical medical information with a qualified interpreter.
        </p>
      </footer>
    </div>
  );
}
