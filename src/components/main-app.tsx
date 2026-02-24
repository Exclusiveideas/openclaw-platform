"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { Sidebar } from "@/components/sidebar/sidebar";
import { TopBar } from "@/components/top-bar";
import { ChatView } from "@/components/chat/chat-view";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { ErrorBoundary } from "@/components/error-boundary";
import { toast } from "sonner";

interface MainAppProps {
  userId: string;
  whopUserId: string;
  experienceId: string;
  configuredProviders: string[];
  initialInstanceStatus: string;
}

export function MainApp(props: MainAppProps) {
  const { whopUserId, experienceId, configuredProviders } = props;
  const {
    setAuth,
    setConfiguredProviders,
    setInstanceStatus,
    setTasks,
    setMessages,
    settingsOpen,
    activeTaskId,
  } = useAppStore();

  useEffect(() => {
    setAuth(whopUserId, experienceId);
    setConfiguredProviders(configuredProviders);
    // TODO(k8s): Restore instance status management when K8s infra is ready
    setInstanceStatus("running");
  }, [
    whopUserId,
    experienceId,
    configuredProviders,
    setAuth,
    setConfiguredProviders,
    setInstanceStatus,
  ]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const tasks = await res.json();
          setTasks(
            tasks.map(
              (t: {
                id: string;
                title: string;
                status: string;
                createdAt: string;
                updatedAt: string;
                messages?: { content: string }[];
              }) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                lastMessage: t.messages?.[0]?.content,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              }),
            ),
          );
        }
      } catch {
        toast.error("Failed to load tasks");
      }
    }
    loadTasks();
  }, [setTasks]);

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
        toast.error("Failed to load messages");
      }
    }
    loadMessages();
  }, [activeTaskId, setMessages]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-neutral-950 text-white overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <ChatView disabled={false} />
        </div>

        {settingsOpen && <SettingsPanel />}
      </div>
    </ErrorBoundary>
  );
}
