export const AI_KINDS = ["enrich", "chat", "speaking", "quiz", "writing"] as const;
export type AiKind = (typeof AI_KINDS)[number];

export const AI_LIMITS = {
  enrich: 20,
  chat: 10,
  speaking: 20,
  quiz: 5,
  writing: 3,
} as const satisfies Record<AiKind, number>;
