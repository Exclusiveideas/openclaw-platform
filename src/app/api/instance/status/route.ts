import { NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getAuthUserId();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: { instance: true },
    });

    if (!user || !user.instance) {
      return NextResponse.json({ status: "none" });
    }

    // TODO: In production, also check actual K8s pod status
    // and update DB if status has changed

    return NextResponse.json({
      status: user.instance.status,
      lastActiveAt: user.instance.lastActiveAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
