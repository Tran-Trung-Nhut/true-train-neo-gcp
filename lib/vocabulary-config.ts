export const VOCABULARY_PAGE_SIZE = 12;

export const WORD_FILTERS = [
  ["all", "all"],
  ["new", "new"],
  ["learning", "learning"],
  ["learned", "learned"],
] as const;

export type WordFilter = (typeof WORD_FILTERS)[number][0];
