import type { QuizOption, QuizQuestion } from "@/lib/data";
import type { StudyCard } from "@/lib/queries";
import { shuffle } from "@/lib/shuffle";
import {
  AI_QUIZ_CONFIG,
  AI_QUIZ_TYPES,
  type AiQuizType,
} from "@/lib/quiz-config";

type IncomingCard = Partial<StudyCard>;

export interface ParsedAiQuizRequest {
  cards: StudyCard[];
  promptCards: StudyCard[];
  targetCards: StudyCard[];
  targetIds: Set<string>;
  selectedTypes: AiQuizType[];
  questionCount: number;
  usableWordCount: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asQuestionCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(count)) return AI_QUIZ_CONFIG.defaultQuestionCount;
  return Math.max(1, Math.min(AI_QUIZ_CONFIG.maxQuestionCount, Math.floor(count)));
}

function asQuizTypes(value: unknown): AiQuizType[] {
  if (!Array.isArray(value)) return [...AI_QUIZ_TYPES];
  const selected = value.filter((item): item is AiQuizType =>
    typeof item === "string" && AI_QUIZ_TYPES.includes(item as AiQuizType)
  );
  return selected.length ? [...new Set(selected)] : [...AI_QUIZ_TYPES];
}

function asCards(value: unknown): StudyCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): StudyCard | null => {
      const card = (item ?? {}) as IncomingCard;
      const id = asString(card.id);
      const word = asString(card.word);
      if (!id || !word) return null;
      return {
        id,
        reviewId: typeof card.reviewId === "string" ? card.reviewId : null,
        easeFactor: typeof card.easeFactor === "number" ? card.easeFactor : 2.5,
        intervalDays: typeof card.intervalDays === "number" ? card.intervalDays : 0,
        repetitions: typeof card.repetitions === "number" ? card.repetitions : 0,
        dueDate: typeof card.dueDate === "string" ? card.dueDate : null,
        totalReviews: typeof card.totalReviews === "number" ? card.totalReviews : 0,
        createdAt: typeof card.createdAt === "string" ? card.createdAt : "",
        word,
        ipa: asString(card.ipa),
        pos: asString(card.pos),
        defEn: asString(card.defEn),
        defOrigin: asString(card.defOrigin),
        exEn: asString(card.exEn),
        syns: asString(card.syns),
        band: typeof card.band === "number" && Number.isFinite(card.band) ? card.band : 0,
        status: card.status === "learning" || card.status === "learned" ? card.status : "new",
      };
    })
    .filter((card): card is StudyCard => card !== null);
}

export function comparableText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseAiQuizRequest(value: unknown): ParsedAiQuizRequest {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const cards = asCards(body.cards);
  const requestedTargetIds = new Set(
    Array.isArray(body.targetIds) ? body.targetIds.map(asString).filter(Boolean) : []
  );
  const eligibleTargets = cards.filter(
    (card) => requestedTargetIds.has(card.id) && !!(card.defOrigin || card.defEn || card.exEn)
  );
  const questionCount = Math.min(asQuestionCount(body.questionCount), eligibleTargets.length);
  const targetCards = eligibleTargets.slice(0, questionCount);
  const targetIds = new Set(targetCards.map((card) => card.id));
  const promptCards = [
    ...targetCards,
    ...shuffle(cards.filter((card) => !targetIds.has(card.id))),
  ].slice(0, AI_QUIZ_CONFIG.maxPromptWords);

  return {
    cards,
    promptCards,
    targetCards,
    targetIds,
    selectedTypes: asQuizTypes(body.types),
    questionCount,
    usableWordCount: new Set(cards.map((card) => comparableText(card.word))).size,
  };
}

function isCopiedSource(question: string, card: StudyCard): boolean {
  const normalizedQuestion = comparableText(question);
  if (!normalizedQuestion) return true;

  const target = comparableText(card.word);
  if (target && ` ${normalizedQuestion} `.includes(` ${target} `)) return true;

  return [card.defEn, card.defOrigin, card.exEn].filter(Boolean).some((source) => {
    const normalizedSource = comparableText(source);
    if (normalizedSource.length < 20) return false;
    if (normalizedQuestion.includes(normalizedSource)) return true;

    const sourceTokens = new Set(normalizedSource.split(" ").filter((token) => token.length > 2));
    if (sourceTokens.size < 5) return false;
    const questionTokens = new Set(normalizedQuestion.split(" "));
    const sharedTokens = [...sourceTokens].filter((token) => questionTokens.has(token)).length;
    return sharedTokens / sourceTokens.size >= 0.8;
  });
}

function normalizeOption(value: unknown): QuizOption | null {
  const option = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const text = asString(option.t ?? option.text ?? option.option);
  if (!text) return null;
  return { t: text.slice(0, 90), c: option.c === true || option.correct === true };
}

function normalizeQuestion(
  value: unknown,
  cardsById: Map<string, StudyCard>,
  allowedWords: Set<string>,
  selectedTypes: AiQuizType[]
): QuizQuestion | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const cardId = asString(record.word_id ?? record.cardId);
  const card = cardsById.get(cardId);
  const label = asString(record.label) as AiQuizType;
  const question = asString(record.q ?? record.question);
  if (!card || !selectedTypes.includes(label) || !question || isCopiedSource(question, card)) {
    return null;
  }

  const options = Array.isArray(record.options)
    ? record.options.map(normalizeOption).filter((option): option is QuizOption => option !== null)
    : [];
  const uniqueOptions = options.filter(
    (option, index) => options.findIndex(
      (candidate) => comparableText(candidate.t) === comparableText(option.t)
    ) === index
  );
  if (uniqueOptions.length !== 4 || uniqueOptions.filter((option) => option.c).length !== 1) {
    return null;
  }
  if (uniqueOptions.some((option) => !allowedWords.has(comparableText(option.t)))) return null;

  const correctOption = uniqueOptions.find((option) => option.c);
  if (!correctOption || comparableText(correctOption.t) !== comparableText(card.word)) return null;

  return {
    cardId,
    label,
    q: question.slice(0, 320),
    options: shuffle(uniqueOptions),
    def: asString(record.def ?? record.explanation).slice(0, 260),
    ex: asString(record.ex ?? record.example).slice(0, 220),
  };
}

export function parseAiQuizResponse(
  text: string,
  request: ParsedAiQuizRequest
): QuizQuestion[] {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { questions?: unknown };
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const cardsById = new Map(request.targetCards.map((card) => [card.id, card]));
  const allowedWords = new Set(request.cards.map((card) => comparableText(card.word)));
  const usedCardIds = new Set<string>();
  const usedQuestions = new Set<string>();

  return rawQuestions
    .map((question) =>
      normalizeQuestion(question, cardsById, allowedWords, request.selectedTypes)
    )
    .filter((question): question is QuizQuestion => {
      if (!question) return false;
      const normalizedQuestion = comparableText(question.q);
      if (usedCardIds.has(question.cardId) || usedQuestions.has(normalizedQuestion)) return false;
      usedCardIds.add(question.cardId);
      usedQuestions.add(normalizedQuestion);
      return true;
    });
}
