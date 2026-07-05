import {
  Activity,
  BarChart3,
  Flame,
  Footprints,
  Scale,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { KpiTile } from "@/components/KpiTile";

const ICONS: Record<string, LucideIcon> = {
  scale: Scale,
  footprints: Footprints,
  flame: Flame,
  utensils: UtensilsCrossed,
  target: Target,
  activity: Activity,
  chart: BarChart3,
};

export type ChatStatCard = {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  trendGoodWhenDown?: boolean;
  icon?: string;
};

/** Renders the coach's inline ```stats``` blocks as the same KpiTile used on the dashboard. */
export function ChatStatCards({ cards }: { cards: ChatStatCard[] }) {
  if (!cards.length) return null;

  return (
    <div className="my-1.5 grid grid-cols-2 gap-2">
      {cards.map((c, i) => (
        <KpiTile
          key={i}
          icon={ICONS[c.icon ?? ""] ?? Activity}
          label={c.label}
          value={c.value}
          sub={c.sub ?? null}
          trend={c.trend ?? null}
          trendGoodWhenDown={c.trendGoodWhenDown ?? false}
        />
      ))}
    </div>
  );
}
