"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BrainCircuit, CalendarCheck, MessageCircle, Mic2, Moon, Sparkles, Sun, Target, Zap } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  authErrorMessage,
  completeRedirectSignIn,
  sendEmailSignInLink,
  signInWithGoogle,
} from "@/lib/auth/client-actions";

const MONO = "var(--font-mono), monospace";
const GROTESK = "var(--font-grotesk), system-ui, sans-serif";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Stay on rhythm",
    text: "SM-2 flashcards and a practice streak keep you studying at a steady pace, without tracking a schedule yourself.",
  },
  {
    icon: Sparkles,
    title: "AI builds the context",
    text: "Enter English, your own language, or just describe the idea; AI suggests the meaning, an IELTS example, synonyms and usage nuance.",
  },
  {
    icon: Target,
    title: "Standard quiz + AI quiz",
    text: "Drill with A-D questions, or let AI generate a set in the count and formats you choose.",
  },
];

const LOGIN_NOTES = [
  "Synced to your account",
  "Flashcards, quiz, chat and speaking in one place",
  "Streak counts when you finish a practice session",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("light");

  const configured = isFirebaseConfigured();

  // Finishes a Google sign-in that fell back to a full-page redirect because
  // the browser blocked the popup.
  useEffect(() => {
    if (!configured) return;
    completeRedirectSignIn()
      .then((signedIn) => {
        if (signedIn) window.location.href = "/";
      })
      .catch(() => {});
  }, [configured]);

  async function sendLoginLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");
    try {
      await sendEmailSignInLink(email);
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setMessage(authErrorMessage(error, "Could not send the sign-in link."));
    }
  }

  async function continueWithGoogle() {
    setStatus("sending");
    setMessage("");
    try {
      await signInWithGoogle();
      window.location.href = "/";
    } catch (error) {
      setStatus("error");
      setMessage(authErrorMessage(error, "Google sign-in failed."));
    }
  }

  return (
    <div
      data-theme={theme}
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
      <div style={{ width: "100%", maxWidth: 1040 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="TRUETRAINNEO" width={30} height={30} priority style={{ height: 30, width: "auto" }} />
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>
              truetrainneo
              <span className="blink" style={{ color: "var(--accent)" }}>_</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="toggle theme"
            title={theme === "dark" ? "light mode" : "dark mode"}
            style={{
              marginLeft: "auto",
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <div
          className="login-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, 430px)",
            gap: 26,
            alignItems: "stretch",
            marginTop: 24,
          }}
        >
          <section
            className="login-card"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 28,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 12.5, color: "var(--accent)" }}>
              {"// ielts vocabulary cockpit"}
            </div>
            <h1
              className="login-title"
              style={{
                fontFamily: GROTESK,
                fontSize: 40,
                lineHeight: 1.03,
                fontWeight: 700,
                letterSpacing: 0,
                margin: "12px 0 0",
                maxWidth: 540,
              }}
            >
              Learn IELTS vocabulary with flashcards, AI quizzes and speaking practice.
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 15.5, lineHeight: 1.58, margin: "14px 0 0", maxWidth: 540 }}>
              TRUETRAINNEO brings your whole vocabulary workflow into one place: add words with AI, review SM-2 flashcards,
              take a standard or AI quiz, chat to build sentences, practise speaking, and keep your streak after every session.
            </p>

            <div style={{ display: "grid", gap: 8, marginTop: 22, maxWidth: 560 }}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  style={{
                    display: "flex",
                    gap: 13,
                    alignItems: "flex-start",
                    padding: "12px 0",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      border: "1px solid var(--borderHi)",
                      background: "var(--panelHi)",
                      color: "var(--accent)",
                      flex: "none",
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <span>
                    <span style={{ display: "block", fontFamily: GROTESK, fontSize: 16, fontWeight: 600 }}>{title}</span>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5, marginTop: 3 }}>
                      {text}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              {[
                [Zap, "flashcard"],
                [Target, "ai quiz"],
                [MessageCircle, "chat"],
                [Mic2, "speaking"],
                [CalendarCheck, "streak"],
              ].map(([Icon, label]) => {
                const TypedIcon = Icon as typeof Zap;
                return (
                  <span
                    key={label as string}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "8px 11px",
                      borderRadius: 9,
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      fontFamily: MONO,
                      fontSize: 12,
                    }}
                  >
                    <TypedIcon size={14} color="var(--accent)" /> {label as string}
                  </span>
                );
              })}
            </div>
          </section>

          <div
          className="login-card"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 12.5, color: "var(--accent)" }}>
            {"// sign in"}
          </div>
          <h1 style={{ fontFamily: GROTESK, fontSize: 24, fontWeight: 600, letterSpacing: 0, margin: "10px 0 0" }}>
            Start learning vocabulary
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>
            Sign in with Google, or get a sign-in link by email.
          </p>

          {!configured && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 9,
                border: "1px solid var(--bad)",
                background: "color-mix(in srgb, var(--bad) 10%, transparent)",
                fontFamily: MONO,
                fontSize: 12,
                color: "var(--bad)",
              }}
            >
              Firebase is not configured - add NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID and APP_ID to .env.local
            </div>
          )}

          {status === "sent" ? (
            <div
              style={{
                marginTop: 22,
                padding: 18,
                borderRadius: 8,
                border: "1px solid var(--ok)",
                background: "color-mix(in srgb, var(--ok) 10%, transparent)",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "var(--ok)" }}>
                &#10003; Sign-in email sent
              </div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                Check the inbox for <strong style={{ color: "var(--text)" }}>{email}</strong> and click the link in the email to sign in.
              </div>
              <button
                onClick={() => setStatus("idle")}
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontFamily: MONO,
                  fontSize: 12.5,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                &larr; use a different email
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={continueWithGoogle}
                disabled={!configured || status === "sending"}
                className="google-btn"
                style={{
                  width: "100%",
                  marginTop: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 11,
                  padding: "14px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--borderHi)",
                  background: "#fff",
                  color: "#1f2937",
                  fontFamily: GROTESK,
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: 0,
                  cursor: configured ? "pointer" : "default",
                  opacity: configured ? 1 : 0.6,
                  boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent), 0 8px 24px -10px color-mix(in srgb, var(--accent) 55%, transparent)",
                }}
              >
                <GoogleIcon size={20} /> Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 4px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--faint)" }}>or use email</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <form onSubmit={sendLoginLink} style={{ marginTop: 14 }}>
                <label style={{ fontFamily: MONO, fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>
                  email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  style={{
                    width: "100%",
                    marginTop: 7,
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
                  disabled={status === "sending" || !configured}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--panelHi)",
                    color: "var(--text)",
                    fontFamily: MONO,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: status === "sending" ? "default" : "pointer",
                    opacity: status === "sending" || !configured ? 0.6 : 1,
                  }}
                >
                  {status === "sending" ? "sending..." : "send sign-in link →"}
                </button>
              </form>

              {status === "error" && (
                <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 12, color: "var(--bad)" }}>
                  {message || "Something went wrong. Please try again."}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", display: "grid", gap: 10 }}>
            {LOGIN_NOTES.map((note) => (
              <div key={note} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 7,
                    background: "var(--accent)",
                    boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent)",
                    flex: "none",
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: "var(--muted)" }}>{note}</span>
              </div>
            ))}
          </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 12, marginTop: 18, fontFamily: MONO }}>
          powered by{" "}
          <a
            href="https://trantrungnhut.id.vn"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Trần Trung Nhựt
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3C39 35.6 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
