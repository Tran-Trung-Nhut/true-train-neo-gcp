import {
  getDatamuseAntonyms,
  getDatamuseSpellingSuggestions,
  getDatamuseSynonyms,
} from "./datamuse";
import { normalizePartOfSpeech } from "@/lib/part-of-speech";

export interface ExternalEnrichmentChoice {
  word?: string;
  sense_label?: string;
  reason?: string;
  phonetic: string;
  part_of_speech: string;
  definition: string;
  definition_origin: string;
  example: string;
  synonyms: string[];
  ielts_band: number;
  topic_tags: string[];
}

export interface ExternalEnrichment extends ExternalEnrichmentChoice {
  valid: boolean;
  suggestion: string;
  input_type: "english";
  ai_enriched: false;
  enrichment_mode: "dictionary";
  sources: string[];
  senses: ExternalEnrichmentChoice[];
  candidates: ExternalEnrichmentChoice[];
  antonyms: string[];
  audio: string;
}

interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryDefinition {
  definition?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryEntry {
  word?: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings?: DictionaryMeaning[];
}

const DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

function cleanWord(input: string): string {
  return input.trim().toLocaleLowerCase("en-US");
}

function uniq(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function firstAudio(entries: DictionaryEntry[]): string {
  for (const entry of entries) {
    for (const phonetic of entry.phonetics ?? []) {
      if (phonetic.audio?.trim()) return phonetic.audio.trim();
    }
  }
  return "";
}

function firstPhonetic(entries: DictionaryEntry[]): string {
  for (const entry of entries) {
    if (entry.phonetic?.trim()) return entry.phonetic.trim();
    for (const phonetic of entry.phonetics ?? []) {
      if (phonetic.text?.trim()) return phonetic.text.trim();
    }
  }
  return "";
}

function choiceFromDefinition(
  word: string,
  phonetic: string,
  meaning: DictionaryMeaning,
  definition: DictionaryDefinition,
  senseLabel: string,
  extraSynonyms: string[] = []
): ExternalEnrichmentChoice {
  const partOfSpeech = normalizePartOfSpeech(meaning.partOfSpeech) || meaning.partOfSpeech?.trim() || "";
  return {
    word,
    sense_label: senseLabel,
    reason: "",
    phonetic,
    part_of_speech: partOfSpeech,
    definition: definition.definition?.trim() ?? "",
    definition_origin: "",
    example: definition.example?.trim() ?? "",
    synonyms: uniq([...(definition.synonyms ?? []), ...(meaning.synonyms ?? []), ...extraSynonyms]).slice(0, 8),
    ielts_band: 6,
    topic_tags: [],
  };
}

function collectSenses(entries: DictionaryEntry[], word: string, phonetic: string, synonyms: string[]) {
  const senses: ExternalEnrichmentChoice[] = [];
  const seen = new Set<string>();
  const countsByPos = new Map<string, number>();

  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      const partOfSpeech = meaning.partOfSpeech?.trim() || "unknown";
      const labelPart = meaning.partOfSpeech?.trim() || "sense";
      for (const definition of meaning.definitions ?? []) {
        const definitionText = definition.definition?.trim();
        if (!definitionText) continue;

        const key = `${partOfSpeech.toLocaleLowerCase("en-US")}::${definitionText.toLocaleLowerCase("en-US")}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const count = (countsByPos.get(partOfSpeech) ?? 0) + 1;
        countsByPos.set(partOfSpeech, count);
        const senseLabel = `${labelPart} - sense ${count}`;
        senses.push(choiceFromDefinition(word, phonetic, meaning, definition, senseLabel, synonyms));
        if (senses.length >= 10) return senses;
      }
    }
  }
  return senses;
}

async function fetchDictionaryEntries(word: string): Promise<DictionaryEntry[]> {
  try {
    const res = await fetch(`${DICTIONARY_BASE}/${encodeURIComponent(word)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as DictionaryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function enrichEnglishWithFreeApis(input: string): Promise<ExternalEnrichment> {
  const lookup = cleanWord(input);
  const [entries, datamuseSynonyms, datamuseAntonyms] = await Promise.all([
    fetchDictionaryEntries(lookup),
    getDatamuseSynonyms(lookup),
    getDatamuseAntonyms(lookup),
  ]);

  const word = cleanWord(entries[0]?.word || lookup);
  const phonetic = firstPhonetic(entries);
  const audio = firstAudio(entries);
  const senses = collectSenses(entries, word, phonetic, datamuseSynonyms);
  const primary = senses[0];

  if (!primary) {
    const suggestions = await getDatamuseSpellingSuggestions(lookup);
    return {
      valid: false,
      suggestion: suggestions[0] ?? "",
      input_type: "english",
      ai_enriched: false,
      enrichment_mode: "dictionary",
      sources: ["dictionaryapi", "datamuse"],
      word: lookup,
      sense_label: "",
      reason: "",
      phonetic: "",
      part_of_speech: "",
      definition: "",
      definition_origin: "",
      example: "",
      synonyms: [],
      antonyms: [],
      ielts_band: 6,
      topic_tags: [],
      senses: [],
      candidates: [],
      audio: "",
    };
  }

  const synonyms = uniq([...primary.synonyms, ...datamuseSynonyms]).slice(0, 8);
  return {
    ...primary,
    valid: true,
    suggestion: "",
    input_type: "english",
    ai_enriched: false,
    enrichment_mode: "dictionary",
    sources: ["dictionaryapi", "datamuse"],
    word,
    synonyms,
    antonyms: datamuseAntonyms.slice(0, 8),
    senses: senses.map((sense) => ({
      ...sense,
      synonyms: uniq([...sense.synonyms, ...datamuseSynonyms]).slice(0, 8),
    })),
    candidates: [],
    audio,
  };
}
