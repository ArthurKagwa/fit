import type OpenAI from "openai";
import { z } from "zod";
import {
  createMeal,
  createPlan,
  createRun,
  createWeight,
  createWorkout,
  listEntries,
  saveGoal,
  ENTRY_TYPES,
} from "@/lib/data";
import { getStatsSummary, statsToPromptText } from "@/lib/stats";
import { formatDuration, parseDuration } from "@/lib/format";

/**
 * Coach tools, defined once in OpenAI function format and executed
 * against the same lib/data.ts functions the forms and REST API use.
 */

export type SavedEntry = { type: string; label: string };

export type ToolResult = {
  content: string; // JSON string returned to the model
  saved?: SavedEntry;
};

export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "log_run",
      description:
        "Save a run the user completed. Use when they describe a run in text or confirm extracted screenshot values.",
      parameters: {
        type: "object",
        properties: {
          distance_km: { type: "number", description: "Distance in kilometres" },
          duration: {
            type: "string",
            description: 'Duration as "26:10" (mm:ss) or "1:02:45" (h:mm:ss)',
          },
          date: { type: "string", description: "YYYY-MM-DD, omit for today" },
          notes: { type: "string" },
        },
        required: ["distance_km", "duration"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_weight",
      description: "Save a body-weight measurement.",
      parameters: {
        type: "object",
        properties: {
          weight_kg: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD, omit for today" },
          note: { type: "string" },
        },
        required: ["weight_kg"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_meal",
      description:
        "Save a meal with estimated calories and macros. Estimate values yourself from the description; flag them as estimates in your reply.",
      parameters: {
        type: "object",
        properties: {
          meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
          description: { type: "string" },
          calories: { type: "integer" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD, omit for today" },
        },
        required: ["meal_type", "description", "calories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_workout",
      description: "Save a workout (strength/cardio/mobility/sport) with its exercises.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: 'e.g. "Push day"' },
          type: {
            type: "string",
            enum: ["strength", "cardio", "mobility", "sport", "other"],
          },
          date: { type: "string", description: "YYYY-MM-DD, omit for today" },
          notes: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sets: { type: "integer" },
                reps: { type: "integer" },
                weight_kg: { type: "number" },
              },
              required: ["name"],
            },
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_goal",
      description:
        "Set or replace a fitness goal. Replaces any active goal of the same type (except CUSTOM).",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["TARGET_WEIGHT", "WEEKLY_DISTANCE", "PACE_5K", "DAILY_CALORIES", "CUSTOM"],
          },
          target_value: { type: "number" },
          unit: { type: "string", description: 'e.g. "kg", "km", "kcal", "min/km"' },
          target_date: { type: "string", description: "YYYY-MM-DD" },
          description: { type: "string", description: 'Short label, e.g. "Get to 78 kg"' },
        },
        required: ["type", "target_value", "unit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_plan",
      description:
        "Create a weekly training plan. Becomes the user's active plan, visible on their Plan page. Keep it realistic given their current stats.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          weeks: { type: "integer", description: "Plan length in weeks" },
          start_date: { type: "string", description: "YYYY-MM-DD, omit for today" },
          items: {
            type: "array",
            description: "One item per scheduled session",
            items: {
              type: "object",
              properties: {
                week: { type: "integer", description: "1-based week number" },
                day_of_week: { type: "integer", description: "1=Monday ... 7=Sunday" },
                activity: { type: "string", description: 'e.g. "Easy run 5 km"' },
                detail: { type: "string" },
              },
              required: ["week", "day_of_week", "activity"],
            },
          },
        },
        required: ["title", "weeks", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description:
        "Fetch the user's aggregated stats (weight trend, weekly distance, pace, calories, streak, goal progress). Use before giving progress assessments.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_entries",
      description: "List the user's recent entries of one type, newest first.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...ENTRY_TYPES] },
          limit: { type: "integer", description: "Max entries, default 10" },
        },
        required: ["type"],
      },
    },
  },
];

const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "log_run": {
      const a = z
        .object({
          distance_km: z.coerce.number(),
          duration: z.string(),
          date: dateArg,
          notes: z.string().optional(),
        })
        .parse(args);
      const durationSec = parseDuration(a.duration);
      if (!durationSec) {
        return { content: JSON.stringify({ error: `could not parse duration "${a.duration}"` }) };
      }
      const run = await createRun(userId, {
        distanceKm: a.distance_km,
        durationSec,
        date: a.date,
        notes: a.notes,
        source: "chat",
      });
      return {
        content: JSON.stringify({ ok: true, id: run.id, paceSecPerKm: run.paceSecPerKm }),
        saved: { type: "run", label: `${run.distanceKm} km run · ${formatDuration(run.durationSec)}` },
      };
    }

    case "log_weight": {
      const a = z
        .object({ weight_kg: z.coerce.number(), date: dateArg, note: z.string().optional() })
        .parse(args);
      const entry = await createWeight(userId, {
        weightKg: a.weight_kg,
        date: a.date,
        note: a.note,
        source: "chat",
      });
      return {
        content: JSON.stringify({ ok: true, id: entry.id }),
        saved: { type: "weight", label: `${entry.weightKg} kg` },
      };
    }

    case "log_meal": {
      const a = z
        .object({
          meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          description: z.string(),
          calories: z.coerce.number().optional(),
          protein_g: z.coerce.number().optional(),
          carbs_g: z.coerce.number().optional(),
          fat_g: z.coerce.number().optional(),
          date: dateArg,
          photo_url: z.string().optional(),
        })
        .parse(args);
      const meal = await createMeal(userId, {
        mealType: a.meal_type,
        description: a.description,
        calories: a.calories,
        proteinG: a.protein_g,
        carbsG: a.carbs_g,
        fatG: a.fat_g,
        date: a.date,
        photoUrl: a.photo_url,
        source: "chat",
      });
      return {
        content: JSON.stringify({ ok: true, id: meal.id }),
        saved: {
          type: "meal",
          label: `${meal.description}${meal.calories != null ? ` · ~${meal.calories} kcal` : ""}`,
        },
      };
    }

    case "log_workout": {
      const a = z
        .object({
          title: z.string(),
          type: z.enum(["strength", "cardio", "mobility", "sport", "other"]).optional(),
          date: dateArg,
          notes: z.string().optional(),
          exercises: z
            .array(
              z.object({
                name: z.string(),
                sets: z.coerce.number().optional(),
                reps: z.coerce.number().optional(),
                weight_kg: z.coerce.number().optional(),
              })
            )
            .optional(),
        })
        .parse(args);
      const workout = await createWorkout(userId, {
        title: a.title,
        type: a.type ?? "strength",
        date: a.date,
        notes: a.notes,
        source: "chat",
        exercises: (a.exercises ?? []).map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weightKg: e.weight_kg,
        })),
      });
      return {
        content: JSON.stringify({ ok: true, id: workout.id, exercises: workout.exercises.length }),
        saved: { type: "workout", label: workout.title },
      };
    }

    case "save_goal": {
      const a = z
        .object({
          type: z.enum(["TARGET_WEIGHT", "WEEKLY_DISTANCE", "PACE_5K", "DAILY_CALORIES", "CUSTOM"]),
          target_value: z.coerce.number(),
          unit: z.string(),
          target_date: dateArg,
          description: z.string().optional(),
        })
        .parse(args);
      const goal = await saveGoal(userId, {
        type: a.type,
        targetValue: a.target_value,
        unit: a.unit,
        targetDate: a.target_date,
        description: a.description,
      });
      return {
        content: JSON.stringify({ ok: true, id: goal.id }),
        saved: { type: "goal", label: goal.description ?? `${goal.type}: ${goal.targetValue} ${goal.unit}` },
      };
    }

    case "create_plan": {
      const a = z
        .object({
          title: z.string(),
          weeks: z.coerce.number(),
          start_date: dateArg,
          items: z.array(
            z.object({
              week: z.coerce.number(),
              day_of_week: z.coerce.number(),
              activity: z.string(),
              detail: z.string().optional(),
            })
          ),
        })
        .parse(args);
      const plan = await createPlan(userId, {
        title: a.title,
        weeks: a.weeks,
        startDate: a.start_date,
        items: a.items.map((i) => ({
          week: i.week,
          dayOfWeek: i.day_of_week,
          activity: i.activity,
          detail: i.detail,
        })),
      });
      return {
        content: JSON.stringify({ ok: true, id: plan.id, items: plan.items.length }),
        saved: { type: "plan", label: plan.title },
      };
    }

    case "get_stats": {
      const stats = await getStatsSummary(userId);
      return { content: statsToPromptText(stats) };
    }

    case "list_recent_entries": {
      const a = z
        .object({
          type: z.enum(ENTRY_TYPES),
          limit: z.coerce.number().int().min(1).max(50).optional(),
        })
        .parse(args);
      const entries = await listEntries(userId, a.type, { limit: a.limit ?? 10 });
      // Compact projection to keep tool-result tokens down
      const compact = entries.map((e) => {
        const base = { id: e.id, date: e.date.toISOString().slice(0, 10) };
        if ("weightKg" in e && a.type === "weight") return { ...base, kg: e.weightKg };
        if ("distanceKm" in e)
          return { ...base, km: e.distanceKm, duration: formatDuration(e.durationSec) };
        if ("mealType" in e)
          return { ...base, meal: e.mealType, description: e.description, kcal: e.calories };
        if ("title" in e) return { ...base, title: e.title };
        return base;
      });
      return { content: JSON.stringify(compact) };
    }

    default:
      return { content: JSON.stringify({ error: `unknown tool: ${name}` }) };
  }
}
