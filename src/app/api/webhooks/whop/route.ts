import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { db } from "@/lib/db";

function extractUserId(data: unknown): string | undefined {
  if (data && typeof data === "object" && "user_id" in data) {
    const userId = (data as { user_id: unknown }).user_id;
    return typeof userId === "string" ? userId : undefined;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const requestBodyText = await request.text();
    const reqHeaders = Object.fromEntries(request.headers);
    const webhookData = whopsdk.webhooks.unwrap(requestBodyText, {
      headers: reqHeaders,
    });

    switch (webhookData.type) {
      case "membership.activated": {
        const whopUserId = extractUserId(webhookData.data);
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
    console.error("Webhook error:", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
