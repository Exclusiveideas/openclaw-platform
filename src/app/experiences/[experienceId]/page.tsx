import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { db } from "@/lib/db";
import { MainApp } from "@/components/main-app";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const { userId } = await whopsdk.verifyUserToken(await headers());

  // Check if user has access to this experience
  const access = await whopsdk.users.checkAccess(experienceId, {
    id: userId,
  });

  if (!access.has_access) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-neutral-400">
            You need an active membership to use OpenClaw Platform.
          </p>
        </div>
      </div>
    );
  }

  // Upsert user record
  const user = await db.user.upsert({
    where: { whopUserId: userId },
    create: { whopUserId: userId },
    update: {},
    include: {
      apiKeys: { select: { provider: true } },
      instance: { select: { status: true } },
    },
  });

  const hasApiKeys = user.apiKeys.length > 0;
  const configuredProviders = user.apiKeys.map((k) => k.provider);
  const instanceStatus = user.instance?.status ?? "none";

  if (!hasApiKeys) {
    return (
      <OnboardingFlow
        userId={user.id}
        whopUserId={userId}
        experienceId={experienceId}
      />
    );
  }

  return (
    <MainApp
      userId={user.id}
      whopUserId={userId}
      experienceId={experienceId}
      configuredProviders={configuredProviders}
      initialInstanceStatus={instanceStatus}
    />
  );
}
