import { NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { v4 as uuid } from "uuid";

export async function POST() {
  try {
    const userId = await getAuthUserId();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: {
        apiKeys: true,
        instance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.instance && user.instance.status === "running") {
      return NextResponse.json({
        status: "running",
        message: "Instance already running",
      });
    }

    const namespace = `user-${user.id.slice(0, 8)}`;
    const gatewayToken = uuid();

    // Build environment variables from user's BYOK keys + server-side OpenRouter key
    const envVars: Record<string, string> = {
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    };

    // Inject server-side OpenRouter key for platform models
    if (process.env.OPENROUTER_API_KEY) {
      envVars.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    }

    // Inject user's BYOK keys
    for (const key of user.apiKeys) {
      const decryptedKey = decrypt(key.encryptedKey);
      switch (key.provider) {
        case "anthropic":
          envVars.ANTHROPIC_API_KEY = decryptedKey;
          break;
        case "openai":
          envVars.OPENAI_API_KEY = decryptedKey;
          break;
        case "gemini":
          envVars.GOOGLE_API_KEY = decryptedKey;
          break;
      }
    }

    // TODO: Call K8s API to create namespace + OpenClawInstance CRD
    // For now, we just record the intent in the database.
    // The actual K8s provisioning will be implemented in the orchestrator service.
    //
    // In production, this will:
    // 1. Create K8s namespace
    // 2. Create K8s Secret with envVars
    // 3. Create OpenClawInstance CRD
    // 4. Wait for the operator to provision the pod

    await db.userInstance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        k8sNamespace: namespace,
        gatewayToken,
        status: "provisioning",
      },
      update: {
        k8sNamespace: namespace,
        gatewayToken,
        status: "provisioning",
      },
    });

    return NextResponse.json({
      status: "provisioning",
      namespace,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
