"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/format";
import { FILE_SIZE_LIMIT, MAX_ATTACHMENTS } from "@/lib/constants";

const STREAM_TIMEOUT_MS = 60_000;

const EMOJI_GRID = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F44E}",
  "\u{2764}\u{FE0F}",
  "\u{1F525}",
  "\u{1F389}",
  "\u{2705}",
  "\u{274C}",
  "\u{2B50}",
  "\u{1F4A1}",
  "\u{1F680}",
  "\u{1F440}",
  "\u{1F64F}",
  "\u{1F4AA}",
  "\u{1F91D}",
  "\u{1F4CC}",
  "\u{26A1}",
  "\u{1F3AF}",
];

const ACCEPTED_TYPES =
  "image/*,.pdf,.csv,.md,.txt,.json,application/pdf,text/plain,text/csv,text/markdown,application/json";

interface ChatInputProps {
  disabled: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const creatingTaskRef = useRef(false);
  const {
    activeTaskId,
    addMessage,
    updateLastMessage,
    setActiveTask,
    addTask,
    setIsStreaming,
    selectedModel,
    pendingAttachments,
    addPendingAttachment,
    removePendingAttachment,
    updatePendingAttachment,
    clearPendingAttachments,
    prefillInput,
    setPrefillInput,
  } = useAppStore();

  useEffect(() => {
    if (prefillInput) {
      setInput(prefillInput);
      setPrefillInput("");
      textareaRef.current?.focus();
    }
  }, [prefillInput, setPrefillInput]);

  const uploadFile = useCallback(
    async (file: File, taskId: string) => {
      const localId = crypto.randomUUID();

      if (file.size > FILE_SIZE_LIMIT) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }

      addPendingAttachment({
        localId,
        file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploading: true,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("taskId", taskId);

        const res = await fetch("/api/attachments/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Upload failed");
        }

        const data = await res.json();
        updatePendingAttachment(localId, {
          s3Key: data.s3Key,
          url: data.url,
          uploading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updatePendingAttachment(localId, {
          uploading: false,
          error: message,
        });
        toast.error(message);
      }
    },
    [addPendingAttachment, updatePendingAttachment],
  );

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const totalPending = pendingAttachments.length + files.length;
      if (totalPending > MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per message`);
        return;
      }

      let taskId = activeTaskId;
      if (!taskId) {
        if (creatingTaskRef.current) return;
        creatingTaskRef.current = true;
        try {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New conversation" }),
          });
          const data = await res.json();
          taskId = data.id as string;
          useAppStore.getState().setActiveTask(taskId);
          useAppStore.getState().addTask({
            id: data.id,
            title: data.title,
            status: "active",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } catch {
          toast.error("Failed to create task for upload");
          return;
        } finally {
          creatingTaskRef.current = false;
        }
      }

      for (const file of Array.from(files)) {
        uploadFile(file, taskId!);
      }
    },
    [activeTaskId, pendingAttachments.length, uploadFile],
  );

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || disabled) return;

    // Check if any attachments are still uploading
    if (pendingAttachments.some((a) => a.uploading)) {
      toast.info("Please wait for uploads to finish");
      return;
    }

    setInput("");

    let taskId = activeTaskId;
    if (!taskId) {
      if (creatingTaskRef.current) return;
      creatingTaskRef.current = true;
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 100) }),
        });
        const data = await res.json();
        taskId = data.id;
        setActiveTask(taskId);
        addTask({
          id: data.id,
          title: data.title,
          status: "active",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch {
        return;
      } finally {
        creatingTaskRef.current = false;
      }
    }

    const uploadedAttachments = pendingAttachments
      .filter((a) => a.s3Key && !a.error && !a.uploading)
      .map((a) => ({
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
        s3Key: a.s3Key!,
        url: a.url,
      }));

    // Build client-side attachments for display
    const displayAttachments = uploadedAttachments.map((a) => ({
      id: crypto.randomUUID(),
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      s3Key: a.s3Key,
      url: a.url ?? "",
    }));

    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      attachments:
        displayAttachments.length > 0 ? displayAttachments : undefined,
      createdAt: new Date().toISOString(),
    });

    clearPendingAttachments();

    setIsStreaming(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          message: text,
          model: selectedModel,
          attachments:
            uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.code === "PLATFORM_UNAVAILABLE") {
          toast.error(
            "Platform models are not available yet. Please add your own API key in Settings.",
          );
        } else if (data?.code === "BYOK_KEY_MISSING") {
          toast.error(
            "No API key configured for this provider. Add one in Settings.",
          );
        } else {
          toast.error(data?.error || "Failed to send message");
        }
        return;
      }

      if (!res.body) {
        toast.error("No response stream received");
        return;
      }

      const assistantMsgId = crypto.randomUUID();
      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              toast.error(parsed.error);
              break;
            }

            if (parsed.content) {
              accumulated += parsed.content;
              updateLastMessage(accumulated);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      const isTimeout =
        err instanceof DOMException && err.name === "AbortError";
      addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: isTimeout
          ? "Response timed out. Please try again."
          : "Failed to send message. Please try again.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      clearTimeout(timeout);
      setIsStreaming(false);
    }
  }, [
    input,
    disabled,
    activeTaskId,
    pendingAttachments,
    addMessage,
    updateLastMessage,
    setActiveTask,
    addTask,
    setIsStreaming,
    selectedModel,
    clearPendingAttachments,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const handleComingSoon = () => {
    toast.info("Coming soon");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const hasInput = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;

  return (
    <div className="relative">
      <div
        className={`bg-neutral-800/60 border rounded-2xl overflow-hidden transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-neutral-700/50 focus-within:border-neutral-600"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Assign a task or ask anything"
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-white placeholder:text-neutral-500 px-4 pt-4 pb-2 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />

        {/* Attachment preview strip */}
        {hasAttachments && (
          <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto">
            {pendingAttachments.map((att) => (
              <div key={att.localId} className="relative flex-shrink-0 group">
                {att.fileType.startsWith("image/") ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-700 border border-neutral-600">
                    {att.url ? (
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-700/50 border border-neutral-600 max-w-[180px]">
                    <DocIcon />
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-200 truncate">
                        {att.fileName}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {formatFileSize(att.fileSize)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload spinner overlay */}
                {att.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {/* Error indicator */}
                {att.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 rounded-lg">
                    <svg
                      className="w-4 h-4 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removePendingAttachment(att.localId)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-600 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-3 h-3 text-white"
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
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left toolbar icons */}
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => {
                handleFileSelect(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Add attachment"
              aria-label="Add attachment"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            <button
              onClick={handleComingSoon}
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Connect tools"
              aria-label="Connect tools"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </button>

            <button
              onClick={handleComingSoon}
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="AI tools"
              aria-label="AI tools"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </button>
          </div>

          {/* Right toolbar icons */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setEmojiOpen((prev) => !prev)}
                disabled={disabled}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
                title="Emoji"
                aria-label="Emoji picker"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                  />
                </svg>
              </button>

              {emojiOpen && (
                <div className="absolute bottom-10 right-0 bg-neutral-800 border border-neutral-700 rounded-xl p-2 shadow-xl z-50 grid grid-cols-5 gap-1 w-[200px]">
                  {EMOJI_GRID.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-700 transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleComingSoon}
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
              title="Voice input"
              aria-label="Voice input"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={disabled || !hasInput}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                hasInput && !disabled
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-neutral-700/50 text-neutral-500"
              } disabled:cursor-not-allowed`}
              title="Send message"
              aria-label="Send message"
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
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg
      className="w-5 h-5 text-neutral-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      className="w-4 h-4 text-neutral-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
