// Search tokens — Q3 option (c).
//
// Postgres backed vocabulary search with ILIKE '%term%' across four columns.
// Firestore has no substring operator, so each word document carries a
// precomputed token array and search becomes an array-contains lookup.
//
// Tokens include prefixes of every word (2..12 chars) so typing "sust" still
// finds "sustainable" — the practical behaviour users expect from the old
// substring match. Infix matches ("tain") are the one thing not reproduced.

const MAX_TOKENS = 200;
const MIN_PREFIX = 2;
const MAX_PREFIX = 12;

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function words(text: string): string[] {
  const cleaned = normalize(text);
  return cleaned ? cleaned.split(/\s+/) : [];
}

export function buildSearchTokens(input: {
  word: string;
  partOfSpeech?: string;
  definition?: string;
  definitionOrigin?: string;
}): string[] {
  const source = [
    input.word ?? "",
    input.partOfSpeech ?? "",
    input.definition ?? "",
    input.definitionOrigin ?? "",
  ].join(" ");

  const tokens = new Set<string>();
  for (const token of words(source)) {
    if (token.length < MIN_PREFIX) continue;
    const limit = Math.min(token.length, MAX_PREFIX);
    for (let end = MIN_PREFIX; end <= limit; end++) {
      tokens.add(token.slice(0, end));
      if (tokens.size >= MAX_TOKENS) return [...tokens];
    }
    tokens.add(token);
    if (tokens.size >= MAX_TOKENS) return [...tokens];
  }
  return [...tokens];
}

// A query can carry only one array-contains filter, so the longest term drives
// the index lookup and any remaining terms are applied to the returned page.
export function parseSearchTerms(search?: string): {
  primary: string;
  rest: string[];
} {
  const terms = words(search ?? "")
    .filter((term) => term.length >= MIN_PREFIX)
    .map((term) => term.slice(0, MAX_PREFIX));
  if (terms.length === 0) return { primary: "", rest: [] };

  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const primary = sorted[0];
  const rest = terms.filter((term) => term !== primary);
  return { primary, rest };
}

export function matchesTerms(tokens: string[], terms: string[]): boolean {
  if (terms.length === 0) return true;
  const set = new Set(tokens);
  return terms.every((term) => set.has(term));
}
