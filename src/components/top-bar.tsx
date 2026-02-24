"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PLATFORM_MODELS, BYOK_PROVIDERS } from "@/lib/models";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "openclaw-pro": "High-performance agent for complex tasks.",
  "openclaw-fast": "Lightweight agent for everyday tasks.",
  anthropic: "Claude models via your own API key.",
  openai: "GPT models via your own API key.",
  gemini: "Gemini models via your own API key.",
};

export function TopBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { selectedModel, setSelectedModel, configuredProviders } =
    useAppStore();

  const modelOptions = [
    ...PLATFORM_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      badge: null as string | null,
    })),
    ...BYOK_PROVIDERS.filter((p) => configuredProviders.includes(p)).map(
      (p) => ({
        id: p,
        name: PROVIDER_LABELS[p],
        badge: "BYOK" as string | null,
      }),
    ),
  ];

  const currentModelName =
    modelOptions.find((m) => m.id === selectedModel)?.name ?? "OpenClaw Pro";

  return (
    <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
      {/* Model selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-200 text-sm font-medium transition-colors"
          aria-label="Select model"
        >
          <span>{currentModelName}</span>
          <svg
            className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
              dropdownOpen ? "rotate-180" : ""
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

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 py-2 overflow-hidden">
              {PLATFORM_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-800/60 transition-colors flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          selectedModel === model.id
                            ? "text-white"
                            : "text-neutral-200"
                        }`}
                      >
                        {model.name}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {MODEL_DESCRIPTIONS[model.id]}
                    </p>
                  </div>
                  {selectedModel === model.id && (
                    <svg
                      className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}

              {configuredProviders.length > 0 && (
                <>
                  <div className="border-t border-neutral-700/50 my-1" />
                  <div className="px-4 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                    Your Keys
                  </div>
                  {BYOK_PROVIDERS.filter((p) =>
                    configuredProviders.includes(p),
                  ).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => {
                        setSelectedModel(provider);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-800/60 transition-colors flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              selectedModel === provider
                                ? "text-white"
                                : "text-neutral-200"
                            }`}
                          >
                            {PROVIDER_LABELS[provider]}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                            BYOK
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {MODEL_DESCRIPTIONS[provider]}
                        </p>
                      </div>
                      {selectedModel === provider && (
                        <svg
                          className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right section — avatar placeholder */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300">
          U
        </div>
      </div>
    </div>
  );
}
