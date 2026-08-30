import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Deck } from "../data";
import { getDb, requireUid } from "../firestore/client";
import { decksPath, wordsPath } from "../firestore/paths";
import { stripUndefined } from "../firestore/sanitize";
import { buildSearchTokens } from "../firestore/search";
import type { WordDoc } from "../firestore/types";
import { normalizePartOfSpeech } from "../part-of-speech";
import { VOCABULARY_PAGE_SIZE } from "../vocabulary-config";
import { dateString, mapStudyCard } from "./shared";
import type {
  DeckStatsRow,
  DeckVocabularyPageInput,
  DeckVocabularyPageResult,
  StudyCard,
} from "./types";

export interface CreateDeckInput {
  name: string;
  description?: string;
  category?: string;
}

export interface CreateWordInput {
  deck_id: string;
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  definition: string;
  definition_origin?: string;
  example?: string;
  synonyms?: string[];
  ielts_band?: number;
  topic_tags?: string[];
  ai_enriched?: boolean;
}

export interface UpdateWordInput {
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  definition: string;
  definition_origin?: string;
  example?: string;
  synonyms?: string[];
  ielts_band?: number;
  deck_id?: string;
}

const STUDY_POOL_SIZE = 200;
const DUPLICATE_SCAN_LIMIT = 50;

function normalizeVocabularyWord(word: string): string {
  return word.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizeDefinition(definition: string): string {
  return definition
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function timezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return (await response.json()) as T;
}

// ── Decks ─────────────────────────────────────────────────────────────

export async function getDecksWithStats(): Promise<Deck[]> {
  const data = await getJson<{ decks: DeckStatsRow[] }>(
    `/api/decks/stats?tzOffset=${timezoneOffset()}`
  );
  return (data.decks ?? []).map((row): Deck => ({
    id: row.id,
    name: row.name,
    level: row.category === "general" ? "General" : "Academic",
    desc: row.description ?? "",
    total: Number(row.total),
    learned: Number(row.learned),
    due: Number(row.due),
  }));
}

export async function createDeck(input: CreateDeckInput) {
  const uid = requireUid();
  const now = new Date().toISOString();
  const payload = {
    name: input.name,
    description: input.description ?? "",
    category: input.category ?? "",
    color: "accent",
    icon: "cards",
    createdAt: now,
    updatedAt: now,
  };
  const created = await addDoc(collection(getDb(), decksPath(uid)), stripUndefined(payload));
  return { id: created.id, ...payload };
}

export async function updateDeck(
  id: string,
  input: { name?: string; description?: string; category?: string }
): Promise<void> {
  const uid = requireUid();
  const payload = stripUndefined({
    name: input.name,
    description: input.description,
    category: input.category,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(getDb(), `${decksPath(uid)}/${id}`), payload);
}

// Cascades to the deck's words, so it runs server-side via BulkWriter rather
// than looping deletes in the browser.
export async function deleteDeck(id: string): Promise<void> {
  const response = await fetch("/api/decks/delete", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deckId: id }),
  });
  if (!response.ok) throw new Error("delete_deck_failed");
}

// ── Words ─────────────────────────────────────────────────────────────

export async function getDeckPool(
  deckId: string,
  limit = STUDY_POOL_SIZE
): Promise<StudyCard[]> {
  const uid = requireUid();
  const snapshot = await getDocs(
    query(
      collection(getDb(), wordsPath(uid)),
      where("deckId", "==", deckId),
      orderBy("createdAt"),
      fsLimit(limit)
    )
  );
  return snapshot.docs.map((entry) => mapStudyCard(entry.id, entry.data() as WordDoc));
}

export interface StudySession {
  sessionCards: StudyCard[];
  deckCards: StudyCard[];
}

export async function getStudySession(
  deckId: string,
  order: string,
  sessionSize: number
): Promise<StudySession> {
  const params = new URLSearchParams({
    deckId,
    order,
    size: String(sessionSize),
    tzOffset: String(timezoneOffset()),
  });
  return getJson<StudySession>(`/api/study/session?${params.toString()}`);
}

export async function getDeckVocabularyPage(
  input: DeckVocabularyPageInput
): Promise<DeckVocabularyPageResult> {
  const params = new URLSearchParams({
    deckId: input.deckId,
    page: String(Math.max(1, Math.floor(input.page ?? 1))),
    pageSize: String(input.pageSize ?? VOCABULARY_PAGE_SIZE),
    status: input.status ?? "all",
  });
  if (input.search) params.set("search", input.search);
  return getJson<DeckVocabularyPageResult>(`/api/decks/words?${params.toString()}`);
}

// Duplicate detection is scoped to the same headword, then narrowed in memory
// on the normalised part of speech + definition, matching the previous
// behaviour without needing a composite index per comparison field.
export async function findExistingWord(
  word: string,
  partOfSpeech: string | undefined,
  definition: string,
  excludeId?: string
): Promise<{ id: string; deck_id: string } | null> {
  const uid = requireUid();
  const normalizedWord = normalizeVocabularyWord(word);
  const normalizedPartOfSpeech = normalizePartOfSpeech(partOfSpeech);
  const normalizedDefinition = normalizeDefinition(definition);

  const snapshot = await getDocs(
    query(
      collection(getDb(), wordsPath(uid)),
      where("wordLower", "==", normalizedWord),
      fsLimit(DUPLICATE_SCAN_LIMIT)
    )
  );

  for (const entry of snapshot.docs) {
    if (excludeId && entry.id === excludeId) continue;
    const data = entry.data() as WordDoc;
    if (
      normalizePartOfSpeech(data.partOfSpeech) === normalizedPartOfSpeech &&
      normalizeDefinition(data.definition ?? "") === normalizedDefinition
    ) {
      return { id: entry.id, deck_id: data.deckId };
    }
  }
  return null;
}

export async function createWord(input: CreateWordInput) {
  const uid = requireUid();
  const now = new Date().toISOString();
  const word = normalizeVocabularyWord(input.word);
  const partOfSpeech = normalizePartOfSpeech(input.part_of_speech);
  const definitionOrigin = input.definition_origin ?? "";

  const payload: WordDoc = {
    deckId: input.deck_id,
    word,
    wordLower: word,
    searchTokens: buildSearchTokens({
      word,
      partOfSpeech,
      definition: input.definition,
      definitionOrigin,
    }),
    phonetic: input.phonetic ?? "",
    partOfSpeech,
    definition: input.definition,
    definitionOrigin,
    example: input.example ?? "",
    synonyms: input.synonyms ?? [],
    ieltsBand: input.ielts_band ?? 0,
    topicTags: input.topic_tags ?? [],
    aiEnriched: input.ai_enriched === true,
    // Born due: makes "never reviewed" and "due today" one indexable predicate.
    sm2: {
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate: dateString(),
      lastReviewed: null,
      totalReviews: 0,
      correctStreak: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  const created = await addDoc(collection(getDb(), wordsPath(uid)), stripUndefined(payload));
  return { id: created.id, ...payload };
}

export async function updateWord(id: string, input: UpdateWordInput): Promise<void> {
  const uid = requireUid();
  const word = normalizeVocabularyWord(input.word);
  const partOfSpeech = normalizePartOfSpeech(input.part_of_speech);
  const definitionOrigin = input.definition_origin ?? "";

  const payload = stripUndefined({
    word,
    wordLower: word,
    searchTokens: buildSearchTokens({
      word,
      partOfSpeech,
      definition: input.definition,
      definitionOrigin,
    }),
    phonetic: input.phonetic ?? "",
    partOfSpeech,
    definition: input.definition,
    definitionOrigin,
    example: input.example ?? "",
    synonyms: input.synonyms ?? [],
    ieltsBand: input.ielts_band ?? 0,
    updatedAt: new Date().toISOString(),
    ...(input.deck_id ? { deckId: input.deck_id } : {}),
  });

  await updateDoc(doc(getDb(), `${wordsPath(uid)}/${id}`), payload);
}

export async function deleteWord(id: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(doc(getDb(), `${wordsPath(uid)}/${id}`));
}
