"use client";

import { useEffect } from "react";
import { ArrowRight, BookOpen, Flame, MessageCircle, Mic2, Plus, Target, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { getStreakVisual } from "@/lib/streak-ui";
import { Comment, ghostBtn, grotesk, mono, panel, solidBtn } from "../shared/ui";

const FLOW = [
  {
    icon: Plus,
    title: "Add words with AI",
    text: "Enter English, your own language, or describe the idea; the app suggests meaning, examples, synonyms and band.",
  },
  {
    icon: Target,
    title: "Quizzes that fit",
    text: "Take a standard quiz, or generate an AI quiz with the question count and formats you choose.",
  },
  {
    icon: Flame,
    title: "Keep your streak",
    text: "Finish your first flashcard or quiz session of the day to extend your streak.",
  },
];

export default function Dashboard() {
  const decks = useStore((s) => s.decks);
  const practiceStreak = useStore((s) => s.practiceStreak);
  const email = useStore((s) => s.email);
  const displayName = useStore((s) => s.displayName);
  const loadStats = useStore((s) => s.loadStats);
  const openAdd = useStore((s) => s.openAdd);
  const startStudy = useStore((s) => s.startStudy);
  const openStudyPicker = useStore((s) => s.openStudyPicker);
  const nav = useStore((s) => s.nav);
  const openDeck = useStore((s) => s.openDeck);

  const name = displayName || (email ? email.split("@")[0] : "there");
  const firstDeckId = decks[0]?.id;
  const featuredDecks = decks.slice(0, 3);
  const streak = practiceStreak?.streak ?? 0;
  const practicedToday = practiceStreak?.practicedToday ?? false;
  const streakStyle = getStreakVisual(streak, practicedToday);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const quickActions = [
    {
      icon: Plus,
      label: "Add words with AI",
      text: "Build vocabulary cards with meanings, IELTS examples, synonyms and usage context.",
      action: openAdd,
      primary: true,
    },
    {
      icon: BookOpen,
      label: "Open a deck",
      text: "Review your word list and edit the deck you are studying.",
      action: () => nav("decks"),
    },
    {
      icon: Zap,
      label: "Flashcard",
      text: "Review with SM-2, rate your recall, and extend your streak when you finish.",
      action: () => openStudyPicker("flashcard"),
    },
    {
      icon: Target,
      label: "Quiz",
      text: "Take an A-D quiz, or generate an advanced AI quiz in the formats you want.",
      action: () => openStudyPicker("quiz"),
    },
    {
      icon: MessageCircle,
      label: "Chat AI",
      text: "Practise building sentences and using words in conversation.",
      action: () => startStudy("chat", firstDeckId),
    },
    {
      icon: Mic2,
      label: "Speaking",
      text: "Build speaking reflexes with AI using short questions and deck vocabulary.",
      action: () => startStudy("speaking", firstDeckId),
    },
  ];

  return (
    <div className="app-container" style={{ padding: "34px 24px 80px" }}>
      <Comment>{"// your_page"}</Comment>

      <section
        className="personal-hero"
        style={{
          ...panel,
          marginTop: 16,
          padding: 28,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
          gap: 24,
          alignItems: "center",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--panelHi)), var(--panel))",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...mono(12), color: "var(--accent)" }}>Hi, {name}</span>
            {streak > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: `1px solid ${streakStyle.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  background: `linear-gradient(180deg, color-mix(in srgb, #fff 38%, ${streakStyle.bg}), ${streakStyle.bg})`,
                  color: streakStyle.fg,
                  transform: `scale(${streakStyle.scale})`,
                  transformOrigin: "left center",
                  boxShadow: `0 8px 22px -14px ${streakStyle.glow}, 0 1px 0 rgba(255,255,255,.72) inset`,
                  textShadow: "0 1px 0 rgba(255,255,255,.55)",
                  ...mono(11.5, 800),
                }}
                title={streakStyle.label}
              >
                <Flame size={14} fill="currentColor" strokeWidth={1.8} /> {streak}-day streak
              </span>
            )}
          </div>
          <h1 className="hero-title" style={{ ...grotesk(45), margin: "12px 0 0", lineHeight: 1.08 }}>
            What will you practise today to stay on pace?
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15.5, lineHeight: 1.6, margin: "14px 0 0", maxWidth: 620 }}>
            Add words with AI, review flashcards, take a standard or AI quiz, then use chat and speaking to turn new words into reflexes.
            Finish your first practice session of the day to extend your streak.
          </p>
          {streak > 0 && (
            <div style={{ ...mono(12), color: "var(--muted)", marginTop: 12 }}>
              {practicedToday
                ? `You kept your ${streak}-day streak today.`
                : `You are on a ${streak}-day streak. Finish a session today to keep it.`}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <button onClick={openAdd} className="solid-btn" style={{ ...solidBtn, padding: "11px 16px" }}>
              <Plus size={15} /> add words with AI
            </button>
            <button onClick={() => openStudyPicker("quiz")} className="ghost-btn" style={{ ...ghostBtn, padding: "11px 16px" }}>
              <Target size={15} /> go to quiz
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {FLOW.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              style={{
                display: "flex",
                gap: 12,
                padding: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--panelHi) 72%, transparent)",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--accent)",
                  color: "#fff",
                  flex: "none",
                }}
              >
                <Icon size={17} />
              </span>
              <div>
                <div style={grotesk(15)}>{title}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45, marginTop: 3 }}>{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <Comment>{"// quick_actions"}</Comment>
          <button onClick={() => nav("stats")} style={{ background: "none", border: "none", color: "var(--accent)", ...mono(12.5, 600), cursor: "pointer" }}>
            view stats <ArrowRight size={13} style={{ verticalAlign: "-2px" }} />
          </button>
        </div>

        <div
          className="quick-actions-grid"
          style={{
            display: "grid",
            gap: 12,
            marginTop: 14,
          }}
        >
          {quickActions.map(({ icon: Icon, label, text, action, primary }) => (
            <button
              key={label}
              onClick={() => action()}
              style={{
                ...panel,
                padding: 18,
                textAlign: "left",
                cursor: "pointer",
                background: primary ? "color-mix(in srgb, var(--accent) 12%, var(--panel))" : "var(--panel)",
                borderColor: primary ? "color-mix(in srgb, var(--accent) 48%, var(--border))" : "var(--border)",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panelHi)",
                  color: "var(--accent)",
                }}
              >
                <Icon size={16} />
              </span>
              <span style={{ display: "block", ...grotesk(16), marginTop: 14 }}>{label}</span>
              <span style={{ display: "block", color: "var(--muted)", fontSize: 13, lineHeight: 1.45, marginTop: 5 }}>
                {text}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <Comment>{"// recent_decks"}</Comment>
        <div style={{ ...panel, marginTop: 14, overflow: "hidden" }}>
          {featuredDecks.length > 0 ? (
            featuredDecks.map((deck, i) => (
              <button
                key={deck.id}
                onClick={() => openDeck(deck.id)}
                className="deck-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  width: "100%",
                  padding: "16px 18px",
                  border: "none",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>
                  <span style={{ display: "block", ...grotesk(16) }}>{deck.name}</span>
                  <span style={{ display: "block", color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
                    {deck.desc || `${deck.level.toLowerCase()} vocabulary`}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)", ...mono(12.5, 600) }}>
                  open deck <ArrowRight size={14} />
                </span>
              </button>
            ))
          ) : (
            <div style={{ padding: 22, textAlign: "center" }}>
              <div style={grotesk(17)}>You have no decks yet</div>
              <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
                Tap "add word" - the app creates your first deck when you save.
              </div>
              <button onClick={openAdd} className="solid-btn" style={{ ...solidBtn, marginTop: 16 }}>
                <Plus size={15} /> add your first word
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
