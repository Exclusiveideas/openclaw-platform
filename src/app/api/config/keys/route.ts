import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import {
  keyPutSchema,
  keyDeleteSchema,
  geminiKeyValid,
} from "@/lib/validation";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    const rl = await rateLimit("config-keys", userId, 10);
    if (rl.limited) return rl.response;

    const body = await req.json();
    const parsed = keyPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { provider, apiKey } = parsed.data;

    if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Anthropic keys should start with sk-ant-" },
        { status: 400 },
      );
    }
    if (provider === "openai" && !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "OpenAI keys should start with sk-" },
        { status: 400 },
      );
    }
    if (provider === "gemini" && !geminiKeyValid(apiKey)) {
      return NextResponse.json(
        { error: "Gemini keys should start with AIza" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const encryptedKey = encrypt(apiKey);
    await db.userApiKey.upsert({
      where: {
        userId_provider: { userId: user.id, provider },
      },
      create: {
        userId: user.id,
        provider,
        encryptedKey,
      },
      update: {
        encryptedKey,
      },
    });

    auditLog({ action: "api_key.added", provider, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const userId = await getAuthUserId();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: {
        apiKeys: { select: { provider: true, createdAt: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ providers: user.apiKeys });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    const rl = await rateLimit("config-keys", userId, 10);
    if (rl.limited) return rl.response;

    const body = await req.json();
    const parsed = keyDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { provider } = parsed.data;

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.userApiKey.deleteMany({
      where: { userId: user.id, provider },
    });

    auditLog({ action: "api_key.removed", provider, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
