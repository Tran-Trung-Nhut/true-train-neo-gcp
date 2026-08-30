"use client";

import { useCallback, useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  authErrorMessage,
  completeEmailLinkSignIn,
  isEmailLink,
  rememberedEmail,
} from "@/lib/auth/client-actions";
import { safeNextPath } from "@/lib/auth/paths";

const MONO = "var(--font-mono), monospace";
const GROTESK = "var(--font-grotesk), system-ui, sans-serif";

type Phase = "working" | "need-email" | "error" | "done";

// Handles the passwordless email sign-in link. The link is opened by the user,
// so this must run in the browser: the one-time code lives in the URL fragment
// and query, which the server never sees.
export default function AuthCompletePage() {
  const [phase, setPhase] = useState<Phase>("working");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const finish = useCallback(async (address: string) => {
    setPhase("working");
    setMessage("");
    try {
      await completeEmailLinkSignIn(address, window.location.href);
      setPhase("done");
      const params = new URLSearchParams(window.location.search);
      window.location.href = safeNextPath(params.get("next"), "/");
    } catch (error) {
      setPhase("error");
      setMessage(authErrorMessage(error, "This sign-in link could not be verified."));
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setPhase("error");
      setMessage("Firebase is not configured on this deployment.");
      return;
    }
    if (!isEmailLink(window.location.href)) {
      setPhase("error");
      setMessage("This page only opens a sign-in link from your email.");
      return;
    }
    // The address is cached at request time. If the link is opened in another
    // browser (or private mode), Firebase requires the user to confirm it.
    const cached = rememberedEmail();
    if (cached) {
      void finish(cached);
    } else {
      setPhase("need-email");
    }
  }, [finish]);

  return (
    <div
      data-theme="light"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 28,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 12.5, color: "var(--accent)" }}>{"// sign in"}</div>

        {phase === "working" && (
          <>
            <h1 style={{ fontFamily: GROTESK, fontSize: 22, fontWeight: 600, margin: "10px 0 0" }}>
              Signing you in...
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>
              Verifying your sign-in link. This only takes a moment.
            </p>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 style={{ fontFamily: GROTESK, fontSize: 22, fontWeight: 600, margin: "10px 0 0" }}>
              Signed in
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>Taking you to your dashboard...</p>
          </>
        )}

        {phase === "need-email" && (
          <>
            <h1 style={{ fontFamily: GROTESK, fontSize: 22, fontWeight: 600, margin: "10px 0 0" }}>
              Confirm your email
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>
              You opened this link in a different browser. Enter the address you requested it with.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) void finish(email);
              }}
              style={{ marginTop: 18 }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panelHi)",
                  color: "var(--text)",
                  fontFamily: MONO,
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "#fff",
                  fontFamily: MONO,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                continue &rarr;
              </button>
            </form>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 style={{ fontFamily: GROTESK, fontSize: 22, fontWeight: 600, margin: "10px 0 0" }}>
              Could not sign you in
            </h1>
            <p style={{ color: "var(--bad)", fontFamily: MONO, fontSize: 12.5, margin: "10px 0 0" }}>{message}</p>
            <a
              href="/login"
              style={{
                display: "inline-block",
                marginTop: 18,
                color: "var(--accent)",
                fontFamily: MONO,
                fontSize: 12.5,
                textDecoration: "none",
              }}
            >
              &larr; back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
