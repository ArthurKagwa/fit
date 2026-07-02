import { requireUserId } from "@/lib/session";
import { aiEnabled, aiUnconfiguredResponse } from "@/lib/ai/client";
import { analyzeRun } from "@/lib/ai/extractors";
import { putImage, readImageFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!aiEnabled()) return aiUnconfiguredResponse();

    const form = await request.formData().catch(() => null);
    if (!form) return Response.json({ error: "expected multipart form data" }, { status: 400 });

    const image = await readImageFile(form.get("image"));
    if ("error" in image) return Response.json({ error: image.error }, { status: 400 });

    const caption = String(form.get("caption") ?? "").slice(0, 1000);
    const screenshotUrl = await putImage(image.buffer, image.contentType, `runs/${userId}`);
    const imageDataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;

    const extraction = await analyzeRun({ imageDataUrl, caption });
    if (!extraction || (extraction.distanceKm == null && extraction.durationSec == null)) {
      return Response.json(
        { error: "could not read that screenshot — fill the fields manually", screenshotUrl },
        { status: 422 }
      );
    }

    return Response.json({ extraction, screenshotUrl });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("analyze/run failed", error);
    return Response.json({ error: "analysis failed" }, { status: 502 });
  }
}
