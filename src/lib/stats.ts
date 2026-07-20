import { prisma } from "@/lib/db";
import { formatDuration, formatPace } from "@/lib/format";

/**
 * Aggregated view of the user's data. Feeds the dashboard, the
 * `get_stats` AI tool and the coach system prompt, so advice is
 * always grounded in what was actually logged.
 */

const DAY = 24 * 60 * 60 * 1000;

// Date-only entries are stored at UTC midnight (see lib/format.ts), so all
// day/week bucketing works in UTC too. Using local-time methods here would
// shift an entry into the previous day — and, at a week boundary, the
// previous week — on any runtime west of UTC.
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

/** Monday 00:00 UTC of the week containing d. */
function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const dow = (day.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(day.getTime() - dow * DAY);
}

function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type StatsSummary = {
  weight: {
    latestKg: number | null;
    latestDate: string | null;
    delta7d: number | null;
    delta30d: number | null;
    series: { date: string; kg: number }[]; // last 90 days
  };
  running: {
    thisWeekKm: number;
    weekly: { weekStart: string; km: number; runs: number }[]; // last 8 weeks
    paceTrend: { date: string; paceSecPerKm: number; distanceKm: number }[]; // last 20 runs
    lastRun: { date: string; distanceKm: number; durationSec: number; paceSecPerKm: number | null } | null;
  };
  calories: {
    todayKcal: number;
    targetKcal: number | null;
    daily: { date: string; kcal: number; protein: number }[]; // last 14 days
  };
  training: {
    workoutsThisWeek: number;
    workoutsLastWeek: number;
    runsThisWeek: number;
    streakDays: number;
  };
  goals: {
    id: string;
    type: string;
    description: string | null;
    targetValue: number;
    unit: string;
    targetDate: string | null;
    currentValue: number | null;
    progressPct: number | null;
  }[];
};

export async function getStatsSummary(userId: string): Promise<StatsSummary> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const since90 = new Date(now.getTime() - 90 * DAY);
  const since8w = new Date(weekStart.getTime() - 7 * 7 * DAY);
  const since14 = startOfDay(new Date(now.getTime() - 13 * DAY));
  const since60 = new Date(now.getTime() - 60 * DAY);

  const [weights, runs, meals14, workoutsWeek, workoutsLastWeek, goals, recentDates] =
    await Promise.all([
    prisma.weightEntry.findMany({
      where: { userId, date: { gte: since90 } },
      orderBy: { date: "asc" },
    }),
    prisma.run.findMany({
      where: { userId, date: { gte: since8w } },
      orderBy: { date: "asc" },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: since14 } },
      orderBy: { date: "asc" },
    }),
    prisma.workout.count({ where: { userId, date: { gte: weekStart } } }),
    prisma.workout.count({
      where: { userId, date: { gte: new Date(weekStart.getTime() - 7 * DAY), lt: weekStart } },
    }),
    prisma.goal.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
    }),
    // dates of any activity in the last 60 days, for streak computation
    Promise.all([
      prisma.weightEntry.findMany({ where: { userId, date: { gte: since60 } }, select: { date: true } }),
      prisma.run.findMany({ where: { userId, date: { gte: since60 } }, select: { date: true } }),
      prisma.meal.findMany({ where: { userId, date: { gte: since60 } }, select: { date: true } }),
      prisma.workout.findMany({ where: { userId, date: { gte: since60 } }, select: { date: true } }),
    ]),
  ]);

  // ---- weight ----
  const latestWeight = weights.at(-1) ?? null;
  function weightAtOrBefore(target: Date): number | null {
    let candidate: number | null = null;
    for (const w of weights) {
      if (w.date <= target) candidate = w.weightKg;
      else break;
    }
    return candidate;
  }
  const w7 = weightAtOrBefore(new Date(now.getTime() - 7 * DAY));
  const w30 = weightAtOrBefore(new Date(now.getTime() - 30 * DAY));

  // ---- running ----
  const weekly: { weekStart: string; km: number; runs: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(weekStart.getTime() - i * 7 * DAY);
    const we = new Date(ws.getTime() + 7 * DAY);
    const inWeek = runs.filter((r) => r.date >= ws && r.date < we);
    weekly.push({
      weekStart: dayKey(ws),
      km: Math.round(inWeek.reduce((sum, r) => sum + r.distanceKm, 0) * 10) / 10,
      runs: inWeek.length,
    });
  }
  const lastRun = runs.at(-1) ?? null;
  const paceTrend = runs
    .filter((r) => r.paceSecPerKm != null)
    .slice(-20)
    .map((r) => ({
      date: dayKey(r.date),
      paceSecPerKm: r.paceSecPerKm as number,
      distanceKm: r.distanceKm,
    }));

  // ---- calories ----
  const daily: { date: string; kcal: number; protein: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * DAY));
    const key = dayKey(day);
    const inDay = meals14.filter((m) => dayKey(m.date) === key);
    daily.push({
      date: key,
      kcal: inDay.reduce((sum, m) => sum + (m.calories ?? 0), 0),
      protein: Math.round(inDay.reduce((sum, m) => sum + (m.proteinG ?? 0), 0)),
    });
  }
  const caloriesGoal = goals.find((g) => g.type === "DAILY_CALORIES") ?? null;

  // ---- streak ----
  const activeDays = new Set<string>();
  for (const list of recentDates) for (const { date } of list) activeDays.add(dayKey(date));
  let streakDays = 0;
  // A streak may end today or yesterday (today just hasn't been logged yet)
  let cursor = activeDays.has(dayKey(now))
    ? startOfDay(now)
    : activeDays.has(dayKey(new Date(now.getTime() - DAY)))
      ? startOfDay(new Date(now.getTime() - DAY))
      : null;
  while (cursor && activeDays.has(dayKey(cursor))) {
    streakDays++;
    cursor = new Date(cursor.getTime() - DAY);
  }

  // ---- goals with progress ----
  const runsThisWeek = runs.filter((r) => r.date >= weekStart);
  const thisWeekKm = Math.round(runsThisWeek.reduce((s, r) => s + r.distanceKm, 0) * 10) / 10;
  const todayKcal = daily.at(-1)?.kcal ?? 0;

  const goalViews = await Promise.all(
    goals.map(async (g) => {
      let currentValue: number | null = null;
      let progressPct: number | null = null;

      if (g.type === "TARGET_WEIGHT" && latestWeight) {
        currentValue = latestWeight.weightKg;
        const start = await prisma.weightEntry.findFirst({
          where: { userId, date: { lte: g.createdAt } },
          orderBy: { date: "desc" },
        });
        const startKg = start?.weightKg ?? weights[0]?.weightKg ?? null;
        if (startKg != null && startKg !== g.targetValue) {
          progressPct = Math.round(
            ((startKg - currentValue) / (startKg - g.targetValue)) * 100
          );
        }
      } else if (g.type === "WEEKLY_DISTANCE") {
        currentValue = thisWeekKm;
        progressPct = Math.round((thisWeekKm / g.targetValue) * 100);
      } else if (g.type === "DAILY_CALORIES") {
        currentValue = todayKcal;
        progressPct = Math.round((todayKcal / g.targetValue) * 100);
      } else if (g.type === "PACE_5K") {
        // target stored in minutes per km; current = best recent pace
        const best = paceTrend.length
          ? Math.min(...paceTrend.map((p) => p.paceSecPerKm))
          : null;
        currentValue = best != null ? Math.round((best / 60) * 100) / 100 : null;
      }

      return {
        id: g.id,
        type: g.type,
        description: g.description,
        targetValue: g.targetValue,
        unit: g.unit,
        targetDate: g.targetDate ? dayKey(g.targetDate) : null,
        currentValue,
        progressPct: progressPct != null ? Math.max(0, Math.min(100, progressPct)) : null,
      };
    })
  );

  return {
    weight: {
      latestKg: latestWeight?.weightKg ?? null,
      latestDate: latestWeight ? dayKey(latestWeight.date) : null,
      delta7d:
        latestWeight && w7 != null
          ? Math.round((latestWeight.weightKg - w7) * 10) / 10
          : null,
      delta30d:
        latestWeight && w30 != null
          ? Math.round((latestWeight.weightKg - w30) * 10) / 10
          : null,
      series: weights.map((w) => ({ date: dayKey(w.date), kg: w.weightKg })),
    },
    running: {
      thisWeekKm,
      weekly,
      paceTrend,
      lastRun: lastRun
        ? {
            date: dayKey(lastRun.date),
            distanceKm: lastRun.distanceKm,
            durationSec: lastRun.durationSec,
            paceSecPerKm: lastRun.paceSecPerKm,
          }
        : null,
    },
    calories: {
      todayKcal,
      targetKcal: caloriesGoal?.targetValue ?? null,
      daily,
    },
    training: {
      workoutsThisWeek: workoutsWeek,
      workoutsLastWeek,
      runsThisWeek: runsThisWeek.length,
      streakDays,
    },
    goals: goalViews,
  };
}

/** Compact plain-text rendering for the coach's system prompt. */
export function statsToPromptText(s: StatsSummary): string {
  const lines: string[] = [];

  if (s.weight.latestKg != null) {
    const deltas = [
      s.weight.delta7d != null ? `${s.weight.delta7d > 0 ? "+" : ""}${s.weight.delta7d} kg vs 7d ago` : null,
      s.weight.delta30d != null ? `${s.weight.delta30d > 0 ? "+" : ""}${s.weight.delta30d} kg vs 30d ago` : null,
    ].filter(Boolean);
    lines.push(`Weight: ${s.weight.latestKg} kg (${s.weight.latestDate})${deltas.length ? " — " + deltas.join(", ") : ""}`);
  } else {
    lines.push("Weight: no entries yet");
  }

  const wk = s.running.weekly.slice(-4).map((w) => `${w.km}km`).join(", ");
  lines.push(
    `Running: ${s.running.thisWeekKm} km this week (last 4 weeks: ${wk}); ${
      s.running.lastRun
        ? `last run ${s.running.lastRun.distanceKm} km in ${formatDuration(s.running.lastRun.durationSec)}${
            s.running.lastRun.paceSecPerKm ? ` (${formatPace(s.running.lastRun.paceSecPerKm)})` : ""
          } on ${s.running.lastRun.date}`
        : "no runs yet"
    }`
  );

  lines.push(
    `Calories today: ${s.calories.todayKcal} kcal${s.calories.targetKcal ? ` of ${s.calories.targetKcal} target` : ""}; ` +
      `avg last 7 days: ${Math.round(
        s.calories.daily.slice(-7).reduce((a, d) => a + d.kcal, 0) / 7
      )} kcal`
  );

  lines.push(
    `Training: ${s.training.workoutsThisWeek} workouts + ${s.training.runsThisWeek} runs this week; logging streak ${s.training.streakDays} days`
  );

  if (s.goals.length) {
    lines.push("Active goals:");
    for (const g of s.goals) {
      lines.push(
        `- ${g.description ?? g.type}: target ${g.targetValue} ${g.unit}` +
          (g.currentValue != null ? `, currently ${g.currentValue}` : "") +
          (g.progressPct != null ? ` (${g.progressPct}% there)` : "") +
          (g.targetDate ? `, by ${g.targetDate}` : "")
      );
    }
  } else {
    lines.push("Active goals: none set");
  }

  return lines.join("\n");
}
