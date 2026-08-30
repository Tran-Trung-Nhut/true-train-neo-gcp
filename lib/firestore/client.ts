"use client";

import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp, getFirebaseAuth } from "@/lib/firebase/client";

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

// The client SDK authorises with the browser session, not the HttpOnly cookie.
// The two can diverge (cleared IndexedDB, private window), so fail explicitly.
export function requireUid(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("unauthorized");
  return uid;
}
