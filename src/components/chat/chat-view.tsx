"use client";

import { useRef, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";
import { AgentActivity } from "./agent-activity";

interface ChatViewProps {
  disabled: boolean;
}

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
        /* Empty state — Manus-like welcome */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              What can I do for you?
            </h1>
            <p className="text-neutral-400 mb-8">
              Your personal AI agent is ready. Assign a task or ask anything.
            </p>

            {/* Suggested actions */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {[
                { label: "Research", icon: "🔍" },
                { label: "Write", icon: "✏️" },
                { label: "Analyze", icon: "📊" },
                { label: "Code", icon: "💻" },
                { label: "Browse", icon: "🌐" },
                { label: "Automate", icon: "⚡" },
              ].map((action) => (
                <button
                  key={action.label}
                  disabled={disabled}
                  className="px-4 py-2 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-700/50 hover:border-neutral-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat input at bottom of welcome */}
          <div className="max-w-2xl w-full">
            <ChatInput disabled={disabled} />
          </div>
        </div>
      ) : (
        /* Active chat thread */
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

          {/* Input at bottom */}
          <div className="px-6 pb-4">
            <ChatInput disabled={disabled} />
          </div>
        </>
      )}
    </div>
  );
}
