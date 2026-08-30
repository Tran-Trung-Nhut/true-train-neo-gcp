"use client";

import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { getRatingPreview, Rating } from "@/lib/sm2";
import type { RateLevel } from "@/lib/study-config";
import { grotesk, mono, panel, solidBtn, ghostBtn } from "../shared/ui";
import SpeakButton from "../shared/SpeakButton";
import PracticeStreakModal from "./PracticeStreakModal";

const RATE_BTNS: { key: string; label: string; level: RateLevel; rating: Rating; fg: string }[] = [
  { key: "1", label: "again", level: "again", rating: 1, fg: "var(--bad)" },
  { key: "2", label: "hard", level: "hard", rating: 2, fg: "#C7891A" },
  { key: "3", label: "good", level: "good", rating: 3, fg: "var(--accent)" },
  { key: "4", label: "easy", level: "easy", rating: 4, fg: "var(--ok)" },
];

export default function Flashcard() {
  const studyCards = useStore((s) => s.studyCards);
  const studyLoading = useStore((s) => s.studyLoading);
  const fcIndex = useStore((s) => s.fcIndex);
  const fcFlipped = useStore((s) => s.fcFlipped);
  const fcDone = useStore((s) => s.fcDone);
  const fcGood = useStore((s) => s.fcGood);
  const fcEasy = useStore((s) => s.fcEasy);
  const fcRatingPending = useStore((s) => s.fcRatingPending);
  const showIpaFront = useStore((s) => s.showIpaFront);
  const showOriginBack = useStore((s) => s.showOriginBack);
  const flip = useStore((s) => s.flip);
  const rate = useStore((s) => s.rate);
  const restartFc = useStore((s) => s.restartFc);
  const openStudyPicker = useStore((s) => s.openStudyPicker);
  const nav = useStore((s) => s.nav);
  const activeDeckId = useStore((s) => s.activeDeckId);
  const deckTotal = useStore((s) => s.decks.find((deck) => deck.id === activeDeckId)?.total ?? 0);

  const words = studyCards;
  const total = words.length;
  const card = words[fcIndex] || words[0];
  const progress = total ? Math.round(((fcIndex + 1) / total) * 100) : 0;

  if (studyLoading) {
    return (
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: "50px 0" }}>
        <div style={{ ...panel, padding: "36px 30px", textAlign: "center", maxWidth: 400 }}>
          <p style={{ color: "var(--muted)", fontSize: 14.5 }}>
            {deckTotal > 0 ? "No new or due cards left in this deck today." : "This deck has no words to review yet."}
          </p>
          <button onClick={() => openStudyPicker("flashcard")} className="ghost-btn" style={{ ...ghostBtn, marginTop: 16 }}>
            choose another deck
          </button>
        </div>
      </div>
    );
  }

  if (fcDone) {
    return (
      <>
        <div style={{ display: "grid", placeItems: "center", padding: "40px 0" }}>
          <div style={{ ...panel, padding: "40px 36px", textAlign: "center", maxWidth: 420 }}>
            <span style={{ color: "var(--ok)", display: "inline-flex" }}>
              <CheckCircle2 size={44} strokeWidth={1.6} />
            </span>
            <h2 style={{ ...grotesk(24), marginTop: 16 }}>Session complete!</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
              You reviewed {total} words - {fcGood + fcEasy} recalled well
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
              <button onClick={restartFc} className="solid-btn" style={solidBtn}>
                check due cards
              </button>
              <button onClick={() => nav("dashboard")} className="ghost-btn" style={ghostBtn}>
                back to dashboard
              </button>
            </div>
          </div>
        </div>
        <PracticeStreakModal />
      </>
    );
  }

  return (
    <div style={{ maxWidth: 660, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            ...mono(11.5, 500),
            color: "var(--accent)",
            border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
            borderRadius: 6,
            padding: "4px 9px",
          }}
        >
          band {card.band}
        </span>
        <span style={{ ...mono(12.5), color: "var(--muted)" }}>
          {fcIndex + 1} / {total}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 5, background: "var(--track)", overflow: "hidden", marginTop: 14 }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)" }} />
      </div>

      <div className="flip-scene" style={{ marginTop: 18 }}>
        <div
          className="flip-inner"
          onClick={flip}
          style={{
            transform: fcFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: 340,
            cursor: "pointer",
          }}
        >
          <div
            className="flip-face"
            style={{
              ...panel,
              border: "1px solid var(--borderHi)",
              borderRadius: 8,
              minHeight: 340,
              display: "grid",
              placeItems: "center",
              padding: 30,
              textAlign: "center",
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 9%, var(--panelHi)), var(--panel))",
            }}
          >
            <div>
              <div className="fc-word" style={grotesk(50)}>
                {card.word}
              </div>
              {showIpaFront && (
                <div style={{ ...mono(14), color: "var(--muted)", marginTop: 12 }}>
                  {[card.ipa, card.pos].filter(Boolean).join(" · ")}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <SpeakButton text={card.word} size={38} radius={11} iconSize={18} />
              </div>
              <div style={{ ...mono(11.5), color: "var(--faint)", marginTop: 18 }}>
                [ space ] to reveal the meaning
              </div>
            </div>
          </div>

          <div
            className="flip-face flip-back"
            style={{
              ...panel,
              border: "1px solid var(--borderHi)",
              borderRadius: 8,
              minHeight: 340,
              padding: 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={grotesk(28)}>{card.word}</span>
              <SpeakButton text={card.word} size={28} radius={8} iconSize={15} />
              <span style={{ ...mono(12.5), color: "var(--muted)" }}>{card.ipa}</span>
              <span style={{ ...mono(11.5), color: "var(--faint)" }}>{card.pos}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 16 }}>{card.defEn}</div>
            {showOriginBack && (
              <div style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 5 }}>{card.defOrigin}</div>
            )}
            <div style={{ fontSize: 14, fontStyle: "italic", color: "var(--muted)", marginTop: 16 }}>
              “{card.exEn}”
            </div>
            <div style={{ ...mono(12.5), marginTop: 16, color: "var(--faint)" }}>
              syn:{" "}
              <span style={{ color: "var(--accent)" }}>{card.syns}</span>
            </div>
          </div>
        </div>
      </div>

      {fcFlipped ? (
        <div
          className="quiz-options"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 20 }}
        >
          {RATE_BTNS.map((b) => (
            <button
              key={b.key}
              onClick={() => rate(b.level)}
              disabled={fcRatingPending}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "13px 8px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                color: "var(--text)",
                cursor: fcRatingPending ? "default" : "pointer",
                opacity: fcRatingPending ? 0.65 : 1,
                transition: "all .15s",
              }}
            >
              <span style={{ ...mono(11), color: "var(--faint)" }}>[{b.key}]</span>
              <span style={{ ...grotesk(16), color: b.fg }}>{b.label}</span>
              <span style={{ ...mono(10.5), color: "var(--faint)" }}>
                {getRatingPreview({
                  ease_factor: card.easeFactor,
                  interval_days: card.intervalDays,
                  repetitions: card.repetitions,
                  due_date: new Date(),
                }, b.rating)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20, ...mono(11.5), color: "var(--faint)" }}>
          [ space ] flip / [ 1-4 ] rate
        </div>
      )}
    </div>
  );
}
