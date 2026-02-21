import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

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

    if (!["openrouter", "anthropic", "openai"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Validate the key by making a test request (OpenRouter)
    if (provider === "openrouter") {
      const testRes = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!testRes.ok) {
        return NextResponse.json(
          { error: "Invalid OpenRouter API key" },
          { status: 400 }
        );
      }
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
