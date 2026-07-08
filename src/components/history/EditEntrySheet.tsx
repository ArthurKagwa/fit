"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { patchEntry } from "@/components/forms/submit";
import { formatDuration, parseDuration } from "@/lib/format";

/** Plain-JSON projection of an entry, safe to pass from a server component. */
export type EditableEntry =
  | { type: "weight"; id: string; date: string; weightKg: number; note: string | null }
  | {
      type: "run";
      id: string;
      date: string;
      distanceKm: number;
      durationSec: number;
      notes: string | null;
    }
  | {
      type: "meal";
      id: string;
      date: string;
      mealType: string;
      description: string;
      calories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
    }
  | {
      type: "workout";
      id: string;
      date: string;
      title: string;
      workoutType: string;
      notes: string | null;
      exercises: { name: string; sets: number | null; reps: number | null; weightKg: number | null }[];
    };

export function EditEntryButton({ entry, label }: { entry: EditableEntry; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit {label.toLowerCase()}</SheetTitle>
          <SheetDescription>Fix a value and save — charts update instantly.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {entry.type === "weight" && <WeightFields entry={entry} close={() => setOpen(false)} />}
          {entry.type === "run" && <RunFields entry={entry} close={() => setOpen(false)} />}
          {entry.type === "meal" && <MealFields entry={entry} close={() => setOpen(false)} />}
          {entry.type === "workout" && <WorkoutFields entry={entry} close={() => setOpen(false)} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function useSave(close: () => void) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function save(type: EditableEntry["type"], id: string, payload: unknown, message: string) {
    setSaving(true);
    const ok = await patchEntry(type, id, payload, message);
    setSaving(false);
    if (ok) {
      close();
      router.refresh();
    }
  }
  return { saving, save };
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <Button type="submit" disabled={saving}>
      {saving ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
      Save changes
    </Button>
  );
}

function WeightFields({
  entry,
  close,
}: {
  entry: Extract<EditableEntry, { type: "weight" }>;
  close: () => void;
}) {
  const { saving, save } = useSave(close);
  const [weightKg, setWeightKg] = useState(String(entry.weightKg));
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note ?? "");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save("weight", entry.id, { weightKg, date, note: note.trim() || null }, "Weight updated");
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="edit-weightKg">Weight (kg)</Label>
          <Input
            id="edit-weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="500"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-weight-date">Date</Label>
          <Input
            id="edit-weight-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-weight-note">Note (optional)</Label>
        <Input id="edit-weight-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <SaveButton saving={saving} />
    </form>
  );
}

function RunFields({
  entry,
  close,
}: {
  entry: Extract<EditableEntry, { type: "run" }>;
  close: () => void;
}) {
  const { saving, save } = useSave(close);
  const [distanceKm, setDistanceKm] = useState(String(entry.distanceKm));
  const [duration, setDuration] = useState(formatDuration(entry.durationSec));
  const [date, setDate] = useState(entry.date);
  const [notes, setNotes] = useState(entry.notes ?? "");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const durationSec = parseDuration(duration);
        if (!durationSec) {
          toast.error("Duration should look like 26:10 or 1:02:45.");
          return;
        }
        save(
          "run",
          entry.id,
          { distanceKm, durationSec, date, notes: notes.trim() || null },
          "Run updated"
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="edit-distanceKm">Distance (km)</Label>
          <Input
            id="edit-distanceKm"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.1"
            max="500"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-duration">Duration</Label>
          <Input
            id="edit-duration"
            inputMode="numeric"
            placeholder="26:10"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-run-date">Date</Label>
        <Input
          id="edit-run-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-run-notes">Notes (optional)</Label>
        <Textarea
          id="edit-run-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <SaveButton saving={saving} />
    </form>
  );
}

function MealFields({
  entry,
  close,
}: {
  entry: Extract<EditableEntry, { type: "meal" }>;
  close: () => void;
}) {
  const { saving, save } = useSave(close);
  const [mealType, setMealType] = useState(entry.mealType);
  const [date, setDate] = useState(entry.date);
  const [description, setDescription] = useState(entry.description);
  const [calories, setCalories] = useState(entry.calories != null ? String(entry.calories) : "");
  const [proteinG, setProteinG] = useState(entry.proteinG != null ? String(entry.proteinG) : "");
  const [carbsG, setCarbsG] = useState(entry.carbsG != null ? String(entry.carbsG) : "");
  const [fatG, setFatG] = useState(entry.fatG != null ? String(entry.fatG) : "");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(
          "meal",
          entry.id,
          {
            mealType,
            date,
            description,
            calories: calories || null,
            proteinG: proteinG || null,
            carbsG: carbsG || null,
            fatG: fatG || null,
          },
          "Meal updated"
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Meal</Label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-meal-date">Date</Label>
          <Input
            id="edit-meal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-meal-description">What did you eat?</Label>
        <Textarea
          id="edit-meal-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="edit-calories" className="text-xs">kcal</Label>
          <Input id="edit-calories" type="number" inputMode="numeric" min="0"
            value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-proteinG" className="text-xs">Protein g</Label>
          <Input id="edit-proteinG" type="number" inputMode="decimal" min="0"
            value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-carbsG" className="text-xs">Carbs g</Label>
          <Input id="edit-carbsG" type="number" inputMode="decimal" min="0"
            value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-fatG" className="text-xs">Fat g</Label>
          <Input id="edit-fatG" type="number" inputMode="decimal" min="0"
            value={fatG} onChange={(e) => setFatG(e.target.value)} />
        </div>
      </div>
      <SaveButton saving={saving} />
    </form>
  );
}

type ExerciseRow = { name: string; sets: string; reps: string; weightKg: string };

function WorkoutFields({
  entry,
  close,
}: {
  entry: Extract<EditableEntry, { type: "workout" }>;
  close: () => void;
}) {
  const { saving, save } = useSave(close);
  const [title, setTitle] = useState(entry.title);
  const [type, setType] = useState(entry.workoutType);
  const [date, setDate] = useState(entry.date);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [rows, setRows] = useState<ExerciseRow[]>(
    entry.exercises.length
      ? entry.exercises.map((e) => ({
          name: e.name,
          sets: e.sets != null ? String(e.sets) : "",
          reps: e.reps != null ? String(e.reps) : "",
          weightKg: e.weightKg != null ? String(e.weightKg) : "",
        }))
      : [{ name: "", sets: "", reps: "", weightKg: "" }]
  );

  function updateRow(i: number, patch: Partial<ExerciseRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(
          "workout",
          entry.id,
          {
            title,
            type,
            date,
            notes: notes.trim() || null,
            exercises: rows
              .filter((r) => r.name.trim())
              .map((r) => ({
                name: r.name.trim(),
                sets: r.sets || null,
                reps: r.reps || null,
                weightKg: r.weightKg || null,
              })),
          },
          "Workout updated"
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="edit-workout-title">Title</Label>
          <Input
            id="edit-workout-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="mobility">Mobility</SelectItem>
              <SelectItem value="sport">Sport</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-workout-date">Date</Label>
        <Input
          id="edit-workout-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Exercises</Label>
        <div className="grid gap-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_3.5rem_3.5rem_4rem_2rem] items-center gap-1.5">
              <Input
                aria-label="Exercise name"
                placeholder="Bench press"
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
              />
              <Input
                aria-label="Sets"
                placeholder="Sets"
                type="number"
                inputMode="numeric"
                min="1"
                value={row.sets}
                onChange={(e) => updateRow(i, { sets: e.target.value })}
              />
              <Input
                aria-label="Reps"
                placeholder="Reps"
                type="number"
                inputMode="numeric"
                min="1"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: e.target.value })}
              />
              <Input
                aria-label="Weight kg"
                placeholder="kg"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={row.weightKg}
                onChange={(e) => updateRow(i, { weightKg: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Remove exercise"
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setRows((rs) => [...rs, { name: "", sets: "", reps: "", weightKg: "" }])}
        >
          <Plus className="size-4" /> Add exercise
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="edit-workout-notes">Notes (optional)</Label>
        <Textarea
          id="edit-workout-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <SaveButton saving={saving} />
    </form>
  );
}
