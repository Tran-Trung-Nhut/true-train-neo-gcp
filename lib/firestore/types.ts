// SM-2 state is embedded on the word document (1:1 within an owner), and a new
// word is created already due, so "unreviewed or due" is one dueDate predicate.

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  /** Local calendar day, YYYY-MM-DD — sorts correctly as a string. */
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
  /** Lowercased tokens + prefixes, for substring-style search. */
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
  /** Per-day counter so the heatmap never scans the whole log. */
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

export interface ConversationDoc {
  /** Derived from the first learner message, never model-authored. */
  title: string;
  /** Empty when the chat is not grounded in a deck. */
  deckId: string;
  deckName: string;
  /** Denormalised for the list view, so rendering it reads one collection. */
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDoc {
  role: "ai" | "user";
  text: string;
  createdAt: string;
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
