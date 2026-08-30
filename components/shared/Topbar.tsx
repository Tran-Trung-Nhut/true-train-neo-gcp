"use client";

import { useState } from "react";
import { BarChart3, BookOpen, Dumbbell, GraduationCap, LayoutDashboard, Menu, Moon, Plus, Settings2, Sun } from "lucide-react";
import { useStore, Screen } from "@/lib/store";
import { Logo, Wordmark, mono, iconBtn } from "./ui";

const NAV: { key: Screen; label: string; match: Screen[]; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "your page", match: ["dashboard"], icon: <LayoutDashboard size={15} /> },
  { key: "decks", label: "decks", match: ["decks", "deck-detail"], icon: <BookOpen size={15} /> },
  { key: "flashcard", label: "practice", match: ["flashcard", "quiz", "chat", "speaking"], icon: <Dumbbell size={15} /> },
  { key: "ielts", label: "IELTS", match: ["ielts", "writing"], icon: <GraduationCap size={15} /> },
  { key: "stats", label: "stats", match: ["stats"], icon: <BarChart3 size={15} /> },
];

export default function Topbar() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.theme);
  const nav = useStore((s) => s.nav);
  const openStudyPicker = useStore((s) => s.openStudyPicker);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const openAdd = useStore((s) => s.openAdd);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (key: Screen) => {
    setMenuOpen(false);
    if (key === "flashcard") openStudyPicker("flashcard");
    else nav(key);
  };

  const navBtn = (label: string, icon: React.ReactNode, on: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: 38,
        padding: "0 12px",
        background: on ? "color-mix(in srgb, var(--accent) 12%, var(--panel))" : "transparent",
        border: on ? "1px solid color-mix(in srgb, var(--accent) 36%, var(--border))" : "1px solid transparent",
        borderRadius: 8,
        ...mono(12.5, 600),
        cursor: "pointer",
        color: on ? "var(--accent)" : "var(--muted)",
        transition: "color .15s, background .15s, border-color .15s",
      }}
    >
      {icon}
      {label}
    </button>
  );


  return (
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
        className="app-container"
        style={{ display: "flex", alignItems: "center", height: 64, gap: 18 }}
      >
        <button
          onClick={() => go("dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Logo size={26} />
          <Wordmark />
        </button>

        <nav className="topbar-nav desktop-nav" style={{ gap: 4 }}>
          {NAV.map((n) => navBtn(n.label, n.icon, n.match.includes(screen), () => go(n.key)))}
        </nav>

        <div style={{ flex: 1 }} />

        <button aria-label="theme" onClick={toggleTheme} style={iconBtn(36)}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={16} />}
        </button>

        <button
          onClick={openAdd}
          className="solid-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 13px",
            borderRadius: 8,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "#fff",
            ...mono(13, 500),
            cursor: "pointer",
            boxShadow: "var(--shadowAccent)",
          }}
        >
          <Plus size={15} />
          <span className="topbar-add-label">add word</span>
        </button>

        <button
          aria-label="settings"
          onClick={() => go("settings")}
          style={iconBtn(36)}
        >
          <Settings2 size={16} />
        </button>

        <button
          aria-label="menu"
          className="mobile-only"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          <Menu size={17} />
        </button>
      </div>

      {menuOpen && (
        <nav
          className="mobile-only"
          style={{
            flexDirection: "column",
            background: "var(--panel)",
            borderBottom: "1px solid var(--border)",
            padding: "8px 16px 14px",
            gap: 2,
          }}
        >
          {NAV.map((n) => {
            const on = n.match.includes(screen);
            return (
              <button
                key={n.key}
                onClick={() => go(n.key)}
                style={{
                  textAlign: "left",
                  padding: "11px 10px",
                  borderRadius: 8,
                  border: on ? "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))" : "1px solid transparent",
                  background: on
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : "transparent",
                  color: on ? "var(--accent)" : "var(--muted)",
                  ...mono(14, 500),
                  cursor: "pointer",
                }}
              >
                {on ? "/ " : ""}
                {n.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
