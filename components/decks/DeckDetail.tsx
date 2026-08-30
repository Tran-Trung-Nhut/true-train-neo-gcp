"use client";

import { ArrowLeft, Plus, Search, Zap, Target, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { statusMap, WordStatus } from "@/lib/data";
import { useStore } from "@/lib/store";
import { VOCABULARY_PAGE_SIZE, WORD_FILTERS } from "@/lib/vocabulary-config";
import { Comment, chipStyle, grotesk, iconBtn, mono, panel, solidBtn, ghostBtn } from "../shared/ui";
import Pagination from "../shared/Pagination";
import SpeakButton from "../shared/SpeakButton";

export default function DeckDetail() {
  const activeDeckId = useStore((s) => s.activeDeckId);
  const decks = useStore((s) => s.decks);
  const words = useStore((s) => s.deckWords);
  const loading = useStore((s) => s.deckWordsLoading);
  const wordsTotal = useStore((s) => s.deckWordsTotal);
  const page = useStore((s) => s.deckWordsPage);
  const wordFilter = useStore((s) => s.wordFilter);
  const deckSearch = useStore((s) => s.deckSearch);
  const set = useStore((s) => s.set);
  const loadDeckVocabularyPage = useStore((s) => s.loadDeckVocabularyPage);
  const nav = useStore((s) => s.nav);
  const startStudy = useStore((s) => s.startStudy);
  const openAdd = useStore((s) => s.openAdd);
  const openEdit = useStore((s) => s.openEdit);
  const deleteWord = useStore((s) => s.deleteWord);
  const deleteDeck = useStore((s) => s.deleteDeck);
  const updateDeckCategory = useStore((s) => s.updateDeckCategory);
  const [searchDraft, setSearchDraft] = useState(deckSearch);
  const tableRef = useRef<HTMLDivElement>(null);

  const deck = decks.find((d) => d.id === activeDeckId) || decks[0];
  const totalPages = Math.max(1, Math.ceil(wordsTotal / VOCABULARY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setSearchDraft(deckSearch);
  }, [activeDeckId, deckSearch]);

  useEffect(() => {
    if (searchDraft.trim() === deckSearch.trim()) return;

    const timer = window.setTimeout(() => {
      set("deckSearch", searchDraft);
      void loadDeckVocabularyPage({ page: 1, search: searchDraft, status: wordFilter });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [deckSearch, loadDeckVocabularyPage, searchDraft, set, wordFilter]);

  const changePage = (nextPage: number) => {
    void loadDeckVocabularyPage({ page: nextPage, search: searchDraft, status: wordFilter });
    window.requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (!deck) {
    return (
      <div className="app-container" style={{ padding: "40px 24px" }}>
        <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
      </div>
    );
  }

  const numbers = [
    { label: "total", value: deck.total, fg: "var(--text)" },
    { label: "learned", value: deck.learned, fg: "var(--ok)" },
    { label: "due", value: deck.due, fg: "var(--accent)" },
  ];

  return (
    <div className="app-container" style={{ padding: "30px 24px 80px" }}>
      <button
        onClick={() => nav("decks")}
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
        <ArrowLeft size={14} /> decks
      </button>

      <div
        style={{
          ...panel,
          marginTop: 16,
          padding: 24,
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--panelHi)), var(--panel))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
          <h1 style={grotesk(27)}>{deck.name}</h1>
          <div style={{ display: "flex", gap: 6 }} title="change deck category">
            {(["Academic", "General"] as const).map((lv) => {
              const on = deck.level === lv;
              return (
                <button
                  key={lv}
                  onClick={() => {
                    if (!on) void updateDeckCategory(deck.id, lv);
                  }}
                  style={{
                    ...mono(11, on ? 600 : 500),
                    cursor: on ? "default" : "pointer",
                    border: on ? "1px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "3px 9px",
                    background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel)",
                    color: on ? "var(--accent)" : "var(--faint)",
                  }}
                >
                  {lv.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "8px 0 0" }}>{deck.desc}</p>

        <div style={{ display: "flex", gap: 36, marginTop: 22, flexWrap: "wrap" }}>
          {numbers.map((n) => (
            <div key={n.label}>
              <div style={{ ...grotesk(26), color: n.fg }}>{n.value}</div>
              <div style={{ ...mono(11), color: "var(--faint)", marginTop: 3, textTransform: "uppercase" }}>
                {n.label}
              </div>
            </div>
          ))}
        </div>

        <div className="deck-actions" style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={() => startStudy("flashcard", deck.id)} className="solid-btn" style={solidBtn}>
            <Zap size={15} /> flashcard
          </button>
          <button onClick={() => startStudy("quiz", deck.id)} className="ghost-btn" style={ghostBtn}>
            <Target size={15} /> quiz
          </button>
          <button onClick={() => startStudy("chat", deck.id)} className="ghost-btn" style={ghostBtn}>
            <MessageCircle size={15} /> chat
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Delete the "${deck.name}" deck and all ${deck.total} words in it? This cannot be undone.`
                )
              )
                void deleteDeck(deck.id);
            }}
            className="ghost-btn"
            style={{ ...ghostBtn, marginLeft: "auto", color: "var(--bad)", borderColor: "var(--bad)" }}
            title="delete deck"
          >
            <Trash2 size={15} /> delete deck
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flex: "1 1 220px",
            padding: "9px 13px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--faint)",
          }}
        >
          <Search size={15} />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="search words..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--text)",
              ...mono(13, 500),
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {WORD_FILTERS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => {
                set("wordFilter", k);
                set("deckSearch", searchDraft);
                void loadDeckVocabularyPage({ page: 1, search: searchDraft, status: k });
              }}
              style={chipStyle(wordFilter === k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div ref={tableRef} style={{ ...panel, marginTop: 18, overflow: "hidden" }}>
        <div
          className="word-table-head"
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1.5fr 0.4fr 0.7fr 64px",
            gap: 14,
            padding: "13px 20px",
            borderBottom: "1px solid var(--border)",
            ...mono(10.5),
            color: "var(--faint)",
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          <span>word / phonetics</span>
          <span>definition</span>
          <span>band</span>
          <span>status</span>
          <span></span>
        </div>

        {loading && (
          <div style={{ padding: "16px 20px" }}>
            <div className="skeleton" style={{ height: 40 }} />
          </div>
        )}
        {!loading && wordsTotal === 0 && (
          <div style={{ padding: "26px 20px", textAlign: "center", ...mono(12.5), color: "var(--faint)" }}>
            no words yet - add your first one below
          </div>
        )}

        {!loading && words.map((w, i) => {
          const [txt, fg] = statusMap[w.status as WordStatus];
          return (
            <div
              key={w.id}
              className="word-row"
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1.5fr 0.4fr 0.7fr 64px",
                gap: 14,
                padding: "14px 20px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              <div className="word-main-cell" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <SpeakButton text={w.word} size={28} radius={8} iconSize={14} />
                <div>
                  <div style={grotesk(15)}>{w.word}</div>
                  <div style={{ ...mono(11.5), color: "var(--faint)", marginTop: 2 }}>
                    {[w.ipa, w.pos].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <div className="word-definition-cell" style={{ fontSize: 13.5, color: "var(--muted)" }}>{w.defOrigin || w.defEn}</div>
              <div className="word-band-cell" style={{ ...mono(12.5), color: "var(--accent)" }}>band {w.band}</div>
              <div className="word-status-cell" style={{ ...mono(12), color: fg }}>{txt}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(w)} aria-label={`edit ${w.word}`} title="edit" style={iconBtn(26, 7)}>
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete the word "${w.word}"?`)) void deleteWord(w.id);
                  }}
                  aria-label={`delete ${w.word}`}
                  title="delete"
                  style={iconBtn(26, 7)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {!loading && wordsTotal > 0 && (
          <Pagination
            page={safePage}
            pageSize={VOCABULARY_PAGE_SIZE}
            totalItems={wordsTotal}
            totalPages={totalPages}
            itemLabel="words"
            onPageChange={changePage}
          />
        )}

        <button
          onClick={openAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "14px 20px",
            background: "none",
            border: "none",
            borderTop: "1px solid var(--border)",
            ...mono(13, 500),
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> add a word to this deck
        </button>
      </div>
    </div>
  );
}
