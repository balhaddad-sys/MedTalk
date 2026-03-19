"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";

interface ConversationViewProps {
  messages: Message[];
  onPlayMessage: (message: Message) => void;
  playingMessageId: string | null;
}

export default function ConversationView({
  messages,
  onPlayMessage,
  playingMessageId,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Conversation
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto px-1 py-2">
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
