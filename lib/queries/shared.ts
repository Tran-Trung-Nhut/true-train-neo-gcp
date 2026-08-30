import type { WordStatus } from "../data";
import type { Sm2State, WordDoc } from "../firestore/types";
import type { StudyCard } from "./types";

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateString(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return formatLocalDate(date);
}

export function deriveWordStatus(sm2?: Sm2State | null): WordStatus {
  if (!sm2 || sm2.repetitions === 0) return "new";
  return sm2.repetitions >= 3 ? "learned" : "learning";
}

// A brand-new word is written already due, so "never reviewed" and "due today"
// share one dueDate predicate. reviewId stays null until the first review so
// isCardDue() keeps behaving exactly as it did against the old review table.
export function mapStudyCard(id: string, row: WordDoc): StudyCard {
  const sm2 = row.sm2;
  return {
    id,
    reviewId: sm2 && sm2.totalReviews > 0 ? id : null,
    easeFactor: sm2?.easeFactor ?? 2.5,
    intervalDays: sm2?.intervalDays ?? 0,
    repetitions: sm2?.repetitions ?? 0,
    dueDate: sm2?.dueDate ?? null,
    totalReviews: sm2?.totalReviews ?? 0,
    createdAt: row.createdAt,
    word: row.word,
    ipa: row.phonetic ?? "",
    pos: row.partOfSpeech ?? "",
    defEn: row.definition,
    defOrigin: row.definitionOrigin ?? "",
    exEn: row.example ?? "",
    syns: (row.synonyms ?? []).join(" · "),
    band: row.ieltsBand ?? 0,
    status: deriveWordStatus(sm2),
  };
}
