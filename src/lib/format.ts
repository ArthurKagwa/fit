/** Formats seconds as "26:10" or "1:02:45". */
export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Formats sec/km as "5:14 /km". */
export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/** Parses "26:10", "1:02:45" or plain minutes ("26") into seconds. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// Date-only entries (runs, meals, weights, workouts) are stored at UTC
// midnight — a "YYYY-MM-DD" the user picked becomes `new Date("YYYY-MM-DD")`,
// which JS parses as UTC. So we must read those instants back in UTC too,
// otherwise a runtime west of UTC renders them as the previous calendar day
// (and can group them into the previous week).
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** Local YYYY-MM-DD, for defaulting <input type="date"> to the user's today. */
export function toDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** UTC YYYY-MM-DD, for reading a stored (UTC-midnight) date back into a form. */
export function toDateKey(date: Date | string): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
