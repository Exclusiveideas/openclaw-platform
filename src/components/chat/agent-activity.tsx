"use client";

import { useState } from "react";

interface AgentAction {
  type: string;
  description: string;
}

interface AgentActivityProps {
  actions: AgentAction[];
}

export function AgentActivity({ actions }: AgentActivityProps) {
  const [expanded, setExpanded] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {actions.length} agent action{actions.length !== 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-2 ml-4 space-y-1.5">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-neutral-400"
            >
              <span className="mt-0.5 w-4 h-4 rounded bg-neutral-800 flex items-center justify-center text-[10px] shrink-0">
                {action.type === "browser"
                  ? "🌐"
                  : action.type === "tool"
                  ? "🔧"
                  : action.type === "search"
                  ? "🔍"
                  : "⚡"}
              </span>
              <span>{action.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
