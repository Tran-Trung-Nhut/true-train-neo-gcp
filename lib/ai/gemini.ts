import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./secrets";

// Server-only Gemini client. Every call walks the model ladder so a transient
// upstream failure costs latency rather than the user's work.

if (typeof window !== "undefined") {
  throw new Error("lib/ai/gemini must never be imported in client code");
}

export const MODEL_LADDER = [
  "gemini-3.6-flash",       // primary
  "gemini-3.1-flash-lite",  // high-availability fallback
  "gemini-flash-latest",    // dynamic alias
  "gemini-3.7-flash",       // deep reasoning fallback
] as const;

// 401/403 are deliberately absent: they fail identically on every model.
const RECOVERABLE_STATUS = new Set([429, 500, 503, 404]);

const RECOVERABLE_PATTERNS = [
  "unavailable",
  "resource_exhausted",
  "resource exhausted",
  "internal",
  "not_found",
  "not found",
  "overloaded",
  "deadline",
];

let client: GoogleGenAI | null = null;

async function getClient(): Promise<GoogleGenAI> {
  if (client) return client;
  const apiKey = await getGeminiApiKey();
  if (!apiKey) throw new Error("no-gemini-key");
  client = new GoogleGenAI({ apiKey });
  return client;
}

export async function hasGeminiKey(): Promise<boolean> {
  try {
    return Boolean(await getGeminiApiKey());
  } catch {
    return false;
  }
}

function statusOf(error: unknown): number {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number") return status;
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "number") return code;
  return 0;
}

function isRecoverable(error: unknown): boolean {
  if (RECOVERABLE_STATUS.has(statusOf(error))) return true;
  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase();
  if (!message) return false;
  // A hard auth failure must never look retryable.
  if (message.includes("api key") || message.includes("permission")) return false;
  return RECOVERABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiTurn {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GenerateOptions {
  system?: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  /** Which rung of the ladder answered. */
  model: string;
}

// Walks MODEL_LADDER, surfacing an error only after every model has been tried.
export async function generateContentWithFallback(
  contents: GeminiTurn[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const ai = await getClient();
  let lastError: unknown = null;

  for (const model of MODEL_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          ...(options.system ? { systemInstruction: options.system } : {}),
          temperature: options.temperature ?? 0.6,
          maxOutputTokens: options.maxTokens ?? 1024,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      });

      const text = response.text ?? "";
      if (!text.trim()) {
        // Empty body (safety block, truncation) is worth one more rung.
        lastError = new Error(`empty_response_from_${model}`);
        continue;
      }
      return { text, model };
    } catch (error) {
      lastError = error;
      if (!isRecoverable(error)) {
        console.error(`gemini_fatal model=${model}`, error);
        throw error;
      }
      console.warn(`gemini_retry model=${model} status=${statusOf(error)}`);
    }
  }

  console.error("gemini_all_models_failed", lastError);
  throw lastError instanceof Error ? lastError : new Error("gemini_unavailable");
}

export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const result = await generateContentWithFallback(
    [{ role: "user", parts: [{ text: prompt }] }],
    options
  );
  return result.text;
}

export function dataUrlToPart(dataUrl: string): GeminiPart | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}
