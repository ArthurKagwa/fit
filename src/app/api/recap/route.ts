import { requireUserId } from "@/lib/session";
import { MODELS, aiEnabled, aiUnconfiguredResponse, getAiClient } from "@/lib/ai/client";
import { getStatsSummary, statsToPromptText } from "@/lib/stats";

/** Short AI weekly recap on the light model tier. */
export async function POST() {
  try {
    const userId = await requireUserId();
    if (!aiEnabled()) return aiUnconfiguredResponse();

    const stats = await getStatsSummary(userId);
    const client = getAiClient();
    const response = await client.chat.completions.create({
      model: MODELS.light,
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content:
            "You are a fitness coach writing a tiny weekly recap. Given the user's stats, write 2-3 short sentences: one on what went well, one honest note on what slipped, one concrete focus for next week. Plain text, no headings, no emoji spam (one emoji max).",
        },
        { role: "user", content: statsToPromptText(stats) },
      ],
    });
    const recap = response.choices[0]?.message?.content?.trim();
    if (!recap) return Response.json({ error: "no recap" }, { status: 502 });
    return Response.json({ recap });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("recap failed", error);
    return Response.json({ error: "recap failed" }, { status: 502 });
  }
}
