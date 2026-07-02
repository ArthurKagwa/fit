"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  kg: { label: "Weight", color: "var(--chart-1)" },
} satisfies ChartConfig;

function shortDate(value: string | number) {
  return new Date(String(value)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function WeightChart({ data }: { data: { date: string; kg: number }[] }) {
  return (
    <ChartContainer config={config}>
      <AreaChart data={data} margin={{ left: -14, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={shortDate}
          minTickGap={40}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={["dataMin - 0.5", "dataMax + 0.5"]}
          tickFormatter={(v: number) => v.toFixed(0)}
          width={44}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={shortDate}
              valueFormatter={(v) => `${v.toFixed(1)} kg`}
            />
          }
        />
        <Area
          dataKey="kg"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#weightFill)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
