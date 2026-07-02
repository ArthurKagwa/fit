"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  kcal: { label: "Calories", color: "var(--chart-3)" },
} satisfies ChartConfig;

function shortDate(value: string | number) {
  return new Date(String(value)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function CaloriesChart({
  data,
  targetKcal,
}: {
  data: { date: string; kcal: number }[];
  targetKcal?: number | null;
}) {
  return (
    <ChartContainer config={config}>
      <BarChart data={data} margin={{ left: -14, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={shortDate}
          minTickGap={30}
        />
        <YAxis tickLine={false} axisLine={false} width={46} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              labelFormatter={shortDate}
              valueFormatter={(v) => `${v} kcal`}
            />
          }
        />
        {targetKcal ? (
          <ReferenceLine y={targetKcal} stroke="var(--chart-5)" strokeDasharray="4 4" />
        ) : null}
        <Bar dataKey="kcal" fill="var(--chart-3)" radius={[6, 6, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  );
}
