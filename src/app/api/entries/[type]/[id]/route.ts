import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { ENTRY_TYPES, deleteEntry } from "@/lib/data";

const typeSchema = z.enum(ENTRY_TYPES);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { type: rawType, id } = await params;
    const parsed = typeSchema.safeParse(rawType);
    if (!parsed.success) {
      return Response.json({ error: "unknown entry type" }, { status: 404 });
    }
    const deleted = await deleteEntry(userId, parsed.data, id);
    if (!deleted) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
