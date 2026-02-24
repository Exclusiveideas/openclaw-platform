import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function extractUserId(data: unknown): string | undefined {
  if (data && typeof data === "object" && "user_id" in data) {
    const userId = (data as { user_id: unknown }).user_id;
    return typeof userId === "string" ? userId : undefined;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  let webhookData;

  try {
    const requestBodyText = await request.text();
    const reqHeaders = Object.fromEntries(request.headers);
    webhookData = whopsdk.webhooks.unwrap(requestBodyText, {
      headers: reqHeaders,
    });
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    switch (webhookData.type) {
      case "membership.activated": {
        const whopUserId = extractUserId(webhookData.data);
        auditLog({
          action: "webhook.received",
          type: "membership.activated",
          whopUserId,
        });
        if (whopUserId) {
          await db.user.upsert({
            where: { whopUserId },
            create: { whopUserId },
            update: {},
          });
        }
        break;
      }

      case "membership.deactivated": {
        const whopUserId = extractUserId(webhookData.data);
        auditLog({
          action: "webhook.received",
          type: "membership.deactivated",
          whopUserId,
        });
        if (whopUserId) {
          const user = await db.user.findUnique({
            where: { whopUserId },
            include: { instance: true },
          });

          if (user?.instance) {
            await db.userInstance.update({
              where: { id: user.instance.id },
              data: { status: "hibernated" },
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook type: ${webhookData.type}`);
        break;
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", {
      type: webhookData.type,
      error: error instanceof Error ? error.message : error,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
