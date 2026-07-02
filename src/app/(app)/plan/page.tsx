import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { getUserId } from "@/lib/session";
import { getActivePlan } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { PlanItemCheckbox } from "@/components/plan/PlanItemCheckbox";
import { cn } from "@/lib/utils";

export const metadata = { title: "Training plan" };

const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY = 24 * 60 * 60 * 1000;

export default async function PlanPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const plan = await getActivePlan(userId);

  if (!plan) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-2xl font-bold">Training plan</h1>
        </header>
        <EmptyState
          icon={CalendarCheck}
          title="No active plan"
          description="Ask the coach to build you one — try “build me a 6-week 5k plan” in the chat."
          ctaLabel="Ask the coach"
          ctaHref="/chat"
        />
      </div>
    );
  }

  const total = plan.items.length;
  const done = plan.items.filter((i) => i.completedAt).length;
  const currentWeek = Math.min(
    plan.weeks,
    Math.max(1, Math.floor((Date.now() - plan.startDate.getTime()) / (7 * DAY)) + 1)
  );

  const weeks = Array.from({ length: plan.weeks }, (_, i) => i + 1).map((week) => ({
    week,
    items: plan.items.filter((i) => i.week === week),
  }));

  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold">{plan.title}</h1>
        <p className="text-muted-foreground text-sm">
          {plan.weeks} weeks · started {formatDate(plan.startDate)}
          {plan.goal ? ` · ${plan.goal.description ?? plan.goal.type}` : ""}
        </p>
      </header>

      <Card className="py-3.5">
        <CardContent className="grid gap-2 px-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {done} / {total} sessions
            </span>
          </div>
          <Progress value={total ? (done / total) * 100 : 0} />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {weeks.map(({ week, items }) => (
          <Card key={week} className={cn(week < currentWeek && "opacity-75")}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Week {week}</CardTitle>
              {week === currentWeek && <Badge>This week</Badge>}
            </CardHeader>
            <CardContent className="grid gap-1.5">
              {items.length === 0 && (
                <p className="text-muted-foreground text-sm">Rest week</p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    item.completedAt && "bg-muted/50"
                  )}
                >
                  <PlanItemCheckbox
                    id={item.id}
                    completed={Boolean(item.completedAt)}
                    label={item.activity}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        item.completedAt && "text-muted-foreground line-through"
                      )}
                    >
                      {item.activity}
                    </p>
                    {item.detail && (
                      <p className="text-muted-foreground truncate text-xs">{item.detail}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs font-medium">
                    {dayNames[item.dayOfWeek] ?? ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
