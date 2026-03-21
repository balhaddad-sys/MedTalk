"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AnswerOption,
  AssessmentData,
  ClinicalReasoningData,
  ConfidenceLevel,
  InterviewResponse,
  Message,
  TranslateResponse,
} from "@/types";
import { loadEncounterState, saveEncounterState } from "@/lib/encounterStorage";
import { getLanguageByCode, languages } from "@/lib/languages";
import { hasOfflinePackForPair, getPhraseTextById } from "@/lib/offlineTranslation";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

function getConfidenceClasses(c: ConfidenceLevel): string {
  if (c === "high") return "bg-emerald-100 text-emerald-700";
  if (c === "medium") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function getConfidenceLabel(c: ConfidenceLevel): string {
  if (c === "high") return "High confidence";
  if (c === "medium") return "Medium confidence";
  return "Low confidence";
}

function getTranslationSourceClasses(source?: Message["translationSource"]): string {
  if (source === "offline_phrasebook") return "bg-cyan-100 text-cyan-700";
  if (source === "offline_memory") return "bg-slate-200 text-slate-700";
  if (source === "local_passthrough") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-500";
}

function getTranslationSourceLabel(source?: Message["translationSource"]): string {
  if (source === "offline_phrasebook") return "Offline phrase pack";
  if (source === "offline_memory") return "Saved offline";
  if (source === "local_passthrough") return "Same language";
  return "Cloud";
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 p-3 shadow-sm">
      <p className="text-[13px] font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Quick Phrases (mapped to offline phrasebook IDs for multilingual display) ─── */
const PHRASES = [
  { emoji: "\u{1F44B}", en: "Hello, I need help", phraseId: "hello_help", cat: "general" },
  { emoji: "\u{1F915}", en: "I am in pain", phraseId: "pain", cat: "pain" },
  { emoji: "\u{1F48A}", en: "I need my medication", phraseId: "medication", cat: "meds" },
  { emoji: "\u{1F691}", en: "This is an emergency", phraseId: "emergency", cat: "emergency" },
  { emoji: "\u{1F922}", en: "I feel nauseous", phraseId: "nauseous", cat: "symptoms" },
  { emoji: "\u{1F6BB}", en: "Where is the bathroom?", phraseId: "bathroom", cat: "general" },
  { emoji: "\u{1F4A7}", en: "I need water", phraseId: "water", cat: "general" },
  { emoji: "\u26A0\uFE0F", en: "I am allergic", phraseId: "allergic", cat: "meds" },
  { emoji: "\u{1F912}", en: "I have a fever", phraseId: "fever", cat: "symptoms" },
  { emoji: "\u{1F635}\u200D\u{1F4AB}", en: "I feel dizzy", phraseId: "dizzy", cat: "symptoms" },
  { emoji: "\u{1F489}", en: "I am diabetic", phraseId: "diabetic", cat: "meds" },
  { emoji: "\u{1F4DE}", en: "Call my family please", phraseId: "call_family", cat: "general" },
  { emoji: "\u{1F494}", en: "I have chest pain", phraseId: "chest_pain", cat: "emergency" },
  { emoji: "\u{1F6A8}", en: "I can't breathe", phraseId: "cant_breathe", cat: "emergency" },
  { emoji: "\u{1F9B4}", en: "The pain is here", phraseId: "pain_here", cat: "pain" },
  { emoji: "\u{1F4A5}", en: "The pain is severe", phraseId: "pain_severe", cat: "pain" },
];

export default function Home() {
  const [patientLang, setPatientLang] = useState("ar");
  const [providerLang, setProviderLang] = useState("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<"lang" | "phrases" | null>(null);
  const [editingSide, setEditingSide] = useState<"patient" | "provider">("patient");
  const [langQ, setLangQ] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [autoInterview, setAutoInterview] = useState(true);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [activeSide, setActiveSide] = useState<"patient" | "provider">("patient");
  const [reasoning, setReasoning] = useState<ClinicalReasoningData | null>(null);
  const [nonVerbal, setNonVerbal] = useState(false);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const interviewHistoryRef = useRef<{ role: "patient" | "provider"; text: string }[]>([]);
  const [readyToPersist, setReadyToPersist] = useState(false);

  const rec = useAudioRecorder();
  const isOnline = useNetworkStatus();
  const stt = useSpeechToText();
  const tr = useTranslation();
  const tts = useTextToSpeech();

  const busy = rec.recordingState === "processing" || stt.isLoading || tr.isLoading || interviewLoading;
  const recording = rec.recordingState === "recording";
  const pL = getLanguageByCode(patientLang);
  const dL = getLanguageByCode(providerLang);
  const emergencyDetected = messages.some((message) => message.isEmergency);
  const offlinePackReady = hasOfflinePackForPair(patientLang, providerLang);
  const aiOperational = autoInterview && isOnline;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 4000); return () => clearTimeout(t); }, [error]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline enhancements should fail softly.
    });
  }, []);
  useEffect(() => {
    const persisted = loadEncounterState();
    if (persisted) {
      setPatientLang(persisted.patientLang);
      setProviderLang(persisted.providerLang);
      setMessages(persisted.messages);
      setAssessment(persisted.assessment);
      setReasoning(persisted.reasoning);
      setActiveSide(persisted.activeSide);
      setAutoInterview(persisted.autoInterview);
      setNonVerbal(persisted.nonVerbal);
      interviewHistoryRef.current = persisted.interviewHistory;
    }
    setReadyToPersist(true);
  }, []);
  useEffect(() => {
    if (!readyToPersist) return;

    saveEncounterState({
      patientLang,
      providerLang,
      messages,
      assessment,
      reasoning,
      activeSide,
      autoInterview,
      nonVerbal,
      interviewHistory: interviewHistoryRef.current,
    });
  }, [readyToPersist, patientLang, providerLang, messages, assessment, reasoning, activeSide, autoInterview, nonVerbal]);

  /* ─── AI Interview: get next clinical question ─── */
  const askFollowUp = useCallback(async (history: { role: "patient" | "provider"; text: string }[]) => {
    setInterviewLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("Interview API error");
      const data: InterviewResponse = await res.json();
      return data;
    } finally {
      setInterviewLoading(false);
    }
  }, []);

  /* ─── Actions ─── */
  const send = useCallback(async (txt: string, from: string, to: string, role: "patient" | "provider") => {
    setError(null);
    try {
      const r: TranslateResponse = await tr.translate(
        txt,
        from,
        to,
        role === "patient"
          ? { mode: "precision", includeVerification: true }
          : { mode: "fast", includeVerification: false }
      );
      const m: Message = {
        id: Date.now().toString(),
        role,
        originalText: txt,
        translatedText: r.translated_text,
        backTranslation: r.back_translation,
        confidence: r.confidence,
        medicalTerms: r.medical_terms,
        sourceLang: from,
        targetLang: to,
        timestamp: Date.now(),
        isEmergency: r.is_emergency,
        translationSource: r.translation_source,
      };
      setMessages(p => [...p, m]);

      const clinicalText = role === "patient" ? r.translated_text : txt;
      interviewHistoryRef.current = [...interviewHistoryRef.current, { role, text: clinicalText }];

      return r;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed. Try again.");
      return null;
    }
  }, [tr]);

  // Process AI follow-up response: translate, add as message, update reasoning
  const handleFollowUp = useCallback(async (followUp: InterviewResponse, targetPatientLang: string) => {
    if (followUp.reasoning) {
      setReasoning(followUp.reasoning);
      // Capture answer options for non-verbal mode
      setAnswerOptions(followUp.reasoning.answerOptions || []);
    }
    if (followUp.assessment) {
      setAssessment(followUp.assessment);
      setAnswerOptions([]);
      setCurrentQuestion(null);
      return;
    }
    if (!followUp.question) return;
    setCurrentQuestion(followUp.question);
    interviewHistoryRef.current = [...interviewHistoryRef.current, { role: "provider", text: followUp.question }];
    const trResult: TranslateResponse = await tr.translate(
      followUp.question,
      "en",
      targetPatientLang,
      { mode: "fast", includeVerification: false }
    );
    const msgId = (Date.now() + 1).toString();
    const providerMsg: Message = {
      id: msgId, role: "provider", originalText: followUp.question,
      translatedText: trResult.translated_text,
      sourceLang: "en",
      targetLang: targetPatientLang,
      timestamp: Date.now(),
      isEmergency: trResult.is_emergency,
      translationSource: trResult.translation_source,
    };
    setMessages(p => [...p, providerMsg]);
    // Fire-and-forget TTS — don't block the UI
    tts.speak(trResult.translated_text, targetPatientLang)
      .then(audioUrl => { if (audioUrl) setMessages(p => p.map(x => x.id === msgId ? { ...x, audioUrl } : x)); })
      .catch(() => {});
  }, [tr, tts]);

  // After patient speaks, auto-generate next clinical question (non-blocking)
  const sendAndFollowUp = useCallback(async (txt: string, from: string, to: string, role: "patient" | "provider") => {
    const r = await send(txt, from, to, role);
    if (!r || !autoInterview || !isOnline || role !== "patient" || assessment) return;

    // Fire interview in background — don't block UI
    const history = [...interviewHistoryRef.current];
    askFollowUp(history)
      .then(followUp => handleFollowUp(followUp, from))
      .catch(() => {});
  }, [send, autoInterview, isOnline, assessment, askFollowUp, handleFollowUp]);

  const processBlob = useCallback(async (blob: Blob) => {
    setError(null);
    try {
      const t = await stt.transcribe(blob, activeSide === "patient" ? patientLang : providerLang);
      if (!t.trim()) { rec.setRecordingState("idle"); setError("Couldn't hear you. Try again."); return; }
      if (activeSide === "patient") {
        await sendAndFollowUp(t, patientLang, providerLang, "patient");
      } else {
        await send(t, providerLang, patientLang, "provider");
      }
      rec.setRecordingState("idle");
    } catch (e) { rec.setRecordingState("idle"); setError(e instanceof Error ? e.message : "Error"); }
  }, [activeSide, patientLang, providerLang, stt, send, sendAndFollowUp, rec]);

  const mic = useCallback(async () => {
    if (!recording && !isOnline) {
      setError("Voice transcription needs connectivity. Type or use quick phrases while offline.");
      return;
    }
    if (recording) { const b = await rec.stopRecording(); if (b) await processBlob(b); }
    else if (rec.recordingState === "idle") { setError(null); rec.startRecording(); }
  }, [recording, isOnline, rec, processBlob]);

  const sendText = useCallback(async () => {
    const v = text.trim(); if (!v) return; setText("");
    rec.setRecordingState("processing");
    if (activeSide === "patient") {
      await sendAndFollowUp(v, patientLang, providerLang, "patient");
    } else {
      await send(v, providerLang, patientLang, "provider");
    }
    rec.setRecordingState("idle");
  }, [text, activeSide, patientLang, providerLang, send, sendAndFollowUp, rec]);

  const phrase = useCallback(async (t: string) => {
    setSheet(null); rec.setRecordingState("processing");
    const r = await send(t, "en", providerLang, "patient");
    if (r && autoInterview && isOnline && !assessment) {
      try {
        const followUp = await askFollowUp(interviewHistoryRef.current);
        await handleFollowUp(followUp, patientLang);
      } catch {}
    }
    rec.setRecordingState("idle");
  }, [providerLang, patientLang, send, autoInterview, isOnline, assessment, askFollowUp, handleFollowUp, rec]);

  const play = useCallback(async (m: Message) => {
    if (playingId === m.id) { tts.stop(); setPlayingId(null); return; }
    setPlayingId(m.id);
    try {
      if (m.audioUrl) await tts.playUrl(m.audioUrl);
      else {
        const u = await tts.speak(m.translatedText, m.targetLang);
        if (u) {
          setMessages(p => p.map(x => x.id === m.id ? { ...x, audioUrl: u } : x));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not play audio.");
    }
    setPlayingId(null);
  }, [playingId, tts]);

  const swap = useCallback(() => { setPatientLang(providerLang); setProviderLang(patientLang); }, [patientLang, providerLang]);
  const clearAll = useCallback(() => {
    setMessages([]);
    setAssessment(null);
    setReasoning(null);
    setAnswerOptions([]);
    setCurrentQuestion(null);
    interviewHistoryRef.current = [];
  }, []);

  // Non-verbal: tap an answer option → send as patient response
  const toggleNonVerbal = useCallback(() => {
    if (!nonVerbal && !isOnline) {
      setError("Non-verbal AI interview needs connectivity. Use typed translation or quick phrases while offline.");
      return;
    }

    setNonVerbal((value) => !value);
    if (!nonVerbal) setAutoInterview(true);
  }, [nonVerbal, isOnline]);
  const toggleAutoInterview = useCallback(() => {
    if (!autoInterview && !isOnline) {
      setError("AI follow-up needs connectivity. Translation still works offline.");
      return;
    }

    setAutoInterview((value) => !value);
  }, [autoInterview, isOnline]);

  const tapOption = useCallback(async (option: AnswerOption) => {
    if (busy || assessment) return;
    setAnswerOptions([]);
    rec.setRecordingState("processing");
    // Send the option label as the patient's response (in English for the AI)
    const patientAnswer = option.label;
    // Add to interview history
    interviewHistoryRef.current = [...interviewHistoryRef.current, { role: "patient", text: patientAnswer }];
    // Translate to provider language and show in messages
    try {
      const r: TranslateResponse = await tr.translate(
        patientAnswer,
        "en",
        providerLang,
        { mode: "fast", includeVerification: false }
      );
      const m: Message = {
        id: Date.now().toString(), role: "patient", originalText: patientAnswer,
        translatedText: r.translated_text,
        backTranslation: r.back_translation,
        confidence: r.confidence,
        medicalTerms: r.medical_terms,
        sourceLang: "en", targetLang: providerLang,
        timestamp: Date.now(),
        isEmergency: r.is_emergency,
        translationSource: r.translation_source,
      };
      setMessages(p => [...p, m]);
    } catch {
      // Even if translation fails, keep the answer in history for the AI
      const m: Message = {
        id: Date.now().toString(), role: "patient", originalText: patientAnswer,
        translatedText: patientAnswer, sourceLang: "en", targetLang: providerLang,
        timestamp: Date.now(),
      };
      setMessages(p => [...p, m]);
    }
    // Get next AI question
    if (isOnline) {
      try {
        const followUp = await askFollowUp(interviewHistoryRef.current);
        await handleFollowUp(followUp, patientLang);
      } catch {}
    }
    rec.setRecordingState("idle");
  }, [busy, assessment, rec, tr, providerLang, patientLang, isOnline, askFollowUp, handleFollowUp]);

  // Non-verbal: start interview by asking opening question
  const startNonVerbalInterview = useCallback(async () => {
    if (busy) return;
    if (!isOnline) {
      setError("Non-verbal AI interview needs connectivity. Use typed translation or quick phrases while offline.");
      return;
    }
    setInterviewLoading(true);
    try {
      const followUp = await askFollowUp([]);
      await handleFollowUp(followUp, patientLang);
    } catch {}
    setInterviewLoading(false);
  }, [busy, isOnline, askFollowUp, handleFollowUp, patientLang]);
  const openLang = (side: "patient" | "provider") => { setEditingSide(side); setLangQ(""); setSheet("lang"); };
  const dur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const langs = languages.filter(l => {
    if (!langQ) return true;
    const q = langQ.toLowerCase();
    return l.label.toLowerCase().includes(q) || l.nativeLabel.toLowerCase().includes(q);
  });

  return (
    <div className="h-dvh flex flex-col overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shrink-0 safe-top z-20">
        <div className="max-w-lg mx-auto px-3 sm:px-4 pt-2 pb-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">MedTalk</h1>
                <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">Medical Translation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={clearAll} className="text-[11px] font-semibold text-slate-400 active:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                  Clear
                </button>
              )}
              <button onClick={toggleNonVerbal}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${nonVerbal ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-400"}`}>
                {nonVerbal ? "Non-Verbal" : "Voice"}
              </button>
              <button onClick={toggleAutoInterview}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${aiOperational ? "bg-emerald-100 text-emerald-700" : autoInterview ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                {aiOperational ? "AI ON" : autoInterview ? "AI WAIT" : "AI OFF"}
              </button>
            </div>
          </div>

          {/* Language bar — stacks labels vertically for small screens */}
          {!isOnline && (
            <div className="mb-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Offline Emergency Mode</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                {offlinePackReady
                  ? `This device will keep the encounter on-device and can still translate saved phrases plus the built-in ${pL?.label}/${dL?.label} emergency pack. Voice transcription and AI follow-up need connectivity.`
                  : "This device will keep the encounter on-device and can still use saved translations offline. Voice transcription and AI follow-up need connectivity, and this language pair does not have a built-in emergency pack yet."}
              </p>
            </div>
          )}

          <div className="flex items-stretch gap-1.5">
            <button onClick={() => openLang("patient")} className="flex-1 flex items-center gap-2 py-2 px-2.5 sm:px-3 bg-slate-50 active:bg-slate-100 rounded-xl transition-all min-h-[48px] active:scale-[0.98] overflow-hidden">
              <span className="text-xl leading-none shrink-0">{pL?.flag}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{pL?.nativeLabel}</p>
                <p className="text-[9px] text-primary-500 font-bold leading-tight mt-px uppercase tracking-wider">Patient</p>
              </div>
            </button>

            <button onClick={swap} className="w-8 rounded-lg bg-primary-50 active:bg-primary-100 flex items-center justify-center shrink-0 active:scale-90 transition-all self-center aspect-square" aria-label="Swap">
              <svg className="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </button>

            <button onClick={() => openLang("provider")} className="flex-1 flex items-center gap-2 py-2 px-2.5 sm:px-3 bg-slate-50 active:bg-slate-100 rounded-xl transition-all min-h-[48px] active:scale-[0.98] overflow-hidden">
              <span className="text-xl leading-none shrink-0">{dL?.flag}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{dL?.nativeLabel}</p>
                <p className="text-[9px] text-emerald-500 font-bold leading-tight mt-px uppercase tracking-wider">Provider</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ BOTTOM SHEETS ═══ */}
      {sheet && (
        <div className="fixed inset-0 z-50 backdrop-enter" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 inset-x-0 flex justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[28px] flex flex-col sheet-enter" style={{ maxHeight: "82dvh" }} onClick={e => e.stopPropagation()}>
              <div className="px-5 pt-3 pb-0">
                <div className="w-9 h-[5px] bg-slate-200 rounded-full mx-auto mb-4" />
              </div>

              {sheet === "lang" && (
                <>
                  <div className="px-5 pb-3">
                    <h3 className="text-[17px] font-extrabold text-slate-900 mb-3">
                      {editingSide === "patient" ? "Patient Language" : "Provider Language"}
                    </h3>
                    <div className="relative">
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input type="text" value={langQ} onChange={e => setLangQ(e.target.value)} placeholder="Search..." autoFocus className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary-200 placeholder:text-slate-400 text-[15px]" />
                    </div>
                  </div>
                  <div className="overflow-y-auto thin-scroll px-3 pb-10">
                    {langs.map(l => {
                      const sel = editingSide === "patient" ? patientLang === l.code : providerLang === l.code;
                      return (
                        <button key={l.code} onClick={() => { if (editingSide === "patient") setPatientLang(l.code); else setProviderLang(l.code); setSheet(null); }}
                          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all min-h-[54px] mb-0.5 ${sel ? "bg-primary-50 ring-2 ring-primary-500/30" : "active:bg-slate-50"}`}>
                          <span className="text-[24px]">{l.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[15px] truncate ${sel ? "font-bold text-primary-700" : "font-semibold text-slate-800"}`}>{l.nativeLabel}</p>
                            <p className="text-[12px] text-slate-400 truncate">{l.label}</p>
                          </div>
                          {sel && <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shrink-0"><svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                        </button>
                      );
                    })}
                    {langs.length === 0 && <p className="text-center text-sm text-slate-400 py-12">No results</p>}
                  </div>
                </>
              )}

              {sheet === "phrases" && (
                <>
                  <div className="px-5 pb-3">
                    <h3 className="text-[17px] font-extrabold text-slate-900">Quick Phrases</h3>
                    <p className="text-[12px] text-slate-400 mt-0.5">Tap to translate instantly</p>
                  </div>
                  <div className="overflow-y-auto thin-scroll px-4 pb-10 grid grid-cols-2 gap-2">
                    {PHRASES.map(p => {
                      const local = getPhraseTextById(p.phraseId, patientLang);
                      const isLocalized = local && patientLang !== "en";
                      return (
                        <button key={p.en} onClick={() => phrase(p.en)} disabled={busy}
                          className="flex items-center gap-2.5 px-3.5 py-3.5 bg-slate-50 hover:bg-primary-50 border border-slate-200/80 hover:border-primary-200 rounded-2xl text-left transition-all disabled:opacity-40 min-h-[52px] active:scale-[0.97]">
                          <span className="text-[20px] shrink-0">{p.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-slate-700 leading-tight block truncate" dir={pL?.dir === "rtl" ? "rtl" : "ltr"}>{isLocalized ? local : p.en}</span>
                            {isLocalized && <span className="text-[10px] text-slate-400 leading-tight block truncate">{p.en}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MESSAGES ═══ */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        <div className="max-w-lg mx-auto px-3 sm:px-4 py-3 sm:py-4">

          {/* Empty state */}
          {messages.length === 0 && !busy && (
            <div className="flex flex-col items-center pt-10 pb-6 px-2">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <svg className="w-11 h-11 text-primary-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-400/30">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-1.5">{nonVerbal ? "Non-Verbal Interview" : "Safer Medical Translation"}</h2>
              <p className="text-[13px] text-slate-400 text-center max-w-[280px] mb-8 leading-relaxed">
                {nonVerbal
                  ? isOnline
                    ? "Tap-based clinical interview for patients who cannot speak. The AI asks questions and the patient taps answers."
                    : "The tap-based AI interview pauses offline. Use typed translation or the emergency phrase pack until connectivity returns."
                  : isOnline
                    ? `Speak, type, or pick a phrase to translate between ${pL?.label} and ${dL?.label}, then review confidence, back-translation, and chart-ready notes.`
                    : offlinePackReady
                      ? `Type or tap a phrase to use saved translations and the built-in ${pL?.label}/${dL?.label} emergency pack while offline.`
                      : "Type or tap a phrase to use saved translations while offline. This language pair needs connectivity for new translations beyond the built-in pack."
                }
              </p>

              {nonVerbal ? (
                <button
                  onClick={startNonVerbalInterview}
                  disabled={busy || !isOnline}
                  className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl text-base font-bold shadow-lg shadow-purple-500/30 active:scale-[0.97] disabled:opacity-40 transition-all"
                >
                  <span className="text-2xl">{"👆"}</span>
                  {isOnline ? "Start Interview" : "Needs Signal"}
                </button>
              ) : (
                <>
                  <div className="w-full grid grid-cols-1 gap-2">
                    {PHRASES.slice(0, 4).map(p => {
                      const local = getPhraseTextById(p.phraseId, patientLang);
                      const isLocalized = local && patientLang !== "en";
                      return (
                        <button key={p.en} onClick={() => phrase(p.en)} disabled={busy}
                          className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-white active:bg-primary-50 border border-slate-200/80 active:border-primary-200 rounded-2xl text-left transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm shadow-slate-100">
                          <span className="text-lg shrink-0">{p.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-slate-700 block truncate" dir={pL?.dir === "rtl" ? "rtl" : "ltr"}>{isLocalized ? local : p.en}</span>
                            {isLocalized && <span className="text-[10px] text-slate-400 block truncate">{p.en}</span>}
                          </div>
                          <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setSheet("phrases")} className="mt-4 text-[13px] font-semibold text-primary-500 active:text-primary-700 py-1.5">
                    See all phrases
                  </button>
                </>
              )}

              <div className="mt-6 w-full grid gap-2">
                <FeatureCard
                  title="Translation Review"
                  description="See confidence, back-translation, and important medical terms on each message."
                />
                <FeatureCard
                  title="Clinical Gap Tracking"
                  description="Auto-interview surfaces missing history, red flags, and the next best question."
                />
                <FeatureCard
                  title="Structured Summary"
                  description="Generate a draft note with a verification checklist before charting."
                />
                <FeatureCard
                  title="Offline Safe"
                  description="The app shell, active encounter, and saved translations stay on this device for emergency use."
                />
              </div>
            </div>
          )}

          {emergencyDetected && (
            <div className="msg-enter mb-3 rounded-3xl border border-red-200 bg-red-50 p-4 shadow-[0_12px_24px_rgba(239,68,68,0.12)]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
                  <span className="text-lg">{"\u{1F6A8}"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-red-700">
                    Urgent Safety Review
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-900">
                    Emergency language was detected in the conversation. Verify airway, breathing, circulation, and immediate patient safety before relying on translation details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-3">
            {messages.map(m => {
              const sL = getLanguageByCode(m.sourceLang);
              const tL = getLanguageByCode(m.targetLang);
              const playing = playingId === m.id;
              const t = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={m.id} className="msg-enter rounded-3xl bg-white border border-slate-200/70 shadow-[0_10px_28px_rgba(15,23,42,0.05)] overflow-hidden">
                  <div className="px-3 sm:px-4 pt-3 pb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        m.role === "provider" ? "bg-emerald-100 text-emerald-700" : "bg-primary-100 text-primary-700"
                      }`}>
                        {m.role}
                      </span>
                      <span className="text-xs">{sL?.flag}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{sL?.label}</span>
                      <span className="text-[10px] text-slate-300 ml-auto shrink-0">{t}</span>
                    </div>
                    <p className="text-[13px] sm:text-[14px] text-slate-600 leading-relaxed break-words" dir={sL?.dir === "rtl" ? "rtl" : "ltr"}>{m.originalText}</p>
                  </div>

                  {m.isEmergency && (
                    <div className="mx-3 sm:mx-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Urgent wording detected in this message. Confirm immediate safety needs.
                    </div>
                  )}

                  <div className="mx-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <div className="px-3 sm:px-4 pt-2 pb-3 bg-gradient-to-b from-primary-50/30 to-transparent">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{tL?.flag}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-primary-500 uppercase tracking-wider truncate">{tL?.label}</span>
                      <button onClick={() => play(m)}
                        className={`ml-auto flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full min-h-[28px] sm:min-h-[30px] transition-all active:scale-95 shrink-0 ${
                          playing ? "bg-primary-600 text-white shadow-md shadow-primary-500/20" : "bg-primary-50 text-primary-600 active:bg-primary-100"}`}>
                        {playing ? (
                          <div className="flex items-center gap-[3px] h-3.5">
                            {[0,1,2,3].map(i => <div key={i} className="w-[3px] bg-white rounded-full animate-sound-wave" style={{ animationDelay: `${i*0.1}s`, height: "4px" }} />)}
                          </div>
                        ) : (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                        <span className="text-[10px] sm:text-[11px] font-bold">{playing ? "Stop" : "Play"}</span>
                      </button>
                    </div>
                    <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed break-words" dir={tL?.dir === "rtl" ? "rtl" : "ltr"}>{m.translatedText}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.confidence && (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getConfidenceClasses(m.confidence)}`}>
                          {getConfidenceLabel(m.confidence)}
                        </span>
                      )}
                      {m.translationSource && m.translationSource !== "cloud" && (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getTranslationSourceClasses(m.translationSource)}`}>
                          {getTranslationSourceLabel(m.translationSource)}
                        </span>
                      )}
                      {(m.medicalTerms ?? []).slice(0, 4).map((term) => (
                        <span
                          key={`${m.id}-${term}`}
                          className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary-700"
                        >
                          {term}
                        </span>
                      ))}
                    </div>

                    {m.backTranslation && (
                      <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
                          Back-Translation Check
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-900">
                          {m.backTranslation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assessment complete banner — provider only */}
          {assessment && activeSide === "provider" && (
            <div className="mt-4 msg-enter rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-[0.18em] mb-1">Interview Complete</p>
              <p className="text-sm text-emerald-900 font-semibold">ESI Level {assessment.esiLevel}</p>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">{assessment.rationale}</p>
              {assessment.criticalActions.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Critical Actions</p>
                  <ul className="mt-1 space-y-0.5">
                    {assessment.criticalActions.map((a, i) => (
                      <li key={i} className="text-xs text-red-800">{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.recommendedWorkup.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Workup</p>
                  <p className="text-xs text-emerald-800 mt-0.5">{assessment.recommendedWorkup.join(" | ")}</p>
                </div>
              )}
            </div>
          )}

          {/* Non-verbal answer options */}
          {nonVerbal && answerOptions.length > 0 && !busy && !assessment && (
            <div className="mt-3 msg-enter">
              {currentQuestion && (
                <p className="text-[12px] font-bold text-purple-600 mb-2 px-1 uppercase tracking-wider">Tap your answer:</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {answerOptions.map((opt, i) => (
                  <button
                    key={`${opt.label}-${i}`}
                    onClick={() => tapOption(opt)}
                    disabled={busy}
                    className="flex items-center gap-2.5 px-3.5 py-3.5 bg-white hover:bg-purple-50 border-2 border-purple-200/80 hover:border-purple-400 rounded-2xl text-left transition-all disabled:opacity-40 min-h-[52px] active:scale-[0.97] active:bg-purple-100"
                  >
                    <span className="text-[20px] shrink-0">{opt.emoji}</span>
                    <span className="text-[13px] font-semibold text-slate-700 leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Busy indicator */}
          {busy && (
            <div className="msg-enter flex items-center gap-3 px-4 py-3.5 mt-3 rounded-[20px] bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex gap-[5px]">
                {[0,1,2].map(i => (
                  <div key={i} className="w-[7px] h-[7px] bg-primary-400 rounded-full" style={{ animation: `dot-bounce 1.4s infinite ease-in-out both`, animationDelay: `${i*0.16}s` }} />
                ))}
              </div>
              <span className="text-[13px] font-medium text-slate-400">{interviewLoading ? "Updating clinical review..." : "Translating..."}</span>
            </div>
          )}

          <div ref={endRef} className="h-1" />
        </div>
      </div>

      {/* ═══ ERROR ═══ */}
      {(error || rec.error) && (
        <div className="px-4 py-2 bg-red-50/90 backdrop-blur-sm border-t border-red-100 shrink-0">
          <p className="text-[12px] text-red-600 text-center font-semibold max-w-lg mx-auto">{error || rec.error}</p>
        </div>
      )}

      {/* ═══ RECORDING BAR ═══ */}
      {recording && (
        <div className="px-4 py-2.5 bg-red-50/90 backdrop-blur-sm border-t border-red-100 shrink-0">
          <div className="max-w-lg mx-auto flex items-center justify-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full recording-glow" />
            <span className="text-[13px] font-bold text-red-600 tabular-nums">{dur(rec.duration)}</span>
            <span className="text-[11px] text-red-400 font-medium">Tap to stop</span>
          </div>
        </div>
      )}

      {/* ═══ SIDE TOGGLE ═══ */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-slate-100 shrink-0">
        <div className="max-w-lg mx-auto px-3 py-1.5 flex items-center gap-1">
          <button onClick={() => setActiveSide("patient")}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeSide === "patient" ? "bg-primary-100 text-primary-700" : "text-slate-400"}`}>
            {pL?.flag} Patient speaks
          </button>
          <button onClick={() => setActiveSide("provider")}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeSide === "provider" ? "bg-emerald-100 text-emerald-700" : "text-slate-400"}`}>
            {dL?.flag} Provider speaks
          </button>
        </div>
      </div>

      {/* ═══ INPUT BAR ═══ */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shrink-0 safe-bottom">
        <div className="max-w-lg mx-auto px-2 sm:px-3 py-2 flex items-end gap-1.5 sm:gap-2">
          <button onClick={() => setSheet("phrases")} disabled={busy || recording}
            className="w-10 h-10 rounded-xl bg-slate-100 active:bg-slate-200 flex items-center justify-center shrink-0 active:scale-90 disabled:opacity-30 transition-all"
            aria-label="Quick phrases">
            <svg className="w-[18px] h-[18px] text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>

          <div className="flex-1 min-w-0">
            <input type="text" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !busy) sendText(); }}
              placeholder={activeSide === "patient" ? `Type in ${pL?.label || "patient language"}...` : `Type in ${dL?.label || "provider language"}...`}
              disabled={busy || recording}
              dir={(activeSide === "patient" ? pL?.dir : dL?.dir) === "rtl" ? "rtl" : "ltr"}
              className="w-full px-3 sm:px-4 py-2.5 bg-slate-100 focus:bg-white rounded-2xl outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-40 placeholder:text-slate-400 transition-all min-h-[42px] text-[15px]" />
          </div>

          {text.trim() ? (
            <button onClick={sendText} disabled={busy}
              className="w-10 h-10 rounded-xl bg-primary-600 active:bg-primary-700 flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-90 transition-all shadow-md shadow-primary-500/20"
              aria-label="Send">
              <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          ) : (
            <button onClick={mic} disabled={busy}
              className={`w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-2xl flex items-center justify-center shrink-0 transition-all
                ${recording
                  ? "bg-red-500 recording-glow scale-105"
                  : busy
                    ? "bg-slate-200"
                    : !isOnline
                      ? "bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/30 active:scale-90"
                      : "bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 active:scale-90"
                }`}
              aria-label={recording ? "Stop recording" : !isOnline ? "Voice needs connectivity" : "Start recording"}>
              {busy ? (
                <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : recording ? (
                <div className="w-5 h-5 rounded-[4px] bg-white" />
              ) : !isOnline ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 3c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" /></svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
