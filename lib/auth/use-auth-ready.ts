"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export type AuthReadyState = "pending" | "ready" | "signed-out";

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
