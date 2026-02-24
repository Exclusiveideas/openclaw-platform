const REQUIRED_VARS = [
  "DATABASE_URL",
  "WHOP_API_KEY",
  "WHOP_APP_ID",
  "ENCRYPTION_KEY",
  "AWS_S3_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
] as const;

const OPTIONAL_VARS = ["OPENROUTER_API_KEY", "REDIS_HOST"] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      console.warn(`Optional env var ${key} not set`);
    }
  }
}
