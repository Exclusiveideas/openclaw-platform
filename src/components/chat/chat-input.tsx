"use client";

import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

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
    selectedModel,
  } = useAppStore();

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || disabled) return;

    setInput("");

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

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    setIsStreaming(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, message: text, model: selectedModel }),
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
      } else {
        const data = await res.json().catch(() => null);
        if (data?.code === "PLATFORM_UNAVAILABLE") {
          toast.error(
            "Platform models are not available yet. Please add your own API key in Settings.",
          );
        } else if (data?.code === "BYOK_KEY_MISSING") {
          toast.error(
            `No API key configured for this provider. Add one in Settings.`,
          );
        } else {
          toast.error(data?.error || "Failed to send message");
        }
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
    selectedModel,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="relative">
      <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-2xl overflow-hidden focus-within:border-neutral-600 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Assign a task or ask anything"
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-white placeholder:text-neutral-500 px-4 pt-4 pb-2 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />

        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left toolbar icons */}
          <div className="flex items-center gap-1">
            <button
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Add attachment"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            <button
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Connect tools"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </button>

            <button
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="AI tools"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </button>
          </div>

          {/* Right toolbar icons */}
          <div className="flex items-center gap-1">
            <button
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Emoji"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                />
              </svg>
            </button>

            <button
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Voice input"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>

            {/* Send button — circular arrow */}
            <button
              onClick={handleSubmit}
              disabled={disabled || !hasInput}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                hasInput && !disabled
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-neutral-700/50 text-neutral-500"
              } disabled:cursor-not-allowed`}
              title="Send message"
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
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
