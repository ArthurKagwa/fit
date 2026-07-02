import { z } from "zod";
import { requireUserId } from "@/lib/session";
import {
  ENTRY_TYPES,
  createMeal,
  createRun,
  createWeight,
  createWorkout,
  listEntries,
  type EntryType,
} from "@/lib/data";

const typeSchema = z.enum(ENTRY_TYPES);

function parseType(raw: string): EntryType {
  const parsed = typeSchema.safeParse(raw);
  if (!parsed.success) {
    throw Response.json({ error: "unknown entry type" }, { status: 404 });
  }
  return parsed.data;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const userId = await requireUserId();
    const type = parseType((await params).type);
    const url = new URL(request.url);
    const entries = await listEntries(userId, type, {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    return Response.json({ entries });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) {
      return Response.json({ error: "invalid query" }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const userId = await requireUserId();
    const type = parseType((await params).type);
    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const entry = await (() => {
      switch (type) {
        case "weight":
          return createWeight(userId, body);
        case "run":
          return createRun(userId, body);
        case "meal":
          return createMeal(userId, body);
        case "workout":
          return createWorkout(userId, body);
      }
    })();

    return Response.json({ entry }, { status: 201 });
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
