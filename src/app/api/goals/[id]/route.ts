import { requireUserId } from "@/lib/session";
import { deactivateGoal } from "@/lib/data";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const done = await deactivateGoal(userId, id);
    if (!done) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
