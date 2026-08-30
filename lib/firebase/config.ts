// Public Firebase identifiers, not secrets — protected by Firestore rules and
// the authorized-domains allowlist. Resolved at runtime rather than inlined at
// build time, so one container image works across environments.

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

// Injected value first, falling back to env vars so `next dev` works directly.
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

// Escapes for inclusion in a <script> block: an unescaped "</script>" would
// close the tag early. U+2028/U+2029 are valid JSON but illegal raw in JS.
export function serializeConfigForScript(config: FirebaseWebConfig | null): string {
  return JSON.stringify(config ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
