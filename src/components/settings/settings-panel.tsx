"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { PLATFORM_MODELS, BYOK_PROVIDERS } from "@/lib/models";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

const PROVIDER_PLACEHOLDERS: Record<string, string> = {
  anthropic: "sk-ant-api03-...",
  openai: "sk-...",
  gemini: "AIza...",
};

const PROVIDER_LINKS: Record<string, { label: string; url: string }> = {
  anthropic: {
    label: "console.anthropic.com",
    url: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "platform.openai.com",
    url: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "aistudio.google.com",
    url: "https://aistudio.google.com/apikey",
  },
};

export function SettingsPanel() {
  const { setSettingsOpen, configuredProviders, setConfiguredProviders } =
    useAppStore();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => setSettingsOpen(false), 300);
  }, [setSettingsOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Auto-dismiss managed by sonner

  const handleSave = async (provider: string) => {
    const apiKey = keys[provider]?.trim();
    if (!apiKey) return;
    setSavingProvider(provider);

    try {
      const res = await fetch("/api/config/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (res.ok) {
        toast.success(`${PROVIDER_LABELS[provider]} key saved`);
        setKeys((prev) => ({ ...prev, [provider]: "" }));
        if (!configuredProviders.includes(provider)) {
          setConfiguredProviders([...configuredProviders, provider]);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleDelete = async (provider: string) => {
    try {
      const res = await fetch("/api/config/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (res.ok) {
        toast.success(`${PROVIDER_LABELS[provider]} key removed`);
        setConfiguredProviders(
          configuredProviders.filter((p) => p !== provider),
        );
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove key");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isClosing ? "opacity-0" : "animate-fade-in"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`relative ml-auto w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto transition-transform duration-300 ease-out ${
          isClosing ? "translate-x-full" : "animate-slide-in-right"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Settings</h2>
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close settings"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Platform Models section (read-only) */}
          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-medium text-neutral-300">
              Platform Models
            </h3>
            <p className="text-xs text-neutral-500">
              Available to all users — no setup required.
            </p>
            {PLATFORM_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/40 border border-neutral-700/30"
              >
                <span className="text-sm font-medium">{model.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-700/30 text-blue-400 text-[10px]">
                  Available
                </span>
              </div>
            ))}
          </div>

          {/* BYOK section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">
              Your API Keys (BYOK)
            </h3>
            <p className="text-xs text-neutral-500">
              Optionally bring your own API keys to use models directly. Keys
              are encrypted with AES-256-GCM before storage.
            </p>

            {BYOK_PROVIDERS.map((provider) => {
              const isConnected = configuredProviders.includes(provider);
              const isSaving = savingProvider === provider;

              return (
                <div
                  key={provider}
                  className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {PROVIDER_LABELS[provider]}
                      </span>
                      {isConnected && (
                        <span className="px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700/30 text-green-400 text-[10px]">
                          Connected
                        </span>
                      )}
                    </div>
                    {isConnected && (
                      <button
                        onClick={() => handleDelete(provider)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="password"
                    value={keys[provider] || ""}
                    onChange={(e) =>
                      setKeys((prev) => ({
                        ...prev,
                        [provider]: e.target.value,
                      }))
                    }
                    placeholder={
                      isConnected
                        ? "Enter new key to update..."
                        : PROVIDER_PLACEHOLDERS[provider]
                    }
                    className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 mb-3"
                  />

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSave(provider)}
                      disabled={isSaving || !keys[provider]?.trim()}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50"
                    >
                      {isSaving
                        ? "Saving..."
                        : isConnected
                          ? "Update Key"
                          : "Save Key"}
                    </button>
                    <a
                      href={PROVIDER_LINKS[provider].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Get key
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instance section */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">
              Agent Instance
            </h3>
            <InstanceInfo />
          </div>
        </div>
      </div>
    </div>
  );
}

function InstanceInfo() {
  const { instanceStatus, selectedModel } = useAppStore();

  const statusColors: Record<string, string> = {
    running: "text-green-400",
    hibernated: "text-yellow-400",
    provisioning: "text-blue-400",
    waking: "text-blue-400",
    error: "text-red-400",
    none: "text-neutral-500",
  };

  const modelName =
    PLATFORM_MODELS.find((m) => m.id === selectedModel)?.name ?? selectedModel;

  return (
    <div className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Status</span>
        <span
          className={`text-sm font-medium capitalize ${
            statusColors[instanceStatus] || "text-neutral-400"
          }`}
        >
          {instanceStatus}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Engine</span>
        <span className="text-sm text-neutral-200">OpenClaw</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Active Model</span>
        <span className="text-sm text-neutral-200">{modelName}</span>
      </div>
    </div>
  );
}
