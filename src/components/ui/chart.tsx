"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          "flex aspect-[2/1] w-full justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string | number) => React.ReactNode;
  valueFormatter?: (value: number, key: string) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover text-popover-foreground grid min-w-32 gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-md">
      {label != null && (
        <p className="font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const entry = config[key];
        const value = typeof item.value === "number" ? item.value : Number(item.value);
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: entry?.color ?? item.color }}
            />
            <span className="text-muted-foreground">{entry?.label ?? key}</span>
            <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
              {valueFormatter ? valueFormatter(value, key) : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
