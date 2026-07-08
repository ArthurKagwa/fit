"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const goalTypes = [
  { value: "TARGET_WEIGHT", label: "Target weight", unit: "kg", placeholder: "78" },
  { value: "WEEKLY_DISTANCE", label: "Weekly running distance", unit: "km", placeholder: "20" },
  { value: "DAILY_CALORIES", label: "Daily calorie budget", unit: "kcal", placeholder: "2200" },
  { value: "PACE_5K", label: "5k pace", unit: "min/km", placeholder: "5.15" },
  { value: "CUSTOM", label: "Custom goal", unit: "", placeholder: "10" },
] as const;

export function GoalForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<(typeof goalTypes)[number]["value"]>("TARGET_WEIGHT");
  const selected = goalTypes.find((g) => g.value === type)!;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        targetValue: form.get("targetValue"),
        unit: form.get("unit") || selected.unit || "units",
        targetDate: form.get("targetDate") || undefined,
        description: form.get("description") || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save the goal — check the values.");
      return;
    }
    toast.success("Goal set");
    el.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label>Goal type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {goalTypes.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="targetValue">Target {selected.unit && `(${selected.unit})`}</Label>
          <Input
            id="targetValue"
            name="targetValue"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={selected.placeholder}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="targetDate">By (optional)</Label>
          <Input id="targetDate" name="targetDate" type="date" />
        </div>
      </div>
      {type === "CUSTOM" && (
        <div className="grid gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" placeholder="push-ups, sessions, …" required />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="description">Label (optional)</Label>
        <Input id="description" name="description" placeholder="Get to 78 kg" />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}
        Set goal
      </Button>
    </form>
  );
}
