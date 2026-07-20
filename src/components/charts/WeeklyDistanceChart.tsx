"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  km: { label: "Distance", color: "var(--chart-2)" },
} satisfies ChartConfig;

function weekLabel(value: string | number) {
  return new Date(String(value)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function WeeklyDistanceChart({
  data,
  targetKm,
}: {
  data: { weekStart: string; km: number }[];
  targetKm?: number | null;
}) {
  return (
    <ChartContainer config={config}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="weekStart"
          tickLine={false}
          axisLine={false}
          tickFormatter={weekLabel}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              labelFormatter={(l) => `Week of ${weekLabel(l)}`}
              valueFormatter={(v) => `${v} km`}
            />
          }
        />
        {targetKm ? (
          <ReferenceLine y={targetKm} stroke="var(--chart-3)" strokeDasharray="4 4" />
        ) : null}
        <Bar dataKey="km" fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}
