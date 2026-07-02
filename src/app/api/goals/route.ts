import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { saveGoal } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: "invalid JSON body" }, { status: 400 });
    const goal = await saveGoal(userId, body);
    return Response.json({ goal }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return Response.json({ error: "validation failed", issues: error.issues }, { status: 400 });
    }
    throw error;
  }
}
