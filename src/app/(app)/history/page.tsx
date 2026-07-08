import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { listEntries, ENTRY_TYPES, type EntryType } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteEntryButton } from "@/components/history/DeleteEntryButton";
import { EditEntryButton } from "@/components/history/EditEntrySheet";
import { toItems, typeIcon, typeLabel } from "@/components/history/item";
import { cn } from "@/lib/utils";

type Filter = "all" | EntryType;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "weight", label: "Weight" },
  { value: "run", label: "Runs" },
  { value: "meal", label: "Meals" },
  { value: "workout", label: "Workouts" },
];

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
              <Card key={`${item.type}-${item.id}`} className="min-w-0 overflow-hidden py-3">
                <CardContent className="flex min-w-0 items-center gap-2 px-3">
                  <Link
                    href={`/history/${item.type}/${item.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
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
                      <Badge variant="secondary" className="shrink-0 px-2">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center">
                    <EditEntryButton entry={item.edit} label={typeLabel[item.type]} />
                    <DeleteEntryButton
                      type={item.type}
                      id={item.id}
                      label={typeLabel[item.type]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
