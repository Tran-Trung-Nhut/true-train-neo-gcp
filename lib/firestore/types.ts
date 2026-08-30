// Firestore document shapes.
//
// Two deliberate departures from the previous SQL schema, both infrastructure
// rather than behaviour:
//
// 1. SM-2 state is embedded on the word document instead of living in a
//    separate word_reviews table. The old relation was unique on
//    (word_id, user_id) and every word already belonged to exactly one user,
//    so it was always 1:1 within an owner. Embedding removes the join that all
//    three Postgres RPCs existed to perform.
//
// 2. A new word is created already due (dueDate = today, repetitions = 0), so
//    "has no review yet OR is due" collapses into a single dueDate <= today
//    filter. Same selection as isCardDue, one indexable predicate.

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  /** Local calendar day, YYYY-MM-DD. Compared as a string, which sorts correctly. */
  dueDate: string;
  lastReviewed: string | null;
  totalReviews: number;
  correctStreak: number;
}

export interface WordDoc {
  deckId: string;
  word: string;
  /** Lowercased headword, used for duplicate detection. */
  wordLower: string;
  /** Lowercased tokens from word + part of speech + both definitions (Q3 option c). */
  searchTokens: string[];
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  definitionOrigin: string;
  example: string;
  synonyms: string[];
  ieltsBand: number;
  topicTags: string[];
  aiEnriched: boolean;
  sm2: Sm2State;
  createdAt: string;
  updatedAt: string;
}

export interface DeckDoc {
  name: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLogDoc {
  wordId: string;
  mode: string;
  rating: number;
  createdAt: string;
}

export interface DailyStatsDoc {
  date: string;
  wordsReviewed: number;
  wordsLearned: number;
  streakDay: number;
  /** Per-day review counter, so the heatmap never scans the whole log. */
  reviewCount: number;
  practiceCompleted: boolean;
  practiceMode: string;
  practiceReviewed: number;
  practiceCorrect: number | null;
  practiceCompletedAt: string | null;
}

export interface SettingsDoc {
  newPerDay: number;
  reminder: boolean;
  cardOrder: string;
  showIpaFront: boolean;
  showOriginBack: boolean;
  /** BCP-47 code for the learner's own language, used for AI explanations. */
  originLanguage: string;
  updatedAt: string;
}

export interface ProfileDoc {
  displayName: string;
  email: string;
  photoURL: string;
  originLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsageDoc {
  kind: string;
  count: number;
  updatedAt: string;
}

export const DEFAULT_SM2: Sm2State = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  dueDate: "",
  lastReviewed: null,
  totalReviews: 0,
  correctStreak: 0,
};
