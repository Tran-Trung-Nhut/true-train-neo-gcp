"use client";

import { ArrowRight, Plus } from "lucide-react";
import { Deck } from "@/lib/data";
import { useStore } from "@/lib/store";
import { grotesk, mono, panel } from "../shared/ui";

export default function DeckIndex({ decks }: { decks: Deck[] }) {
  const openDeck = useStore((s) => s.openDeck);
  const openDeckModal = useStore((s) => s.openDeckModal);

  return (
    <div style={{ ...panel, overflow: "hidden" }}>
      {decks.length === 0 && (
        <div style={{ padding: "26px 22px", textAlign: "center" }}>
          <div style={grotesk(17)}>No decks yet</div>
          <div style={{ ...mono(12), color: "var(--muted)", marginTop: 6 }}>
            Create your first deck, then add words.
          </div>
        </div>
      )}

      {decks.map((d, i) => {
        const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0;
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
                <span style={mono(12.5)}>
                  {d.learned}/{d.total}
                </span>
                <span style={{ ...mono(11), color: "var(--faint)" }}>{pct}%</span>
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
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>

            <div style={{ width: 92, textAlign: "right" }}>
              {d.due > 0 ? (
                <span style={{ ...mono(12), color: "var(--accent)" }}>{d.due} due</span>
              ) : (
                <span style={{ ...mono(12), color: "var(--faint)" }}>— xong</span>
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
