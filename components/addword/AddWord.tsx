"use client";

import { X, Zap } from "lucide-react";
import { type EnrichChoice, useStore } from "@/lib/store";
import { grotesk, mono, solidBtn, ghostBtn } from "../shared/ui";
import SpeakButton from "../shared/SpeakButton";
import { ChoiceGroup, Field, ModeButton, PartOfSpeechChips } from "./AddWordControls";
import DeckSelect from "./DeckSelect";
import { emptyEnrichResult, formatSenseBody, mergeEnrichChoice } from "./add-word-utils";

export default function AddWord() {
  const addOpen = useStore((s) => s.addOpen);
  const addWord = useStore((s) => s.addWord);
  const enrichMode = useStore((s) => s.enrichMode);
  const enriching = useStore((s) => s.enriching);
  const enriched = useStore((s) => s.enriched);
  const enrichResult = useStore((s) => s.enrichResult);
  const enrichNote = useStore((s) => s.enrichNote);
  const enrichSuggestion = useStore((s) => s.enrichSuggestion);
  const saving = useStore((s) => s.saving);
  const saveError = useStore((s) => s.saveError);
  const editWordId = useStore((s) => s.editWordId);
  const isEdit = !!editWordId;
  const decks = useStore((s) => s.decks);
  const editDeckId = useStore((s) => s.editDeckId);
  const set = useStore((s) => s.set);
  const closeAdd = useStore((s) => s.closeAdd);
  const doEnrich = useStore((s) => s.doEnrich);
  const saveWord = useStore((s) => s.saveWord);

  if (!addOpen) return null;

  const r = enrichResult;
  const update = (patch: Partial<NonNullable<typeof enrichResult>>) =>
    set("enrichResult", { ...emptyEnrichResult(r), ...patch });
  const applyChoice = (choice: EnrichChoice) => {
    const next = mergeEnrichChoice(emptyEnrichResult(r), choice);
    set("enrichResult", next);
    if (choice.word?.trim()) set("addWord", choice.word.trim());
  };
  const setMode = (mode: typeof enrichMode) => {
    set("enrichMode", mode);
    set("enrichNote", "");
    set("enrichSuggestion", "");
  };
  const isAiMode = enrichMode === "ai";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={closeAdd} style={{ position: "absolute", inset: 0, background: "rgba(4,7,13,.55)", animation: "fadeIn .2s ease" }} />

      <div
        className="add-slideover"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          background: "var(--bg)",
          borderLeft: "1px solid var(--borderHi)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight .28s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <div>
            <h2 style={grotesk(19)}>{isEdit ? "Edit word" : "Add a word"}</h2>
            <div style={{ ...mono(11), color: "var(--muted)", marginTop: 3 }}>
              {isEdit
                ? "edit your word"
                : decks.length === 0
                  ? "A deck will be created for you automatically"
                  : "Choose a deck for this word"}
            </div>
          </div>
          <button
            onClick={closeAdd}
            aria-label="close"
            style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panelHi)", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {decks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...mono(10.5, 500), color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0 }}>
                {isEdit ? "deck (move to another deck)" : "deck"}
              </div>
              <div style={{ marginTop: 6 }}>
                <DeckSelect decks={decks} value={editDeckId} onChange={(id) => set("editDeckId", id)} />
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              padding: 4,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              marginBottom: 10,
            }}
          >
            <ModeButton active={!isAiMode} onClick={() => setMode("dictionary")}>
              English word
            </ModeButton>
            <ModeButton active={isAiMode} accent onClick={() => setMode("ai")}>
              <Zap size={13} /> AI mode
            </ModeButton>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={addWord}
              onChange={(e) => set("addWord", e.target.value)}
              placeholder={isAiMode ? "type in your language, describe a meaning, or the idea to express..." : "type an English word or phrase..."}
              style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--accent)", background: "var(--panel)", color: "var(--text)", ...mono(14, 500) }}
            />
            {addWord.trim() && <SpeakButton text={addWord.trim()} size={40} radius={8} iconSize={17} />}
            <button onClick={() => void doEnrich(enrichMode)} disabled={enriching || !addWord.trim()} className="solid-btn" style={{ ...solidBtn, padding: "10px 15px", opacity: enriching || !addWord.trim() ? 0.6 : 1 }}>
              {isAiMode && <Zap size={14} />} {isAiMode ? "fill with AI" : "fill"}
            </button>
          </div>

          <div style={{ ...mono(11.5), color: "var(--faint)", marginTop: 9, lineHeight: 1.45 }}>
            {isAiMode
              ? "Find a word, collocation or natural phrase from your description using AI"
              : "Look it up in an English dictionary and save it quickly"}
          </div>

          {(enrichNote || enrichSuggestion || (enriched && r && !r.definition)) && (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {enrichNote && (
                <div style={{ ...mono(11), color: enrichSuggestion ? "var(--bad)" : "var(--accent)", lineHeight: 1.45 }}>
                  {enrichNote}
                </div>
              )}
              {enrichSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    set("addWord", enrichSuggestion);
                    void doEnrich(enrichMode);
                  }}
                  className="ghost-btn"
                  style={{ ...ghostBtn, justifySelf: "flex-start" }}
                >
                  use &quot;{enrichSuggestion}&quot; &amp; refill
                </button>
              )}
              {!enrichNote && enriched && r && !r.definition && (
                <div style={{ ...mono(11), color: "var(--faint)" }}>
                  Auto-fill is unavailable. You can fill the fields in yourself and save.
                </div>
              )}
            </div>
          )}

          {enriching && (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="spinner" />
                <span style={{ ...mono(12.5), color: "var(--muted)" }}>{`> enrich("${addWord}")…`}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                <div className="skeleton" style={{ height: 44 }} />
                <div className="skeleton" style={{ height: 44 }} />
                <div className="skeleton" style={{ height: 64 }} />
              </div>
            </div>
          )}

          {enriched && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
              {!!r?.candidates?.length && (
                <ChoiceGroup
                  title="suggested English word or phrase"
                  items={r.candidates}
                  onPick={applyChoice}
                  getHeading={(item) => item.word || ""}
                  getBody={(item) => item.reason || item.definition_origin || item.definition}
                />
              )}

              {!!r?.senses?.length && (
                <ChoiceGroup
                  title="meanings you can save"
                  items={r.senses}
                  onPick={applyChoice}
                  getHeading={(item) => item.sense_label || item.part_of_speech || "other meaning"}
                  getBody={(item) => formatSenseBody(item)}
                />
              )}

              <div style={{ display: "grid", gap: 12 }}>
                <Field label="phonetics" mono value={r?.phonetic ?? ""} onChange={(v) => update({ phonetic: v })} />
                <PartOfSpeechChips
                  label="part of speech"
                  value={r?.part_of_speech ?? ""}
                  onChange={(v) => update({ part_of_speech: v })}
                />
              </div>
              <Field label="definition (en)" value={r?.definition ?? ""} onChange={(v) => update({ definition: v })} />
              <Field label="definition (your language)" value={r?.definition_origin ?? ""} onChange={(v) => update({ definition_origin: v })} />
              <Field label="example" textarea value={r?.example ?? ""} onChange={(v) => update({ example: v })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="band" mono value={String(r?.ielts_band ?? "")} onChange={(v) => update({ ielts_band: Number(v) || 7 })} />
                <Field label="synonyms  " mono value={(r?.synonyms ?? []).join(", ")} onChange={(v) => update({ synonyms: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "16px 22px", borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
          {saveError && (
            <span style={{ ...mono(11), color: "var(--bad)", marginRight: "auto", maxWidth: 220 }}>{saveError}</span>
          )}
          <button onClick={closeAdd} className="ghost-btn" style={ghostBtn}>
            cancel
          </button>
          <button
            onClick={saveWord}
            disabled={saving || !addWord.trim()}
            className="solid-btn"
            style={{ ...solidBtn, opacity: saving || !addWord.trim() ? 0.55 : 1 }}
          >
            {saving ? "saving..." : isEdit ? "update" : "save word"}
          </button>
        </div>
      </div>
    </div>
  );
}

