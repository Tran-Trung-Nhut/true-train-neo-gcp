import { NextResponse } from "next/server";
import { readJsonBody, requireUser } from "@/lib/api/guard";
import { AI_LIMITS } from "@/lib/ai/config";
import { getOriginLanguage, languageName } from "@/lib/ai/context";
import { generateContentWithFallback, hasGeminiKey } from "@/lib/ai/gemini";
import { QUIZ_SYSTEM, buildAiQuizPrompt } from "@/lib/ai/quiz-prompt";
import { parseAiQuizRequest, parseAiQuizResponse } from "@/lib/ai/quiz-validation";
import { bumpUsage, checkQuota } from "@/lib/ai/usage";
import { generateQuiz } from "@/lib/quiz";
import { AI_QUIZ_CONFIG } from "@/lib/quiz-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const request = parseAiQuizRequest(await readJsonBody(req));
  if (
    request.questionCount < 1 ||
    request.usableWordCount < AI_QUIZ_CONFIG.minOptionWords
  ) {
    return NextResponse.json({ error: "not_enough_words" }, { status: 400 });
  }

  // Without a key the app still works: the local generator produces a quiz.
  if (!(await hasGeminiKey())) {
    const questions = generateQuiz(
      request.targetCards,
      request.questionCount,
      request.cards
    );
    return NextResponse.json({
      questions,
      simulated: true,
      limit: AI_LIMITS.quiz,
      remaining: null,
      questionCount: questions.length,
      types: request.selectedTypes,
    });
  }

  const limit = AI_LIMITS.quiz;
  const quota = await checkQuota(uid, "quiz", limit);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", kind: "quiz", limit, used: quota.used, remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const language = languageName(await getOriginLanguage(uid));
    const result = await generateContentWithFallback(
      buildAiQuizPrompt(
        request.promptCards,
        request.targetIds,
        request.questionCount,
        request.selectedTypes,
        language
      ),
      {
        system: QUIZ_SYSTEM,
        json: true,
        maxTokens: AI_QUIZ_CONFIG.maxTokens,
        temperature: AI_QUIZ_CONFIG.temperature,
      }
    );

    const parsed = parseAiQuizResponse(result.text, request);
    if (parsed.length < Math.min(4, request.questionCount)) {
      return NextResponse.json({ error: "invalid_quiz" }, { status: 502 });
    }
    const questions = parsed.slice(0, request.questionCount);

    await bumpUsage(uid, "quiz");
    return NextResponse.json({
      questions,
      simulated: false,
      limit,
      remaining: Math.max(0, limit - quota.used - 1),
      questionCount: questions.length,
      types: request.selectedTypes,
    });
  } catch (error) {
    console.error("ai_quiz_failed", error);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const limit = AI_LIMITS.quiz;
  const quota = await checkQuota(guard.user.uid, "quiz", limit);
  return NextResponse.json({
    kind: "quiz",
    limit,
    used: quota.used,
    remaining: quota.remaining,
    simulated: !(await hasGeminiKey()),
  });
}
