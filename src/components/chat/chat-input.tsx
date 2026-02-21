"use client";

import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store/app-store";

interface ChatInputProps {
  disabled: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    activeTaskId,
    addMessage,
    setActiveTask,
    addTask,
    setIsStreaming,
  } = useAppStore();

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || disabled) return;

    setInput("");

    // Create a new task if none is active
    let taskId = activeTaskId;
    if (!taskId) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 100) }),
        });
        const data = await res.json();
        taskId = data.id;
        setActiveTask(taskId);
        addTask({
          id: data.id,
          title: data.title,
          status: "active",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch {
        return;
      }
    }

    // Add user message to UI
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Send to OpenClaw via our API
    setIsStreaming(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        addMessage({
          id: data.id || crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          metadata: data.metadata,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: "Failed to send message. Please try again.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    input,
    disabled,
    activeTaskId,
    addMessage,
    setActiveTask,
    addTask,
    setIsStreaming,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="relative">
      <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-2xl overflow-hidden focus-within:border-neutral-600 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Assign a task or ask anything..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-white placeholder:text-neutral-500 px-4 pt-4 pb-2 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />

        <div className="flex items-center justify-between px-4 pb-3">
          {/* Left actions */}
          <div className="flex items-center gap-2">
            <button
              disabled={disabled}
              className="p-1.5 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              title="Attach files"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <button
              disabled={disabled}
              className="p-1.5 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              title="Settings"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
