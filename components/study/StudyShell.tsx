"use client";

import { ArrowLeft, Sun, Moon, Zap, Target, MessageCircle, Mic2 } from "lucide-react";
import { useStore, Screen } from "@/lib/store";
import { Logo, mono, sideTabStyle, panel } from "../shared/ui";
import Flashcard from "./Flashcard";
import Quiz from "./Quiz";
import Chat from "./Chat";
import SpeakingPractice from "./SpeakingPractice";

const TABS: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: "flashcard", label: "flashcard", icon: <Zap size={15} /> },
  { key: "quiz", label: "quiz", icon: <Target size={15} /> },
  { key: "chat", label: "chat", icon: <MessageCircle size={15} /> },
  { key: "speaking", label: "speak", icon: <Mic2 size={15} /> },
];

export default function StudyShell() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.theme);
  const activeDeckId = useStore((s) => s.activeDeckId);
  const decks = useStore((s) => s.decks);
  const studyCount = useStore((s) => s.studyCards.length);
  const nav = useStore((s) => s.nav);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const startStudy = useStore((s) => s.startStudy);

  const fcAgain = useStore((s) => s.fcAgain);
  const fcHard = useStore((s) => s.fcHard);
  const fcGood = useStore((s) => s.fcGood);
  const fcEasy = useStore((s) => s.fcEasy);

  const deck = decks.find((d) => d.id === activeDeckId) || decks[0];
  const reviewed = fcAgain + fcHard + fcGood + fcEasy;

  const ratingRows = [
    { label: "again", fg: "var(--bad)", count: fcAgain },
    { label: "hard", fg: "#C7891A", count: fcHard },
    { label: "good", fg: "var(--accent)", count: fcGood },
    { label: "easy", fg: "var(--ok)", count: fcEasy },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          height: 64,
          background: "var(--barBg)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadowSm)",
        }}
      >
        <div
          className="study-container"
          style={{ display: "flex", alignItems: "center", height: 64, gap: 14 }}
        >
          <button
            onClick={() => nav("dashboard")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              ...mono(12.5),
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> exit
          </button>

          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <Logo size={20} />
            <span style={{ ...mono(12.5), color: "var(--muted)" }}>
              {deck?.name ?? ""} / {screen}
            </span>
          </div>

          <button
            aria-label="theme"
            onClick={toggleTheme}
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div
        className="study-container study-shell"
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 28,
          padding: "30px 24px 70px",
          alignItems: "start",
        }}
      >
        <aside className="study-sidebar" style={{ position: "sticky", top: 86, width: 240 }}>
          <div style={{ ...mono(11.5), color: "var(--accent)", marginBottom: 10 }}>{"// mode"}</div>
          <div className="sidebar-tabs" style={{ ...panel, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => startStudy(t.key, activeDeckId)}
                style={sideTabStyle(screen === t.key)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {screen === "flashcard" && (
            <div className="session-card" style={{ ...panel, marginTop: 26, padding: 18 }}>
              <div style={{ ...mono(11.5), color: "var(--accent)", marginBottom: 12 }}>{"// this session"}</div>
              <div style={{ ...mono(12.5), color: "var(--muted)" }}>reviewed {reviewed}/{studyCount}</div>
              <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {ratingRows.map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ ...mono(12.5), color: r.fg }}>{r.label}</span>
                    <span style={{ ...mono(12.5), color: "var(--muted)" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="study-main" style={{ minWidth: 0 }}>
          {screen === "flashcard" && <Flashcard />}
          {screen === "quiz" && <Quiz />}
          {screen === "chat" && <Chat />}
          {screen === "speaking" && <SpeakingPractice />}
        </main>
      </div>
    </div>
  );
}
