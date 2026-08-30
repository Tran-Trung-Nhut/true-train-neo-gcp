import type { Rating } from "./sm2";

export const STUDY_ORDERS = {
  sm2: "SM-2",
  random: "random",
  alpha: "A→Z",
} as const;

export type StudyOrder = keyof typeof STUDY_ORDERS;
export const STUDY_ORDER_KEYS = Object.keys(STUDY_ORDERS) as StudyOrder[];

export const SESSION_SIZE = {
  default: 20,
  min: 5,
  max: 50,
  step: 5,
} as const;

export const RATE_LEVELS = ["again", "hard", "good", "easy"] as const;
export type RateLevel = (typeof RATE_LEVELS)[number];

export const RATING_BY_LEVEL: Record<RateLevel, Rating> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

export const STUDY_PICKER_MODES = ["flashcard", "quiz"] as const;
export type StudyPickerMode = (typeof STUDY_PICKER_MODES)[number];
