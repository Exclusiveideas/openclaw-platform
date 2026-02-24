import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedFileUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const userId = await getAuthUserId();
    const { taskId } = await params;

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const task = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: { attachments: true },
    });

    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => {
        if (msg.attachments.length === 0) {
          return { ...msg, attachments: undefined };
        }

        const attachments = await Promise.all(
          msg.attachments.map(async (att) => ({
            id: att.id,
            fileName: att.fileName,
            fileType: att.fileType,
            fileSize: att.fileSize,
            s3Key: att.s3Key,
            url: await getSignedFileUrl(att.s3Key),
          })),
        );

        return { ...msg, attachments };
      }),
    );

    return NextResponse.json(messagesWithUrls);
  } catch (error) {
    return handleRouteError(error);
  }
}
