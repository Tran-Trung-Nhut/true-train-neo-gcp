export type WordStatus = "new" | "learning" | "learned";

export interface Word {
  word: string;
  ipa: string;
  pos: string;
  defEn: string;
  defOrigin: string;
  exEn: string;
  syns: string;
  band: number;
  status: WordStatus;
}

export interface Deck {
  id: string;
  name: string;
  level: "Academic" | "General";
  desc: string;
  total: number;
  learned: number;
  due: number;
  /** False when the server could not read this deck's counts; totals are then
   *  placeholders and must not be rendered as real numbers. */
  statsAvailable: boolean;
}

export interface QuizOption {
  t: string;
  c: boolean;
}

export interface QuizQuestion {
  cardId: string;
  label: string;
  q: string;
  options: QuizOption[];
  def: string;
  ex: string;
}

export const statusMap: Record<WordStatus, [string, string]> = {
  new: ["new", "var(--faint)"],
  learning: ["learning", "var(--accent)"],
  learned: ["learned", "var(--ok)"],
};

export interface ChatSeg {
  hl: boolean;
  text: string;
}

export function parseSegs(t: string): ChatSeg[] {
  return t
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((s) =>
      s.startsWith("[") && s.endsWith("]")
        ? { hl: true, text: s.slice(1, -1) }
        : { hl: false, text: s }
    );
}
