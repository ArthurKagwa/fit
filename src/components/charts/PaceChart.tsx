"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPace } from "@/lib/format";

const config = {
  paceSecPerKm: { label: "Pace", color: "var(--chart-4)" },
} satisfies ChartConfig;

function shortDate(value: string | number) {
  return new Date(String(value)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function PaceChart({
  data,
}: {
  data: { date: string; paceSecPerKm: number }[];
}) {
  return (
    <ChartContainer config={config}>
      <LineChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
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
          width={48}
          reversed // lower pace = faster = plotted higher
          domain={["dataMin - 10", "dataMax + 10"]}
          tickFormatter={(v: number) => formatPace(v).replace(" /km", "")}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={shortDate}
              valueFormatter={(v) => formatPace(v)}
            />
          }
        />
        <Line
          dataKey="paceSecPerKm"
          type="monotone"
          stroke="var(--chart-4)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "var(--chart-4)", strokeWidth: 0 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
