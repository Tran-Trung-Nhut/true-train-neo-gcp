import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firebase Admin singleton.
//
// Credentials come from Application Default Credentials — the Cloud Run runtime
// service account in production, `gcloud auth application-default login`
// locally. No service-account JSON is ever read from disk or from an env var,
// per the zero-hardcoding directive.

if (typeof window !== "undefined") {
  throw new Error("firebase-admin must never be imported in client code");
}

// Enforces the zero-hardcoding directive at runtime. Embedding service-account
// key material in an environment variable is the exact pattern Secret Manager
// exists to replace, so it fails loudly rather than working quietly.
const FORBIDDEN_CREDENTIAL_VARS = [
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_SERVICE_ACCOUNT_KEY",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_PRIVATE_KEY",
  "GOOGLE_CREDENTIALS",
  "SERVICE_ACCOUNT_JSON",
];

function assertNoInlineCredentials(): void {
  const offender = FORBIDDEN_CREDENTIAL_VARS.find((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
  if (offender) {
    throw new Error(
      `${offender} is set. Service-account key material must never be supplied ` +
        "via environment variables. Use Application Default Credentials: the " +
        "Cloud Run runtime service account in production, or " +
        "`gcloud auth application-default login` locally."
    );
  }
}

let adminApp: App | null = null;

function projectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined
  );
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  assertNoInlineCredentials();
  const existing = getApps();
  adminApp = existing.length
    ? existing[0]
    : initializeApp({ credential: applicationDefault(), projectId: projectId() });
  return adminApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

let firestore: Firestore | null = null;

export function adminDb(): Firestore {
  if (firestore) return firestore;
  firestore = getFirestore(getAdminApp());
  firestore.settings({ ignoreUndefinedProperties: false });
  return firestore;
}
