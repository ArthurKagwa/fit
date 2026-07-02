import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Flame,
  Footprints,
  LineChart as LineChartIcon,
  Scale,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { auth } from "@/auth";
import { getStatsSummary } from "@/lib/stats";
import { formatPace } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KpiTile } from "@/components/KpiTile";
import { EmptyState } from "@/components/EmptyState";
import { WeightChart } from "@/components/charts/WeightChart";
import { WeeklyDistanceChart } from "@/components/charts/WeeklyDistanceChart";
import { PaceChart } from "@/components/charts/PaceChart";
import { CaloriesChart } from "@/components/charts/CaloriesChart";

const goalLabels: Record<string, string> = {
  TARGET_WEIGHT: "Target weight",
  WEEKLY_DISTANCE: "Weekly distance",
  PACE_5K: "5k pace",
  DAILY_CALORIES: "Daily calories",
  CUSTOM: "Goal",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const stats = await getStatsSummary(userId);
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  const hasAnyData =
    stats.weight.series.length > 0 ||
    stats.running.paceTrend.length > 0 ||
    stats.calories.daily.some((d) => d.kcal > 0) ||
    stats.training.workoutsThisWeek > 0;

  const distanceGoal = stats.goals.find((g) => g.type === "WEEKLY_DISTANCE");

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Hey {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm">Here’s where you stand</p>
      </header>

      {!hasAnyData ? (
        <EmptyState
          icon={Activity}
          title="No data yet"
          description="Log a weight, run or meal — or just tell the coach what you did — and your dashboard will come alive."
          ctaLabel="Log your first entry"
          ctaHref="/log"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <KpiTile
              icon={Scale}
              label="Weight"
              value={stats.weight.latestKg != null ? `${stats.weight.latestKg} kg` : "—"}
              trend={stats.weight.delta30d}
              trendGoodWhenDown
              sub={stats.weight.delta30d != null ? "kg in 30d" : null}
            />
            <KpiTile
              icon={Footprints}
              label="This week"
              value={`${stats.running.thisWeekKm} km`}
              sub={`${stats.training.runsThisWeek} runs`}
            />
            <KpiTile
              icon={Flame}
              label="Streak"
              value={`${stats.training.streakDays} days`}
              sub={`${stats.training.workoutsThisWeek} workout${stats.training.workoutsThisWeek === 1 ? "" : "s"} this week`}
            />
            <KpiTile
              icon={UtensilsCrossed}
              label="Today"
              value={`${stats.calories.todayKcal} kcal`}
              sub={stats.calories.targetKcal ? `of ${stats.calories.targetKcal} target` : null}
            />
          </div>

          {stats.goals.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="text-primary size-4" /> Goals
                </CardTitle>
                <Link href="/goals" className="text-primary text-sm font-medium">
                  Manage
                </Link>
              </CardHeader>
              <CardContent className="grid gap-3">
                {stats.goals.map((g) => (
                  <div key={g.id} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">
                        {g.description ?? goalLabels[g.type] ?? g.type}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {g.currentValue != null ? `${g.currentValue} / ` : ""}
                        {g.targetValue} {g.unit}
                      </span>
                    </div>
                    {g.progressPct != null && <Progress value={g.progressPct} />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {stats.weight.series.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="text-chart-1 size-4" /> Weight trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeightChart data={stats.weight.series} />
              </CardContent>
            </Card>
          )}

          {stats.running.weekly.some((w) => w.km > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Footprints className="text-chart-2 size-4" /> Weekly distance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeeklyDistanceChart
                  data={stats.running.weekly}
                  targetKm={distanceGoal?.targetValue}
                />
              </CardContent>
            </Card>
          )}

          {stats.running.paceTrend.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChartIcon className="text-chart-4 size-4" /> Pace trend
                </CardTitle>
                {stats.running.lastRun?.paceSecPerKm && (
                  <p className="text-muted-foreground text-xs">
                    Last run {formatPace(stats.running.lastRun.paceSecPerKm)}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <PaceChart data={stats.running.paceTrend} />
              </CardContent>
            </Card>
          )}

          {stats.calories.daily.some((d) => d.kcal > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UtensilsCrossed className="text-chart-3 size-4" /> Calories · last 14 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CaloriesChart
                  data={stats.calories.daily}
                  targetKcal={stats.calories.targetKcal}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
