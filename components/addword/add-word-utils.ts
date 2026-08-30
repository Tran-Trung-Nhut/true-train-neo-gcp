import type { EnrichChoice, EnrichResult } from "@/lib/store";

export function emptyEnrichResult(result: EnrichResult | null): EnrichResult {
  return result ?? {
    word: "",
    sense_label: "",
    reason: "",
    phonetic: "",
    part_of_speech: "",
    definition: "",
    definition_origin: "",
    example: "",
    synonyms: [],
    ielts_band: 7,
    topic_tags: [],
    senses: [],
    candidates: [],
  };
}

export function mergeEnrichChoice(base: EnrichResult, choice: EnrichChoice): EnrichResult {
  return {
    ...base,
    ...choice,
    word: choice.word ?? base.word,
    synonyms: choice.synonyms.length ? choice.synonyms : base.synonyms,
    topic_tags: choice.topic_tags.length ? choice.topic_tags : base.topic_tags,
    senses: base.senses,
    candidates: base.candidates,
  };
}

export function formatSenseBody(choice: EnrichChoice): string {
  const definition = choice.definition_origin || choice.definition;
  return choice.example ? `${definition} - Example: ${choice.example}` : definition;
}
