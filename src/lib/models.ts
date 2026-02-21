/** Platform models — powered by OpenRouter, branded for the platform */
export const PLATFORM_MODELS = [
  {
    id: "openclaw-pro",
    name: "OpenClaw Pro",
    openrouterId: "anthropic/claude-sonnet-4",
  },
  {
    id: "openclaw-fast",
    name: "OpenClaw Fast",
    openrouterId: "anthropic/claude-haiku-4",
  },
] as const;

export type PlatformModelId = (typeof PLATFORM_MODELS)[number]["id"];

/** BYOK providers users can configure with their own API keys */
export const BYOK_PROVIDERS = ["anthropic", "openai", "gemini"] as const;

export type ByokProvider = (typeof BYOK_PROVIDERS)[number];

/** Look up a platform model by its ID */
export function getPlatformModel(id: string) {
  return PLATFORM_MODELS.find((m) => m.id === id);
}

/** Check whether a model ID is a platform model */
export function isPlatformModel(id: string): id is PlatformModelId {
  return PLATFORM_MODELS.some((m) => m.id === id);
}

/** Check whether a string is a valid BYOK provider */
export function isByokProvider(id: string): id is ByokProvider {
  return (BYOK_PROVIDERS as readonly string[]).includes(id);
}
