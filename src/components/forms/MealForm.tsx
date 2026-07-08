"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { compressImage } from "@/lib/image-client";
import { toDateInputValue } from "@/lib/format";

const confidenceVariant = { low: "warning", medium: "secondary", high: "success" } as const;

export function MealForm({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high" | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [mealType, setMealType] = useState("lunch");
  const [date, setDate] = useState(() => toDateInputValue());
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");

  function onPickFile(picked: File | null) {
    setFile(picked);
    setConfidence(null);
    setPhotoUrl(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  async function analyze() {
    if (!file && !caption.trim()) {
      toast.error("Add a photo or a caption first.");
      return;
    }
    setAnalyzing(true);
    try {
      const form = new FormData();
      if (file) form.append("image", await compressImage(file));
      if (caption.trim()) form.append("caption", caption.trim());
      const res = await fetch("/api/analyze/meal", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error === "ai_unconfigured" ? "AI is not configured." : (data?.error ?? "Analysis failed."));
        if (data?.photoUrl) setPhotoUrl(data.photoUrl);
        return;
      }
      const e = data.estimate;
      setDescription(e.description ?? "");
      setCalories(e.calories != null ? String(e.calories) : "");
      setProteinG(e.proteinG != null ? String(Math.round(e.proteinG)) : "");
      setCarbsG(e.carbsG != null ? String(Math.round(e.carbsG)) : "");
      setFatG(e.fatG != null ? String(Math.round(e.fatG)) : "");
      if (e.mealType) setMealType(e.mealType);
      setConfidence(e.confidence ?? "medium");
      setPhotoUrl(data.photoUrl ?? null);
      toast.success("Estimated — check the numbers before saving");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const ok = await submitEntry(
      "meal",
      {
        mealType,
        description,
        date,
        calories: calories || undefined,
        proteinG: proteinG || undefined,
        carbsG: carbsG || undefined,
        fatG: fatG || undefined,
        photoUrl: photoUrl ?? undefined,
        source: photoUrl ? "photo" : "manual",
      },
      "Meal logged"
    );
    setSaving(false);
    if (ok) {
      setDescription("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      setCaption("");
      setConfidence(null);
      setPhotoUrl(null);
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
            Snap it — AI fills in the calories
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Meal preview" className="h-28 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
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
              <Camera className="size-4" /> Add meal photo
            </Button>
          )}
          <Input
            placeholder="Caption (optional): chicken rice, large portion"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={analyze} disabled={analyzing}>
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {analyzing ? "Estimating…" : "Estimate calories"}
          </Button>
          {confidence && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Badge variant={confidenceVariant[confidence]}>{confidence} confidence</Badge>
              AI estimate — adjust anything that looks off.
            </p>
          )}
        </div>
      )}

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
          {/* Local "today" can differ between server and client at render time */}
          <Input
            id="meal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            suppressHydrationWarning
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="meal-description">What did you eat?</Label>
        <Textarea
          id="meal-description"
          placeholder="Chicken rice bowl with veg"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          required
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="calories" className="text-xs">kcal</Label>
          <Input id="calories" type="number" inputMode="numeric" min="0" placeholder="620"
            value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proteinG" className="text-xs">Protein g</Label>
          <Input id="proteinG" type="number" inputMode="decimal" min="0" placeholder="42"
            value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="carbsG" className="text-xs">Carbs g</Label>
          <Input id="carbsG" type="number" inputMode="decimal" min="0" placeholder="60"
            value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fatG" className="text-xs">Fat g</Label>
          <Input id="fatG" type="number" inputMode="decimal" min="0" placeholder="18"
            value={fatG} onChange={(e) => setFatG(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <UtensilsCrossed className="size-4" />}
        Log meal
      </Button>
    </form>
  );
}
