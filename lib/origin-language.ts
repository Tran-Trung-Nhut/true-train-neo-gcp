// The learner's own language. English words are explained in this language,
// and it is passed to the AI prompts so explanations come back in it.

export const ORIGIN_LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", english: "Vietnamese" },
  { code: "en", label: "English", english: "English" },
  { code: "zh", label: "中文", english: "Chinese" },
  { code: "ja", label: "日本語", english: "Japanese" },
  { code: "ko", label: "한국어", english: "Korean" },
  { code: "th", label: "ไทย", english: "Thai" },
  { code: "id", label: "Bahasa Indonesia", english: "Indonesian" },
  { code: "es", label: "Español", english: "Spanish" },
  { code: "pt", label: "Português", english: "Portuguese" },
  { code: "fr", label: "Français", english: "French" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "ru", label: "Русский", english: "Russian" },
  { code: "ar", label: "العربية", english: "Arabic" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
] as const;

export type OriginLanguage = (typeof ORIGIN_LANGUAGES)[number]["code"];

export const ORIGIN_LANGUAGE_CODES = ORIGIN_LANGUAGES.map((item) => item.code);

export const DEFAULT_ORIGIN_LANGUAGE: OriginLanguage = "vi";

export function isOriginLanguage(value: unknown): value is OriginLanguage {
  return typeof value === "string" && (ORIGIN_LANGUAGE_CODES as readonly string[]).includes(value);
}

export function normalizeOriginLanguage(value: unknown): OriginLanguage {
  return isOriginLanguage(value) ? value : DEFAULT_ORIGIN_LANGUAGE;
}

// English name of the language, for use inside AI prompts.
export function originLanguageName(code: OriginLanguage): string {
  return ORIGIN_LANGUAGES.find((item) => item.code === code)?.english ?? "Vietnamese";
}

