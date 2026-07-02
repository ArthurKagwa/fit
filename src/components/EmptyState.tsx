import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" />
      </div>
      <p className="font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-xs text-sm">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Button asChild size="sm" className="mt-2">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
