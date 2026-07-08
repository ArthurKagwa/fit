import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { ENTRY_TYPES, deleteEntry, getEntry, updateEntry, type EntryType } from "@/lib/data";

const typeSchema = z.enum(ENTRY_TYPES);

function parseType(raw: string): EntryType {
  const parsed = typeSchema.safeParse(raw);
  if (!parsed.success) {
    throw Response.json({ error: "unknown entry type" }, { status: 404 });
  }
  return parsed.data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { type: rawType, id } = await params;
    const entry = await getEntry(userId, parseType(rawType), id);
    if (!entry) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json({ entry });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { type: rawType, id } = await params;
    const type = parseType(rawType);
    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }
    const entry = await updateEntry(userId, type, id, body);
    if (!entry) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json({ entry });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { type: rawType, id } = await params;
    const deleted = await deleteEntry(userId, parseType(rawType), id);
    if (!deleted) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
