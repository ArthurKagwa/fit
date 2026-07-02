import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Single choke point for all writes/reads of fitness entries.
 * Quick-add forms, REST routes and AI tools all go through these
 * functions, so data stays consistent no matter how it was logged.
 */

const sourceSchema = z.enum(["manual", "screenshot", "photo", "chat"]).default("manual");

// ---------- Runs ----------

export const runInputSchema = z.object({
  date: z.coerce.date().optional(),
  distanceKm: z.coerce.number().positive().max(500),
  durationSec: z.coerce.number().int().positive().max(24 * 3600),
  notes: z.string().max(2000).nullish(),
  source: sourceSchema,
  screenshotUrl: z.string().max(1000).nullish(),
});
export type RunInput = z.input<typeof runInputSchema>;

export async function createRun(userId: string, input: RunInput) {
  const data = runInputSchema.parse(input);
  return prisma.run.create({
    data: {
      userId,
      date: data.date ?? new Date(),
      distanceKm: data.distanceKm,
      durationSec: data.durationSec,
      paceSecPerKm: Math.round(data.durationSec / data.distanceKm),
      notes: data.notes ?? null,
      source: data.source,
      screenshotUrl: data.screenshotUrl ?? null,
    },
  });
}

// ---------- Weight ----------

export const weightInputSchema = z.object({
  date: z.coerce.date().optional(),
  weightKg: z.coerce.number().positive().max(500),
  note: z.string().max(1000).nullish(),
  source: sourceSchema,
});
export type WeightInput = z.input<typeof weightInputSchema>;

export async function createWeight(userId: string, input: WeightInput) {
  const data = weightInputSchema.parse(input);
  return prisma.weightEntry.create({
    data: {
      userId,
      date: data.date ?? new Date(),
      weightKg: data.weightKg,
      note: data.note ?? null,
      source: data.source,
    },
  });
}

// ---------- Meals ----------

export const mealInputSchema = z.object({
  date: z.coerce.date().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1).max(2000),
  calories: z.coerce.number().int().min(0).max(10000).nullish(),
  proteinG: z.coerce.number().min(0).max(1000).nullish(),
  carbsG: z.coerce.number().min(0).max(1000).nullish(),
  fatG: z.coerce.number().min(0).max(1000).nullish(),
  photoUrl: z.string().max(1000).nullish(),
  source: sourceSchema,
});
export type MealInput = z.input<typeof mealInputSchema>;

export async function createMeal(userId: string, input: MealInput) {
  const data = mealInputSchema.parse(input);
  return prisma.meal.create({
    data: {
      userId,
      date: data.date ?? new Date(),
      mealType: data.mealType,
      description: data.description,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      photoUrl: data.photoUrl ?? null,
      source: data.source,
    },
  });
}

// ---------- Workouts ----------

export const workoutInputSchema = z.object({
  date: z.coerce.date().optional(),
  type: z.enum(["strength", "cardio", "mobility", "sport", "other"]).default("strength"),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullish(),
  source: sourceSchema,
  exercises: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        sets: z.coerce.number().int().positive().max(100).nullish(),
        reps: z.coerce.number().int().positive().max(1000).nullish(),
        weightKg: z.coerce.number().min(0).max(1000).nullish(),
      })
    )
    .max(50)
    .default([]),
});
export type WorkoutInput = z.input<typeof workoutInputSchema>;

export async function createWorkout(userId: string, input: WorkoutInput) {
  const data = workoutInputSchema.parse(input);
  return prisma.workout.create({
    data: {
      userId,
      date: data.date ?? new Date(),
      type: data.type,
      title: data.title,
      notes: data.notes ?? null,
      source: data.source,
      exercises: {
        create: data.exercises.map((e, order) => ({
          name: e.name,
          sets: e.sets ?? null,
          reps: e.reps ?? null,
          weightKg: e.weightKg ?? null,
          order,
        })),
      },
    },
    include: { exercises: true },
  });
}

// ---------- Goals ----------

export const goalInputSchema = z.object({
  type: z.enum(["TARGET_WEIGHT", "WEEKLY_DISTANCE", "PACE_5K", "DAILY_CALORIES", "CUSTOM"]),
  targetValue: z.coerce.number(),
  unit: z.string().min(1).max(50),
  targetDate: z.coerce.date().nullish(),
  description: z.string().max(1000).nullish(),
});
export type GoalInput = z.input<typeof goalInputSchema>;

export async function saveGoal(userId: string, input: GoalInput) {
  const data = goalInputSchema.parse(input);
  // Only one active goal per type (except CUSTOM, which can have several)
  if (data.type !== "CUSTOM") {
    await prisma.goal.updateMany({
      where: { userId, type: data.type, active: true },
      data: { active: false },
    });
  }
  return prisma.goal.create({
    data: {
      userId,
      type: data.type,
      targetValue: data.targetValue,
      unit: data.unit,
      targetDate: data.targetDate ?? null,
      description: data.description ?? null,
    },
  });
}

// ---------- Plans ----------

export const planInputSchema = z.object({
  title: z.string().min(1).max(200),
  goalId: z.string().nullish(),
  startDate: z.coerce.date().optional(),
  weeks: z.coerce.number().int().min(1).max(52),
  items: z
    .array(
      z.object({
        week: z.coerce.number().int().min(1).max(52),
        dayOfWeek: z.coerce.number().int().min(1).max(7),
        activity: z.string().min(1).max(200),
        detail: z.string().max(1000).nullish(),
      })
    )
    .min(1)
    .max(500),
});
export type PlanInput = z.input<typeof planInputSchema>;

export async function createPlan(userId: string, input: PlanInput) {
  const data = planInputSchema.parse(input);
  // A new plan becomes the active one
  await prisma.plan.updateMany({
    where: { userId, active: true },
    data: { active: false },
  });
  return prisma.plan.create({
    data: {
      userId,
      title: data.title,
      goalId: data.goalId ?? null,
      startDate: data.startDate ?? new Date(),
      weeks: data.weeks,
      items: {
        create: data.items.map((item) => ({
          week: item.week,
          dayOfWeek: item.dayOfWeek,
          activity: item.activity,
          detail: item.detail ?? null,
        })),
      },
    },
    include: { items: true },
  });
}

// ---------- Listing & deleting ----------

export const ENTRY_TYPES = ["weight", "run", "meal", "workout"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const listOptionsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type ListOptions = z.input<typeof listOptionsSchema>;

export async function listEntries(userId: string, type: EntryType, options: ListOptions = {}) {
  const { from, to, limit } = listOptionsSchema.parse(options);
  const where = {
    userId,
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const args = { where, orderBy: { date: "desc" as const }, take: limit };

  switch (type) {
    case "weight":
      return prisma.weightEntry.findMany(args);
    case "run":
      return prisma.run.findMany(args);
    case "meal":
      return prisma.meal.findMany(args);
    case "workout":
      return prisma.workout.findMany({ ...args, include: { exercises: { orderBy: { order: "asc" } } } });
  }
}

export async function deleteEntry(userId: string, type: EntryType, id: string) {
  // deleteMany so the userId scope is enforced atomically
  const where = { id, userId };
  switch (type) {
    case "weight":
      return (await prisma.weightEntry.deleteMany({ where })).count > 0;
    case "run":
      return (await prisma.run.deleteMany({ where })).count > 0;
    case "meal":
      return (await prisma.meal.deleteMany({ where })).count > 0;
    case "workout":
      return (await prisma.workout.deleteMany({ where })).count > 0;
  }
}
