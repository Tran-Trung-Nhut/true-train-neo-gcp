import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { userPath } from "@/lib/firestore/paths";
import { stripUndefined } from "@/lib/firestore/sanitize";
import { DEFAULT_ORIGIN_LANGUAGE } from "@/lib/origin-language";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionCookie,
  revokeSession,
  sessionCookieOptions,
} from "@/lib/firebase/session";

// Exchanges a fresh Firebase ID token for an HttpOnly session cookie.
// Node runtime required: firebase-admin cannot run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ID_TOKEN_CHARS = 8192;

export async function POST(request: Request) {
  // Requiring JSON blocks simple-form CSRF; SameSite=Lax covers the rest.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 415 });
  }

  const raw = await request.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const idToken = typeof body.idToken === "string" ? body.idToken : "";

  if (!idToken || idToken.length > MAX_ID_TOKEN_CHARS) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  try {
    const sessionCookie = await createSessionCookie(idToken);
    cookies().set(SESSION_COOKIE, sessionCookie, sessionCookieOptions(SESSION_MAX_AGE_MS));
    await ensureProfile(idToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("session_mint_failed", error);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
}

// Built from the verified token, so the profile cannot be seeded with an
// identity the caller does not own.
async function ensureProfile(idToken: string): Promise<void> {
  try {
    const claims = await adminAuth().verifyIdToken(idToken, true);
    const now = new Date().toISOString();
    const ref = adminDb().doc(userPath(claims.uid));
    const existing = await ref.get();

    await ref.set(
      stripUndefined({
        displayName: typeof claims.name === "string" ? claims.name : "",
        email: typeof claims.email === "string" ? claims.email : "",
        photoURL: typeof claims.picture === "string" ? claims.picture : "",
        originLanguage: existing.exists
          ? (existing.data()?.originLanguage ?? DEFAULT_ORIGIN_LANGUAGE)
          : DEFAULT_ORIGIN_LANGUAGE,
        createdAt: existing.exists ? (existing.data()?.createdAt ?? now) : now,
        updatedAt: now,
      }),
      { merge: true }
    );
  } catch (error) {
    // Must not block sign-in; the settings writer creates the doc lazily too.
    console.error("profile_bootstrap_failed", error);
  }
}

export async function DELETE() {
  await revokeSession();
  cookies().set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return NextResponse.json({ ok: true });
}
