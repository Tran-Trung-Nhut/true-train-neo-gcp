"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export type AuthReadyState = "pending" | "ready" | "signed-out";

// The server gate trusts the HttpOnly session cookie; the Firestore client SDK
// trusts the browser's own Firebase session. They normally agree, but the local
// session can be missing (cleared storage, a private window) while the cookie
// is still valid — and every client query would then fail with an opaque
// permission-denied. Waiting for the real auth state here turns that into a
// clean redirect back to sign-in.
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
