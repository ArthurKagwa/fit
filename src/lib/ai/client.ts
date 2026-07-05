import OpenAI from "openai";

/**
 * OpenRouter client + the cost-tiered model fleet.
 * Cheap models handle single-shot extraction; the stronger model is
 * reserved for coaching chat where quality matters.
 */

/**
 * Model fleets, ordered by preference. Free OpenRouter models are shared and
 * frequently rate-limited (429) upstream, so each tier is a list: we pass the
 * whole list to OpenRouter's `models` param and it auto-falls-back to the next
 * one when the primary is throttled or unavailable. An env override, if set,
 * is tried first.
 *
 * chat    — needs tool/function calling.
 * extract — needs vision (meal photos, run screenshots).
 */
const CHAT_FLEET = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
];

const EXTRACT_FLEET = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

// Light text-only tasks (weekly recap). Small/fast free models, no vision needed.
const LIGHT_FLEET = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-4-31b-it:free",
];

function fleet(envValue: string | undefined, defaults: string[]): string[] {
  const override = envValue?.trim();
  if (!override) return defaults;
  // Prepend the override, drop any duplicate of it from the defaults.
  return [override, ...defaults.filter((m) => m !== override)];
}

export const MODELS = {
  chat: fleet(process.env.MODEL_CHAT, CHAT_FLEET),
  extract: fleet(process.env.MODEL_EXTRACT, EXTRACT_FLEET),
  light: fleet(process.env.MODEL_LIGHT, LIGHT_FLEET),
} as const;

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Builds the model routing fields for an OpenRouter request from a fleet.
 * `model` (first entry) keeps the OpenAI SDK types happy; `models` is the
 * OpenRouter-specific fallback list it routes through on error/rate-limit.
 * OpenRouter caps `models` at 3 entries, so we send at most the top 3.
 *
 * `reasoning: { exclude: true }` lets reasoning-capable models still think
 * internally but keeps their chain-of-thought OUT of the response content —
 * otherwise some free models dump their thoughts into `message.content`.
 * See https://openrouter.ai/docs/features/model-routing
 *     https://openrouter.ai/docs/use-cases/reasoning-tokens
 */
export function fleetRouting(models: readonly string[]): {
  model: string;
  models: string[];
  reasoning: { exclude: true };
} {
  const top = models.slice(0, 3);
  return { model: top[0], models: top, reasoning: { exclude: true } };
}

/**
 * Strips leaked chain-of-thought from a model reply. `reasoning.exclude` handles
 * providers that expose reasoning on a separate channel; this is the belt-and-
 * braces for free models that inline their thoughts into content using various
 * tags/markers instead of respecting that param.
 */
const THOUGHT_TAGS = ["think", "thinking", "reflection", "reasoning", "scratchpad"];

export function stripReasoning(text: string): string {
  let out = text;
  for (const tag of THOUGHT_TAGS) {
    out = out
      .replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "gi"), "")
      // An unclosed opening tag (truncated mid-thought) — drop everything after it.
      .replace(new RegExp(`<${tag}>[\\s\\S]*$`, "gi"), "");
  }
  return out
    .replace(/<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/gi, "")
    .replace(/◁think▷[\s\S]*?◁\/think▷/gi, "")
    .trim();
}

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!aiEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
  client ??= new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "X-Title": "Fit - personal fitness tracker",
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
