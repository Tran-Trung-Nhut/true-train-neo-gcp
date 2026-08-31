import type { Deck, Word } from "../data";
import type { StudyOrder } from "../study-config";
import type { WordFilter } from "../vocabulary-config";
import type { OriginLanguage } from "../origin-language";

export interface UserSettings {
  sessionSize: number;
  reminder: boolean;
  order: StudyOrder;
  showIpaFront: boolean;
  showOriginBack: boolean;
  /** The learner's own language, used for AI explanations of English words. */
  originLanguage: OriginLanguage;
}

export interface StudyCard extends Word {
  id: string;
  reviewId: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string | null;
  totalReviews: number;
  createdAt: string;
}

export interface DeckVocabularyPageInput {
  deckId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WordFilter;
}

export interface DeckVocabularyPageResult {
  words: StudyCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeckStatsRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  total: number;
  learned: number;
  due: number;
  /** False when a count() aggregation failed, so the numbers are placeholders. */
  statsAvailable?: boolean;
}

export interface DeckStatsResult {
  decks: Deck[];
  /** True when at least one deck's counts could not be read. */
  partial: boolean;
}

export interface StatsSummary {
  totalWords: number;
  learned: number;
  due: number;
  accuracy: number;
  perDeck: { id: string; name: string; learned: number; total: number }[];
}

export const STREAK_TIERS = [
  "starter",
  "spark",
  "flame",
  "ember",
  "blaze",
  "inferno",
  "nova",
  "legend",
  "mythic",
] as const;

export type StreakTier = (typeof STREAK_TIERS)[number];

export interface PracticeStreakSummary {
  streak: number;
  practicedToday: boolean;
  lastActiveDate: string | null;
  tier: StreakTier;
}
