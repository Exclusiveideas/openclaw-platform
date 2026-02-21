"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore, type InstanceStatus } from "@/store/app-store";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatView } from "@/components/chat/chat-view";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { InstanceStatusBar } from "@/components/shared/instance-status";

interface MainAppProps {
  userId: string;
  whopUserId: string;
  experienceId: string;
  configuredProviders: string[];
  initialInstanceStatus: string;
}

export function MainApp({
  userId,
  whopUserId,
  experienceId,
  configuredProviders,
  initialInstanceStatus,
}: MainAppProps) {
  const {
    setAuth,
    setConfiguredProviders,
    setInstanceStatus,
    setOnboardingComplete,
    setTasks,
    setMessages,
    sidebarOpen,
    settingsOpen,
    instanceStatus,
    activeTaskId,
  } = useAppStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  // Initialize auth and state from server props
  useEffect(() => {
    setAuth(whopUserId, experienceId);
    setConfiguredProviders(configuredProviders);
    setInstanceStatus(initialInstanceStatus as InstanceStatus);
    setOnboardingComplete(true);
  }, [
    whopUserId,
    experienceId,
    configuredProviders,
    initialInstanceStatus,
    setAuth,
    setConfiguredProviders,
    setInstanceStatus,
    setOnboardingComplete,
  ]);

  // Load tasks from server on mount
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const tasks = await res.json();
          setTasks(
            tasks.map((t: { id: string; title: string; status: string; createdAt: string; updatedAt: string; messages?: { content: string }[] }) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              lastMessage: t.messages?.[0]?.content,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            }))
          );
        }
      } catch {
        // Silently fail — tasks will show empty
      }
    }
    loadTasks();
  }, [setTasks]);

  // Load messages when active task changes
  useEffect(() => {
    if (!activeTaskId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const res = await fetch(`/api/tasks/${activeTaskId}/messages`);
        if (res.ok) {
          const messages = await res.json();
          setMessages(messages);
        }
      } catch {
        // Silently fail
      }
    }
    loadMessages();
  }, [activeTaskId, setMessages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > 20) {
        stopPolling();
        setInstanceStatus("error");
        return;
      }
      try {
        const res = await fetch("/api/instance/status");
        const data = await res.json();
        setInstanceStatus(data.status);
        if (data.status === "running" || data.status === "error") {
          stopPolling();
        }
      } catch {
        stopPolling();
        setInstanceStatus("error");
      }
    }, 3000);
  }, [stopPolling, setInstanceStatus]);

  const handleInstanceWake = useCallback(async () => {
    const currentStatus = useAppStore.getState().instanceStatus;
    try {
      setInstanceStatus("waking");
      const endpoint =
        currentStatus === "none"
          ? "/api/instance/provision"
          : "/api/instance/wake";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        startPolling();
      } else {
        setInstanceStatus("error");
      }
    } catch {
      setInstanceStatus("error");
    }
  }, [setInstanceStatus, startPolling]);

  // Auto-provision or wake instance if needed
  useEffect(() => {
    if (instanceStatus === "none" || instanceStatus === "hibernated") {
      handleInstanceWake();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Instance status bar (shows when not running) */}
        {instanceStatus !== "running" && (
          <InstanceStatusBar
            status={instanceStatus}
            onRetry={handleInstanceWake}
          />
        )}

        {/* Chat view */}
        <ChatView disabled={instanceStatus !== "running"} />
      </div>

      {/* Settings panel (overlay) */}
      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
