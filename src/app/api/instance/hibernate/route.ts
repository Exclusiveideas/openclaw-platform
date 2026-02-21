import { NextResponse } from "next/server";
import { getAuthUserId, handleRouteError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const userId = await getAuthUserId();

    const user = await db.user.findUnique({
      where: { whopUserId: userId },
      include: { instance: true },
    });

    if (!user || !user.instance) {
      return NextResponse.json(
        { error: "No instance found" },
        { status: 404 }
      );
    }

    // TODO: Call K8s API to scale deployment replicas to 0
    // PVC (persistent volume) is preserved so no data is lost

    await db.userInstance.update({
      where: { id: user.instance.id },
      data: { status: "hibernated" },
    });

    return NextResponse.json({ status: "hibernated" });
  } catch (error) {
    return handleRouteError(error);
  }
}
