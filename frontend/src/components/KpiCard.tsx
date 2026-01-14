import React from "react";
import { Card } from "@/components/ui/card";

export function KpiCard({
  title,
  value,
  hint,
  trend,
  trendLabel,
  testId,
}: {
  title: string;
  value: string;
  hint?: string;
  trend?: number;
  trendLabel?: string;
  testId: string;
}) {
  const trendColor = trend === undefined ? "text-muted-foreground" : trend >= 0 ? "text-emerald-500" : "text-rose-500";
  const sign = trend === undefined ? "" : trend >= 0 ? "+" : "";

  return (
    <Card data-testid={testId} className="rounded-2xl border-border/60 bg-card/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div data-testid={`${testId}-title`} className="text-xs font-semibold text-muted-foreground">
            {title}
          </div>
          <div data-testid={`${testId}-value`} className="mt-2 text-2xl font-semibold tracking-tight">
            {value}
          </div>
          {hint ? (
            <div data-testid={`${testId}-hint`} className="mt-1 text-xs text-muted-foreground">
              {hint}
            </div>
          ) : null}
        </div>

        {trend !== undefined ? (
          <div data-testid={`${testId}-trend`} className={`rounded-full bg-muted/60 px-2 py-1 text-xs font-medium ${trendColor}`}>
            {sign}
            {trend.toFixed(1)}% {trendLabel ? `· ${trendLabel}` : ""}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
