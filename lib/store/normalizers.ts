import type { QuizOption, QuizQuestion } from "../data";
import { normalizePartOfSpeech } from "../part-of-speech";
import type { StudyCard } from "../queries";
import type { EnrichChoice } from "./types";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

export function replaceCard(cards: StudyCard[], updated: StudyCard): StudyCard[] {
  return cards.map((card) => (card.id === updated.id ? updated : card));
}

function normalizeQuizOption(value: unknown): QuizOption | null {
  const option = asRecord(value);
  const text = asString(option.t).trim();
  return text ? { t: text, c: option.c === true } : null;
}

export function normalizeQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): QuizQuestion | null => {
      const question = asRecord(item);
      const options = Array.isArray(question.options)
        ? question.options
            .map(normalizeQuizOption)
            .filter((option): option is QuizOption => option !== null)
        : [];
      const uniqueOptions = options.filter(
        (option, index) =>
          options.findIndex(
            (candidate) => candidate.t.toLowerCase() === option.t.toLowerCase()
          ) === index
      );
      const cardId = asString(question.cardId).trim();
      const label = asString(question.label).trim();
      const text = asString(question.q).trim();
      if (
        !cardId ||
        !label ||
        !text ||
        uniqueOptions.length !== 4 ||
        uniqueOptions.filter((option) => option.c).length !== 1
      ) {
        return null;
      }
      return {
        cardId,
        label,
        q: text,
        options: uniqueOptions,
        def: asString(question.def),
        ex: asString(question.ex),
      };
    })
    .filter((question): question is QuizQuestion => question !== null);
}

function asBand(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const band = Number(value);
  return Number.isFinite(band) && band > 0 ? band : 7;
}

export function normalizeEnrichChoice(value: unknown): EnrichChoice {
  const choice = asRecord(value);
  return {
    word: asString(choice.word).trim(),
    sense_label: asString(choice.sense_label).trim(),
    reason: asString(choice.reason).trim(),
    phonetic: asString(choice.phonetic),
    part_of_speech: normalizePartOfSpeech(asString(choice.part_of_speech)),
    definition: asString(choice.definition),
    definition_origin: asString(choice.definition_origin),
    example: asString(choice.example),
    synonyms: asStringArray(choice.synonyms),
    ielts_band: asBand(choice.ielts_band),
    topic_tags: asStringArray(choice.topic_tags),
  };
}

export function normalizeEnrichChoices(
  value: unknown,
  requireWord = false
): EnrichChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeEnrichChoice)
    .filter((choice) => !requireWord || !!choice.word?.trim())
    .slice(0, 5);
}
