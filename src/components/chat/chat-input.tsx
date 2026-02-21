"use client";

import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { PLATFORM_MODELS, BYOK_PROVIDERS } from "@/lib/models";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

interface ChatInputProps {
  disabled: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    activeTaskId,
    addMessage,
    setActiveTask,
    addTask,
    setIsStreaming,
    selectedModel,
    setSelectedModel,
    configuredProviders,
  } = useAppStore();

  // Build model options: platform models + configured BYOK providers
  const modelOptions = [
    ...PLATFORM_MODELS.map((m) => ({ id: m.id, name: m.name })),
    ...BYOK_PROVIDERS.filter((p) => configuredProviders.includes(p)).map(
      (p) => ({ id: p, name: PROVIDER_LABELS[p] })
    ),
  ];

  const currentModelName =
    modelOptions.find((m) => m.id === selectedModel)?.name ?? "OpenClaw Pro";

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
            "Platform models are not available yet. Please add your own API key in Settings."
          );
        } else if (data?.code === "BYOK_KEY_MISSING") {
          toast.error(
            `No API key configured for this provider. Add one in Settings.`
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
            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors disabled:opacity-50"
              >
                <span>{currentModelName}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${
                    modelDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {modelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setModelDropdownOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                    {PLATFORM_MODELS.length > 0 && (
                      <div className="px-3 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                        Platform
                      </div>
                    )}
                    {PLATFORM_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-700/50 transition-colors ${
                          selectedModel === model.id
                            ? "text-blue-400"
                            : "text-neutral-200"
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}

                    {configuredProviders.length > 0 && (
                      <>
                        <div className="border-t border-neutral-700 my-1" />
                        <div className="px-3 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                          Your Keys
                        </div>
                        {BYOK_PROVIDERS.filter((p) =>
                          configuredProviders.includes(p)
                        ).map((provider) => (
                          <button
                            key={provider}
                            onClick={() => {
                              setSelectedModel(provider);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-700/50 transition-colors ${
                              selectedModel === provider
                                ? "text-blue-400"
                                : "text-neutral-200"
                            }`}
                          >
                            {PROVIDER_LABELS[provider]}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

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
