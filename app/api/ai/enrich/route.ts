import { NextResponse } from "next/server";
import { readJsonBody, requireUser } from "@/lib/api/guard";
import { AI_LIMITS } from "@/lib/ai/config";
import { fenceUntrusted, getOriginLanguage, languageName } from "@/lib/ai/context";
import { generateText, hasGeminiKey } from "@/lib/ai/gemini";
import { bumpUsage, checkQuota } from "@/lib/ai/usage";
import { enrichEnglishWithFreeApis } from "@/lib/external/dictionary";
import { normalizePartOfSpeech } from "@/lib/part-of-speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface EnrichmentChoice {
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

export interface Enrichment extends EnrichmentChoice {
  input_type?: "english" | "origin";
  ai_enriched: boolean;
  enrichment_mode?: "ai" | "dictionary" | "simulated";
  sources?: string[];
  senses?: EnrichmentChoice[];
  candidates?: EnrichmentChoice[];
}

const ENRICH_PROMPT = (input: string, language: string) => `You are an IELTS vocabulary and collocation assistant for ${language}-speaking learners.
The user may enter either:
1) an English word, collocation, phrasal verb, idiom, or phrase to enrich, or
2) text in ${language} describing a meaning they want to express in English.

${fenceUntrusted("user_input", input)}

Return ONLY valid JSON, no markdown:
{
  "valid": true,
  "input_type": "english|origin",
  "entry_type": "word|collocation|phrasal_verb|idiom|phrase",
  "word": "chosen English headword or complete expression in lowercase",
  "suggestion": "",
  "sense_label": "short label for the selected meaning",
  "phonetic": "IPA",
  "part_of_speech": "verb|noun|adjective|adverb|collocation|phrase|phrasal verb|idiom",
  "definition": "clear English definition for the selected meaning",
  "definition_origin": "translation/explanation in ${language} for the selected meaning",
  "example": "natural IELTS-level sentence",
  "synonyms": ["w1","w2"],
  "ielts_band": 7,
  "topic_tags": ["t1"],
  "senses": [
    {
      "entry_type": "word|collocation|phrasal_verb|idiom|phrase",
      "sense_label": "short label",
      "phonetic": "IPA",
      "part_of_speech": "verb|noun|adjective|adverb|collocation|phrase|phrasal verb|idiom",
      "definition": "English definition",
      "definition_origin": "explanation in ${language}",
      "example": "IELTS-level sentence",
      "synonyms": ["w1","w2"],
      "ielts_band": 7,
      "topic_tags": ["t1"]
    }
  ],
  "candidates": [
    {
      "entry_type": "word|collocation|phrasal_verb|idiom|phrase",
      "word": "english candidate",
      "reason": "brief reason in ${language} why this fits",
      "phonetic": "IPA",
      "part_of_speech": "verb|noun|adjective|adverb|collocation|phrase|phrasal verb|idiom",
      "definition": "English definition",
      "definition_origin": "explanation in ${language}",
      "example": "IELTS-level sentence",
      "synonyms": ["w1","w2"],
      "ielts_band": 7,
      "topic_tags": ["t1"]
    }
  ]
}

Rules:
- Classify the lexical item before enriching it:
  * "make a decision", "heavy rain", and "take responsibility" are collocations.
  * "look after" is a phrasal verb.
  * "break the ice" is an idiom.
  * A free combination that is not conventional may be a phrase.
- For a direct English multi-word input, preserve the complete canonical expression in "word". Never replace it with only one component word.
- For a collocation, set entry_type and part_of_speech to "collocation". Define and translate the WHOLE collocation, not an individual component.
- A collocation example must contain the complete collocation, allowing only natural inflection such as take/takes/took/taken responsibility.
- Collocation synonyms must be alternatives for the whole meaning. Never return synonyms of only one component word.
- For collocations, return senses only when the same complete collocation genuinely has distinct meanings/usages. Do not put related collocations in senses.
- If the input is a valid single English word, set input_type to "english", set word to that headword, and return 2-5 useful senses only when it is genuinely polysemous. Use the most common meaning as the top-level result when no context is provided.
- If the input is in ${language} or is a description in that language, set input_type to "origin", return 3-5 natural English candidates, and copy the best candidate into the top-level fields. Prefer a conventional collocation when that is how native speakers normally express the idea.
- Candidate reasons must explain in ${language} whether the candidate is a word, collocation, phrasal verb, idiom, or phrase and why it fits.
- If the input is a misspelled English word, set valid:false, set suggestion to the likely spelling, and leave arrays empty.
- Only set valid:false for gibberish or clear misspellings. Descriptions in ${language} are valid.
- Do not invent an unnatural expression merely to sound academic. Natural usage and semantic accuracy come first.`;

function simulated(input: string): Enrichment {
  return {
    word: input,
    input_type: "english",
    sense_label: "",
    phonetic: "",
    part_of_speech: "",
    definition: "",
    definition_origin: "",
    example: `Try using "${input}" in a sentence.`,
    synonyms: [],
    ielts_band: 7,
    topic_tags: [],
    ai_enriched: false,
    enrichment_mode: "simulated",
    senses: [],
    candidates: [],
  };
}

function dictionaryOnlyNeedsAi(input: string) {
  return NextResponse.json({
    valid: false,
    requires_ai: true,
    input_type: "origin",
    enrichment_mode: "dictionary",
    ai_enriched: false,
    word: input,
    suggestion: "",
    senses: [],
    candidates: [],
  });
}

function isLikelyDirectEnglishLookup(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(text)) return false;

  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 3) return false;

  const lower = text.toLocaleLowerCase("en-US");
  const descriptionStarters = [
    "a word",
    "an expression",
    "the word",
    "how to",
    "what is",
    "means",
    "meaning",
    "someone who",
    "something that",
  ];
  return !descriptionStarters.some((starter) => lower.startsWith(starter));
}

function isDirectEnglishMultiword(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(text)) return false;
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 8;
}

const ENTRY_TYPE_TO_POS: Record<string, string> = {
  collocation: "collocation",
  phrasal_verb: "phrasal verb",
  "phrasal verb": "phrasal verb",
  idiom: "idiom",
  phrase: "phrase",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeAiChoice(value: unknown): Record<string, unknown> {
  const choice = { ...asRecord(value) };
  const entryType = typeof choice.entry_type === "string"
    ? choice.entry_type.trim().toLocaleLowerCase("en-US")
    : "";
  const mappedPos = ENTRY_TYPE_TO_POS[entryType];
  const currentPos = typeof choice.part_of_speech === "string"
    ? normalizePartOfSpeech(choice.part_of_speech)
    : "";

  if (mappedPos) choice.part_of_speech = mappedPos;
  else if (currentPos) choice.part_of_speech = currentPos;

  if (typeof choice.word === "string") {
    choice.word = choice.word.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  }
  return choice;
}

function normalizeAiPayload(value: unknown, input: string): Record<string, unknown> {
  const raw = asRecord(value);
  const normalized = normalizeAiChoice(raw);
  const inputType = raw.input_type === "origin" || raw.input_type === "vietnamese" ? "origin" : "english";

  if (inputType === "english" && raw.valid !== false && isDirectEnglishMultiword(input)) {
    normalized.word = input.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    const pos = typeof normalized.part_of_speech === "string"
      ? normalizePartOfSpeech(normalized.part_of_speech)
      : "";
    if (!pos || ["noun", "verb", "adjective", "adverb"].includes(pos)) {
      normalized.part_of_speech = "phrase";
    }
  }

  normalized.senses = Array.isArray(raw.senses)
    ? raw.senses.map((sense) => normalizeAiChoice(sense))
    : [];
  normalized.candidates = Array.isArray(raw.candidates)
    ? raw.candidates.map((candidate) => normalizeAiChoice(candidate))
    : [];
  return normalized;
}

async function runAiEnrich(input: string, uid: string) {
  if (!(await hasGeminiKey())) {
    return NextResponse.json({ ...simulated(input), simulated: true });
  }

  const limit = AI_LIMITS.enrich;
  const quota = await checkQuota(uid, "enrich", limit);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", kind: "enrich", limit, used: quota.used, remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const language = languageName(await getOriginLanguage(uid));
    const text = await generateText(ENRICH_PROMPT(input, language), {
      json: true,
      maxTokens: 1800,
    });
    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);
    const normalized = normalizeAiPayload(parsed, input);
    await bumpUsage(uid, "enrich");
    return NextResponse.json({
      ...normalized,
      valid: normalized.valid !== false,
      word: typeof normalized.word === "string" ? normalized.word : input,
      suggestion: typeof normalized.suggestion === "string" ? normalized.suggestion : "",
      senses: Array.isArray(normalized.senses) ? normalized.senses : [],
      candidates: Array.isArray(normalized.candidates) ? normalized.candidates : [],
      ai_enriched: true,
      enrichment_mode: "ai",
      simulated: false,
      remaining: Math.max(0, limit - quota.used - 1),
    });
  } catch (error) {
    console.error("ai_enrich_failed", error);
    return NextResponse.json({ ...simulated(input), simulated: true });
  }
}

export async function POST(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await readJsonBody(req);
  const input = typeof body.word === "string" ? body.word : typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return NextResponse.json({ error: "missing input" }, { status: 400 });
  }

  const trimmed = input.trim();
  const mode = body.mode === "ai" || body.mode === "dictionary" ? body.mode : "dictionary";

  if (mode === "dictionary" && !isLikelyDirectEnglishLookup(trimmed)) {
    return dictionaryOnlyNeedsAi(trimmed);
  }

  if (mode !== "ai" && isLikelyDirectEnglishLookup(trimmed)) {
    try {
      const dictionaryResult = await enrichEnglishWithFreeApis(trimmed);
      if (dictionaryResult.valid || mode === "dictionary" || !trimmed.includes(" ")) {
        return NextResponse.json({ ...dictionaryResult, simulated: false });
      }
    } catch {
      if (mode === "dictionary" || !trimmed.includes(" ")) {
        return NextResponse.json({ ...simulated(trimmed), enrichment_mode: "dictionary", simulated: true });
      }
    }
  }

  return runAiEnrich(trimmed, guard.user.uid);
}
