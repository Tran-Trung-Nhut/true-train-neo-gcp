import {
  WRITING_CRITERIA,
  type WritingAssessment,
  type WritingCorrection,
  type WritingCriterion,
  type WritingCriterionKey,
  type WritingTaskType,
} from "./writing-types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBand(value: unknown): number {
  const band = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(band)) return 0;
  return Math.min(9, Math.max(0, Math.round(band * 2) / 2));
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function roundHalfBand(mean: number): number {
  return Math.min(9, Math.max(0, Math.round(mean * 2) / 2));
}

function parseCriteria(value: unknown): WritingCriterion[] {
  const list = Array.isArray(value) ? value : [];
  const byKey = new Map<string, Record<string, unknown>>();
  for (const item of list) {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const key = asString(record.key).toLowerCase();
      if (key) byKey.set(key, record);
    }
  }
  return WRITING_CRITERIA.map(({ key, name }) => {
    const record = byKey.get(key) ?? {};
    return {
      key: key as WritingCriterionKey,
      name,
      band: asBand(record.band),
      feedback: asString(record.feedback),
    };
  });
}

function parseCorrections(value: unknown): WritingCorrection[] {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item): WritingCorrection | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const original = asString(record.original);
      const suggestion = asString(record.suggestion);
      if (!original && !suggestion) return null;
      return { original, suggestion, note: asString(record.note) };
    })
    .filter((item): item is WritingCorrection => item !== null)
    .slice(0, 8);
}

export function parseWritingAssessment(
  text: string,
  taskType: WritingTaskType,
  wordCount: number
): WritingAssessment {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as Record<string, unknown>;

  const offTopic = parsed.offTopic === true;
  const criteria = parseCriteria(parsed.criteria);
  const mean = criteria.reduce((sum, item) => sum + item.band, 0) / criteria.length;

  return {
    taskType,
    overall: roundHalfBand(mean),
    criteria,
    corrections: parseCorrections(parsed.corrections),
    summary: asString(parsed.summary),
    improvedVersion: asString(parsed.improvedVersion),
    wordCount,
    offTopic,
  };
}
