import {
  Dumbbell,
  Footprints,
  Scale,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { listEntries, EntryType } from "@/lib/data";
import { formatDuration, formatPace, toDateKey } from "@/lib/format";
import type { EditableEntry } from "@/components/history/EditEntrySheet";

export type Item = {
  type: EntryType;
  id: string;
  date: Date;
  title: string;
  detail: string | null;
  badge: string | null;
  edit: EditableEntry;
};

type Entry = Awaited<ReturnType<typeof listEntries>>[number];

export function toItem(type: EntryType, entry: Entry): Item {
  switch (type) {
    case "weight": {
      const e = entry as Extract<Entry, { weightKg: number; note: string | null }>;
      return {
        type,
        id: e.id,
        date: e.date,
        title: `${e.weightKg.toFixed(1)} kg`,
        detail: e.note,
        badge: null,
        edit: {
          type,
          id: e.id,
          date: toDateKey(e.date),
          weightKg: e.weightKg,
          note: e.note,
        },
      };
    }
    case "run": {
      const e = entry as Extract<Entry, { distanceKm: number }>;
      return {
        type,
        id: e.id,
        date: e.date,
        title: `${e.distanceKm} km run · ${formatDuration(e.durationSec)}`,
        detail: e.notes,
        badge: e.paceSecPerKm ? formatPace(e.paceSecPerKm) : null,
        edit: {
          type,
          id: e.id,
          date: toDateKey(e.date),
          distanceKm: e.distanceKm,
          durationSec: e.durationSec,
          notes: e.notes,
        },
      };
    }
    case "meal": {
      const e = entry as Extract<Entry, { mealType: string; description: string }>;
      return {
        type,
        id: e.id,
        date: e.date,
        title: e.description,
        detail:
          [
            e.proteinG != null ? `${Math.round(e.proteinG)}g protein` : null,
            e.carbsG != null ? `${Math.round(e.carbsG)}g carbs` : null,
            e.fatG != null ? `${Math.round(e.fatG)}g fat` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        badge: e.calories != null ? `${e.calories} kcal` : e.mealType,
        edit: {
          type,
          id: e.id,
          date: toDateKey(e.date),
          mealType: e.mealType,
          description: e.description,
          calories: e.calories,
          proteinG: e.proteinG,
          carbsG: e.carbsG,
          fatG: e.fatG,
        },
      };
    }
    case "workout": {
      const e = entry as Extract<
        Entry,
        {
          title: string;
          exercises: { name: string; sets: number | null; reps: number | null; weightKg: number | null }[];
        }
      >;
      return {
        type,
        id: e.id,
        date: e.date,
        title: e.title,
        detail: e.exercises.map((x) => x.name).join(", ") || e.notes,
        badge: e.type,
        edit: {
          type,
          id: e.id,
          date: toDateKey(e.date),
          title: e.title,
          workoutType: e.type,
          notes: e.notes,
          exercises: e.exercises.map((x) => ({
            name: x.name,
            sets: x.sets,
            reps: x.reps,
            weightKg: x.weightKg,
          })),
        },
      };
    }
  }
}

export function toItems(type: EntryType, entries: Entry[]): Item[] {
  return entries.map((entry) => toItem(type, entry));
}

export const typeIcon: Record<EntryType, LucideIcon> = {
  weight: Scale,
  run: Footprints,
  meal: UtensilsCrossed,
  workout: Dumbbell,
};

export const typeLabel: Record<EntryType, string> = {
  weight: "Weight entry",
  run: "Run",
  meal: "Meal",
  workout: "Workout",
};
