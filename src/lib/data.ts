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

// ---------- Progress photos ----------

export const photoInputSchema = z.object({
  takenAt: z.coerce.date().optional(),
  fileUrl: z.string().min(1).max(1000),
  note: z.string().max(1000).nullish(),
  weightKg: z.coerce.number().positive().max(500).nullish(),
});
export type PhotoInput = z.input<typeof photoInputSchema>;

export async function createProgressPhoto(userId: string, input: PhotoInput) {
  const data = photoInputSchema.parse(input);
  return prisma.progressPhoto.create({
    data: {
      userId,
      takenAt: data.takenAt ?? new Date(),
      fileUrl: data.fileUrl,
      note: data.note ?? null,
      weightKg: data.weightKg ?? null,
    },
  });
}

export async function deleteProgressPhoto(userId: string, id: string) {
  return (await prisma.progressPhoto.deleteMany({ where: { id, userId } })).count > 0;
}

// ---------- Goal + plan management ----------

export async function deactivateGoal(userId: string, id: string) {
  return (
    (await prisma.goal.updateMany({ where: { id, userId }, data: { active: false } })).count > 0
  );
}

export async function getActivePlan(userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { userId, active: true },
    include: { items: { orderBy: [{ week: "asc" }, { dayOfWeek: "asc" }] }, goal: true },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return null;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const currentWeek = Math.min(
    plan.weeks,
    Math.max(1, Math.floor((Date.now() - plan.startDate.getTime()) / WEEK_MS) + 1)
  );
  return { ...plan, currentWeek };
}

export async function setPlanItemCompleted(userId: string, itemId: string, completed: boolean) {
  const result = await prisma.planItem.updateMany({
    where: { id: itemId, plan: { userId } },
    data: { completedAt: completed ? new Date() : null },
  });
  return result.count > 0;
}

// ---------- Updating ----------

export const runUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  distanceKm: z.coerce.number().positive().max(500).optional(),
  durationSec: z.coerce.number().int().positive().max(24 * 3600).optional(),
  notes: z.string().max(2000).nullish(),
});
export type RunUpdate = z.input<typeof runUpdateSchema>;

export async function updateRun(userId: string, id: string, input: RunUpdate) {
  const data = runUpdateSchema.parse(input);
  const existing = await prisma.run.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const distanceKm = data.distanceKm ?? existing.distanceKm;
  const durationSec = data.durationSec ?? existing.durationSec;
  return prisma.run.update({
    where: { id: existing.id },
    data: {
      ...(data.date !== undefined && { date: data.date }),
      distanceKm,
      durationSec,
      paceSecPerKm: Math.round(durationSec / distanceKm),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export const weightUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  weightKg: z.coerce.number().positive().max(500).optional(),
  note: z.string().max(1000).nullish(),
});
export type WeightUpdate = z.input<typeof weightUpdateSchema>;

export async function updateWeight(userId: string, id: string, input: WeightUpdate) {
  const data = weightUpdateSchema.parse(input);
  const existing = await prisma.weightEntry.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.weightEntry.update({
    where: { id: existing.id },
    data: {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
      ...(data.note !== undefined && { note: data.note }),
    },
  });
}

export const mealUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  description: z.string().min(1).max(2000).optional(),
  calories: z.coerce.number().int().min(0).max(10000).nullish(),
  proteinG: z.coerce.number().min(0).max(1000).nullish(),
  carbsG: z.coerce.number().min(0).max(1000).nullish(),
  fatG: z.coerce.number().min(0).max(1000).nullish(),
});
export type MealUpdate = z.input<typeof mealUpdateSchema>;

export async function updateMeal(userId: string, id: string, input: MealUpdate) {
  const data = mealUpdateSchema.parse(input);
  const existing = await prisma.meal.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.meal.update({
    where: { id: existing.id },
    data: {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.mealType !== undefined && { mealType: data.mealType }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.calories !== undefined && { calories: data.calories }),
      ...(data.proteinG !== undefined && { proteinG: data.proteinG }),
      ...(data.carbsG !== undefined && { carbsG: data.carbsG }),
      ...(data.fatG !== undefined && { fatG: data.fatG }),
    },
  });
}

export const workoutUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  type: z.enum(["strength", "cardio", "mobility", "sport", "other"]).optional(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).nullish(),
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
    .optional(),
});
export type WorkoutUpdate = z.input<typeof workoutUpdateSchema>;

export async function updateWorkout(userId: string, id: string, input: WorkoutUpdate) {
  const data = workoutUpdateSchema.parse(input);
  const existing = await prisma.workout.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.workout.update({
    where: { id: existing.id },
    data: {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
      // Exercises are replaced wholesale when provided
      ...(data.exercises !== undefined && {
        exercises: {
          deleteMany: {},
          create: data.exercises.map((e, order) => ({
            name: e.name,
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            weightKg: e.weightKg ?? null,
            order,
          })),
        },
      }),
    },
    include: { exercises: { orderBy: { order: "asc" } } },
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

export async function getEntry(userId: string, type: EntryType, id: string) {
  const where = { id, userId };
  switch (type) {
    case "weight":
      return prisma.weightEntry.findFirst({ where });
    case "run":
      return prisma.run.findFirst({ where });
    case "meal":
      return prisma.meal.findFirst({ where });
    case "workout":
      return prisma.workout.findFirst({
        where,
        include: { exercises: { orderBy: { order: "asc" } } },
      });
  }
}

/** Partial update; returns the updated entry or null when it isn't the user's. */
export async function updateEntry(userId: string, type: EntryType, id: string, input: unknown) {
  switch (type) {
    case "weight":
      return updateWeight(userId, id, input as WeightUpdate);
    case "run":
      return updateRun(userId, id, input as RunUpdate);
    case "meal":
      return updateMeal(userId, id, input as MealUpdate);
    case "workout":
      return updateWorkout(userId, id, input as WorkoutUpdate);
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
