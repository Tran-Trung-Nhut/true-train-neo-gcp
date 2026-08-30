import { QuizQuestion } from "./data";
import { StudyCard } from "./queries";
import { shuffle } from "./shuffle";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clozeExample(example: string, word: string): string {
  const trimmed = example.trim();
  if (!trimmed) return "";

  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  if (pattern.test(trimmed)) return trimmed.replace(pattern, "___");

  return trimmed;
}

type Prompt = { label: string; q: string; def: string; ex: string };

function buildPrompt(card: StudyCard): Prompt {
  const prompts: Prompt[] = [];

  if (card.defOrigin.trim()) {
    prompts.push({
      label: "meaning → word",
      q: `Which word means: "${card.defOrigin.trim()}"?`,
      def: card.defOrigin.trim(),
      ex: card.exEn || "",
    });
  }

  if (card.defEn.trim()) {
    prompts.push({
      label: "definition → word",
      q: `Which word matches this definition? "${card.defEn.trim()}"`,
      def: card.defEn.trim(),
      ex: card.exEn || "",
    });
  }

  if (card.exEn.trim()) {
    const cloze = clozeExample(card.exEn, card.word);
    const hasBlank = cloze.includes("___");
    prompts.push({
      label: "cloze → word",
      q: hasBlank
        ? `Which word best completes this example? "${cloze}"`
        : `Which word is used in this example? "${cloze}"`,
      def: `Answer: ${card.word}`,
      ex: card.exEn || "",
    });
  }

  return prompts[Math.floor(Math.random() * prompts.length)];
}

function shortText(text: string, max = 34): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function optionLabel(card: StudyCard, wordCounts: Map<string, number>): string {
  if ((wordCounts.get(card.word) ?? 0) <= 1) return card.word;

  const hint = card.defOrigin || card.defEn || card.pos || "another meaning";
  const parts = [card.pos, shortText(hint)].filter(Boolean);
  return `${card.word} (${parts.join(" · ")})`;
}

export function generateQuiz(
  cards: StudyCard[],
  count = 6,
  optionCards: StudyCard[] = cards
): QuizQuestion[] {
  const usable = cards.filter((c) => c.defOrigin.trim() || c.defEn.trim() || c.exEn.trim());
  const optionPool = optionCards.filter((c) => c.word.trim());
  if (usable.length === 0) return [];
  if (new Set(optionPool.map((c) => c.word.toLowerCase())).size < 2) return [];

  const wordCounts = optionPool.reduce((acc, card) => {
    acc.set(card.word, (acc.get(card.word) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const pool = shuffle(usable).slice(0, count);
  return pool.map((card) => {
    const targetLabel = optionLabel(card, wordCounts);
    const usedLabels = new Set([targetLabel.toLowerCase()]);
    const others: StudyCard[] = [];
    for (const candidate of shuffle(optionPool.filter((c) => c.word !== card.word))) {
      const label = optionLabel(candidate, wordCounts).toLowerCase();
      if (usedLabels.has(label)) continue;
      usedLabels.add(label);
      others.push(candidate);
      if (others.length === 3) break;
    }
    const prompt = buildPrompt(card);
    const options = shuffle([
      { t: targetLabel, c: true },
      ...others.map((o) => ({ t: optionLabel(o, wordCounts), c: false })),
    ]);
    return {
      cardId: card.id,
      label: prompt.label,
      q: prompt.q,
      options,
      def: prompt.def,
      ex: prompt.ex,
    };
  });
}
