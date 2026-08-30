"use client";

import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Comment, chipStyle, grotesk, mono } from "../shared/ui";
import DeckIndex from "./DeckIndex";

const FILTERS: [string, string][] = [
  ["all", "all"],
  ["academic", "academic"],
  ["general", "general"],
];

export default function Decks() {
  const deckFilter = useStore((s) => s.deckFilter);
  const allDecks = useStore((s) => s.decks);
  const set = useStore((s) => s.set);
  const openDeckModal = useStore((s) => s.openDeckModal);

  const decks = allDecks.filter(
    (d) =>
      deckFilter === "all" ||
      (deckFilter === "academic" && d.level === "Academic") ||
      (deckFilter === "general" && d.level === "General")
  );

  return (
    <div className="app-container" style={{ padding: "34px 24px 80px" }}>
      <Comment>{"// vocabulary_decks"}</Comment>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 14,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={grotesk(32)}>Vocabulary decks</h1>
        <button
          onClick={openDeckModal}
          className="ghost-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--muted)",
            ...mono(13, 500),
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> new deck
        </button>
      </div>

      <div style={{ display: "flex", gap: 9, marginTop: 22, flexWrap: "wrap" }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => set("deckFilter", k)} style={chipStyle(deckFilter === k)}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <DeckIndex decks={decks} />
      </div>
    </div>
  );
}
