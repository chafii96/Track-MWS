import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { SiteSelector } from "@/components/SiteSelector";
import { activeVisitors, calcKpis, fmtDuration, groupByDay, rangeToMs, realtimeWindow, topBy } from "@/lib/metrics";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCcw } from "lucide-react";

export default function OverviewPage() {
  const { lang, selectedSiteId } = useAppStore();
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const tmr = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(tmr);
  }, []);

  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    const start = now - rangeToMs("90d");
    return db.hits.where("siteId").equals(selectedSiteId).and((h) => h.ts >= start).toArray();
  }, [selectedSiteId, now]);

  const filtered = useMemo(() => {
    if (!hits) return [];
    const start = now - rangeToMs(range);
    return hits.filter((h) => h.ts >= start);
  }, [hits, range, now]);

  const kpis = useMemo(() => calcKpis(filtered), [filtered]);
  const chart = useMemo(() => groupByDay(filtered), [filtered]);

  const rtHits = useMemo(() => realtimeWindow(filtered, 30, now), [filtered, now]);
  const active = useMemo(() => activeVisitors(filtered, 5, now), [filtered, now]);

  const topPages = useMemo(() => topBy(filtered.filter((h) => h.type === "pageview"), (h) => h.url, 6), [filtered]);

  return (
    <div data-testid="overview-page" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 data-testid="overview-title" className="text-2xl font-semibold tracking-tight">
            {t("sidebarOverview", lang)}
          </h1>
          <p data-testid="overview-subtitle" className="mt-1 text-sm text-muted-foreground">
            {lang === "ar" ? "مؤشرات سريعة + رسوم بيانية. (Client‑side IndexedDB)" : "Quick KPIs and charts (client-side IndexedDB)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SiteSelector />
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/40 p-1">
            <button
              data-testid="range-7d"
              onClick={() => setRange("7d")}
              className={[
                "rounded-full px-3 py-1.5 text-sm",
                range === "7d" ? "bg-indigo-500/15 text-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t("last7", lang)}
            </button>
            <button
              data-testid="range-30d"
              onClick={() => setRange("30d")}
              className={[
                "rounded-full px-3 py-1.5 text-sm",
                range === "30d" ? "bg-indigo-500/15 text-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t("last30", lang)}
            </button>
            <button
              data-testid="range-90d"
              onClick={() => setRange("90d")}
              className={[
                "rounded-full px-3 py-1.5 text-sm",
                range === "90d" ? "bg-indigo-500/15 text-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t("last90", lang)}
            </button>
          </div>

          <Button data-testid="overview-refresh" variant="outline" className="rounded-full" onClick={() => setNow(Date.now())}>
            <RefreshCcw className="h-4 w-4" />
            <span className="ms-2">{lang === "ar" ? "تحديث" : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="overview-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-lg font-semibold">{t("emptyStateTitle", lang)}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptyStateDesc", lang)}</div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard testId="kpi-visits" title={t("kpiVisits", lang)} value={String(kpis.visits)} />
            <KpiCard testId="kpi-visitors" title={t("kpiVisitors", lang)} value={String(kpis.visitors)} />
            <KpiCard testId="kpi-pageviews" title={t("kpiPageviews", lang)} value={String(kpis.pageviews)} />
            <KpiCard testId="kpi-bounce" title={t("kpiBounce", lang)} value={`${kpis.bounceRate.toFixed(1)}%`} />
            <KpiCard testId="kpi-avg-session" title={t("kpiAvgSession", lang)} value={fmtDuration(kpis.avgSessionMs)} />
            <KpiCard testId="kpi-pages-session" title={t("kpiPagesPerSession", lang)} value={kpis.pagesPerSession.toFixed(2)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card data-testid="realtime-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div data-testid="realtime-title" className="text-sm font-semibold">
                    {t("realtime", lang)}
                  </div>
                  <div data-testid="realtime-sub" className="mt-1 text-xs text-muted-foreground">
                    {t("last30min", lang)}
                  </div>
                </div>
                <div data-testid="realtime-active" className="rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-semibold">
                  {active} {t("activeNow", lang)}
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {rtHits.slice(0, 8).map((h) => (
                  <div
                    data-testid={`realtime-row-${h.id}`}
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{h.title || h.url}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {h.countryHint} · {h.browser} · {h.deviceType}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{Math.max(0, Math.round((now - h.ts) / 60000))}m</div>
                  </div>
                ))}
                {rtHits.length === 0 ? (
                  <div data-testid="realtime-empty" className="text-sm text-muted-foreground">
                    {lang === "ar" ? "لا توجد نشاطات في آخر 30 دقيقة." : "No activity in last 30 minutes."}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card data-testid="timeseries-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <div data-testid="timeseries-title" className="text-sm font-semibold">
                    {lang === "ar" ? "الزيارات عبر الزمن" : "Traffic over time"}
                  </div>
                  <div data-testid="timeseries-sub" className="mt-1 text-xs text-muted-foreground">
                    {lang === "ar" ? "Visitors / Pageviews / Sessions" : "Visitors / Pageviews / Sessions"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {chart.length ? chart[0].day : ""} → {chart.length ? chart[chart.length - 1].day : ""}
                </div>
              </div>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} width={40} />
                    <Tooltip />
                    <Area type="monotone" dataKey="pageviews" stroke="rgb(99, 102, 241)" fill="url(#pv)" strokeWidth={2} />
                    <Area type="monotone" dataKey="visitors" stroke="rgb(34, 211, 238)" fill="url(#vis)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card data-testid="top-pages-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-2">
              <div data-testid="top-pages-title" className="text-sm font-semibold">
                {lang === "ar" ? "أكثر الصفحات زيارة" : "Top pages"}
              </div>
              <div className="mt-3 space-y-2">
                {topPages.map((p) => (
                  <div data-testid={`top-page-${p.key}`} key={p.key} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                    <div className="truncate text-sm">{p.key}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.value} {lang === "ar" ? "مشاهدة" : "views"}
                    </div>
                  </div>
                ))}
                {topPages.length === 0 ? (
                  <div data-testid="top-pages-empty" className="text-sm text-muted-foreground">
                    {lang === "ar" ? "لا بيانات بعد." : "No data yet."}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card data-testid="tips-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-3">
              <div data-testid="tips-title" className="text-sm font-semibold">
                {lang === "ar" ? "نصيحة سريعة" : "Quick tip"}
              </div>
              <div data-testid="tips-body" className="mt-2 text-sm text-muted-foreground">
                {lang === "ar"
                  ? "للتجربة بسرعة: افتح صفحة /demo.html من زر (صفحة تجريبية) داخل صفحة المواقع."
                  : "Quick test: open /demo.html from the Demo page button in Sites."}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
