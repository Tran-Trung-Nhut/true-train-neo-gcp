// Public Firebase Web config. These values are identifiers, not secrets: they
// ship to the browser by design and are protected by Firestore rules plus the
// Console's authorized-domains allowlist, never by obscurity.
// The Gemini key is NOT here — it never leaves the server.
//
// Config is resolved at RUNTIME, not baked in at build time. Next.js inlines
// NEXT_PUBLIC_* during `next build`, which would freeze the Firebase project
// into the container image and mean a rebuild to change environments — and a
// silent "not configured" screen whenever build-time vars are forgotten. The
// root layout serializes the config into window.__FIREBASE_CONFIG__ on every
// request instead, so a single image works anywhere and `--set-env-vars` alone
// is enough to configure a deployment.

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_CONFIG__: FirebaseWebConfig | undefined;
}

export const FIREBASE_CONFIG_GLOBAL = "__FIREBASE_CONFIG__";

// Server-side read. Runs per request in the root layout.
export function readFirebaseWebConfigFromEnv(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };
}

// Client-side read: the injected value first, falling back to inlined env vars
// so `next dev` keeps working straight from .env.local.
export function readFirebaseWebConfig(): FirebaseWebConfig | null {
  if (typeof window !== "undefined") {
    const injected = window.__FIREBASE_CONFIG__;
    if (injected?.apiKey && injected.authDomain && injected.projectId && injected.appId) {
      return injected;
    }
  }
  return readFirebaseWebConfigFromEnv();
}

export function isFirebaseConfigured(): boolean {
  return readFirebaseWebConfig() !== null;
}

// Escapes a JSON payload for safe inclusion inside a <script> block. Without
// this, a value containing "</script>" would close the tag early and turn
// config injection into stored XSS. U+2028/U+2029 are valid JSON but illegal
// raw in a JS string literal.
export function serializeConfigForScript(config: FirebaseWebConfig | null): string {
  return JSON.stringify(config ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
