import type { OriginLanguage } from "../origin-language";
import type { Deck, QuizQuestion } from "../data";
import type {
  DeckVocabularyPageInput,
  PracticeStreakSummary,
  StatsSummary,
  StudyCard,
} from "../queries";
import type { AiQuizType } from "../quiz-config";
import type { RateLevel, StudyOrder, StudyPickerMode } from "../study-config";
import type { WordFilter } from "../vocabulary-config";
import type { WritingAssessment, WritingTaskType } from "../ai/writing-types";

export const SCREENS = [
  "dashboard",
  "decks",
  "deck-detail",
  "stats",
  "settings",
  "flashcard",
  "quiz",
  "speaking",
  "chat",
  "ielts",
  "writing",
] as const;

export type Screen = (typeof SCREENS)[number];
export type Theme = "dark" | "light";
export type EnrichMode = "ai" | "dictionary";

export interface ChatMsg {
  role: "ai" | "user";
  text: string;
}

export interface EnrichChoice {
  word?: string;
  sense_label?: string;
  reason?: string;
  phonetic: string;
  part_of_speech: string;
  definition: string;
  definition_origin: string;
  example: string;
  synonyms: string[];
  ielts_band: number;
  topic_tags: string[];
}

export interface EnrichResult extends EnrichChoice {
  input_type?: "english" | "origin";
  ai_enriched?: boolean;
  enrichment_mode?: "ai" | "dictionary" | "simulated";
  sources?: string[];
  audio?: string;
  senses: EnrichChoice[];
  candidates: EnrichChoice[];
}

export interface ToastState {
  id: number;
  text: string;
  tone: "success" | "error" | "info";
}

export interface AppState {
  email: string;
  displayName: string;
  theme: Theme;
  screen: Screen;
  activeDeckId: string;
  decks: Deck[];
  decksLoading: boolean;
  deckWords: StudyCard[];
  deckWordsLoading: boolean;
  deckWordsTotal: number;
  deckWordsPage: number;
  studyDeckCards: StudyCard[];
  studyCards: StudyCard[];
  studyLoading: boolean;
  quizQuestions: QuizQuestion[];
  quizSource: "local" | "ai";
  aiQuizLoading: boolean;
  aiQuizError: string;
  aiQuizQuotaLoading: boolean;
  aiQuizLimit: number | null;
  aiQuizRemaining: number | null;
  aiQuizSimulated: boolean;
  aiQuizQuestionCount: number;
  aiQuizTypes: AiQuizType[];
  stats: StatsSummary | null;
  dailyCounts: number[];
  practiceStreak: PracticeStreakSummary | null;
  studyPickerMode: StudyPickerMode | null;
  addOpen: boolean;
  enriching: boolean;
  enriched: boolean;
  addWord: string;
  enrichMode: EnrichMode;
  enrichResult: EnrichResult | null;
  enrichNote: string;
  enrichSuggestion: string;
  saving: boolean;
  saveError: string;
  editWordId: string | null;
  editDeckId: string;
  deckModalOpen: boolean;
  deckDraftName: string;
  deckDraftLevel: "Academic" | "General";
  fcIndex: number;
  fcFlipped: boolean;
  fcDone: boolean;
  fcAgain: number;
  fcHard: number;
  fcGood: number;
  fcEasy: number;
  fcRatingPending: boolean;
  qIndex: number;
  qSelected: number | null;
  qAnswered: boolean;
  qCorrect: number;
  qDone: boolean;
  qWrong: QuizQuestion[];
  qStreakChecked: boolean;
  fcStreakChecked: boolean;
  practiceStreakPopup: { streak: number } | null;
  qReviewPending: boolean;
  chat: ChatMsg[];
  chatInput: string;
  aiTyping: boolean;
  chatError: string;
  writingTaskType: WritingTaskType;
  writingImage: string;
  writingAnswer: string;
  writingGrading: boolean;
  writingError: string;
  writingResult: WritingAssessment | null;
  writingQuotaLoading: boolean;
  writingLimit: number | null;
  writingRemaining: number | null;
  writingAvailable: boolean;
  deckFilter: string;
  wordFilter: WordFilter;
  deckSearch: string;
  sessionSize: number;
  reminder: boolean;
  order: StudyOrder;
  showIpaFront: boolean;
  showOriginBack: boolean;
  originLanguage: OriginLanguage;
  toast: ToastState | null;
  setEmail: (email: string) => void;
  setIdentity: (email: string, displayName?: string) => void;
  updateDisplayName: (displayName: string) => Promise<void>;
  notify: (text: string, tone?: ToastState["tone"]) => void;
  clearToast: (id?: number) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  nav: (screen: Screen) => void;
  set: <Key extends keyof AppState>(key: Key, value: AppState[Key]) => void;
  toggle: (key: "reminder" | "showIpaFront" | "showOriginBack") => void;
  setOriginLanguage: (code: OriginLanguage) => void;
  loadDecks: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => void;
  createNewDeck: (name: string, level: "Academic" | "General") => Promise<void>;
  openDeckModal: () => void;
  closeDeckModal: () => void;
  confirmCreateDeck: () => Promise<void>;
  updateDeckCategory: (id: string, level: "Academic" | "General") => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  openDeck: (id: string) => Promise<void>;
  loadDeckVocabularyPage: (
    input?: Partial<Omit<DeckVocabularyPageInput, "deckId">> & { deckId?: string }
  ) => Promise<void>;
  startStudy: (mode: Screen, deckId?: string) => Promise<void>;
  openStudyPicker: (mode: StudyPickerMode) => void;
  closeStudyPicker: () => void;
  openAdd: () => void;
  openEdit: (word: StudyCard) => void;
  closeAdd: () => void;
  doEnrich: (mode?: EnrichMode) => Promise<void>;
  saveWord: () => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  flip: () => void;
  rate: (level: RateLevel) => Promise<void>;
  restartFc: () => void;
  quizPick: (index: number) => Promise<void>;
  quizNext: () => void;
  quizRestart: () => void;
  dismissPracticeStreakPopup: () => void;
  generateAiQuiz: () => Promise<void>;
  loadAiQuizQuota: () => Promise<void>;
  setAiQuizQuestionCount: (count: number) => void;
  toggleAiQuizType: (type: AiQuizType) => void;
  chatSend: () => void;
  setWritingImage: (dataUrl: string) => void;
  setWritingAnswer: (text: string) => void;
  setWritingTaskType: (taskType: WritingTaskType) => void;
  gradeWriting: () => Promise<void>;
  loadWritingQuota: () => Promise<void>;
  resetWriting: () => void;
  incSessionSize: () => void;
  decSessionSize: () => void;
}

export type StoreSet = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)
) => void;
export type StoreGet = () => AppState;
