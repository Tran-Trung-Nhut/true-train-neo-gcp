"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export type AuthReadyState = "pending" | "ready" | "signed-out";

// The server gate trusts the session cookie; the Firestore client SDK trusts
// the browser session. When they diverge, redirect instead of letting every
// client query fail with an opaque permission-denied.
export function useAuthReady(): AuthReadyState {
  const [state, setState] = useState<AuthReadyState>("pending");

  useEffect(() => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch {
      setState("signed-out");
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setState(user ? "ready" : "signed-out");
    });
  }, []);

  return state;
}
