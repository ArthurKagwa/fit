import { auth } from "@/auth";

/** Returns the authenticated user's id, or null. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Returns the authenticated user's id or throws a Response(401) — for route handlers. */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    throw Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  return userId;
}
