"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuthReady } from "@/lib/auth/use-auth-ready";
import Topbar from "@/components/shared/Topbar";
import Dashboard from "@/components/dashboard/Dashboard";
import Stats from "@/components/dashboard/Stats";
import Decks from "@/components/decks/Decks";
import DeckDetail from "@/components/decks/DeckDetail";
import Settings from "@/components/settings/Settings";
import StudyShell from "@/components/study/StudyShell";
import StudyDeckPicker from "@/components/study/StudyDeckPicker";
import AddWord from "@/components/addword/AddWord";
import CreateDeck from "@/components/decks/CreateDeck";
import IeltsHub from "@/components/ielts/IeltsHub";
import Writing from "@/components/ielts/Writing";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { mono } from "@/components/shared/ui";

const STUDY_SCREENS = ["flashcard", "quiz", "chat", "speaking"];

export default function AppRoot({ email, displayName }: { email: string; displayName: string }) {
  const theme = useStore((s) => s.theme);
  const screen = useStore((s) => s.screen);
  const setIdentity = useStore((s) => s.setIdentity);
  const loadDecks = useStore((s) => s.loadDecks);
  const loadSettings = useStore((s) => s.loadSettings);
  const [booting, setBooting] = useState(true);
  const authState = useAuthReady();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Data loading waits for the browser Firebase session, because the Firestore
  // client SDK authorises with that, not with the server session cookie.
  useEffect(() => {
    if (authState === "pending") return;
    if (authState === "signed-out") {
      window.location.href = "/login";
      return;
    }
    setIdentity(email, displayName);
    (async () => {
      await Promise.all([loadDecks(), loadSettings()]);
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (s.screen === "flashcard" && !s.fcDone && !s.fcRatingPending) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          s.flip();
        } else if (s.fcFlipped && ["1", "2", "3", "4"].includes(e.key)) {
          void s.rate((["again", "hard", "good", "easy"] as const)[+e.key - 1]);
        }
      } else if (s.screen === "quiz" && !s.qDone && !s.qReviewPending) {
        if (!s.qAnswered) {
          const a = "abcd".indexOf(e.key.toLowerCase());
          const n = "1234".indexOf(e.key);
          if (a >= 0) void s.quizPick(a);
          else if (n >= 0) void s.quizPick(n);
        } else if (e.key === "Enter") {
          s.quizNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isStudy = STUDY_SCREENS.includes(screen);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {isStudy ? (
        <StudyShell />
      ) : (
        <>
          <Topbar />
          {booting && screen === "dashboard" ? (
            <BootSkeleton />
          ) : (
            <>
              {screen === "dashboard" && <Dashboard />}
              {screen === "decks" && <Decks />}
              {screen === "deck-detail" && <DeckDetail />}
              {screen === "stats" && <Stats />}
              {screen === "settings" && <Settings />}
              {screen === "ielts" && <IeltsHub />}
              {screen === "writing" && <Writing />}
            </>
          )}
        </>
      )}

      <AddWord />
      <CreateDeck />
      <StudyDeckPicker />
      <Toast />
    </div>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => clearToast(toast.id), 3200);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  const tone = toast.tone === "error" ? "var(--bad)" : toast.tone === "info" ? "var(--accent)" : "var(--ok)";
  const Icon = toast.tone === "error" ? XCircle : toast.tone === "info" ? Info : CheckCircle2;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "min(360px, calc(100vw - 40px))",
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid color-mix(in srgb, ${tone} 45%, var(--border))`,
        background: "var(--panel)",
        color: "var(--text)",
        boxShadow: "var(--shadowMd)",
        animation: "fadeIn .16s ease",
      }}
    >
      <span style={{ color: tone, display: "inline-flex", flex: "none" }}>
        <Icon size={17} />
      </span>
      <span style={{ ...mono(12.5, 600), lineHeight: 1.45 }}>{toast.text}</span>
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="app-container" style={{ padding: "40px 24px" }}>
      <div className="skeleton" style={{ height: 20, width: 280 }} />
      <div className="skeleton" style={{ height: 52, width: 360, marginTop: 20 }} />
      <div className="skeleton" style={{ height: 110, marginTop: 28, borderRadius: 14 }} />
      <div className="skeleton" style={{ height: 90, marginTop: 18, borderRadius: 14 }} />
      <div className="skeleton" style={{ height: 240, marginTop: 28, borderRadius: 14 }} />
    </div>
  );
}
