export interface DatamuseWord {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
}

const DATAMUSE_BASE = "https://api.datamuse.com/words";

async function fetchWords(params: Record<string, string | number>): Promise<DatamuseWord[]> {
  const url = new URL(DATAMUSE_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => ({
        word: typeof item?.word === "string" ? item.word : "",
        score: typeof item?.score === "number" ? item.score : undefined,
        tags: Array.isArray(item?.tags) ? item.tags.filter((x: unknown) => typeof x === "string") : [],
        defs: Array.isArray(item?.defs) ? item.defs.filter((x: unknown) => typeof x === "string") : [],
      }))
      .filter((item) => item.word);
  } catch {
    return [];
  }
}

export async function getDatamuseSynonyms(word: string, max = 8): Promise<string[]> {
  const rows = await fetchWords({ rel_syn: word, max });
  return rows.map((row) => row.word);
}

export async function getDatamuseAntonyms(word: string, max = 8): Promise<string[]> {
  const rows = await fetchWords({ rel_ant: word, max });
  return rows.map((row) => row.word);
}

export async function getDatamuseSpellingSuggestions(word: string, max = 3): Promise<string[]> {
  const rows = await fetchWords({ sp: word, md: "d", max });
  return rows.map((row) => row.word).filter((candidate) => candidate.toLowerCase() !== word.toLowerCase());
}
