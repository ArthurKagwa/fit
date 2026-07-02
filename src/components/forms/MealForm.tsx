"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UtensilsCrossed } from "lucide-react";
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

export type MealPrefill = {
  description?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  photoUrl?: string;
};

export function MealForm({ prefill }: { prefill?: MealPrefill }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState("lunch");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaving(true);
    const ok = await submitEntry(
      "meal",
      {
        mealType,
        description: form.get("description"),
        date: form.get("date"),
        calories: form.get("calories") || undefined,
        proteinG: form.get("proteinG") || undefined,
        carbsG: form.get("carbsG") || undefined,
        fatG: form.get("fatG") || undefined,
        photoUrl: prefill?.photoUrl,
        source: prefill?.photoUrl ? "photo" : "manual",
      },
      "Meal logged"
    );
    setSaving(false);
    if (ok) {
      el.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
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
          <Label htmlFor="meal-date">Date</Label>
          <Input id="meal-date" name="date" type="date" defaultValue={toDateInputValue()} required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="meal-description">What did you eat?</Label>
        <Textarea
          id="meal-description"
          name="description"
          placeholder="Chicken rice bowl with veg"
          defaultValue={prefill?.description}
          rows={2}
          required
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="calories" className="text-xs">kcal</Label>
          <Input id="calories" name="calories" type="number" inputMode="numeric" min="0" defaultValue={prefill?.calories} placeholder="620" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proteinG" className="text-xs">Protein g</Label>
          <Input id="proteinG" name="proteinG" type="number" inputMode="decimal" min="0" defaultValue={prefill?.proteinG} placeholder="42" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="carbsG" className="text-xs">Carbs g</Label>
          <Input id="carbsG" name="carbsG" type="number" inputMode="decimal" min="0" defaultValue={prefill?.carbsG} placeholder="60" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fatG" className="text-xs">Fat g</Label>
          <Input id="fatG" name="fatG" type="number" inputMode="decimal" min="0" defaultValue={prefill?.fatG} placeholder="18" />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <UtensilsCrossed className="size-4" />}
        Log meal
      </Button>
    </form>
  );
}
