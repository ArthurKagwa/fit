"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitEntry } from "@/components/forms/submit";
import { toDateInputValue } from "@/lib/format";

export function WeightForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaving(true);
    const ok = await submitEntry(
      "weight",
      {
        weightKg: form.get("weightKg"),
        date: form.get("date"),
        note: form.get("note") || undefined,
      },
      "Weight logged"
    );
    setSaving(false);
    if (ok) {
      el.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="weightKg">Weight (kg)</Label>
        <Input
          id="weightKg"
          name="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="500"
          placeholder="82.4"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="weight-date">Date</Label>
        <Input id="weight-date" name="date" type="date" defaultValue={toDateInputValue()} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="weight-note">Note (optional)</Label>
        <Input id="weight-note" name="note" placeholder="Morning, before breakfast" />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />}
        Log weight
      </Button>
    </form>
  );
}
