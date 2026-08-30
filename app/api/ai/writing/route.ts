import { NextResponse } from "next/server";
import { readJsonBody, requireUser } from "@/lib/api/guard";
import { AI_LIMITS } from "@/lib/ai/config";
import { getOriginLanguage, languageName } from "@/lib/ai/context";
import { generateContentWithFallback, hasGeminiKey } from "@/lib/ai/gemini";
import { bumpUsage, checkQuota } from "@/lib/ai/usage";
import { WRITING_SYSTEM, buildWritingParts } from "@/lib/ai/writing-prompt";
import { countWords, parseWritingAssessment } from "@/lib/ai/writing-validation";
import type { WritingTaskType } from "@/lib/ai/writing-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ANSWER_CHARS = 8000;
const MAX_IMAGE_CHARS = 7_000_000; // ~5MB image encoded as base64
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic"]);

// Grading reads the task prompt out of an uploaded image, so the MIME type is
// validated against an allowlist rather than trusting the data: URL label.
function imageMimeType(dataUrl: string): string {
  const match = /^data:([^;,]+);base64,/i.exec(dataUrl);
  return match ? match[1].toLowerCase() : "";
}

export async function POST(req: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const uid = guard.user.uid;

  const body = await readJsonBody(req);
  const answer = typeof body.answer === "string" ? body.answer.slice(0, MAX_ANSWER_CHARS) : "";
  const imageDataUrl = typeof body.image === "string" ? body.image : "";
  const taskType: WritingTaskType = body.taskType === 2 ? 2 : 1;
  const wordCount = countWords(answer);

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(imageMimeType(imageDataUrl))) {
    return NextResponse.json({ error: "unsupported_image_type" }, { status: 415 });
  }
  if (imageDataUrl.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }
  if (wordCount < 20) {
    return NextResponse.json({ error: "answer_too_short" }, { status: 400 });
  }

  if (!(await hasGeminiKey())) {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  const limit = AI_LIMITS.writing;
  const quota = await checkQuota(uid, "writing", limit);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", kind: "writing", limit, used: quota.used, remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const language = languageName(await getOriginLanguage(uid));

    // Gemini 3.6 Flash is natively multimodal, so grading uses the same
    // fallback ladder as every text route — there is no separate vision path.
    const result = await generateContentWithFallback(
      buildWritingParts(taskType, answer, imageDataUrl, wordCount, language),
      { system: WRITING_SYSTEM, json: true, maxTokens: 2800, temperature: 0.3 }
    );

    const assessment = parseWritingAssessment(result.text, taskType, wordCount);
    if (!assessment.criteria.some((item) => item.band > 0)) {
      return NextResponse.json({ error: "invalid_assessment" }, { status: 502 });
    }

    await bumpUsage(uid, "writing");
    return NextResponse.json({
      assessment,
      limit,
      remaining: Math.max(0, limit - quota.used - 1),
    });
  } catch (error) {
    console.error("ai_writing_failed", error);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const limit = AI_LIMITS.writing;
  const quota = await checkQuota(guard.user.uid, "writing", limit);
  return NextResponse.json({
    kind: "writing",
    limit,
    used: quota.used,
    remaining: quota.remaining,
    available: await hasGeminiKey(),
  });
}
