"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, ImageUp, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEntry } from "@/components/forms/submit";
import { compressImage } from "@/lib/image-client";
import { formatDuration, parseDuration, toDateInputValue } from "@/lib/format";

const confidenceVariant = { low: "warning", medium: "secondary", high: "success" } as const;

export function RunForm({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"low" | "medium" | "high" | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const [distanceKm, setDistanceKm] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(() => toDateInputValue());
  const [notes, setNotes] = useState("");

  function onPickFile(picked: File | null) {
    setFile(picked);
    setConfidence(null);
    setScreenshotUrl(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  async function analyze() {
    if (!file) {
      toast.error("Pick a screenshot first.");
      return;
    }
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append("image", await compressImage(file));
      const res = await fetch("/api/analyze/run", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error === "ai_unconfigured" ? "AI is not configured." : (data?.error ?? "Analysis failed."));
        if (data?.screenshotUrl) setScreenshotUrl(data.screenshotUrl);
        return;
      }
      const x = data.extraction;
      if (x.distanceKm != null) setDistanceKm(String(Math.round(x.distanceKm * 100) / 100));
      if (x.durationSec != null) setDuration(formatDuration(x.durationSec));
      else if (x.distanceKm != null && x.paceSecPerKm != null) {
        setDuration(formatDuration(Math.round(x.distanceKm * x.paceSecPerKm)));
      }
      if (x.date && /^\d{4}-\d{2}-\d{2}$/.test(x.date)) setDate(x.date);
      setConfidence(x.confidence ?? "medium");
      setScreenshotUrl(data.screenshotUrl ?? null);
      toast.success("Screenshot read — check the values before saving");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const durationSec = parseDuration(duration);
    if (!durationSec) {
      toast.error("Duration should look like 26:10 or 1:02:45.");
      return;
    }
    setSaving(true);
    const ok = await submitEntry(
      "run",
      {
        distanceKm,
        durationSec,
        date,
        notes: notes || undefined,
        source: screenshotUrl ? "screenshot" : "manual",
        screenshotUrl: screenshotUrl ?? undefined,
      },
      "Run logged"
    );
    setSaving(false);
    if (ok) {
      setDistanceKm("");
      setDuration("");
      setNotes("");
      setDate(toDateInputValue());
      setConfidence(null);
      setScreenshotUrl(null);
      onPickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {aiEnabled && (
        <div className="bg-accent/40 grid gap-3 rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="text-primary size-4" />
            Upload your run screenshot — AI reads the stats
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Run screenshot preview" className="h-28 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remove screenshot"
                onClick={() => {
                  onPickFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="bg-background/80 absolute top-1 right-1 rounded-full p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageUp className="size-4" /> Choose screenshot
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={analyze} disabled={analyzing || !file}>
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {analyzing ? "Reading…" : "Read screenshot"}
          </Button>
          {confidence && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Badge variant={confidenceVariant[confidence]}>{confidence} confidence</Badge>
              Extracted — adjust anything that looks off.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="distanceKm">Distance (km)</Label>
          <Input
            id="distanceKm"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.1"
            max="500"
            placeholder="5.0"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            inputMode="numeric"
            placeholder="26:10"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="run-date">Date</Label>
        {/* Local "today" can differ between server and client at render time */}
        <Input
          id="run-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          suppressHydrationWarning
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="run-notes">Notes (optional)</Label>
        <Textarea
          id="run-notes"
          placeholder="Felt strong, negative splits"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Footprints className="size-4" />}
        Log run
      </Button>
    </form>
  );
}
