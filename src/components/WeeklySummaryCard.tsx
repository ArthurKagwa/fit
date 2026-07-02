"use client";

import { useState } from "react";
import { Loader2, NotebookText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  const diff = Math.round((now - before) * 10) / 10;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        diff > 0 ? "text-success" : diff < 0 ? "text-warning" : "text-muted-foreground"
      )}
    >
      {diff > 0 ? "+" : ""}
      {diff} {unit} vs last week
    </span>
  );
}

export function WeeklySummaryCard({
  kmThisWeek,
  kmLastWeek,
  workoutsThisWeek,
  workoutsLastWeek,
  aiEnabled,
}: {
  kmThisWeek: number;
  kmLastWeek: number;
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  aiEnabled: boolean;
}) {
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getRecap() {
    setLoading(true);
    try {
      const res = await fetch("/api/recap", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Couldn’t get your recap. Try again.");
        return;
      }
      setRecap(data.recap);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookText className="text-primary size-4" /> This week
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-lg font-bold tabular-nums">{kmThisWeek} km</p>
            <Delta now={kmThisWeek} before={kmLastWeek} unit="km" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {workoutsThisWeek} workout{workoutsThisWeek === 1 ? "" : "s"}
            </p>
            <Delta now={workoutsThisWeek} before={workoutsLastWeek} unit="" />
          </div>
        </div>
        {aiEnabled &&
          (recap ? (
            <p className="text-muted-foreground border-primary/40 border-l-2 pl-3 text-sm">
              {recap}
            </p>
          ) : (
            <Button variant="outline" size="sm" onClick={getRecap} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Coach’s recap
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
