import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { getUserId } from "@/lib/session";
import { getStatsSummary } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { GoalForm } from "@/components/goals/GoalForm";
import { RemoveGoalButton } from "@/components/goals/RemoveGoalButton";

export const metadata = { title: "Goals" };

const goalLabels: Record<string, string> = {
  TARGET_WEIGHT: "Target weight",
  WEEKLY_DISTANCE: "Weekly distance",
  PACE_5K: "5k pace",
  DAILY_CALORIES: "Daily calories",
  CUSTOM: "Goal",
};

export default async function GoalsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const stats = await getStatsSummary(userId);

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-muted-foreground text-sm">What you’re working towards</p>
      </header>

      {stats.goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a target below — or just tell the coach “I want to get to 78 kg”."
        />
      ) : (
        <div className="grid gap-2.5">
          {stats.goals.map((g) => {
            const label = g.description ?? goalLabels[g.type] ?? g.type;
            return (
              <Card key={g.id} className="py-3.5">
                <CardContent className="grid gap-2 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{label}</p>
                    <RemoveGoalButton id={g.id} label={label} />
                  </div>
                  <div className="text-muted-foreground flex items-baseline justify-between text-xs">
                    <span>
                      {g.currentValue != null ? `Now: ${g.currentValue} ${g.unit}` : "No data yet"}
                    </span>
                    <span className="tabular-nums">
                      Target: {g.targetValue} {g.unit}
                      {g.targetDate ? ` by ${g.targetDate}` : ""}
                    </span>
                  </div>
                  {g.progressPct != null && <Progress value={g.progressPct} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New goal</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalForm />
        </CardContent>
      </Card>
    </div>
  );
}
