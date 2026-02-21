"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiKeyForm } from "./api-key-form";

interface OnboardingFlowProps {
  userId: string;
  whopUserId: string;
  experienceId: string;
}

export function OnboardingFlow({
  userId,
  whopUserId,
  experienceId,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "apikey" | "complete">(
    "welcome"
  );

  if (step === "welcome") {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-white">
        <div className="max-w-lg text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
            O
          </div>
          <h1 className="text-3xl font-bold mb-3">
            Welcome to OpenClaw Platform
          </h1>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            Your personal AI agent that can research, write, code, browse the
            web, and automate tasks — all from a simple chat interface.
          </p>

          <div className="space-y-4 text-left mb-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30">
              <span className="text-xl">🔑</span>
              <div>
                <h3 className="font-medium text-sm">
                  Bring Your Own Key (BYOK)
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  You&apos;ll need an OpenRouter API key. This gives you access
                  to Claude, GPT-4, Llama, and 100+ other models through a
                  single key.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30">
              <span className="text-xl">🔒</span>
              <div>
                <h3 className="font-medium text-sm">Isolated & Secure</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  Your agent runs in its own isolated environment. Your data and
                  API keys are encrypted and never shared.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/30">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="font-medium text-sm">Powered by OpenClaw</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  An open-source AI agent that can browse the web, write code,
                  manage files, and connect to your favorite tools.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep("apikey")}
            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  if (step === "apikey") {
    return (
      <ApiKeyForm
        userId={userId}
        onComplete={() => {
          router.refresh();
        }}
      />
    );
  }

  return null;
}
