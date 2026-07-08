import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { getEntry, ENTRY_TYPES, type EntryType } from "@/lib/data";
import { formatDate, formatDuration, formatPace } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeleteEntryButton } from "@/components/history/DeleteEntryButton";
import { EditEntryButton } from "@/components/history/EditEntrySheet";
import { toItem, typeIcon, typeLabel } from "@/components/history/item";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function HistoryEntryPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const { type: rawType, id } = await params;
  const type = ENTRY_TYPES.find((t) => t === rawType) as EntryType | undefined;
  if (!type) notFound();

  const entry = await getEntry(userId, type, id);
  if (!entry) notFound();

  const item = toItem(type, entry);
  const Icon = typeIcon[type];

  return (
    <div className="grid gap-4">
      <Link
        href="/history"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to history
      </Link>

      <header className="flex min-w-0 items-center gap-3">
        <div className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{item.title}</h1>
          <p className="text-muted-foreground text-sm">
            {typeLabel[type]} · {formatDate(item.date)}
          </p>
        </div>
        {item.badge && (
          <Badge variant="secondary" className="shrink-0">
            {item.badge}
          </Badge>
        )}
      </header>

      <Card>
        <CardContent className="grid gap-3 px-4 py-4">
          {type === "weight" && (() => {
            const e = entry as Extract<typeof entry, { weightKg: number; note: string | null }>;
            return (
              <>
                <Row label="Weight" value={`${e.weightKg.toFixed(1)} kg`} />
                <Row label="Date" value={formatDate(e.date)} />
                {e.note && (
                  <>
                    <Separator />
                    <p className="text-sm">{e.note}</p>
                  </>
                )}
              </>
            );
          })()}

          {type === "run" && (() => {
            const e = entry as Extract<typeof entry, { distanceKm: number }>;
            return (
              <>
                <Row label="Distance" value={`${e.distanceKm} km`} />
                <Row label="Duration" value={formatDuration(e.durationSec)} />
                {e.paceSecPerKm && <Row label="Pace" value={formatPace(e.paceSecPerKm)} />}
                <Row label="Date" value={formatDate(e.date)} />
                {e.notes && (
                  <>
                    <Separator />
                    <p className="text-sm">{e.notes}</p>
                  </>
                )}
              </>
            );
          })()}

          {type === "meal" && (() => {
            const e = entry as Extract<typeof entry, { mealType: string; description: string }>;
            return (
              <>
                <Row label="Meal" value={e.mealType} />
                <Row label="Date" value={formatDate(e.date)} />
                <Separator />
                <p className="text-sm">{e.description}</p>
                {(e.calories != null || e.proteinG != null || e.carbsG != null || e.fatG != null) && (
                  <>
                    <Separator />
                    {e.calories != null && <Row label="Calories" value={`${e.calories} kcal`} />}
                    {e.proteinG != null && <Row label="Protein" value={`${Math.round(e.proteinG)} g`} />}
                    {e.carbsG != null && <Row label="Carbs" value={`${Math.round(e.carbsG)} g`} />}
                    {e.fatG != null && <Row label="Fat" value={`${Math.round(e.fatG)} g`} />}
                  </>
                )}
              </>
            );
          })()}

          {type === "workout" && (() => {
            const e = entry as Extract<
              typeof entry,
              {
                title: string;
                exercises: { name: string; sets: number | null; reps: number | null; weightKg: number | null }[];
              }
            >;
            return (
              <>
                <Row label="Type" value={e.type} />
                <Row label="Date" value={formatDate(e.date)} />
                {e.exercises.length > 0 && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      {e.exercises.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium">{ex.name}</span>
                          <span className="text-muted-foreground">
                            {[
                              ex.sets != null ? `${ex.sets} sets` : null,
                              ex.reps != null ? `${ex.reps} reps` : null,
                              ex.weightKg != null ? `${ex.weightKg} kg` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {e.notes && (
                  <>
                    <Separator />
                    <p className="text-sm">{e.notes}</p>
                  </>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <EditEntryButton entry={item.edit} label={typeLabel[type]} iconOnly={false} />
        <DeleteEntryButton
          type={type}
          id={item.id}
          label={typeLabel[type]}
          redirectTo="/history"
          iconOnly={false}
        />
      </div>
    </div>
  );
}
