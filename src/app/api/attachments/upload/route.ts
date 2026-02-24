import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, getSignedFileUrl, buildS3Key } from "@/lib/s3";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);

function isAllowedMimeType(type: string): boolean {
  return ALLOWED_MIME_TYPES.has(type) || type.startsWith("image/");
}

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()! : "bin";
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be 10MB or less" },
        { status: 400 },
      );
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 },
      );
    }

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

    const fileId = randomUUID();
    const ext = getExtension(file.name);
    const s3Key = buildS3Key(user.id, taskId, fileId, ext);

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(s3Key, buffer, file.type);

    const url = await getSignedFileUrl(s3Key);

    return NextResponse.json({
      id: fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      s3Key,
      url,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
