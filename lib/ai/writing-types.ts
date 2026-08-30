export type WritingTaskType = 1 | 2;

export type WritingCriterionKey =
  | "task"
  | "coherence"
  | "lexical"
  | "grammar";

export interface WritingCriterion {
  key: WritingCriterionKey;
  name: string;
  band: number;
  feedback: string;
}

export interface WritingCorrection {
  original: string;
  suggestion: string;
  note: string;
}

export interface WritingAssessment {
  taskType: WritingTaskType;
  overall: number;
  criteria: WritingCriterion[];
  corrections: WritingCorrection[];
  summary: string;
  improvedVersion: string;
  wordCount: number;
  offTopic: boolean;
}

export const WRITING_CRITERIA: { key: WritingCriterionKey; name: string; short: string }[] = [
  { key: "task", name: "Task Achievement", short: "Task achievement" },
  { key: "coherence", name: "Coherence & Cohesion", short: "Coherence & cohesion" },
  { key: "lexical", name: "Lexical Resource", short: "Vocabulary" },
  { key: "grammar", name: "Grammatical Range & Accuracy", short: "Grammar" },
];

export const WRITING_TASK1_MIN_WORDS = 150;
export const WRITING_TASK2_MIN_WORDS = 250;

export function bandColor(band: number): string {
  if (band >= 7) return "var(--ok)";
  if (band >= 5.5) return "var(--accent)";
  if (band >= 4) return "#C7891A";
  return "var(--bad)";
}
