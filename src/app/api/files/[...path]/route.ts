import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { requireUserId } from "@/lib/session";
import { resolveLocalUpload } from "@/lib/storage";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Serves images from the local .uploads/ dir (dev fallback for Vercel Blob). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await requireUserId();
    const { path: segments } = await params;
    const filePath = resolveLocalUpload(segments);
    if (!filePath) return new Response("Not found", { status: 404 });

    try {
      await stat(filePath);
    } catch {
      return new Response("Not found", { status: 404 });
    }

    const ext = filePath.split(".").pop() ?? "";
    return new Response(
      Readable.toWeb(createReadStream(filePath)) as ReadableStream,
      {
        headers: {
          "Content-Type": contentTypes[ext] ?? "application/octet-stream",
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
