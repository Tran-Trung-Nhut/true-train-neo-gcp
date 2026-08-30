import { NextResponse } from "next/server";
import { readJsonBody, requireUser } from "@/lib/api/guard";
import { AI_LIMITS } from "@/lib/ai/config";
import { fenceUntrusted, getOriginLanguage, languageName } from "@/lib/ai/context";
import {
  buildConversationSystemPrompt,
  type ConversationWordContext,
} from "@/lib/ai/conversation-prompt";
import { generateContentWithFallback, hasGeminiKey, type GeminiTurn } from "@/lib/ai/gemini";
import { bumpUsage, checkQuota } from "@/lib/ai/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingMsg {
  role: "ai" | "user";
  text: string;
}

function cleanText(value: unknown, max = 240): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function parseMessages(value: unknown): IncomingMsg[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as { role?: unknown }).role;
      const text = cleanText((item as { text?: unknown }).text, 1000);
      if ((role !== "ai" && role !== "user") || !text) return null;
      return { role, text } as IncomingMsg;
    })
    .filter((item): item is IncomingMsg => item !== null);
}

function parseTargetWords(value: unknown): ConversationWordContext[] {
  if (!Array.isArray(value)) return [];
  const words: ConversationWordContext[] = [];
  for (const item of value.slice(0, 12)) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const word = cleanText(source.word, 48);
    if (!word) continue;
    words.push({
      word,
      pos: cleanText(source.pos, 32),
      defEn: cleanText(source.defEn, 120),
      defOrigin: cleanText(source.defOrigin, 120),
      example: cleanText(source.example, 160),
    });
  }
  return words;
}

export async function POST(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const body = await readJsonBody(request);
  const messages = parseMessages(body.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "missing messages" }, { status: 400 });
  }

  if (!(await hasGeminiKey())) {
    return NextResponse.json({
      reply: "I can hear you. Try one short answer: What did you do today?",
      simulated: true,
    });
  }

  // The old route skipped rate limiting whenever the Host header looked like
  // localhost. Host is caller-controlled, so that check is gone: the quota now
  // applies uniformly.
  const limit = AI_LIMITS.speaking;
  const quota = await checkQuota(uid, "speaking", limit);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", kind: "speaking", limit, used: quota.used, remaining: 0 },
      { status: 429 }
    );
  }

  const context =
    body.context && typeof body.context === "object"
      ? (body.context as Record<string, unknown>)
      : {};

  const language = languageName(await getOriginLanguage(uid));
  const systemPrompt = buildConversationSystemPrompt({
    deckName: cleanText(context.deckName, 60),
    deckLevel: cleanText(context.deckLevel, 30),
    voiceMode: true,
    originLanguage: language,
    targetWords: parseTargetWords(context.targetWords),
  });

  const contents: GeminiTurn[] = messages.slice(-12).map((message) => ({
    role: message.role === "ai" ? "model" : "user",
    parts: [
      {
        text:
          message.role === "user"
            ? fenceUntrusted("learner_speech", message.text)
            : message.text,
      },
    ],
  }));

  try {
    const result = await generateContentWithFallback(contents, {
      system: systemPrompt,
      maxTokens: 260,
      temperature: 0.78,
    });
    await bumpUsage(uid, "speaking");
    return NextResponse.json({
      reply: result.text.trim(),
      remaining: Math.max(0, limit - quota.used - 1),
    });
  } catch (error) {
    console.error("ai_speaking_failed", error);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
