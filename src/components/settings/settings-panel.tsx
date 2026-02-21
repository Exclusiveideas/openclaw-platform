"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function SettingsPanel() {
  const { setSettingsOpen, configuredProviders, setConfiguredProviders } =
    useAppStore();
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto-dismiss messages after 4 seconds
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [message]);

  const hasOpenRouter = configuredProviders.includes("openrouter");

  const handleSave = async () => {
    if (!openRouterKey.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/config/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          apiKey: openRouterKey.trim(),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "API key updated successfully" });
        setOpenRouterKey("");
        if (!configuredProviders.includes("openrouter")) {
          setConfiguredProviders([...configuredProviders, "openrouter"]);
        }
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error || "Failed to save",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
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

          {/* API Keys section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">API Keys</h3>

            <div className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">OpenRouter</span>
                  {hasOpenRouter && (
                    <span className="px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700/30 text-green-400 text-[10px]">
                      Connected
                    </span>
                  )}
                </div>
              </div>

              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder={
                  hasOpenRouter ? "Enter new key to update..." : "sk-or-v1-..."
                }
                className="w-full bg-neutral-700/50 border border-neutral-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 mb-3"
              />

              <button
                onClick={handleSave}
                disabled={saving || !openRouterKey.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : hasOpenRouter ? "Update Key" : "Save Key"}
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-900/30 border border-green-800/50 text-green-200"
                    : "bg-red-900/30 border border-red-800/50 text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <p className="text-xs text-neutral-500">
              Your API keys are encrypted with AES-256-GCM and stored securely.
              Get an OpenRouter key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
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
  const { instanceStatus } = useAppStore();

  const statusColors: Record<string, string> = {
    running: "text-green-400",
    hibernated: "text-yellow-400",
    provisioning: "text-blue-400",
    waking: "text-blue-400",
    error: "text-red-400",
    none: "text-neutral-500",
  };

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
        <span className="text-sm text-neutral-400">LLM Provider</span>
        <span className="text-sm text-neutral-200">OpenRouter (BYOK)</span>
      </div>
    </div>
  );
}
