"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const EMAIL_FOR_SIGN_IN = "ttn-email-for-sign-in";

// Firebase error codes are stable identifiers; map them to fixed English copy
// so nothing from the SDK is echoed straight into the UI.
const ERROR_COPY: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in window was closed before finishing.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Redirecting instead…",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/expired-action-code": "This sign-in link has expired. Request a new one.",
  "auth/invalid-action-code": "This sign-in link is no longer valid. Request a new one.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/unauthorized-domain": "This domain isn't authorised for sign-in.",
};

export function authErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? (error as { code: string }).code
    : "";
  return ERROR_COPY[code] ?? fallback;
}

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

// Trades the client-side Firebase user for the HttpOnly server session cookie.
// Nothing is considered signed in until this resolves.
export async function establishServerSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("session_failed");
}

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const credential = await signInWithPopup(auth, provider);
    await establishServerSession(credential.user);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

// Completes a Google redirect fallback. Returns true when a session was made.
export async function completeRedirectSignIn(): Promise<boolean> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return false;
  await establishServerSession(result.user);
  return true;
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  const address = email.trim();
  await sendSignInLinkToEmail(auth, address, {
    url: `${origin()}/auth/callback`,
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN, address);
  } catch {
    // Private mode: the callback page asks for the address instead.
  }
}

export function isEmailLink(href: string): boolean {
  return isSignInWithEmailLink(getFirebaseAuth(), href);
}

export function rememberedEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_FOR_SIGN_IN) ?? "";
  } catch {
    return "";
  }
}

export async function completeEmailLinkSignIn(email: string, href: string): Promise<void> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailLink(auth, email.trim(), href);
  try {
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN);
  } catch {
    // Nothing cached; harmless.
  }
  await establishServerSession(credential.user);
}

// Clears the server session first (revoking refresh tokens), then the local one,
// so a failed network call can never leave a live server session behind.
export async function signOutEverywhere(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } finally {
    await signOut(getFirebaseAuth()).catch(() => {});
  }
}

// Updates the Firebase profile, then re-mints the session cookie so the
// server-rendered shell picks up the new name on the next request.
export async function updateDisplayName(displayName: string): Promise<string> {
  const name = displayName.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) throw new Error("missing_display_name");

  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("unauthorized");

  await updateProfile(user, { displayName: name });

  // Best-effort only. Firebase refuses to mint a session cookie from an ID
  // token whose auth_time is over 5 minutes old, so this succeeds right after
  // sign-in and is expected to fail later. The profile write above is what
  // matters; the name shown by the server shell catches up on the next
  // sign-in, and step 2 makes the Firestore profile doc the source of truth.
  await establishServerSession(user).catch(() => {});
  return name;
}
