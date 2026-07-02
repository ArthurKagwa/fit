"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2, Plus, X } from "lucide-react";
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
import { submitEntry } from "@/components/forms/submit";
import { toDateInputValue } from "@/lib/format";

type ExerciseRow = { name: string; sets: string; reps: string; weightKg: string };

const emptyRow: ExerciseRow = { name: "", sets: "", reps: "", weightKg: "" };

export function WorkoutForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("strength");
  const [rows, setRows] = useState<ExerciseRow[]>([{ ...emptyRow }]);

  function updateRow(i: number, patch: Partial<ExerciseRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaving(true);
    const ok = await submitEntry(
      "workout",
      {
        title: form.get("title"),
        type,
        date: form.get("date"),
        notes: form.get("notes") || undefined,
        exercises: rows
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            sets: r.sets || undefined,
            reps: r.reps || undefined,
            weightKg: r.weightKg || undefined,
          })),
      },
      "Workout logged"
    );
    setSaving(false);
    if (ok) {
      el.reset();
      setRows([{ ...emptyRow }]);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="workout-title">Title</Label>
          <Input id="workout-title" name="title" placeholder="Push day" required />
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
        <Label htmlFor="workout-date">Date</Label>
        <Input id="workout-date" name="date" type="date" defaultValue={toDateInputValue()} required />
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
          onClick={() => setRows((rs) => [...rs, { ...emptyRow }])}
        >
          <Plus className="size-4" /> Add exercise
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workout-notes">Notes (optional)</Label>
        <Textarea id="workout-notes" name="notes" rows={2} placeholder="New PR on bench" />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Dumbbell className="size-4" />}
        Log workout
      </Button>
    </form>
  );
}
