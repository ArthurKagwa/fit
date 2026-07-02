import Link from "next/link";
import {
  Dumbbell,
  Footprints,
  NotebookPen,
  Scale,
  UtensilsCrossed,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { listEntries, ENTRY_TYPES, type EntryType } from "@/lib/data";
import { formatDate, formatDuration, formatPace } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteEntryButton } from "@/components/history/DeleteEntryButton";
import { cn } from "@/lib/utils";

type Filter = "all" | EntryType;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "weight", label: "Weight" },
  { value: "run", label: "Runs" },
  { value: "meal", label: "Meals" },
  { value: "workout", label: "Workouts" },
];

type Item = {
  type: EntryType;
  id: string;
  date: Date;
  title: string;
  detail: string | null;
  badge: string | null;
};

function toItems(type: EntryType, entries: Awaited<ReturnType<typeof listEntries>>): Item[] {
  return entries.map((entry) => {
    switch (type) {
      case "weight": {
        const e = entry as Extract<typeof entry, { weightKg: number; note: string | null }>;
        return {
          type,
          id: e.id,
          date: e.date,
          title: `${e.weightKg.toFixed(1)} kg`,
          detail: e.note,
          badge: null,
        };
      }
      case "run": {
        const e = entry as Extract<typeof entry, { distanceKm: number }>;
        return {
          type,
          id: e.id,
          date: e.date,
          title: `${e.distanceKm} km run · ${formatDuration(e.durationSec)}`,
          detail: e.notes,
          badge: e.paceSecPerKm ? formatPace(e.paceSecPerKm) : null,
        };
      }
      case "meal": {
        const e = entry as Extract<typeof entry, { mealType: string; description: string }>;
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
        };
      }
      case "workout": {
        const e = entry as Extract<typeof entry, { title: string; exercises: { name: string }[] }>;
        return {
          type,
          id: e.id,
          date: e.date,
          title: e.title,
          detail: e.exercises.map((x) => x.name).join(", ") || e.notes,
          badge: e.type,
        };
      }
    }
  });
}

const typeIcon: Record<EntryType, typeof Scale> = {
  weight: Scale,
  run: Footprints,
  meal: UtensilsCrossed,
  workout: Dumbbell,
};

const typeLabel: Record<EntryType, string> = {
  weight: "Weight entry",
  run: "Run",
  meal: "Meal",
  workout: "Workout",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const { type: rawType } = await searchParams;
  const filter: Filter = (filters.find((f) => f.value === rawType)?.value ?? "all") as Filter;

  const types: EntryType[] = filter === "all" ? [...ENTRY_TYPES] : [filter];
  const lists = await Promise.all(
    types.map(async (t) => toItems(t, await listEntries(userId, t, { limit: filter === "all" ? 25 : 100 })))
  );
  const items = lists
    .flat()
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 100);

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground text-sm">Everything you have logged</p>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/history" : `/history?type=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nothing here yet"
          description="Log your first entry and it will show up here."
          ctaLabel="Log something"
          ctaHref="/log"
        />
      ) : (
        <div className="grid gap-2">
          {items.map((item) => {
            const Icon = typeIcon[item.type];
            return (
              <Card key={`${item.type}-${item.id}`} className="py-3">
                <CardContent className="flex items-center gap-3 px-3">
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDate(item.date)}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                  <DeleteEntryButton
                    type={item.type}
                    id={item.id}
                    label={typeLabel[item.type]}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
