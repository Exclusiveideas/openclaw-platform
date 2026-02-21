import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlatformModel, isByokProvider, getPlatformModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { taskId, message, model } = await req.json();

    // Input validation
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }
    if (message.length > 10000) {
      return NextResponse.json(
        { error: "Message must be 10000 characters or less" },
        { status: 400 }
      );
    }

    // Validate model selection
    const selectedModel = typeof model === "string" ? model : "openclaw-pro";

    if (isPlatformModel(selectedModel)) {
      // Platform model — requires server-side OpenRouter key
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json(
          {
            error: "Platform models are not available yet. Please add your own API key in settings.",
            code: "PLATFORM_UNAVAILABLE",
          },
          { status: 503 }
        );
      }
    } else if (isByokProvider(selectedModel)) {
      // BYOK model — requires user's own key for this provider
      const user = await db.user.findUnique({
        where: { whopUserId: userId },
        include: { apiKeys: { where: { provider: selectedModel } } },
      });

      if (!user || user.apiKeys.length === 0) {
        return NextResponse.json(
          {
            error: `No API key configured for ${selectedModel}. Add one in settings.`,
            code: "BYOK_KEY_MISSING",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid model selection" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: { instance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save user message to DB
    await db.message.create({
      data: {
        taskId,
        role: "user",
        content: message,
      },
    });

    // Update last active timestamp
    if (user.instance) {
      await db.userInstance.update({
        where: { id: user.instance.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // TODO: Forward message to user's OpenClaw Gateway via WebSocket
    // In production, this will:
    // 1. Look up the user's instance gateway URL from K8s service
    // 2. Open a WebSocket connection to the gateway
    // 3. Send: { type: "req", id: msgId, method: "chat.send", params: { text: message, model: resolvedModel } }
    // 4. Wait for the response events and relay them back
    //
    // For now, return a placeholder response
    const modelLabel = isPlatformModel(selectedModel)
      ? getPlatformModel(selectedModel)?.name
      : selectedModel;

    const assistantResponse = {
      role: "assistant",
      content:
        "OpenClaw instance is being set up. Once your agent is running, I'll be able to help you with tasks like research, writing, coding, and web browsing.\n\n" +
        `Selected model: ${modelLabel}\n` +
        `Instance status: ${user.instance?.status || "not provisioned"}`,
    };

    // Save assistant response
    const savedMessage = await db.message.create({
      data: {
        taskId,
        role: "assistant",
        content: assistantResponse.content,
        metadata: {},
      },
    });

    // Update task timestamp
    await db.task.update({
      where: { id: taskId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      id: savedMessage.id,
      content: assistantResponse.content,
      metadata: {},
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
