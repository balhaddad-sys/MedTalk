"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, TranslateResponse } from "@/types";
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
  const [textValue, setTextValue] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [editingLang, setEditingLang] = useState<"patient" | "provider">("patient");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recorder = useAudioRecorder();
  const stt = useSpeechToText();
  const translation = useTranslation();
  const tts = useTextToSpeech();

  const isProcessing = recorder.recordingState === "processing" || stt.isLoading || translation.isLoading;
  const isRecording = recorder.recordingState === "recording";

  const pLang = getLanguageByCode(patientLang);
  const dLang = getLanguageByCode(providerLang);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Core: translate + speak + add message
  const send = useCallback(
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
        try { msg.audioUrl = await tts.speak(result.translated_text); } catch {}
        setMessages((prev) => [...prev, msg]);
      } catch {
        setProcessingError("Translation failed. Try again.");
      }
    },
    [translation, tts]
  );

  // Voice: STT → translate
  const processAudio = useCallback(
    async (blob: Blob) => {
      setProcessingError(null);
      try {
        const transcript = await stt.transcribe(blob, patientLang);
        if (!transcript.trim()) {
          recorder.setRecordingState("idle");
          setProcessingError("Couldn't hear you. Try again.");
          return;
        }
        await send(transcript, patientLang, providerLang, "patient");
        recorder.setRecordingState("idle");
      } catch (err) {
        recorder.setRecordingState("idle");
        setProcessingError(err instanceof Error ? err.message : "Error");
      }
    },
    [patientLang, providerLang, stt, send, recorder]
  );

  // Tap mic
  const handleMic = useCallback(async () => {
    if (isRecording) {
      const blob = await recorder.stopRecording();
      if (blob) await processAudio(blob);
    } else if (recorder.recordingState === "idle") {
      setProcessingError(null);
      recorder.startRecording();
    }
  }, [isRecording, recorder, processAudio]);

  // Send text
  const handleSendText = useCallback(async () => {
    const text = textValue.trim();
    if (!text) return;
    setTextValue("");
    recorder.setRecordingState("processing");
    await send(text, patientLang, providerLang, "patient");
    recorder.setRecordingState("idle");
  }, [textValue, patientLang, providerLang, send, recorder]);

  // Quick phrase
  const handlePhrase = useCallback(
    async (text: string) => {
      recorder.setRecordingState("processing");
      await send(text, "en", providerLang, "patient");
      recorder.setRecordingState("idle");
    },
    [providerLang, send, recorder]
  );

  // Play message
  const handlePlay = useCallback(async (msg: Message) => {
    try {
      if (msg.audioUrl) await tts.playUrl(msg.audioUrl);
      else await tts.speak(msg.translatedText);
    } catch {}
  }, [tts]);

  // Swap
  const handleSwap = useCallback(() => {
    setPatientLang(providerLang);
    setProviderLang(patientLang);
  }, [patientLang, providerLang]);

  // Quick phrases data
  const phrases = [
    { emoji: "👋", text: "Hello, I need help" },
    { emoji: "🤕", text: "I am in pain" },
    { emoji: "💊", text: "I need my medication" },
    { emoji: "🚑", text: "This is an emergency" },
    { emoji: "🤢", text: "I feel nauseous" },
    { emoji: "🚻", text: "Where is the bathroom?" },
    { emoji: "💧", text: "I need water" },
    { emoji: "⚠️", text: "I am allergic" },
  ];

  return (
    <div className="h-screen flex flex-col bg-medical-50">
      {/* ── TOP BAR ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <span className="text-base font-bold text-medical-700">MedTalk</span>

          {/* Language pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setEditingLang("patient"); setShowLangPicker(true); }}
              className="px-2.5 py-1 bg-medical-50 border border-medical-200 rounded-lg text-xs font-medium hover:bg-medical-100 transition-colors"
            >
              {pLang?.flag} {pLang?.label}
            </button>

            <button onClick={handleSwap} className="p-1 text-slate-400 hover:text-medical-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <button
              onClick={() => { setEditingLang("provider"); setShowLangPicker(true); }}
              className="px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 transition-colors"
            >
              {dLang?.flag} {dLang?.label}
            </button>
          </div>
        </div>
      </header>

      {/* ── LANGUAGE PICKER OVERLAY ── */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-slate-800">
                {editingLang === "patient" ? "Patient language" : "Provider language"}
              </h3>
              <button onClick={() => setShowLangPicker(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
              {languages.map((l) => {
                const selected =
                  editingLang === "patient" ? patientLang === l.code : providerLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      if (editingLang === "patient") setPatientLang(l.code);
                      else setProviderLang(l.code);
                      setShowLangPicker(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all text-sm
                      ${selected
                        ? "bg-medical-100 border-2 border-medical-500 font-semibold"
                        : "bg-slate-50 border-2 border-transparent hover:bg-medical-50"
                      }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{l.nativeLabel}</p>
                      <p className="text-xs text-slate-400">{l.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-xl mx-auto space-y-3">
          {messages.length === 0 && !isProcessing && (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">🏥</div>
              <p className="text-slate-500 text-sm">
                Tap the microphone or type a message to translate
              </p>

              {/* Quick phrases */}
              <div className="grid grid-cols-2 gap-2 pt-4">
                {phrases.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => handlePhrase(p.text)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left text-sm hover:border-medical-300 hover:bg-medical-50 transition-colors disabled:opacity-50"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span className="text-slate-700">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const tLang = getLanguageByCode(msg.targetLang);
            const sLang = getLanguageByCode(msg.sourceLang);
            return (
              <div key={msg.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Original */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-slate-400">{sLang?.flag} {sLang?.label}</span>
                  </div>
                  <p className="text-sm text-slate-600" dir={sLang?.dir === "rtl" ? "rtl" : "ltr"}>
                    {msg.originalText}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-slate-100 mx-4" />

                {/* Translation */}
                <div className="px-4 pt-2 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-medical-500 font-medium">{tLang?.flag} {tLang?.label}</span>
                    <button
                      onClick={() => handlePlay(msg)}
                      className="flex items-center gap-1 text-xs text-medical-600 hover:text-medical-800 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                  </div>
                  <p className="text-base font-medium text-slate-800" dir={tLang?.dir === "rtl" ? "rtl" : "ltr"}>
                    {msg.translatedText}
                  </p>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-slate-400 px-2">
              <div className="w-2 h-2 bg-medical-400 rounded-full animate-pulse" />
              Translating...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {(processingError || recorder.error) && (
        <div className="px-4 pb-1">
          <div className="max-w-xl mx-auto">
            <p className="text-xs text-danger text-center">{processingError || recorder.error}</p>
          </div>
        </div>
      )}

      {/* Debug (temporary) */}
      {recorder.debugInfo && (
        <div className="px-4 pb-1">
          <div className="max-w-xl mx-auto">
            <p className="text-xs text-slate-400 font-mono text-center">{recorder.debugInfo}</p>
          </div>
        </div>
      )}

      {/* ── INPUT BAR (like WhatsApp) ── */}
      <div className="bg-white border-t border-slate-200 px-3 py-2 shrink-0">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {/* Text input */}
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isProcessing) handleSendText(); }}
            placeholder={`Type in ${pLang?.label || "your language"}...`}
            disabled={isProcessing || isRecording}
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-medical-300 disabled:opacity-50 placeholder:text-slate-400"
          />

          {/* Send text button (shows when text is entered) */}
          {textValue.trim() ? (
            <button
              onClick={handleSendText}
              disabled={isProcessing}
              className="w-10 h-10 rounded-full bg-medical-600 hover:bg-medical-700 flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : (
            /* Mic button */
            <button
              onClick={handleMic}
              disabled={isProcessing}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all
                ${isRecording
                  ? "bg-danger animate-pulse shadow-lg shadow-danger/30"
                  : isProcessing
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-medical-600 hover:bg-medical-700"
                }`}
            >
              {isRecording ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
