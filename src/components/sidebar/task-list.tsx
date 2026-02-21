"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";

interface TaskListProps {
  searchQuery: string;
}

export function TaskList({ searchQuery }: TaskListProps) {
  const { tasks, activeTaskId, setActiveTask } = useAppStore();

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(query));
  }, [tasks, searchQuery]);

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-neutral-500 text-sm">No tasks yet</p>
        <p className="text-neutral-600 text-xs mt-1">
          Start a conversation to create your first task
        </p>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-neutral-500 text-sm">No matching tasks</p>
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
        Tasks
      </div>
      {filteredTasks.map((task) => (
        <button
          key={task.id}
          onClick={() => setActiveTask(task.id)}
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
            activeTaskId === task.id
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
          }`}
        >
          <div className="text-sm truncate">{task.title}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            {new Date(task.updatedAt).toLocaleDateString()}
          </div>
        </button>
      ))}
    </div>
  );
}
