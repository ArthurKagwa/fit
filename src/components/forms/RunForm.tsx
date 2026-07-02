"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Footprints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEntry } from "@/components/forms/submit";
import { parseDuration, toDateInputValue } from "@/lib/format";

export type RunPrefill = {
  distanceKm?: number;
  durationText?: string;
  date?: string;
  screenshotUrl?: string;
};

export function RunForm({ prefill }: { prefill?: RunPrefill }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    const durationSec = parseDuration(String(form.get("duration") ?? ""));
    if (!durationSec) {
      toast.error("Duration should look like 26:10 or 1:02:45.");
      return;
    }
    setSaving(true);
    const ok = await submitEntry(
      "run",
      {
        distanceKm: form.get("distanceKm"),
        durationSec,
        date: form.get("date"),
        notes: form.get("notes") || undefined,
        source: prefill?.screenshotUrl ? "screenshot" : "manual",
        screenshotUrl: prefill?.screenshotUrl,
      },
      "Run logged"
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
          <Label htmlFor="distanceKm">Distance (km)</Label>
          <Input
            id="distanceKm"
            name="distanceKm"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.1"
            max="500"
            placeholder="5.0"
            defaultValue={prefill?.distanceKm}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            name="duration"
            inputMode="numeric"
            placeholder="26:10"
            defaultValue={prefill?.durationText}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="run-date">Date</Label>
        <Input
          id="run-date"
          name="date"
          type="date"
          defaultValue={prefill?.date ?? toDateInputValue()}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="run-notes">Notes (optional)</Label>
        <Textarea id="run-notes" name="notes" placeholder="Felt strong, negative splits" rows={2} />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Footprints className="size-4" />}
        Log run
      </Button>
    </form>
  );
}
