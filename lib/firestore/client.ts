"use client";

import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp, getFirebaseAuth } from "@/lib/firebase/client";

// Browser Firestore handle. Reads and simple owner-scoped writes go straight
// to Firestore so firestore.rules are the live enforcement path; queries that
// need offset, aggregation or bulk deletes go through authenticated API routes
// backed by the Admin SDK instead.

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

// The Firestore client SDK authorises with the *client* Firebase session, not
// the HttpOnly cookie. They normally agree, but the local session can be gone
// (cleared IndexedDB, private window) while the cookie is still valid. Failing
// loudly here beats an opaque permission-denied from a rule.
export function requireUid(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("unauthorized");
  return uid;
}
