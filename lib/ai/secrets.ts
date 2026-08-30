import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Runtime secret resolution. No key is ever hardcoded, committed, or exposed to
// the client — nothing here is prefixed NEXT_PUBLIC_, so Next.js cannot inline
// it into the browser bundle.
//
// Resolution order:
//   1. GEMINI_API_KEY in the environment — local development only.
//   2. Google Cloud Secret Manager, read with the Cloud Run runtime service
//      account's Application Default Credentials.
//
// The resolved value is cached in module scope, so Secret Manager is hit once
// per container cold start rather than once per request.

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

// Guards against the classic misconfiguration where the key is exposed to the
// browser by giving it a NEXT_PUBLIC_ prefix.
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
    // Logged, not thrown: routes degrade to their non-AI path rather than 500.
    console.error("gemini_secret_unavailable", error);
    return "";
  }
}

export function getGeminiApiKey(): Promise<string> {
  if (!cached) {
    cached = resolveGeminiApiKey().catch((error) => {
      // Never cache a failure — the next request should retry.
      cached = null;
      throw error;
    });
  }
  return cached;
}
