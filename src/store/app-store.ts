"use client";

import { create } from "zustand";

export type InstanceStatus =
  | "provisioning"
  | "running"
  | "hibernated"
  | "waking"
  | "error"
  | "none";

export interface TaskItem {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface PendingAttachment {
  localId: string;
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key?: string;
  url?: string;
  uploading: boolean;
  error?: string;
}

interface AppState {
  // Auth
  whopUserId: string | null;
  experienceId: string | null;
  setAuth: (userId: string, experienceId: string) => void;

  // Instance
  instanceStatus: InstanceStatus;
  setInstanceStatus: (status: InstanceStatus) => void;

  // Tasks
  tasks: TaskItem[];
  setTasks: (tasks: TaskItem[]) => void;
  addTask: (task: TaskItem) => void;

  // Task mutations
  updateTask: (
    id: string,
    updates: Partial<Pick<TaskItem, "title" | "status">>,
  ) => void;
  removeTask: (id: string) => void;

  // Active task / chat
  activeTaskId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  setActiveTask: (taskId: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;

  // UI state
  sidebarMode: "rail" | "expanded";
  settingsOpen: boolean;
  setSidebarMode: (mode: "rail" | "expanded") => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;

  // Model selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // BYOK providers configured by the user
  configuredProviders: string[];
  setConfiguredProviders: (providers: string[]) => void;

  // Pending attachments (pre-send)
  pendingAttachments: PendingAttachment[];
  addPendingAttachment: (attachment: PendingAttachment) => void;
  removePendingAttachment: (localId: string) => void;
  updatePendingAttachment: (
    localId: string,
    updates: Partial<PendingAttachment>,
  ) => void;
  clearPendingAttachments: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  whopUserId: null,
  experienceId: null,
  setAuth: (userId, experienceId) => set({ whopUserId: userId, experienceId }),

  // Instance
  instanceStatus: "none",
  setInstanceStatus: (status) => set({ instanceStatus: status }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
      messages: state.activeTaskId === id ? [] : state.messages,
    })),

  // Active task / chat
  activeTaskId: null,
  messages: [],
  isStreaming: false,
  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      return { messages: msgs };
    }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  // UI state
  sidebarMode: "rail",
  settingsOpen: false,
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarMode: state.sidebarMode === "rail" ? "expanded" : "rail",
    })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Model selection — default to platform model
  selectedModel: "openclaw-pro",
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Providers
  configuredProviders: [],
  setConfiguredProviders: (providers) =>
    set({ configuredProviders: providers }),

  // Pending attachments
  pendingAttachments: [],
  addPendingAttachment: (attachment) =>
    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, attachment],
    })),
  removePendingAttachment: (localId) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(
        (a) => a.localId !== localId,
      ),
    })),
  updatePendingAttachment: (localId, updates) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map((a) =>
        a.localId === localId ? { ...a, ...updates } : a,
      ),
    })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
}));
