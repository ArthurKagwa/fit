import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendGoodWhenDown = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string | null;
  trend?: number | null;
  /** e.g. weight loss: a downward trend is good */
  trendGoodWhenDown?: boolean;
}) {
  const showTrend = trend != null && trend !== 0;
  const good = showTrend && (trend < 0 ? trendGoodWhenDown : !trendGoodWhenDown);

  return (
    <Card className="py-3">
      <CardContent className="px-3.5">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Icon className="size-3.5" />
          {label}
        </div>
        <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
        {(sub || showTrend) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs">
            {showTrend && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  good ? "text-success" : "text-warning"
                )}
              >
                {trend < 0 ? (
                  <TrendingDown className="size-3" />
                ) : (
                  <TrendingUp className="size-3" />
                )}
                {trend > 0 ? "+" : ""}
                {trend}
              </span>
            )}
            {sub && <span className="text-muted-foreground truncate">{sub}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
