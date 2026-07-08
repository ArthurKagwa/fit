"use client";

import { toast } from "sonner";

type EntryType = "weight" | "run" | "meal" | "workout";

/** POSTs a new entry and returns true on success (with a toast either way). */
export async function submitEntry(
  type: EntryType,
  payload: unknown,
  successMessage: string
): Promise<boolean> {
  return sendEntry(`/api/entries/${type}`, "POST", payload, successMessage);
}

/** PATCHes an existing entry and returns true on success (with a toast either way). */
export async function patchEntry(
  type: EntryType,
  id: string,
  payload: unknown,
  successMessage: string
): Promise<boolean> {
  return sendEntry(`/api/entries/${type}/${id}`, "PATCH", payload, successMessage);
}

async function sendEntry(
  url: string,
  method: "POST" | "PATCH",
  payload: unknown,
  successMessage: string
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
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
