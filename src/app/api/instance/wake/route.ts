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
        { error: "No instance found. Please provision first." },
        { status: 404 }
      );
    }

    if (user.instance.status === "running") {
      return NextResponse.json({ status: "running" });
    }

    // TODO: Call K8s API to scale deployment replicas from 0 to 1
    // In production:
    // await k8sAppsApi.patchNamespacedDeployment(
    //   'agent', user.instance.k8sNamespace,
    //   { spec: { replicas: 1 } },
    //   { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
    // );

    await db.userInstance.update({
      where: { id: user.instance.id },
      data: {
        status: "waking",
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ status: "waking" });
  } catch (error) {
    return handleRouteError(error);
  }
}
