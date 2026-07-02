import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createProgressPhoto } from "@/lib/data";
import { putImage, readImageFile } from "@/lib/storage";

export async function GET() {
  try {
    const userId = await requireUserId();
    const photos = await prisma.progressPhoto.findMany({
      where: { userId },
      orderBy: { takenAt: "desc" },
      take: 200,
    });
    return Response.json({ photos });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const form = await request.formData().catch(() => null);
    if (!form) return Response.json({ error: "expected multipart form data" }, { status: 400 });

    const image = await readImageFile(form.get("image"));
    if ("error" in image) return Response.json({ error: image.error }, { status: 400 });

    const fileUrl = await putImage(image.buffer, image.contentType, `progress/${userId}`);
    const photo = await createProgressPhoto(userId, {
      fileUrl,
      note: String(form.get("note") ?? "").slice(0, 1000) || undefined,
      takenAt: String(form.get("takenAt") ?? "") || undefined,
      weightKg: String(form.get("weightKg") ?? "") || undefined,
    });
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return Response.json({ error: "validation failed" }, { status: 400 });
    }
    throw error;
  }
}
