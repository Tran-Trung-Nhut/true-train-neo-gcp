import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Resolution order: GEMINI_API_KEY from the environment (Cloud Run secret
// injection or local dev), then Secret Manager via ADC. Cached in module scope
// so Secret Manager is read once per cold start.

if (typeof window !== "undefined") {
  throw new Error("lib/ai/secrets must never be imported in client code");
}

let cached: Promise<string> | null = null;
let secretClient: SecretManagerServiceClient | null = null;

function projectId(): string | undefined {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined
  );
}

export async function accessSecret(
  secretId: string,
  versionId = "latest"
): Promise<string> {
  const project = projectId();
  if (!project) throw new Error("missing_project_id");

  if (!secretClient) secretClient = new SecretManagerServiceClient();
  const name = `projects/${project}/secrets/${secretId}/versions/${versionId}`;
  const [response] = await secretClient.accessSecretVersion({ name });
  return response.payload?.data?.toString() ?? "";
}

// A NEXT_PUBLIC_ prefix would inline the key into the client bundle.
function assertKeyNotPublic(): void {
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("NEXT_PUBLIC_") && /GEMINI|GENAI|GOOGLE_AI/i.test(name)) {
      throw new Error(
        `${name} is set. A NEXT_PUBLIC_ variable is inlined into the client ` +
          "bundle; the Gemini key must stay server-side only."
      );
    }
  }
}

async function resolveGeminiApiKey(): Promise<string> {
  assertKeyNotPublic();

  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const secretId = process.env.GEMINI_SECRET_NAME?.trim() || "GEMINI_API_KEY";
  try {
    return (await accessSecret(secretId)).trim();
  } catch (error) {
    // Routes degrade to their non-AI path rather than returning 500.
    console.error("gemini_secret_unavailable", error);
    return "";
  }
}

export function getGeminiApiKey(): Promise<string> {
  if (!cached) {
    cached = resolveGeminiApiKey().catch((error) => {
      cached = null; // never cache a failure
      throw error;
    });
  }
  return cached;
}
