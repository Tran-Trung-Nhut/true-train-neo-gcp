import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { readFirebaseWebConfigFromEnv } from "@/lib/firebase/config";
import { getGeminiApiKey } from "@/lib/ai/secrets";

// Readiness probe. Every field is a boolean, a length, an error code, or the
// project id, so this is safe to curl against a live URL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reported generically so an unexpected message cannot leak internals.
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string") return code;
  if (typeof code === "number") {
    const map: Record<number, string> = {
      5: "NOT_FOUND",
      7: "PERMISSION_DENIED",
      9: "FAILED_PRECONDITION",
      16: "UNAUTHENTICATED",
    };
    return map[code] ?? `GRPC_${code}`;
  }
  const message = String((error as { message?: unknown })?.message ?? "");
  if (message.includes("requires an index")) return "FAILED_PRECONDITION";
  if (message.includes("PERMISSION_DENIED")) return "PERMISSION_DENIED";
  if (message.includes("NOT_FOUND")) return "NOT_FOUND";
  return "ERROR";
}

function adminProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    ""
  );
}

export async function GET() {
  const webConfig = readFirebaseWebConfigFromEnv();

  // Exercised rather than assumed present.
  let adminCredentials = false;
  let adminError = "";
  try {
    await adminAuth().listUsers(1);
    adminCredentials = true;
  } catch (error) {
    adminError = errorCode(error);
    console.error("health_admin_credentials_failed", error);
  }

  // Separate permission from Firebase Auth: roles/datastore.user vs
  // roles/firebaseauth.admin. Checking only Auth hides read failures.
  let firestoreRead = false;
  let firestoreError = "";
  try {
    await adminDb().collection("users").limit(1).get();
    firestoreRead = true;
  } catch (error) {
    firestoreError = errorCode(error);
    console.error("health_firestore_read_failed", error);
  }

  // FAILED_PRECONDITION here means the composite indexes are still building.
  let firestoreIndexes = false;
  let indexError = "";
  if (firestoreRead) {
    try {
      const probe = adminDb().collectionGroup("words").where("deckId", "==", "__health_probe__");
      await Promise.all([
        probe.where("sm2.repetitions", ">=", 3).count().get(),
        probe.where("sm2.dueDate", "<=", "1970-01-01").count().get(),
        probe.orderBy("createdAt").limit(1).get(),
      ]);
      firestoreIndexes = true;
    } catch (error) {
      indexError = errorCode(error);
      console.error("health_firestore_indexes_failed", error);
    }
  }

  // Cloud Run injects --set-secrets values as ordinary environment variables,
  // so "environment" is expected for both that and --set-env-vars.
  let geminiKeyLength = 0;
  let geminiSource: "none" | "environment" | "secret-manager-api" = "none";
  try {
    const key = await getGeminiApiKey();
    geminiKeyLength = key.length;
    if (key) {
      geminiSource = process.env.GEMINI_API_KEY?.trim()
        ? "environment"
        : "secret-manager-api";
    }
  } catch (error) {
    console.error("health_gemini_secret_failed", error);
  }

  const checks = {
    firebaseWebConfig: webConfig !== null,
    firebaseAdminCredentials: adminCredentials,
    firestoreRead,
    firestoreIndexes,
    geminiKeyResolved: geminiKeyLength > 0,
    geminiKeySource: geminiSource,
    geminiKeyLength,
    // A mismatch sends writes and reads to different databases.
    webConfigProjectId: webConfig?.projectId ?? "",
    adminProjectId: adminProjectId(),
    projectIdsMatch: (webConfig?.projectId ?? "") === adminProjectId(),
    errors: {
      admin: adminError,
      firestore: firestoreError,
      indexes: indexError,
    },
  };

  const ready =
    checks.firebaseWebConfig &&
    checks.firebaseAdminCredentials &&
    checks.firestoreRead &&
    checks.firestoreIndexes &&
    checks.projectIdsMatch &&
    checks.geminiKeyResolved;

  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
