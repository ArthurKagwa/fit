import { requireUserId } from "@/lib/session";
import { deleteProgressPhoto } from "@/lib/data";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const deleted = await deleteProgressPhoto(userId, id);
    if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
