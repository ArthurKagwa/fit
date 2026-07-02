"use client";

import { toast } from "sonner";

/** POSTs a new entry and returns true on success (with a toast either way). */
export async function submitEntry(
  type: "weight" | "run" | "meal" | "workout",
  payload: unknown,
  successMessage: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/entries/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error === "validation failed" ? "Check the highlighted values and try again." : "Could not save. Try again.");
      return false;
    }
    toast.success(successMessage);
    return true;
  } catch {
    toast.error("Network error. Try again.");
    return false;
  }
}
