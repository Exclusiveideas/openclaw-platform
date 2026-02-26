import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isPlatformModel,
  isByokProvider,
  getPlatformModel,
} from "@/lib/models";
import { getSignedFileUrl, getFileContent } from "@/lib/s3";
import { rateLimit } from "@/lib/rate-limit";
import { MESSAGE_CHAR_LIMIT, MAX_ATTACHMENTS } from "@/lib/constants";

type AttachmentInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    const rl = await rateLimit("chat-send", userId, 20);
    if (rl.limited) return rl.response;

    const { title, message, model, attachments } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }
    if (message.length > MESSAGE_CHAR_LIMIT) {
      return NextResponse.json(
        { error: `Message must be ${MESSAGE_CHAR_LIMIT} characters or less` },
        { status: 400 },
      );
    }

    const taskTitle =
      typeof title === "string" && title.trim()
        ? title.slice(0, 500)
        : message.slice(0, 100);

    const selectedModel = typeof model === "string" ? model : "openclaw-pro";

    if (isPlatformModel(selectedModel)) {
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json(
          {
            error:
              "Platform models are not available yet. Please add your own API key in settings.",
            code: "PLATFORM_UNAVAILABLE",
          },
          { status: 503 },
        );
      }
    } else if (!isByokProvider(selectedModel)) {
      return NextResponse.json(
        { error: "Invalid model selection" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: isByokProvider(selectedModel)
        ? { apiKeys: { where: { provider: selectedModel } } }
        : undefined,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      isByokProvider(selectedModel) &&
      (!("apiKeys" in user) || !(user as { apiKeys: unknown[] }).apiKeys.length)
    ) {
      return NextResponse.json(
        {
          error: `No API key configured for ${selectedModel}. Add one in settings.`,
          code: "BYOK_KEY_MISSING",
        },
        { status: 400 },
      );
    }

    // Validate attachments
    const validAttachments: AttachmentInput[] = [];
    if (Array.isArray(attachments)) {
      for (const att of attachments.slice(0, MAX_ATTACHMENTS)) {
        if (att?.fileName && att?.fileType && att?.s3Key && att?.fileSize) {
          validAttachments.push({
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            s3Key: att.s3Key,
          });
        }
      }
    }

    // Create task + save user message in a single interactive transaction
    const { task, savedUserMessage } = await db.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          userId: user.id,
          title: taskTitle,
          status: "active",
        },
      });
      const m = await tx.message.create({
        data: {
          taskId: t.id,
          role: "user",
          content: message,
          metadata: validAttachments.length > 0 ? { hasAttachments: true } : {},
        },
      });
      return { task: t, savedUserMessage: m };
    });

    // Create attachment records (fire-and-forget for streaming speed)
    if (validAttachments.length > 0) {
      db.attachment
        .createMany({
          data: validAttachments.map((att) => ({
            messageId: savedUserMessage.id,
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            s3Key: att.s3Key,
          })),
        })
        .catch((err) => console.error("Failed to save attachments:", err));
    }

    // Build the current user message content for OpenRouter
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    let currentUserContent: string | ContentPart[] = message;

    if (validAttachments.length > 0) {
      const imageAttachments = validAttachments.filter((a) =>
        a.fileType.startsWith("image/"),
      );
      const docAttachments = validAttachments.filter(
        (a) => !a.fileType.startsWith("image/"),
      );

      let docPrefix = "";
      for (const doc of docAttachments) {
        try {
          const content = await getFileContent(doc.s3Key);
          docPrefix += `[Attached: ${doc.fileName}]\n${content}\n\n`;
        } catch {
          docPrefix += `[Attached: ${doc.fileName} — could not read]\n\n`;
        }
      }

      if (imageAttachments.length > 0) {
        const parts: ContentPart[] = [];
        for (const img of imageAttachments) {
          const url = await getSignedFileUrl(img.s3Key);
          parts.push({ type: "image_url", image_url: { url } });
        }
        parts.push({ type: "text", text: docPrefix + message });
        currentUserContent = parts;
      } else if (docPrefix) {
        currentUserContent = docPrefix + message;
      }
    }

    type OpenRouterMessage = {
      role: "user" | "assistant" | "system";
      content: string | ContentPart[];
    };

    // First message — no history to load
    const openRouterMessages: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          "You are OpenClaw, an AI assistant powering the OpenClaw Platform. " +
          "You help users with research, analysis, coding, writing, and creative tasks. " +
          "You are direct, knowledgeable, and thorough. When you don't know something, say so. " +
          "When a task is complex, break it down into steps. " +
          "Keep responses well-structured using markdown when helpful. Be concise unless the user asks for depth.",
      },
      { role: "user", content: currentUserContent },
    ];

    const platformModel = getPlatformModel(selectedModel);
    const openrouterModelId = platformModel?.openrouterId ?? selectedModel;

    const openRouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://openclaw.app",
          "X-Title": "OpenClaw Platform",
        },
        body: JSON.stringify({
          model: openrouterModelId,
          messages: openRouterMessages,
          stream: true,
        }),
      },
    );

    if (!openRouterRes.ok) {
      const errorBody = await openRouterRes.text().catch(() => "Unknown error");
      console.error("OpenRouter error:", openRouterRes.status, errorBody);
      return NextResponse.json(
        { error: "Failed to get response from AI model" },
        { status: 502 },
      );
    }

    if (!openRouterRes.body) {
      return NextResponse.json(
        { error: "No response body from AI model" },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";
    const taskId = task.id;

    const stream = new ReadableStream({
      async start(controller) {
        // Send taskId as the first SSE event so the client can update state
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ taskId, title: taskTitle, createdAt: task.createdAt, updatedAt: task.updatedAt })}\n\n`,
          ),
        );

        const reader = openRouterRes.body!.getReader();
        let buffer = "";
        let saved = false;

        async function saveAssistantMessage(
          metadata: Record<string, boolean | string | number> = {},
        ) {
          if (saved || !fullContent) return null;
          saved = true;

          const [savedMessage] = await db.$transaction([
            db.message.create({
              data: {
                taskId,
                role: "assistant",
                content: fullContent,
                metadata,
              },
            }),
            db.task.update({
              where: { id: taskId },
              data: { updatedAt: new Date() },
            }),
          ]);
          return savedMessage;
        }

        try {
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
              if (data === "[DONE]") {
                const savedMessage = await saveAssistantMessage();
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ done: true, id: savedMessage?.id })}\n\n`,
                  ),
                );
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: delta })}\n\n`,
                    ),
                  );
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }

          const savedMessage = await saveAssistantMessage();
          if (savedMessage) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, id: savedMessage.id })}\n\n`,
              ),
            );
          }

          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          await saveAssistantMessage({ error: true });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
