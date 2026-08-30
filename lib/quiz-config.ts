export const AI_QUIZ_TYPES = [
  "meaning → word",
  "definition → word",
  "cloze → word",
  "synonym → word",
  "context → word",
] as const;

export type AiQuizType = (typeof AI_QUIZ_TYPES)[number];

export const AI_QUIZ_CONFIG = {
  defaultQuestionCount: 8,
  maxQuestionCount: 10,
  maxPromptWords: 24,
  minOptionWords: 4,
  maxTokens: 3600,
  temperature: 0.85,
  questionChoices: [5, 8, 10],
} as const;
