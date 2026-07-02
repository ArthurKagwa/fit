import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Image storage behind a tiny interface: Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set (production), a local .uploads/
 * directory served by /api/files otherwise (development).
 */

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV !== "production";
}

/** Saves an image and returns its serving URL. */
export async function putImage(
  buffer: Buffer,
  contentType: string,
  keyHint: string
): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) throw new Error(`unsupported image type: ${contentType}`);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${keyHint}.${ext}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });
    return blob.url;
  }

  const name = `${keyHint}-${randomBytes(8).toString("hex")}.${ext}`;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/api/files/${name}`;
}

/** Resolves a local upload path, refusing anything outside .uploads/. */
export function resolveLocalUpload(segments: string[]): string | null {
  const resolved = path.resolve(LOCAL_DIR, ...segments);
  if (!resolved.startsWith(LOCAL_DIR + path.sep)) return null;
  return resolved;
}

/** Reads and validates an uploaded image file from a form. */
export async function readImageFile(
  file: unknown
): Promise<{ buffer: Buffer; contentType: string } | { error: string }> {
  if (!(file instanceof File)) return { error: "no image provided" };
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return { error: "unsupported image type (use JPEG, PNG or WebP)" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "image too large (max 8 MB)" };
  }
  return { buffer: Buffer.from(await file.arrayBuffer()), contentType: file.type };
}
