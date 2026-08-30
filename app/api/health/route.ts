import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { readFirebaseWebConfigFromEnv } from "@/lib/firebase/config";
import { getGeminiApiKey } from "@/lib/ai/secrets";

// Deployment readiness probe.
//
// Answers "is this container correctly wired?" without ever revealing what it
// is wired to: every field is a boolean or a length. No secret value, no
// fragment of one, and no project identifier beyond what the browser already
// receives. Safe to curl against a live Cloud Run URL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const webConfig = readFirebaseWebConfigFromEnv();

  // Application Default Credentials: exercised, not merely assumed present.
  let adminCredentials = false;
  try {
    await adminAuth().listUsers(1);
    adminCredentials = true;
  } catch (error) {
    console.error("health_admin_credentials_failed", error);
  }

  let geminiKeyLength = 0;
  let geminiSource: "none" | "env" | "secret-manager" = "none";
  try {
    const key = await getGeminiApiKey();
    geminiKeyLength = key.length;
    if (key) geminiSource = process.env.GEMINI_API_KEY?.trim() ? "env" : "secret-manager";
  } catch (error) {
    console.error("health_gemini_secret_failed", error);
  }

  const checks = {
    firebaseWebConfig: webConfig !== null,
    firebaseAdminCredentials: adminCredentials,
    geminiKeyResolved: geminiKeyLength > 0,
    geminiKeySource: geminiSource,
    // Length only — enough to spot a truncated or empty secret, useless to an
    // attacker.
    geminiKeyLength,
  };

  const ready =
    checks.firebaseWebConfig && checks.firebaseAdminCredentials && checks.geminiKeyResolved;

  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
