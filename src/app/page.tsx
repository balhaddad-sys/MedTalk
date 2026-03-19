"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, TranslateResponse } from "@/types";
import { getLanguageByCode, languages } from "@/lib/languages";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

/* ─── Quick Phrases ─── */
const PHRASES = [
  { emoji: "\u{1F44B}", text: "Hello, I need help", cat: "general" },
  { emoji: "\u{1F915}", text: "I am in pain", cat: "pain" },
  { emoji: "\u{1F48A}", text: "I need my medication", cat: "meds" },
  { emoji: "\u{1F691}", text: "This is an emergency", cat: "emergency" },
  { emoji: "\u{1F922}", text: "I feel nauseous", cat: "symptoms" },
  { emoji: "\u{1F6BB}", text: "Where is the bathroom?", cat: "general" },
  { emoji: "\u{1F4A7}", text: "I need water", cat: "general" },
  { emoji: "\u26A0\uFE0F", text: "I am allergic", cat: "meds" },
  { emoji: "\u{1F912}", text: "I have a fever", cat: "symptoms" },
  { emoji: "\u{1F635}\u200D\u{1F4AB}", text: "I feel dizzy", cat: "symptoms" },
  { emoji: "\u{1F489}", text: "I am diabetic", cat: "meds" },
  { emoji: "\u{1F4DE}", text: "Call my family please", cat: "general" },
  { emoji: "\u{1F494}", text: "I have chest pain", cat: "emergency" },
  { emoji: "\u{1F6A8}", text: "I can't breathe", cat: "emergency" },
  { emoji: "\u{1F9B4}", text: "The pain is here", cat: "pain" },
  { emoji: "\u{1F4A5}", text: "The pain is severe", cat: "pain" },
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
  const endRef = useRef<HTMLDivElement>(null);

  const rec = useAudioRecorder();
  const stt = useSpeechToText();
  const tr = useTranslation();
  const tts = useTextToSpeech();

  const busy = rec.recordingState === "processing" || stt.isLoading || tr.isLoading;
  const recording = rec.recordingState === "recording";
  const pL = getLanguageByCode(patientLang);
  const dL = getLanguageByCode(providerLang);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 4000); return () => clearTimeout(t); }, [error]);

  /* ─── Actions ─── */
  const send = useCallback(async (txt: string, from: string, to: string, role: "patient" | "provider") => {
    setError(null);
    try {
      const r: TranslateResponse = await tr.translate(txt, from, to);
      const m: Message = { id: Date.now().toString(), role, originalText: txt, translatedText: r.translated_text, sourceLang: from, targetLang: to, timestamp: Date.now() };
      try { m.audioUrl = await tts.speak(r.translated_text); } catch {}
      setMessages(p => [...p, m]);
    } catch { setError("Translation failed. Try again."); }
  }, [tr, tts]);

  const processBlob = useCallback(async (blob: Blob) => {
    setError(null);
    try {
      const t = await stt.transcribe(blob, patientLang);
      if (!t.trim()) { rec.setRecordingState("idle"); setError("Couldn't hear you. Try again."); return; }
      await send(t, patientLang, providerLang, "patient");
      rec.setRecordingState("idle");
    } catch (e) { rec.setRecordingState("idle"); setError(e instanceof Error ? e.message : "Error"); }
  }, [patientLang, providerLang, stt, send, rec]);

  const mic = useCallback(async () => {
    if (recording) { const b = await rec.stopRecording(); if (b) await processBlob(b); }
    else if (rec.recordingState === "idle") { setError(null); rec.startRecording(); }
  }, [recording, rec, processBlob]);

  const sendText = useCallback(async () => {
    const v = text.trim(); if (!v) return; setText("");
    rec.setRecordingState("processing");
    await send(v, patientLang, providerLang, "patient");
    rec.setRecordingState("idle");
  }, [text, patientLang, providerLang, send, rec]);

  const phrase = useCallback(async (t: string) => {
    setSheet(null); rec.setRecordingState("processing");
    await send(t, "en", providerLang, "patient");
    rec.setRecordingState("idle");
  }, [providerLang, send, rec]);

  const play = useCallback(async (m: Message) => {
    if (playingId === m.id) { tts.stop(); setPlayingId(null); return; }
    setPlayingId(m.id);
    try {
      if (m.audioUrl) await tts.playUrl(m.audioUrl);
      else { const u = await tts.speak(m.translatedText); setMessages(p => p.map(x => x.id === m.id ? { ...x, audioUrl: u } : x)); }
    } catch {}
    setPlayingId(null);
  }, [playingId, tts]);

  const swap = useCallback(() => { setPatientLang(providerLang); setProviderLang(patientLang); }, [patientLang, providerLang]);
  const openLang = (side: "patient" | "provider") => { setEditingSide(side); setLangQ(""); setSheet("lang"); };
  const dur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const langs = languages.filter(l => {
    if (!langQ) return true;
    const q = langQ.toLowerCase();
    return l.label.toLowerCase().includes(q) || l.nativeLabel.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 flex flex-col" style={{ height: "100dvh" }}>

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
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="text-[11px] font-semibold text-slate-400 active:text-red-500 px-2 py-1.5 rounded-lg transition-colors">
                Clear
              </button>
            )}
          </div>

          {/* Language bar — stacks labels vertically for small screens */}
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
                    {PHRASES.map(p => (
                      <button key={p.text} onClick={() => phrase(p.text)} disabled={busy}
                        className="flex items-center gap-2.5 px-3.5 py-3.5 bg-slate-50 hover:bg-primary-50 border border-slate-200/80 hover:border-primary-200 rounded-2xl text-left transition-all disabled:opacity-40 min-h-[52px] active:scale-[0.97]">
                        <span className="text-[20px] shrink-0">{p.emoji}</span>
                        <span className="text-[13px] font-semibold text-slate-700 leading-tight">{p.text}</span>
                      </button>
                    ))}
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
              <h2 className="text-xl font-extrabold text-slate-800 mb-1.5">Ready to Translate</h2>
              <p className="text-[13px] text-slate-400 text-center max-w-[250px] mb-8 leading-relaxed">
                Speak, type, or pick a phrase to start translating between {pL?.label} and {dL?.label}
              </p>

              <div className="w-full grid grid-cols-1 gap-2">
                {PHRASES.slice(0, 4).map(p => (
                  <button key={p.text} onClick={() => phrase(p.text)} disabled={busy}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-white active:bg-primary-50 border border-slate-200/80 active:border-primary-200 rounded-2xl text-left transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm shadow-slate-100">
                    <span className="text-lg shrink-0">{p.emoji}</span>
                    <span className="text-[13px] font-semibold text-slate-700 flex-1">{p.text}</span>
                    <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
              <button onClick={() => setSheet("phrases")} className="mt-4 text-[13px] font-semibold text-primary-500 active:text-primary-700 py-1.5">
                See all phrases
              </button>
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
                <div key={m.id} className="msg-enter rounded-[20px] bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  {/* Source */}
                  <div className="px-4 pt-3.5 pb-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[13px]">{sL?.flag}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{sL?.label}</span>
                      <span className="text-[10px] text-slate-300 ml-auto">{t}</span>
                    </div>
                    <p className="text-[14px] text-slate-600 leading-[1.6]" dir={sL?.dir === "rtl" ? "rtl" : "ltr"}>{m.originalText}</p>
                  </div>

                  {/* Translation */}
                  <div className="mx-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <div className="px-4 pt-2.5 pb-3.5 bg-gradient-to-b from-primary-50/30 to-transparent">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[13px]">{tL?.flag}</span>
                      <span className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">{tL?.label}</span>
                      <button onClick={() => play(m)}
                        className={`ml-auto flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-full min-h-[30px] transition-all active:scale-95 ${
                          playing ? "bg-primary-600 text-white shadow-md shadow-primary-500/20" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}>
                        {playing ? (
                          <div className="flex items-center gap-[3px] h-3.5">
                            {[0,1,2,3].map(i => <div key={i} className="w-[3px] bg-white rounded-full animate-sound-wave" style={{ animationDelay: `${i*0.1}s`, height: "4px" }} />)}
                          </div>
                        ) : (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                        <span className="text-[11px] font-bold">{playing ? "Stop" : "Play"}</span>
                      </button>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-800 leading-[1.6]" dir={tL?.dir === "rtl" ? "rtl" : "ltr"}>{m.translatedText}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Busy indicator */}
          {busy && (
            <div className="msg-enter flex items-center gap-3 px-4 py-3.5 mt-3 rounded-[20px] bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex gap-[5px]">
                {[0,1,2].map(i => (
                  <div key={i} className="w-[7px] h-[7px] bg-primary-400 rounded-full" style={{ animation: `dot-bounce 1.4s infinite ease-in-out both`, animationDelay: `${i*0.16}s` }} />
                ))}
              </div>
              <span className="text-[13px] font-medium text-slate-400">Translating...</span>
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
              placeholder={`Type in ${pL?.label || "your language"}...`}
              disabled={busy || recording}
              dir={pL?.dir === "rtl" ? "rtl" : "ltr"}
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
                    : "bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 active:scale-90"
                }`}
              aria-label={recording ? "Stop recording" : "Start recording"}>
              {busy ? (
                <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : recording ? (
                <div className="w-5 h-5 rounded-[4px] bg-white" />
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
