import { z } from "zod";
import { MODELS, extractJson, getAiClient } from "@/lib/ai/client";

/**
 * Single-shot vision extraction on the cheap model tier.
 * One request, strict JSON out, no tool loop — these endpoints are
 * called often (every meal pic / run screenshot), so tokens are capped
 * and images are pre-compressed client-side.
 */

export const mealEstimateSchema = z.object({
  description: z.string().min(1).max(500),
  items: z.array(z.string().max(200)).max(20).default([]),
  calories: z.coerce.number().int().min(0).max(10000),
  proteinG: z.coerce.number().min(0).max(1000),
  carbsG: z.coerce.number().min(0).max(1000),
  fatG: z.coerce.number().min(0).max(1000),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullish(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
});
export type MealEstimate = z.infer<typeof mealEstimateSchema>;

export const runExtractionSchema = z.object({
  distanceKm: z.coerce.number().positive().max(500).nullish(),
  durationSec: z.coerce.number().int().positive().max(24 * 3600).nullish(),
  paceSecPerKm: z.coerce.number().int().positive().max(3600).nullish(),
  date: z.string().nullish(), // YYYY-MM-DD if visible on the screenshot
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
});
export type RunExtraction = z.infer<typeof runExtractionSchema>;

type ImageInput = { imageDataUrl?: string; caption?: string };

async function completeJson(
  system: string,
  userContent: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[],
  maxTokens: number
): Promise<unknown> {
  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: MODELS.extract,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  const text = response.choices[0]?.message?.content ?? "";
  return extractJson(text);
}

export async function analyzeMeal({ imageDataUrl, caption }: ImageInput): Promise<MealEstimate | null> {
  const system = `You are a nutrition estimation service. Estimate the calories and macros of the meal from the photo and/or the user's caption.
Reply with ONLY a JSON object, no prose:
{"description": "short name of the meal", "items": ["component", ...], "calories": <int kcal>, "proteinG": <number>, "carbsG": <number>, "fatG": <number>, "mealType": "breakfast"|"lunch"|"dinner"|"snack"|null, "confidence": "low"|"medium"|"high"}
Estimate portion sizes from visual cues. Use the caption to correct what you see. If only a caption is given, estimate from typical portions. Be realistic, not optimistic.`;

  const content: Parameters<typeof completeJson>[1] = [];
  if (caption?.trim()) content.push({ type: "text", text: `Caption: ${caption.trim()}` });
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  if (content.length === 0) return null;

  const raw = await completeJson(system, content, 600);
  const parsed = mealEstimateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function analyzeRun({ imageDataUrl, caption }: ImageInput): Promise<RunExtraction | null> {
  const system = `You extract running data from fitness app screenshots (Strava, Nike Run Club, Garmin, Apple Watch, treadmill displays...).
Reply with ONLY a JSON object, no prose:
{"distanceKm": <number|null>, "durationSec": <int seconds|null>, "paceSecPerKm": <int seconds per km|null>, "date": "YYYY-MM-DD"|null, "confidence": "low"|"medium"|"high"}
Convert units: miles -> km (x1.60934), pace min/mi -> sec/km. "Moving time" beats "elapsed time". Only include the date if it is actually visible. If a value is not on screen, use null.`;

  const content: Parameters<typeof completeJson>[1] = [];
  if (caption?.trim()) content.push({ type: "text", text: `Note from user: ${caption.trim()}` });
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  if (content.length === 0) return null;

  const raw = await completeJson(system, content, 400);
  const parsed = runExtractionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
