import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./session.edge";

// Firebase ID tokens live in IndexedDB, unreachable from Server Components.
// The client posts its ID token to /api/auth/session once, which exchanges it
// for an HttpOnly session cookie that every server gate verifies.

export { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./session.edge";

// createSessionCookie rejects ID tokens older than 5 minutes; checking first
// turns an opaque Admin SDK error into a clean 401.
const MAX_ID_TOKEN_AGE_MS = 5 * 60 * 1000;

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

function toSessionUser(claims: DecodedIdToken): SessionUser {
  const name = typeof claims.name === "string" ? claims.name : "";
  const picture = typeof claims.picture === "string" ? claims.picture : "";
  return {
    uid: claims.uid,
    email: typeof claims.email === "string" ? claims.email : "",
    displayName: name,
    photoURL: picture,
    emailVerified: claims.email_verified === true,
  };
}

export async function createSessionCookie(idToken: string): Promise<string> {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  const issuedAtMs = decoded.auth_time * 1000;
  if (Date.now() - issuedAtMs > MAX_ID_TOKEN_AGE_MS) {
    throw new Error("stale_id_token");
  }
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

// Returns null rather than throwing so callers choose between redirect and 401.
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie, true);
    return toSessionUser(claims);
  } catch {
    return null;
  }
}


export async function revokeSession(): Promise<void> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie, false);
    await adminAuth().revokeRefreshTokens(claims.sub);
  } catch {
    // Already invalid or expired — clearing the cookie is enough.
  }
}
