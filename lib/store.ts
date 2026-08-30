import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getDecksWithStats,
  getDeckVocabularyPage,
  getDeckPool,
  getStudySession,
  getStatsSummary,
  getDailyCounts,
  getPracticeStreakSummary,
  getUserSettings,
  saveUserSettings,
  saveDisplayName,
  submitReview,
} from "./queries";
import { generateQuiz } from "./quiz";
import { AI_QUIZ_CONFIG, AI_QUIZ_TYPES } from "./quiz-config";
import {
  RATING_BY_LEVEL,
  SESSION_SIZE,
  STUDY_ORDER_KEYS,
  type StudyOrder,
} from "./study-config";
import { VOCABULARY_PAGE_SIZE } from "./vocabulary-config";
import { DEFAULT_ORIGIN_LANGUAGE } from "./origin-language";
import { replaceCard } from "./store/normalizers";
import {
  generateAiQuiz,
  loadAiQuizQuota,
} from "./store/ai-quiz-actions";
import { completePracticeStreak } from "./store/streak";
import {
  deleteCurrentWord,
  enrichCurrentWord,
  saveCurrentWord,
} from "./store/word-actions";
import { gradeWriting, loadWritingQuota } from "./store/writing-actions";
import type { AppState, ChatMsg, Screen } from "./store/types";

export type {
  ChatMsg,
  EnrichChoice,
  EnrichMode,
  EnrichResult,
  Screen,
  Theme,
  ToastState,
} from "./store/types";

const STATS_HISTORY_DAYS = 126;
const DB_SETTING_KEYS = new Set<keyof AppState>([
  "sessionSize",
  "reminder",
  "order",
  "showIpaFront",
  "showOriginBack",
]);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  email: "",
  displayName: "",
  theme: "light",
  screen: "dashboard",
  activeDeckId: "",

  decks: [],
  decksLoading: false,
  decksError: "",
  deckWords: [],
  deckWordsLoading: false,
  deckWordsTotal: 0,
  deckWordsPage: 1,
  studyDeckCards: [],
  studyCards: [],
  studyLoading: false,
  quizQuestions: [],
  quizSource: "local",
  aiQuizLoading: false,
  aiQuizError: "",
  aiQuizQuotaLoading: false,
  aiQuizLimit: null,
  aiQuizRemaining: null,
  aiQuizSimulated: false,
  aiQuizQuestionCount: AI_QUIZ_CONFIG.defaultQuestionCount,
  aiQuizTypes: [...AI_QUIZ_TYPES],
  stats: null,
  dailyCounts: [],
  practiceStreak: null,
  studyPickerMode: null,

  addOpen: false,
  enriching: false,
  enriched: false,
  addWord: "",
  enrichMode: "dictionary",
  enrichResult: null,
  enrichNote: "",
  enrichSuggestion: "",
  saving: false,
  saveError: "",
  editWordId: null,
  editDeckId: "",

  deckModalOpen: false,
  deckDraftName: "",
  deckDraftLevel: "Academic",

  fcIndex: 0,
  fcFlipped: false,
  fcDone: false,
  fcAgain: 0,
  fcHard: 0,
  fcGood: 0,
  fcEasy: 0,
  fcRatingPending: false,

  qIndex: 0,
  qSelected: null,
  qAnswered: false,
  qCorrect: 0,
  qDone: false,
  qWrong: [],
  qStreakChecked: false,
  fcStreakChecked: false,
  practiceStreakPopup: null,
  qReviewPending: false,

  chat: [
    {
      role: "ai",
      text: "Hi! I am your English tutor. Start with any English sentence and I will chat with you and suggest fixes where useful.",
    },
  ],
  chatInput: "",
  aiTyping: false,
  chatError: "",

  writingTaskType: 1,
  writingImage: "",
  writingAnswer: "",
  writingGrading: false,
  writingError: "",
  writingResult: null,
  writingQuotaLoading: false,
  writingLimit: null,
  writingRemaining: null,
  writingAvailable: true,

  deckFilter: "all",
  wordFilter: "all",
  deckSearch: "",

  sessionSize: SESSION_SIZE.default,
  reminder: true,
  order: "sm2",
  showIpaFront: true,
  showOriginBack: true,
  originLanguage: DEFAULT_ORIGIN_LANGUAGE,
  toast: null,

  setEmail: (e) => set({ email: e }),
  setIdentity: (email, displayName = "") => set({ email, displayName }),
  updateDisplayName: async (displayName) => {
    try {
      const name = await saveDisplayName(displayName);
      set({ displayName: name });
      get().notify("Your name has been updated.");
    } catch {
      get().notify("Could not update your name. Please try again.", "error");
      throw new Error("display_name_update_failed");
    }
  },
  notify: (text, tone = "success") => set({ toast: { id: Date.now(), text, tone } }),
  clearToast: (id) =>
    set((s) => (!id || s.toast?.id === id ? { toast: null } : {})),
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  nav: (screen) => {
    set({ screen });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    if (screen === "stats") void get().loadStats();
  },
  set: (k, v) => {
    set({ [k]: v } as Partial<AppState>);
    if (DB_SETTING_KEYS.has(k)) get().saveSettings();
  },
  toggle: (k) => {
    set((s) => ({ [k]: !s[k] } as Partial<AppState>));
    get().saveSettings();
  },

  loadDecks: async () => {
    set({ decksLoading: true });
    try {
      const decks = await getDecksWithStats();
      set({ decks, decksLoading: false, decksError: "" });
    } catch (error) {
      // A read failure must never render as "you have no decks" - that looks
      // like data loss and hides the real cause (permissions, missing index,
      // expired session).
      console.error("loadDecks failed", error);
      set({
        decksLoading: false,
        decksError:
          "Could not load your decks. Your data is safe - this is a connection or server error.",
      });
    }
  },

  loadStats: async () => {
    try {
      const [stats, dailyCounts, practiceStreak] = await Promise.all([
        getStatsSummary(),
        getDailyCounts(STATS_HISTORY_DAYS),
        getPracticeStreakSummary(STATS_HISTORY_DAYS),
      ]);
      set({ stats, dailyCounts, practiceStreak });
    } catch (error) {
      console.error("loadStats failed", error);
    }
  },

  loadSettings: async () => {
    try {
      const s = await getUserSettings();
      if (s) {
        set({
          sessionSize: s.sessionSize,
          reminder: s.reminder,
          order: s.order,
          showIpaFront: s.showIpaFront,
          showOriginBack: s.showOriginBack,
          originLanguage: s.originLanguage,
        });
      }
    } catch {}
  },

  saveSettings: () => {
    const s = get();
    void saveUserSettings({
      sessionSize: s.sessionSize,
      reminder: s.reminder,
      order: s.order,
      showIpaFront: s.showIpaFront,
      showOriginBack: s.showOriginBack,
      originLanguage: s.originLanguage,
    }).catch(() => {});
  },

  setOriginLanguage: (code) => {
    set({ originLanguage: code });
    get().saveSettings();
  },

  createNewDeck: async (name, level) => {
    const { createDeck } = await import("./queries");
    try {
      await createDeck({
        name: name.trim(),
        category: level === "General" ? "general" : "ielts_academic",
      });
    } catch (error) {
      // The write itself failed: never claim success.
      console.error("createDeck failed", error);
      get().notify("Could not create the deck. Check your connection and try again.", "error");
      return;
    }
    // Only now is the save confirmed.
    get().notify(`Created the "${name.trim()}" deck.`);
    await get().loadDecks();
  },

  openDeckModal: () => set({ deckModalOpen: true, deckDraftName: "", deckDraftLevel: "Academic" }),
  closeDeckModal: () => set({ deckModalOpen: false }),

  confirmCreateDeck: async () => {
    const { deckDraftName, deckDraftLevel } = get();
    if (!deckDraftName.trim()) return;
    await get().createNewDeck(deckDraftName, deckDraftLevel);
    set({ deckModalOpen: false });
  },

  updateDeckCategory: async (id, level) => {
    const prev = get().decks;
    set((s) => ({ decks: s.decks.map((d) => (d.id === id ? { ...d, level } : d)) }));
    try {
      const { updateDeck } = await import("./queries");
      await updateDeck(id, { category: level === "General" ? "general" : "ielts_academic" });
    } catch {
      set({ decks: prev });
    }
  },

  deleteDeck: async (id) => {
    const prev = get().decks;
    set((s) => ({
      decks: s.decks.filter((d) => d.id !== id),
      ...(s.screen === "deck-detail" && s.activeDeckId === id
        ? { screen: "decks" as Screen, activeDeckId: "" }
        : {}),
    }));
    try {
      const { deleteDeck } = await import("./queries");
      await deleteDeck(id);
      get().notify("Deck deleted.");
      void get().loadDecks();
    } catch {
      set({ decks: prev });
    }
  },

  openDeck: async (id) => {
    set({
      activeDeckId: id,
      screen: "deck-detail",
      deckWords: [],
      deckWordsLoading: true,
      deckWordsTotal: 0,
      deckWordsPage: 1,
    });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    try {
      const result = await getDeckVocabularyPage({
        deckId: id,
        page: 1,
        pageSize: VOCABULARY_PAGE_SIZE,
        search: get().deckSearch,
        status: get().wordFilter,
      });
      set({
        deckWords: result.words,
        deckWordsTotal: result.total,
        deckWordsPage: result.page,
        deckWordsLoading: false,
      });
    } catch {
      set({ deckWordsLoading: false });
    }
  },

  loadDeckVocabularyPage: async (input = {}) => {
    const state = get();
    const deckId = input.deckId ?? state.activeDeckId;
    if (!deckId) return;

    set({ deckWordsLoading: true });
    try {
      const result = await getDeckVocabularyPage({
        deckId,
        page: input.page ?? state.deckWordsPage,
        pageSize: input.pageSize ?? VOCABULARY_PAGE_SIZE,
        search: input.search ?? state.deckSearch,
        status: input.status ?? state.wordFilter,
      });
      set({
        deckWords: result.words,
        deckWordsTotal: result.total,
        deckWordsPage: result.page,
        deckWordsLoading: false,
      });
    } catch {
      set({ deckWordsLoading: false });
    }
  },

  startStudy: async (mode, deckId) => {
    const id = deckId || get().activeDeckId || get().decks[0]?.id || "";
    set({
      screen: mode,
      activeDeckId: id,
      studyLoading: true,
      studyDeckCards: [],
      studyCards: [],
      quizQuestions: [],
      fcIndex: 0,
      fcFlipped: false,
      fcDone: false,
      fcAgain: 0,
      fcHard: 0,
      fcGood: 0,
      fcEasy: 0,
      fcRatingPending: false,
      qIndex: 0,
      qSelected: null,
      qAnswered: false,
      qCorrect: 0,
      qDone: false,
      qWrong: [],
      qStreakChecked: false,
      fcStreakChecked: false,
      practiceStreakPopup: null,
      qReviewPending: false,
      quizSource: "local",
      aiQuizLoading: false,
      aiQuizError: "",
      aiQuizSimulated: false,
    });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    try {
      if (mode === "flashcard" || mode === "quiz") {
        const order = (STUDY_ORDER_KEYS.includes(get().order as StudyOrder)
          ? get().order
          : "sm2") as StudyOrder;
        const { sessionCards, deckCards } = await getStudySession(id, order, get().sessionSize);
        set({
          studyDeckCards: deckCards,
          studyCards: sessionCards,
          studyLoading: false,
          quizQuestions: mode === "quiz"
            ? generateQuiz(sessionCards, get().sessionSize, deckCards)
            : [],
        });
      } else {
        const cards = await getDeckPool(id);
        set({ studyDeckCards: cards, studyCards: cards, studyLoading: false, quizQuestions: [] });
      }
    } catch {
      set({ studyLoading: false });
    }
  },

  openStudyPicker: (mode) => {
    set({ studyPickerMode: mode });
    void get().loadDecks();
  },
  closeStudyPicker: () => set({ studyPickerMode: null }),

  openAdd: () =>
    set((s) => ({ addOpen: true, editWordId: null, editDeckId: s.activeDeckId || s.decks[0]?.id || "", enriched: true, enriching: false, enrichMode: "dictionary", enrichResult: null, enrichNote: "", enrichSuggestion: "", saveError: "", addWord: "" })),

  openEdit: (w) =>
    set((s) => ({
      addOpen: true,
      editWordId: w.id,
      editDeckId: s.activeDeckId || s.decks[0]?.id || "",
      enriched: true,
      enriching: false,
      enrichMode: "dictionary",
      enrichNote: "",
      enrichSuggestion: "",
      saveError: "",
      addWord: w.word,
      enrichResult: {
        word: w.word,
        sense_label: "",
        reason: "",
        phonetic: w.ipa,
        part_of_speech: w.pos,
        definition: w.defEn,
        definition_origin: w.defOrigin,
        example: w.exEn,
        synonyms: w.syns ? w.syns.split("·").map((x) => x.trim()).filter(Boolean) : [],
        ielts_band: w.band,
        topic_tags: [],
        senses: [],
        candidates: [],
      },
    })),

  closeAdd: () => set({ addOpen: false, editWordId: null }),

  doEnrich: async (mode = get().enrichMode) => enrichCurrentWord(mode, set, get),
  saveWord: async () => saveCurrentWord(set, get),
  deleteWord: async (id) => deleteCurrentWord(id, set, get),

  flip: () => {
    if (!get().fcDone && !get().fcRatingPending) {
      set((s) => ({ fcFlipped: !s.fcFlipped }));
    }
  },

  rate: async (level) => {
    if (get().fcRatingPending) return;
    const key = ("fc" + level[0].toUpperCase() + level.slice(1)) as
      | "fcAgain"
      | "fcHard"
      | "fcGood"
      | "fcEasy";
    const cards = get().studyCards;
    const card = cards[get().fcIndex];
    if (!card) return;

    set({ fcRatingPending: true });
    try {
      const updated = await submitReview(card, RATING_BY_LEVEL[level], "flashcard");
      if (get().studyCards !== cards) return;
      set((s) => {
        const next = s.fcIndex + 1;
        const done = next >= cards.length;
        return {
          studyCards: replaceCard(s.studyCards, updated),
          studyDeckCards: replaceCard(s.studyDeckCards, updated),
          [key]: (s[key] as number) + 1,
          fcIndex: done ? s.fcIndex : next,
          fcFlipped: false,
          fcDone: done,
          fcRatingPending: false,
        } as Partial<AppState>;
      });
    } catch {
      set({ fcRatingPending: false });
      get().notify("Could not save your review. Check your connection and try again.", "error");
      return;
    }

    const latest = get();
    if (latest.fcDone && !latest.fcStreakChecked) {
      set({ fcStreakChecked: true });
      void completePracticeStreak("flashcard", cards.length, undefined, set, get);
    }
  },

  restartFc: () => {
    void get().startStudy("flashcard", get().activeDeckId);
  },

  quizPick: async (i) => {
    if (get().qAnswered || get().qReviewPending) return;
    const questions = get().quizQuestions;
    const q = questions[get().qIndex];
    const selected = q?.options[i];
    if (!q || !selected) return;
    const correct = q.options[i]?.c === true;
    const card = get().studyDeckCards.find((candidate) => candidate.id === q.cardId);
    if (!card) {
      get().notify("Could not identify the word for this question.", "error");
      return;
    }

    set({ qReviewPending: true });
    try {
      const updated = await submitReview(card, correct ? 3 : 1, "quiz");
      if (get().quizQuestions !== questions) return;
      set((s) => ({
        studyCards: replaceCard(s.studyCards, updated),
        studyDeckCards: replaceCard(s.studyDeckCards, updated),
        qSelected: i,
        qAnswered: true,
        qReviewPending: false,
        qCorrect: s.qCorrect + (correct ? 1 : 0),
        qWrong: correct ? s.qWrong : [...s.qWrong, q],
      }));
    } catch {
      set({ qReviewPending: false });
      get().notify("Could not save your answer. Check your connection and answer again.", "error");
    }
  },

  quizNext: () => {
    const state = get();
    if (state.qReviewPending) return;
    const next = state.qIndex + 1;
    if (next >= state.quizQuestions.length) {
      set({ qDone: true });
      if (!state.qStreakChecked) {
        set({ qStreakChecked: true });
        void completePracticeStreak("quiz", state.quizQuestions.length, state.qCorrect, set, get);
      }
      return;
    }
    set({ qIndex: next, qSelected: null, qAnswered: false });
  },

  quizRestart: () => {
    void get().startStudy("quiz", get().activeDeckId);
  },

  dismissPracticeStreakPopup: () => set({ practiceStreakPopup: null }),

  loadAiQuizQuota: async () => loadAiQuizQuota(set),
  generateAiQuiz: async () => generateAiQuiz(set, get),

  setAiQuizQuestionCount: (count) =>
    set({
      aiQuizQuestionCount: Math.max(
        1,
        Math.min(AI_QUIZ_CONFIG.maxQuestionCount, Math.floor(count))
      ),
    }),

  toggleAiQuizType: (type) =>
    set((s) => {
      const on = s.aiQuizTypes.includes(type);
      if (on && s.aiQuizTypes.length === 1) return {};
      return {
        aiQuizTypes: on
          ? s.aiQuizTypes.filter((item) => item !== type)
          : [...s.aiQuizTypes, type],
        aiQuizError: "",
      };
    }),

  chatSend: async () => {
    const state = get();
    const text = state.chatInput.trim();
    if (!text || state.aiTyping) return;
    const history: ChatMsg[] = [...state.chat, { role: "user", text }];

    // The input buffer is NOT cleared here. Per the persistence directive the
    // user's text is only discarded once the request has actually settled, so
    // a failed send leaves it in the box to retry rather than losing it.
    set({ chat: history, aiTyping: true, chatError: "" });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (res.status === 429) {
        const d = await res.json().catch(() => ({ limit: 10 }));
        set((s) => ({
          chat: [
            ...s.chat,
            {
              role: "ai",
              text: `You have used all ${d.limit ?? 10} AI chat turns for today. Come back tomorrow!`,
            },
          ],
          chatInput: "",
          aiTyping: false,
        }));
        return;
      }

      if (!res.ok) throw new Error("chat_failed");

      const d = await res.json();
      set((s) => ({
        chat: [...s.chat, { role: "ai", text: d.reply || "…" }],
        chatInput: "",
        aiTyping: false,
      }));
    } catch {
      // Roll the pending turn back out of the transcript and keep the text in
      // the input so the user can press send again.
      set((s) => ({
        chat: s.chat.slice(0, -1),
        chatError: "Could not reach the AI. Your message was kept — try again.",
        aiTyping: false,
      }));
    }
  },

  setWritingImage: (dataUrl) => set({ writingImage: dataUrl, writingError: "" }),
  setWritingAnswer: (text) => set({ writingAnswer: text }),
  setWritingTaskType: (taskType) => set({ writingTaskType: taskType }),
  gradeWriting: async () => gradeWriting(set, get),
  loadWritingQuota: async () => loadWritingQuota(set),
  resetWriting: () => set({ writingResult: null, writingError: "" }),

  incSessionSize: () => {
    set((s) => ({
      sessionSize: Math.min(SESSION_SIZE.max, s.sessionSize + SESSION_SIZE.step),
    }));
    get().saveSettings();
  },
  decSessionSize: () => {
    set((s) => ({
      sessionSize: Math.max(SESSION_SIZE.min, s.sessionSize - SESSION_SIZE.step),
    }));
    get().saveSettings();
  },
    }),
    {
      name: "ttn-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        aiQuizQuestionCount: s.aiQuizQuestionCount,
        aiQuizTypes: s.aiQuizTypes,
      }),
    }
  )
);

