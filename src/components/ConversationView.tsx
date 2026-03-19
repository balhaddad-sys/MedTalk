"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";

interface ConversationViewProps {
  messages: Message[];
  onPlayMessage: (message: Message) => void;
  playingMessageId: string | null;
  onExport?: () => void;
}

export default function ConversationView({
  messages,
  onPlayMessage,
  playingMessageId,
  onExport,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="w-full" role="log" aria-label="Conversation history" aria-live="polite">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Conversation ({messages.length})
        </span>
        <div className="h-px flex-1 bg-slate-200" />
        {onExport && (
          <button
            onClick={onExport}
            className="text-xs text-medical-500 hover:text-medical-700 font-medium transition-colors flex items-center gap-1"
            aria-label="Export conversation"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* Disclaimer banner */}
      <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
        <span>{"\u26A0\uFE0F"}</span>
        <span>AI translations may contain errors. Verify critical medical information with a qualified interpreter.</span>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-2 custom-scroll">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onPlay={() => onPlayMessage(msg)}
            isPlaying={playingMessageId === msg.id}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
