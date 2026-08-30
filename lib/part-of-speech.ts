export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "collocation",
  "phrase",
  "phrasal verb",
  "idiom",
  "pronoun",
  "preposition",
  "conjunction",
  "determiner",
  "interjection",
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

const POS_ALIASES: Record<string, PartOfSpeech> = {
  n: "noun",
  noun: "noun",
  nouns: "noun",
  v: "verb",
  verb: "verb",
  verbs: "verb",
  adj: "adjective",
  adjective: "adjective",
  adjectives: "adjective",
  adv: "adverb",
  adverb: "adverb",
  adverbs: "adverb",
  collocation: "collocation",
  collocations: "collocation",
  phrase: "phrase",
  phrases: "phrase",
  expression: "phrase",
  expressions: "phrase",
  "phrasal verb": "phrasal verb",
  "phrasal verbs": "phrasal verb",
  idiom: "idiom",
  idioms: "idiom",
  pron: "pronoun",
  pronoun: "pronoun",
  prep: "preposition",
  preposition: "preposition",
  conj: "conjunction",
  conjunction: "conjunction",
  det: "determiner",
  determiner: "determiner",
  interj: "interjection",
  interjection: "interjection",
};

export function normalizePartOfSpeech(value?: string | null): string {
  const key = value?.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ") ?? "";
  return POS_ALIASES[key] ?? "";
}
