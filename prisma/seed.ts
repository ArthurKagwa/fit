import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number, hour = 8): Date {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Deterministic pseudo-random in [0, 1) so reseeding is stable. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

async function main() {
  const email = "demo@fit.local";

  // Reset the demo user only — other accounts are untouched.
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo Athlete",
      passwordHash: await hash("Fit123!", 10),
    },
  });

  // ~60 days of weight: 82 -> 79 kg with noise, logged most mornings
  const weights = [];
  for (let i = 60; i >= 0; i--) {
    if (rand(i * 7 + 1) < 0.2) continue; // skip ~20% of days
    const trend = 79 + (i / 60) * 3;
    weights.push({
      userId: user.id,
      date: daysAgo(i, 7),
      weightKg: Math.round((trend + (rand(i * 3 + 2) - 0.5) * 0.8) * 10) / 10,
    });
  }
  await prisma.weightEntry.createMany({ data: weights });

  // 3 runs/week for 8 weeks, pace slowly improving (5:50 -> 5:15 min/km)
  const runs = [];
  for (let w = 8; w >= 1; w--) {
    for (const dayOffset of [1, 3, 6]) {
      const i = (w - 1) * 7 + dayOffset;
      const distanceKm = [5, 6.5, 8, 10][Math.floor(rand(i * 11 + 3) * 4)];
      const paceSecPerKm = Math.round(350 - (8 - w) * 4 + (rand(i * 13 + 4) - 0.5) * 20);
      runs.push({
        userId: user.id,
        date: daysAgo(i, 18),
        distanceKm,
        durationSec: Math.round(distanceKm * paceSecPerKm),
        paceSecPerKm,
        source: "manual",
      });
    }
  }
  await prisma.run.createMany({ data: runs });

  // 2 strength workouts/week
  const workoutTemplates = [
    {
      title: "Push day",
      exercises: [
        { name: "Bench press", sets: 4, reps: 8, weightKg: 60 },
        { name: "Overhead press", sets: 3, reps: 10, weightKg: 35 },
        { name: "Dips", sets: 3, reps: 12 },
      ],
    },
    {
      title: "Pull day",
      exercises: [
        { name: "Deadlift", sets: 4, reps: 6, weightKg: 100 },
        { name: "Pull-ups", sets: 4, reps: 8 },
        { name: "Barbell row", sets: 3, reps: 10, weightKg: 55 },
      ],
    },
    {
      title: "Leg day",
      exercises: [
        { name: "Squat", sets: 4, reps: 8, weightKg: 80 },
        { name: "Lunges", sets: 3, reps: 12, weightKg: 20 },
        { name: "Calf raises", sets: 4, reps: 15, weightKg: 40 },
      ],
    },
  ];
  for (let w = 8; w >= 1; w--) {
    for (const dayOffset of [2, 5]) {
      const i = (w - 1) * 7 + dayOffset;
      const t = workoutTemplates[(w + dayOffset) % workoutTemplates.length];
      await prisma.workout.create({
        data: {
          userId: user.id,
          date: daysAgo(i, 17),
          type: "strength",
          title: t.title,
          exercises: {
            create: t.exercises.map((e, order) => ({ ...e, order })),
          },
        },
      });
    }
  }

  // Meals: ~3/day for the last 21 days
  const mealChoices: [string, string, number, number][] = [
    ["breakfast", "Oats with banana and peanut butter", 420, 16],
    ["breakfast", "Eggs, toast and avocado", 480, 22],
    ["lunch", "Chicken rice bowl with veg", 620, 42],
    ["lunch", "Beef burrito", 700, 35],
    ["dinner", "Grilled fish, potatoes and salad", 560, 40],
    ["dinner", "Pasta with turkey mince", 680, 38],
    ["snack", "Protein shake", 180, 30],
    ["snack", "Greek yogurt with honey", 210, 15],
  ];
  const meals = [];
  for (let i = 21; i >= 0; i--) {
    for (const mealType of ["breakfast", "lunch", "dinner"]) {
      const pick = mealChoices.filter((m) => m[0] === mealType);
      const [type, description, calories, proteinG] =
        pick[Math.floor(rand(i * 17 + mealType.length) * pick.length)];
      meals.push({
        userId: user.id,
        date: daysAgo(i, type === "breakfast" ? 8 : type === "lunch" ? 13 : 20),
        mealType: type,
        description,
        calories: calories + Math.round((rand(i * 19 + 5) - 0.5) * 80),
        proteinG,
        carbsG: Math.round(calories * 0.45 / 4),
        fatG: Math.round(calories * 0.3 / 9),
      });
    }
    if (rand(i * 23 + 6) < 0.6) {
      const [type, description, calories, proteinG] = mealChoices[6 + (i % 2)];
      meals.push({
        userId: user.id,
        date: daysAgo(i, 16),
        mealType: type,
        description,
        calories,
        proteinG,
        carbsG: Math.round(calories * 0.4 / 4),
        fatG: Math.round(calories * 0.25 / 9),
      });
    }
  }
  await prisma.meal.createMany({ data: meals });

  // Goals
  const weightGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      type: "TARGET_WEIGHT",
      targetValue: 78,
      unit: "kg",
      targetDate: new Date(Date.now() + 60 * DAY),
      description: "Get to 78 kg",
    },
  });
  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        type: "DAILY_CALORIES",
        targetValue: 2200,
        unit: "kcal",
        description: "Stay under 2200 kcal/day",
      },
      {
        userId: user.id,
        type: "WEEKLY_DISTANCE",
        targetValue: 20,
        unit: "km",
        description: "Run 20 km per week",
      },
    ],
  });

  // A 6-week plan, ~half completed
  const plan = await prisma.plan.create({
    data: {
      userId: user.id,
      title: "6-week 5k speed block",
      goalId: weightGoal.id,
      startDate: daysAgo(21),
      weeks: 6,
    },
  });
  const planItems = [];
  for (let week = 1; week <= 6; week++) {
    planItems.push(
      { week, dayOfWeek: 2, activity: "Easy run 5 km", detail: "Conversational pace" },
      { week, dayOfWeek: 4, activity: "Intervals", detail: `${4 + week} x 400m @ 5k pace` },
      { week, dayOfWeek: 6, activity: "Long run", detail: `${6 + week} km steady` },
      { week, dayOfWeek: 7, activity: "Strength", detail: "Full body 45 min" }
    );
  }
  await prisma.planItem.createMany({
    data: planItems.map((item) => ({
      ...item,
      planId: plan.id,
      completedAt:
        item.week <= 3 && rand(item.week * 31 + item.dayOfWeek) < 0.85
          ? daysAgo((3 - item.week) * 7 + (7 - item.dayOfWeek), 20)
          : null,
    })),
  });

  console.log(`Seeded demo user: ${email} / Fit123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
