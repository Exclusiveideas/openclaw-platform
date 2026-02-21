import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { title } = await req.json();

    // Input validation
    if (typeof title === "string" && title.trim().length > 500) {
      return NextResponse.json(
        { error: "Title must be 500 characters or less" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const task = await db.task.create({
      data: {
        userId: user.id,
        title: (typeof title === "string" && title.trim()) || "New Task",
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const userId = await getAuthUserId();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tasks = await db.task.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return handleRouteError(error);
  }
}
