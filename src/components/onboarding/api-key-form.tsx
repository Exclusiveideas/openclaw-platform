"use client";

import { useState } from "react";

interface ApiKeyFormProps {
  userId: string;
  onComplete: () => void;
}

export function ApiKeyForm({ userId, onComplete }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/config/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          apiKey: apiKey.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save API key");
      }

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-neutral-950 text-white">
      <div className="max-w-md w-full px-6">
        <button
          onClick={() => window.history.back()}
          className="mb-6 text-neutral-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <h1 className="text-2xl font-bold mb-2">Connect Your API Key</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Enter your OpenRouter API key to power your AI agent. You can get one
          at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            openrouter.ai/keys
          </a>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-700/30 text-xs text-neutral-400">
            <strong className="text-neutral-300">Security:</strong> Your API key
            is encrypted with AES-256-GCM before storage. We never log or expose
            your keys.
          </div>

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Validating & Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
