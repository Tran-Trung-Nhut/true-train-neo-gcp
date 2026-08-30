import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { aiUsageId, aiUsagePath } from "@/lib/firestore/paths";
import type { AiKind } from "./config";
export { AI_LIMITS } from "./config";

// Per-user, per-day AI quota. firestore.rules blocks all client writes to
// aiUsage, so the counter is only mutable here via the Admin SDK.

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageRef(uid: string, kind: AiKind) {
  return adminDb().doc(`${aiUsagePath(uid)}/${aiUsageId(utcDateString(), kind)}`);
}

export async function getUsage(uid: string, kind: AiKind): Promise<number> {
  const snapshot = await usageRef(uid, kind).get();
  if (!snapshot.exists) return 0;
  const count = snapshot.data()?.count;
  return typeof count === "number" ? count : 0;
}

// Atomic: two concurrent requests cannot both read N and write N+1.
export async function bumpUsage(uid: string, kind: AiKind): Promise<void> {
  await usageRef(uid, kind).set(
    {
      kind,
      date: utcDateString(),
      count: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Fails closed: an unreachable quota store must not grant unlimited calls.
export async function checkQuota(
  uid: string,
  kind: AiKind,
  limit: number
): Promise<{ allowed: boolean; used: number; remaining: number }> {
  try {
    const used = await getUsage(uid, kind);
    return { allowed: used < limit, used, remaining: Math.max(0, limit - used) };
  } catch (error) {
    console.error("ai_usage_read_failed", error);
    return { allowed: false, used: limit, remaining: 0 };
  }
}
