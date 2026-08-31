"use client";

import { ArrowRight, Plus } from "lucide-react";
import { Deck } from "@/lib/data";
import { useStore } from "@/lib/store";
import { grotesk, mono, panel } from "../shared/ui";

export default function DeckIndex({ decks }: { decks: Deck[] }) {
  const openDeck = useStore((s) => s.openDeck);
  const openDeckModal = useStore((s) => s.openDeckModal);
  const decksError = useStore((s) => s.decksError);
  const decksPartial = useStore((s) => s.decksPartial);
  const loadDecks = useStore((s) => s.loadDecks);

  return (
    <div style={{ ...panel, overflow: "hidden" }}>
      {/* A failed load must not masquerade as an empty account. */}
      {decksError && (
        <div
          role="alert"
          style={{
            padding: "18px 22px",
            borderBottom: decks.length ? "1px solid var(--border)" : "none",
            background: "color-mix(in srgb, var(--bad) 8%, transparent)",
          }}
        >
          <div style={{ ...mono(12.5, 600), color: "var(--bad)" }}>Could not load decks</div>
          <div style={{ ...mono(12), color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
            {decksError}
          </div>
          <button
            onClick={() => void loadDecks()}
            style={{
              marginTop: 10,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
              ...mono(12, 600),
              cursor: "pointer",
            }}
          >
            retry
          </button>
        </div>
      )}

      {/* The decks themselves loaded; only their counts are missing. */}
      {!decksError && decksPartial && (
        <div
          role="status"
          style={{
            padding: "14px 22px",
            borderBottom: decks.length ? "1px solid var(--border)" : "none",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            ...mono(12),
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          Your decks loaded, but their word counts are temporarily unavailable. Nothing has been
          lost — open a deck to see its words, or{" "}
          <button
            onClick={() => void loadDecks()}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--accent)",
              ...mono(12, 600),
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            retry
          </button>
          .
        </div>
      )}

      {decks.length === 0 && !decksError && (
        <div style={{ padding: "26px 22px", textAlign: "center" }}>
          <div style={grotesk(17)}>No decks yet</div>
          <div style={{ ...mono(12), color: "var(--muted)", marginTop: 6 }}>
            Create your first deck, then add words.
          </div>
        </div>
      )}

      {decks.map((d, i) => {
        const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0;
        const hasStats = d.statsAvailable !== false;
        return (
          <button
            key={d.id}
            className="deck-row"
            onClick={() => openDeck(d.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              width: "100%",
              textAlign: "left",
              padding: "18px 22px",
              background: "none",
              border: "none",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            <span style={{ ...mono(12), color: "var(--faint)", width: 24 }}>
              {String(i + 1).padStart(2, "0")}
            </span>

            <div style={{ minWidth: 200, flex: "1 1 240px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={grotesk(16)}>{d.name}</span>
                <span
                  style={{
                    ...mono(10.5, 500),
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "2px 7px",
                    textTransform: "lowercase",
                  }}
                >
                  {d.level.toLowerCase()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{d.desc}</div>
            </div>

            <div className="deck-row-progress" style={{ width: 170 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={mono(12.5)}>{hasStats ? `${d.learned}/${d.total}` : "—/—"}</span>
                <span style={{ ...mono(11), color: "var(--faint)" }}>
                  {hasStats ? `${pct}%` : "count unavailable"}
                </span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  height: 3,
                  borderRadius: 3,
                  background: "var(--track)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: hasStats ? `${pct}%` : 0,
                    height: "100%",
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>

            <div style={{ width: 92, textAlign: "right" }}>
              {!hasStats ? (
                <span style={{ ...mono(12), color: "var(--faint)" }}>—</span>
              ) : d.due > 0 ? (
                <span style={{ ...mono(12), color: "var(--accent)" }}>{d.due} due</span>
              ) : (
                <span style={{ ...mono(12), color: "var(--faint)" }}>— done</span>
              )}
            </div>

            <span className="row-arrow" style={{ color: "var(--accent)", display: "inline-flex" }}>
              <ArrowRight size={16} />
            </span>
          </button>
        );
      })}

      <button
        onClick={openDeckModal}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "15px 22px",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--border)",
          ...mono(13, 500),
          color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        <Plus size={15} /> new deck
      </button>
    </div>
  );
}
