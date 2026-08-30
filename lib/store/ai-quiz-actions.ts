import { AI_LIMITS } from "../ai/config";
import { AI_QUIZ_CONFIG } from "../quiz-config";
import { isCardDue } from "../study";
import { asRecord, normalizeQuizQuestions } from "./normalizers";
import type { StoreGet, StoreSet } from "./types";

export async function loadAiQuizQuota(set: StoreSet): Promise<void> {
  set({ aiQuizQuotaLoading: true, aiQuizError: "" });
  try {
    const response = await fetch("/api/ai/quiz", { credentials: "same-origin" });
    const data = asRecord(await response.json().catch(() => ({})));
    set({
      aiQuizQuotaLoading: false,
      aiQuizLimit: response.ok && typeof data.limit === "number" ? data.limit : null,
      aiQuizRemaining: response.ok && typeof data.remaining === "number" ? data.remaining : null,
      aiQuizSimulated: response.ok && data.simulated === true,
    });
  } catch {
    set({ aiQuizQuotaLoading: false });
  }
}

export async function generateAiQuiz(set: StoreSet, get: StoreGet): Promise<void> {
  const state = get();
  const targetCards = state.studyCards.filter(
    (card) => isCardDue(card) && !!(card.defOrigin || card.defEn || card.exEn)
  );
  const deckCards = state.studyDeckCards;
  if (targetCards.length === 0) {
    set({ aiQuizError: "No new or due words in this deck right now." });
    return;
  }
  if (
    new Set(deckCards.map((card) => card.word.toLowerCase())).size <
    AI_QUIZ_CONFIG.minOptionWords
  ) {
    set({
      aiQuizError: `You need at least ${AI_QUIZ_CONFIG.minOptionWords} different words in the deck to build an AI quiz.`,
    });
    return;
  }

  const questionCount = Math.min(
    state.aiQuizQuestionCount,
    targetCards.length,
    AI_QUIZ_CONFIG.maxQuestionCount
  );
  set({ aiQuizLoading: true, aiQuizError: "" });

  try {
    const response = await fetch("/api/ai/quiz", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        questionCount,
        types: state.aiQuizTypes,
        targetIds: targetCards.map((card) => card.id),
        cards: deckCards.map((card) => ({
          id: card.id,
          word: card.word,
          ipa: card.ipa,
          pos: card.pos,
          defEn: card.defEn,
          defOrigin: card.defOrigin,
          exEn: card.exEn,
          syns: card.syns,
          band: card.band,
          status: card.status,
        })),
      }),
    });
    const data = asRecord(await response.json().catch(() => ({})));

    if (response.status === 429) {
      const limit = typeof data.limit === "number" ? data.limit : AI_LIMITS.quiz;
      set({
        aiQuizLoading: false,
        aiQuizError: `You have used all ${limit} AI quiz generations for today.`,
        aiQuizLimit: limit,
        aiQuizRemaining: 0,
      });
      return;
    }
    if (!response.ok) {
      set({
        aiQuizLoading: false,
        aiQuizError: "Could not build the AI quiz. Try again later, or use the standard quiz.",
      });
      return;
    }

    const questions = normalizeQuizQuestions(data.questions);
    if (questions.length < Math.min(4, questionCount)) {
      set({
        aiQuizLoading: false,
        aiQuizError: "The AI did not return enough usable questions. Try generating again.",
      });
      return;
    }

    set({
      quizQuestions: questions,
      quizSource: "ai",
      aiQuizLoading: false,
      aiQuizError: "",
      aiQuizLimit: typeof data.limit === "number" ? data.limit : get().aiQuizLimit,
      aiQuizRemaining: typeof data.remaining === "number" ? data.remaining : null,
      aiQuizSimulated: data.simulated === true,
      qIndex: 0,
      qSelected: null,
      qAnswered: false,
      qReviewPending: false,
      qCorrect: 0,
      qDone: false,
      qWrong: [],
      qStreakChecked: false,
      practiceStreakPopup: null,
    });
  } catch {
    set({
      aiQuizLoading: false,
      aiQuizError: "Connection error while building the AI quiz. Please try again.",
    });
  }
}
