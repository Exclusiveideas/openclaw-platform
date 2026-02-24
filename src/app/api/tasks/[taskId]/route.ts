import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/s3";
import { auditLog } from "@/lib/audit";
import { taskUpdateSchema } from "@/lib/validation";
import type { TaskStatus } from "@/generated/prisma/client";

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
      include: {
        _count: { select: { messages: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const userId = await getAuthUserId();
    const { taskId } = await params;
    const body = await req.json();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership
    const existing = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { title, status } = parsed.data;
    if (!title && !status) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const data: { title?: string; status?: TaskStatus } = {};
    if (title) data.title = title;
    if (status) data.status = status;

    const task = await db.task.update({
      where: { id: taskId },
      data,
    });

    return NextResponse.json(task);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
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

    // Verify ownership
    const existing = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Collect S3 keys before cascade delete removes attachment records
    const attachments = await db.attachment.findMany({
      where: { message: { taskId } },
      select: { s3Key: true },
    });

    await db.task.delete({ where: { id: taskId } });

    // Best-effort S3 cleanup — don't fail the request
    if (attachments.length > 0) {
      Promise.allSettled(attachments.map((a) => deleteFile(a.s3Key))).catch(
        () => {},
      );
    }

    auditLog({ action: "task.deleted", taskId, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
