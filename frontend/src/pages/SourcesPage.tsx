import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { parseReferrerHost, topBy } from "@/lib/metrics";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function SourcesPage() {
  const { lang, selectedSiteId } = useAppStore();
  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    return db.hits.where("siteId").equals(selectedSiteId).toArray();
  }, [selectedSiteId]);

  const channels = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.channel as any, 6), [hits]);
  const referrers = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => parseReferrerHost(h.referrer) as any, 10), [hits]);

  const pieData = channels.map((c, idx) => ({ name: c.key || "(none)", value: c.value, fill: ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#fb7185"][idx % 6] }));

  return (
    <div data-testid="sources-page" className="space-y-4">
      <div>
        <h1 data-testid="sources-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarSources", lang)}
        </h1>
        <p data-testid="sources-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "قنوات الزيارة + المُحيلين." : "Channels and referrers."}
        </p>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="sources-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "اختر موقعاً." : "Select a site."}</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card data-testid="channels-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-2">
            <div data-testid="channels-title" className="text-sm font-semibold">
              {lang === "ar" ? "القنوات" : "Channels"}
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" nameKey="name" data={pieData} innerRadius={50} outerRadius={85} stroke="transparent" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card data-testid="referrers-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-3">
            <div data-testid="referrers-title" className="text-sm font-semibold">
              {lang === "ar" ? "المُحيلون" : "Referrers"}
            </div>
            <div className="mt-3 space-y-2">
              {referrers.filter((r) => r.key).map((r) => (
                <div data-testid={`referrer-row-${r.key}`} key={r.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <div className="text-sm">{r.key}</div>
                  <div className="text-xs text-muted-foreground">{r.value}</div>
                </div>
              ))}
              {referrers.filter((r) => r.key).length === 0 ? (
                <div data-testid="referrers-empty" className="text-sm text-muted-foreground">
                  {lang === "ar" ? "لا توجد إحالات." : "No referrers."}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
