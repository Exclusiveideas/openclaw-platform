"use client";

import type { ChatMessage, MessageAttachment } from "@/store/app-store";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const attachments = message.attachments ?? [];
  const imageAttachments = attachments.filter((a) =>
    a.fileType.startsWith("image/"),
  );
  const docAttachments = attachments.filter(
    (a) => !a.fileType.startsWith("image/"),
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : isSystem
              ? "bg-red-900/30 border border-red-800/50 text-red-200"
              : "bg-neutral-800/60 border border-neutral-700/30 text-neutral-100"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold">
              O
            </div>
            <span className="text-xs font-medium text-neutral-400">
              {isSystem ? "System" : "OpenClaw"}
            </span>
          </div>
        )}

        {/* Image attachments */}
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imageAttachments.map((att) => (
              <AttachmentImage key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Document attachments */}
        {docAttachments.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-2">
            {docAttachments.map((att) => (
              <AttachmentDoc key={att.id} attachment={att} isUser={isUser} />
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-blue-200" : "text-neutral-500"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function AttachmentImage({ attachment }: { attachment: MessageAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <img
        src={attachment.url}
        alt={attachment.fileName}
        className="max-h-48 rounded-xl object-cover hover:opacity-90 transition-opacity"
      />
    </a>
  );
}

function AttachmentDoc({
  attachment,
  isUser,
}: {
  attachment: MessageAttachment;
  isUser: boolean;
}) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isUser
          ? "bg-blue-700/50 hover:bg-blue-700/70"
          : "bg-neutral-700/50 hover:bg-neutral-700/70"
      }`}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 ${isUser ? "text-blue-200" : "text-neutral-400"}`}
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
      <div className="min-w-0">
        <div
          className={`text-xs truncate ${isUser ? "text-white" : "text-neutral-200"}`}
        >
          {attachment.fileName}
        </div>
        <div
          className={`text-[10px] ${isUser ? "text-blue-200" : "text-neutral-500"}`}
        >
          {formatFileSize(attachment.fileSize)}
        </div>
      </div>
    </a>
  );
}
