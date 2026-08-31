"use client";

import { useEffect } from "react";
import { BookOpen, Target, X, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { STUDY_PICKER_MODES, type StudyPickerMode } from "@/lib/study-config";
import { chipStyle, ghostBtn, grotesk, mono, panel } from "../shared/ui";

const MODE_LABEL: Record<StudyPickerMode, string> = {
  flashcard: "flashcards",
  quiz: "quiz",
};

export default function StudyDeckPicker() {
  const mode = useStore((s) => s.studyPickerMode);
  const decks = useStore((s) => s.decks);
  const decksLoading = useStore((s) => s.decksLoading);
  const close = useStore((s) => s.closeStudyPicker);
  const startStudy = useStore((s) => s.startStudy);
  const setState = useStore((s) => s.set);
  const nav = useStore((s) => s.nav);

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, close]);

  if (!mode) return null;

  const isQuiz = mode === "quiz";
  const ModeIcon = isQuiz ? Target : Zap;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a deck to ${isQuiz ? "quiz" : "review with flashcards"}`}
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 85,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,.58)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ ...panel, width: "min(620px, 100%)", maxHeight: "min(720px, calc(100vh - 36px))", overflow: "auto", padding: 22, boxShadow: "var(--shadowMd)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
                background: "color-mix(in srgb, var(--accent) 9%, var(--panel))",
              }}
            >
              <ModeIcon size={19} />
            </span>
            <div>
              <div style={{ ...mono(11), color: "var(--accent)", textTransform: "uppercase" }}>
                {isQuiz ? "standard quiz" : "SM-2 flashcards"}
              </div>
              <h2 style={{ ...grotesk(23), margin: "4px 0 0" }}>Which deck do you want to study?</h2>
              {decksLoading && <div style={{ ...mono(11), color: "var(--muted)", marginTop: 4 }}>updating your review schedule...</div>}
              <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                {STUDY_PICKER_MODES.map((key) => (
                  <button
                    key={key}
                    onClick={() => setState("studyPickerMode", key)}
                    style={{ ...chipStyle(mode === key), padding: "6px 11px", fontSize: 11.5 }}
                  >
                    {MODE_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            aria-label="close"
            onClick={close}
            style={{
              width: 34,
              height: 34,
              flex: "none",
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {decks.length > 0 ? (
          <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
            {decks.map((deck) => {
              const due = deck.due > 0;
              // A deck with nothing due is still practisable ahead of schedule.
              // Only a genuinely empty deck has nothing to show.
              const empty = deck.total === 0;
              return (
                <button
                  key={deck.id}
                  disabled={empty || decksLoading}
                  onClick={() => {
                    close();
                    void startStudy(mode, deck.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    width: "100%",
                    padding: "14px 15px",
                    textAlign: "left",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: due ? "var(--panelHi)" : "var(--panel)",
                    color: "var(--text)",
                    cursor: !empty && !decksLoading ? "pointer" : "default",
                    opacity: !empty && !decksLoading ? 1 : 0.62,
                  }}
                >
                  <span style={{ color: due ? "var(--accent)" : "var(--faint)", display: "inline-flex" }}>
                    <BookOpen size={18} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...grotesk(16), display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {deck.name}
                    </span>
                    <span style={{ ...mono(11.5), color: "var(--muted)", display: "block", marginTop: 3 }}>
                      {empty
                        ? "no words yet - add some first"
                        : due
                          ? `${deck.total} words - ${deck.learned} learned`
                          : `${deck.total} words - practise ahead of schedule`}
                    </span>
                  </span>
                  <span
                    style={{
                      ...mono(11.5, 600),
                      flex: "none",
                      padding: "5px 8px",
                      borderRadius: 6,
                      color: due ? "var(--accent)" : "var(--muted)",
                      background: due ? "color-mix(in srgb, var(--accent) 10%, var(--panel))" : "var(--track)",
                    }}
                  >
                    {empty ? "empty" : due ? `${deck.due} due` : "done for today"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "38px 10px 18px" }}>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>You have no decks to practise with yet.</p>
            <button
              onClick={() => {
                close();
                nav("decks");
              }}
              className="ghost-btn"
              style={{ ...ghostBtn, marginTop: 14 }}
            >
              open deck list
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
