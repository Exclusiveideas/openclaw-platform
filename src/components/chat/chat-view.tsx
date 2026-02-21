"use client";

import { useRef, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";
import { AgentActivity } from "./agent-activity";

interface ChatViewProps {
  disabled: boolean;
}

const SUGGESTED_ACTIONS = [
  { label: "Research", icon: "search" },
  { label: "Write Code", icon: "code" },
  { label: "Analyze Data", icon: "chart" },
  { label: "Design", icon: "sparkles" },
  { label: "More", icon: null },
];

export function ChatView({ disabled }: ChatViewProps) {
  const { messages, activeTaskId, isStreaming } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isEmpty = messages.length === 0 && !activeTaskId;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-4xl font-display text-neutral-200 mb-10">
              What can I do for you?
            </h1>

            <div className="mb-6">
              <ChatInput disabled={disabled} />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  disabled={disabled}
                  className="px-4 py-2 rounded-full bg-neutral-800/40 border border-neutral-700/40 text-neutral-300 hover:text-white hover:border-neutral-600 hover:bg-neutral-800/60 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "assistant" &&
                  msg.metadata &&
                  "agentActions" in msg.metadata && (
                    <AgentActivity
                      actions={
                        msg.metadata.agentActions as Array<{
                          type: string;
                          description: string;
                        }>
                      }
                    />
                  )}
                <MessageBubble message={msg} />
              </div>
            ))}

            {isStreaming && (
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                Agent is thinking...
              </div>
            )}
          </div>

          <div className="px-6 pb-4">
            <ChatInput disabled={disabled} />
          </div>
        </>
      )}
    </div>
  );
}
