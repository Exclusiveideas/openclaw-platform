"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { TaskList } from "./task-list";

export function Sidebar() {
  const {
    sidebarMode,
    toggleSidebar,
    setSettingsOpen,
    setActiveTask,
    setMessages,
    tasks,
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const expanded = sidebarMode === "expanded";

  const handleNewTask = () => {
    setActiveTask(null);
    setMessages([]);
  };

  return (
    <div
      className="h-full shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: expanded ? 280 : 48 }}
    >
      {/* Header: Logo + brand + collapse toggle */}
      <div className="p-2 flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 hover:opacity-90 transition-opacity"
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          O
        </button>

        {expanded && (
          <div className="flex items-center justify-between flex-1 min-w-0 animate-fade-in-fast">
            <span className="font-semibold text-sm text-neutral-200 truncate">
              openclaw
            </span>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors shrink-0"
              aria-label="Collapse sidebar"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Navigation items */}
      <div className="px-1.5 space-y-0.5 shrink-0">
        {/* New task */}
        <button
          onClick={handleNewTask}
          className={`w-full flex items-center gap-3 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors ${
            expanded ? "px-3 py-2" : "justify-center py-2"
          }`}
          title="New task"
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          {expanded && <span className="text-sm truncate">New task</span>}
        </button>

        {/* Search */}
        <button
          className={`w-full flex items-center gap-3 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors ${
            expanded ? "px-3 py-2" : "justify-center py-2"
          }`}
          title="Search"
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {expanded && <span className="text-sm truncate">Search</span>}
        </button>
      </div>

      {/* Expanded content: search, tasks */}
      {expanded && (
        <div className="flex-1 flex flex-col min-h-0 mt-4 animate-fade-in-fast">
          {/* Search input */}
          <div className="px-3 mb-3">
            <div className="relative">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          {/* All tasks label */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">
              All tasks
            </span>
            <svg
              className="w-4 h-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7h4m0 0V3m0 4l3 3M3 17h4m0 0v4m0-4l3-3M21 7h-4m0 0V3m0 4l-3 3M21 17h-4m0 0v4m0-4l-3-3"
              />
            </svg>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {tasks.length > 0 ? (
              <TaskList searchQuery={searchQuery} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-700 flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 text-neutral-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-neutral-500">
                  Create a new task to get started
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spacer when collapsed */}
      {!expanded && <div className="flex-1" />}

      {/* Bottom: Settings */}
      <div className="p-1.5 border-t border-neutral-800 shrink-0">
        <button
          onClick={() => setSettingsOpen(true)}
          className={`w-full flex items-center gap-3 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors ${
            expanded ? "px-3 py-2" : "justify-center py-2"
          }`}
          title="Settings"
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {expanded && <span className="text-sm truncate">Settings</span>}
        </button>
      </div>
    </div>
  );
}
