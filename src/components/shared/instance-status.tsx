"use client";

import type { InstanceStatus } from "@/store/app-store";

interface InstanceStatusBarProps {
  status: InstanceStatus;
  onRetry: () => void;
}

export function InstanceStatusBar({ status, onRetry }: InstanceStatusBarProps) {
  const config: Record<
    string,
    { bg: string; text: string; message: string; showRetry: boolean }
  > = {
    provisioning: {
      bg: "bg-blue-900/30 border-blue-800/50",
      text: "text-blue-200",
      message: "Setting up your AI agent... This may take a minute.",
      showRetry: false,
    },
    waking: {
      bg: "bg-blue-900/30 border-blue-800/50",
      text: "text-blue-200",
      message: "Waking up your agent...",
      showRetry: false,
    },
    hibernated: {
      bg: "bg-yellow-900/30 border-yellow-800/50",
      text: "text-yellow-200",
      message: "Your agent is hibernated. Waking up...",
      showRetry: false,
    },
    error: {
      bg: "bg-red-900/30 border-red-800/50",
      text: "text-red-200",
      message: "Something went wrong with your agent instance.",
      showRetry: true,
    },
    none: {
      bg: "bg-neutral-800/50 border-neutral-700/50",
      text: "text-neutral-300",
      message: "Initializing...",
      showRetry: false,
    },
  };

  const c = config[status] || config.none;

  return (
    <div
      className={`mx-4 mt-4 px-4 py-3 rounded-xl border ${c.bg} flex items-center justify-between`}
    >
      <div className="flex items-center gap-3">
        {!c.showRetry && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        <span className={`text-sm ${c.text}`}>{c.message}</span>
      </div>
      {c.showRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
