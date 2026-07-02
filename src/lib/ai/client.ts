import OpenAI from "openai";

/**
 * OpenRouter client + the cost-tiered model fleet.
 * Cheap models handle single-shot extraction; the stronger model is
 * reserved for coaching chat where quality matters.
 */

export const MODELS = {
  chat: process.env.MODEL_CHAT ?? "anthropic/claude-sonnet-4.5",
  extract: process.env.MODEL_EXTRACT ?? "google/gemini-2.5-flash",
  light: process.env.MODEL_LIGHT ?? "google/gemini-2.5-flash-lite",
} as const;

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!aiEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
  client ??= new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "X-Title": "Fit — personal fitness tracker",
    },
  });
  return client;
}

/** 503 body shared by AI endpoints when no key is configured. */
export function aiUnconfiguredResponse(): Response {
  return Response.json(
    { error: "ai_unconfigured", message: "Set OPENROUTER_API_KEY to enable AI features." },
    { status: 503 }
  );
}

/** Pulls the first JSON object out of a model reply (handles ```json fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
