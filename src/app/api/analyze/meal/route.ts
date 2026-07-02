import { requireUserId } from "@/lib/session";
import { aiEnabled, aiUnconfiguredResponse } from "@/lib/ai/client";
import { analyzeMeal } from "@/lib/ai/extractors";
import { putImage, readImageFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!aiEnabled()) return aiUnconfiguredResponse();

    const form = await request.formData().catch(() => null);
    if (!form) return Response.json({ error: "expected multipart form data" }, { status: 400 });

    const caption = String(form.get("caption") ?? "").slice(0, 1000);
    const file = form.get("image");

    let photoUrl: string | null = null;
    let imageDataUrl: string | undefined;
    if (file instanceof File && file.size > 0) {
      const image = await readImageFile(file);
      if ("error" in image) return Response.json({ error: image.error }, { status: 400 });
      photoUrl = await putImage(image.buffer, image.contentType, `meals/${userId}`);
      imageDataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;
    }

    if (!imageDataUrl && !caption.trim()) {
      return Response.json({ error: "provide a photo or a caption" }, { status: 400 });
    }

    const estimate = await analyzeMeal({ imageDataUrl, caption });
    if (!estimate) {
      return Response.json(
        { error: "could not read that meal — fill the fields manually", photoUrl },
        { status: 422 }
      );
    }

    return Response.json({ estimate, photoUrl });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("analyze/meal failed", error);
    return Response.json({ error: "analysis failed" }, { status: 502 });
  }
}
