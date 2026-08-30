import { AI_LIMITS } from "../ai/config";
import { normalizePartOfSpeech } from "../part-of-speech";
import {
  createDeck,
  createWord,
  deleteWord,
  findExistingWord,
  updateWord,
} from "../queries";
import {
  asRecord,
  asString,
  asStringArray,
  normalizeEnrichChoice,
  normalizeEnrichChoices,
} from "./normalizers";
import type { EnrichMode, StoreGet, StoreSet } from "./types";

export async function enrichCurrentWord(
  mode: EnrichMode,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  const word = get().addWord.trim();
  if (!word) return;
  set({ enriching: true, enriched: false, enrichNote: "", enrichSuggestion: "" });

  try {
    const response = await fetch("/api/ai/enrich", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ word, mode }),
    });
    const data = asRecord(await response.json().catch(() => ({})));

    if (response.status === 429) {
      const limit = typeof data.limit === "number" ? data.limit : AI_LIMITS.enrich;
      set({
        enriching: false,
        enriched: true,
        enrichResult: null,
        enrichNote: `You have used all ${limit} AI lookups for today. You can still look up English words in standard mode, or fill the fields in yourself and save.`,
      });
      return;
    }
    if (!response.ok) throw new Error("enrichment_failed");

    if (data.requires_ai === true) {
      set({
        enriching: false,
        enriched: true,
        enrichResult: null,
        enrichSuggestion: "",
        enrichNote:
          "Standard mode only handles English words. To enter your own language or describe a meaning, switch to AI mode.",
      });
      return;
    }

    if (data.valid === false) {
      const suggestion = asString(data.suggestion);
      set({
        enriching: false,
        enriched: true,
        enrichResult: null,
        enrichSuggestion: suggestion,
        enrichNote: suggestion
          ? `Could not find "${word}". Did you mean "${suggestion}"?`
          : `Could not find "${word}". Check the spelling, or switch to AI mode if this is an idea you want to express.`,
      });
      return;
    }

    const primary = normalizeEnrichChoice(data);
    const senses = normalizeEnrichChoices(data.senses);
    const candidates = normalizeEnrichChoices(data.candidates, true);
    const resolvedWord = (primary.word || candidates[0]?.word || word).trim();
    const enrichmentMode = data.enrichment_mode === "dictionary"
      ? "dictionary"
      : data.enrichment_mode === "simulated"
        ? "simulated"
        : "ai";
    const remainingNote =
      enrichmentMode !== "dictionary" && typeof data.remaining === "number"
        ? `You have ${data.remaining} AI lookups left today.`
        : "";
    const guideNote = candidates.length
      ? "Pick the English word or phrase that fits below, then save."
      : senses.length
        ? primary.part_of_speech === "collocation"
          ? "This collocation has several uses - choose the one you want to save."
          : "This word has several meanings - choose the one you want to save."
        : "";

    set({
      addWord: resolvedWord,
      enriching: false,
      enriched: true,
      enrichSuggestion: "",
      enrichNote: [remainingNote, guideNote].filter(Boolean).join(" "),
      enrichResult: {
        ...primary,
        word: resolvedWord,
        input_type: data.input_type === "origin" ? "origin" : "english",
        ai_enriched: data.ai_enriched === true,
        enrichment_mode: enrichmentMode,
        sources: asStringArray(data.sources),
        audio: asString(data.audio),
        senses,
        candidates,
      },
    });
  } catch {
    set({
      enriching: false,
      enriched: true,
      enrichResult: null,
      enrichNote: "",
      enrichSuggestion: "",
    });
  }
}

export async function saveCurrentWord(set: StoreSet, get: StoreGet): Promise<void> {
  const { addWord, enrichResult, activeDeckId, decks, editWordId, editDeckId } = get();
  const word = addWord.trim().toLowerCase();
  const definition = enrichResult?.definition || word;
  const partOfSpeech = normalizePartOfSpeech(enrichResult?.part_of_speech);
  if (!word) {
    set({ saveError: "Enter a word before saving." });
    return;
  }

  set({ saving: true, saveError: "" });
  try {
    const duplicate = await findExistingWord(
      word,
      partOfSpeech,
      definition,
      editWordId ?? undefined
    );
    if (duplicate) {
      const deckName = decks.find((deck) => deck.id === duplicate.deck_id)?.name ?? "another deck";
      set({ saving: false, saveError: `This meaning of "${word}" is already in the "${deckName}" deck.` });
      return;
    }

    if (editWordId) {
      await updateWord(editWordId, {
        word,
        phonetic: enrichResult?.phonetic,
        part_of_speech: partOfSpeech,
        definition,
        definition_origin: enrichResult?.definition_origin,
        example: enrichResult?.example,
        synonyms: enrichResult?.synonyms,
        ielts_band: enrichResult?.ielts_band,
        deck_id: editDeckId || undefined,
      });
    } else {
      let deckId = editDeckId || activeDeckId || decks[0]?.id;
      if (!deckId) {
        const deck = await createDeck({ name: "My words", category: "ielts_academic" });
        deckId = deck.id;
      }
      await createWord({
        deck_id: deckId,
        word,
        phonetic: enrichResult?.phonetic,
        part_of_speech: partOfSpeech,
        definition,
        definition_origin: enrichResult?.definition_origin,
        example: enrichResult?.example,
        synonyms: enrichResult?.synonyms,
        ielts_band: enrichResult?.ielts_band,
        topic_tags: enrichResult?.topic_tags,
        ai_enriched: enrichResult?.ai_enriched === true,
      });
    }

    set({ saving: false, addOpen: false, editWordId: null });
    get().notify(editWordId ? `Updated "${word}".` : `Saved "${word}".`);
    void get().loadDecks();
    if (get().screen === "deck-detail") {
      void get().loadDeckVocabularyPage({ page: editWordId ? get().deckWordsPage : 1 });
    }
  } catch {
    set({
      saving: false,
      saveError: "Could not save the word - check your sign-in and connection, then try again.",
    });
  }
}

export async function deleteCurrentWord(
  id: string,
  set: StoreSet,
  get: StoreGet
): Promise<void> {
  const previousWords = get().deckWords;
  const previousTotal = get().deckWordsTotal;
  set({
    deckWords: previousWords.filter((word) => word.id !== id),
    deckWordsTotal: Math.max(0, previousTotal - 1),
  });
  try {
    await deleteWord(id);
    get().notify("Word deleted.");
    void get().loadDecks();
    if (get().screen === "deck-detail") {
      void get().loadDeckVocabularyPage();
    }
  } catch {
    set({ deckWords: previousWords, deckWordsTotal: previousTotal });
  }
}
