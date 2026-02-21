import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { isByokProvider } from "@/lib/models";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and apiKey are required" },
        { status: 400 }
      );
    }

    if (!isByokProvider(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Supported: anthropic, openai, gemini" },
        { status: 400 }
      );
    }

    // Basic key format validation per provider
    if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Anthropic keys should start with sk-ant-" },
        { status: 400 }
      );
    }
    if (provider === "openai" && !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "OpenAI keys should start with sk-" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Encrypt and store
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
    const { provider } = await req.json();

    if (!provider || !isByokProvider(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.userApiKey.deleteMany({
      where: { userId: user.id, provider },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
