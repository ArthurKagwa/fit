import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { setPlanItemCompleted } from "@/lib/data";

const bodySchema = z.object({ completed: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "expected { completed: boolean }" }, { status: 400 });
    }
    const done = await setPlanItemCompleted(userId, id, parsed.data.completed);
    if (!done) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
