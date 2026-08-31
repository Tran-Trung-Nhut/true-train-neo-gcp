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
  }
  await establishServerSession(credential.user);
}

export async function signOutEverywhere(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } finally {
    await signOut(getFirebaseAuth()).catch(() => {});
  }
}

export async function updateDisplayName(displayName: string): Promise<string> {
  const name = displayName.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) throw new Error("missing_display_name");

  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("unauthorized");

  await updateProfile(user, { displayName: name });

  await establishServerSession(user).catch(() => {});
  return name;
}
