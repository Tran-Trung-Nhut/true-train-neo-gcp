import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/firebase/session";

// The uid always comes from the verified session cookie, never from the
// request body, so a caller cannot address another account.

export type Guarded =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireUser(): Promise<Guarded> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

// A missing or malformed payload becomes {} rather than an unhandled throw.
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.json().catch(() => null);
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function readString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}
