import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

type Row = {
  url: string;
  views: number;
  visitors: number;
  avgDurationMs: number;
  avgScroll: number;
  entry: number;
  exit: number;
  exitRate: number;
};

export default function PagesPage() {
  const { lang, selectedSiteId } = useAppStore();
  const [q, setQ] = useState("");

  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    return db.hits.where("siteId").equals(selectedSiteId).toArray();
  }, [selectedSiteId]);

  const rows = useMemo(() => {
    if (!hits) return [];

    // Build per-session navigation path (ordered) from pageview hits
    const bySession = new Map<string, { ts: number; url: string }[]>();
    for (const h of hits) {
      if (h.type !== "pageview") continue;
      const list = bySession.get(h.sessionId) || [];
      list.push({ ts: h.ts, url: h.url });
      bySession.set(h.sessionId, list);
    }

    const entryCount: Record<string, number> = {};
    const exitCount: Record<string, number> = {};

    bySession.forEach((list) => {
      if (!list.length) return;
      const sorted = list.sort((a, b) => a.ts - b.ts);
      const entry = sorted[0].url;
      const exit = sorted[sorted.length - 1].url;
      entryCount[entry] = (entryCount[entry] || 0) + 1;
      exitCount[exit] = (exitCount[exit] || 0) + 1;
    });

    const map = new Map<
      string,
      { views: number; visitors: Set<string>; dur: number; durN: number; scr: number; scrN: number; entry: number; exit: number }
    >();

    for (const h of hits) {
      if (h.type !== "pageview") continue;
      const st =
        map.get(h.url) ||
        ({
          views: 0,
          visitors: new Set<string>(),
          dur: 0,
          durN: 0,
          scr: 0,
          scrN: 0,
          entry: 0,
          exit: 0,
        } as any);

      st.views += 1;
      st.visitors.add(h.visitorId);

      if (typeof h.durationMs === "number") {
        st.dur += h.durationMs || 0;
        st.durN += 1;
      }
      if (typeof h.scrollMax === "number") {
        st.scr += h.scrollMax || 0;
        st.scrN += 1;
      }

      map.set(h.url, st);
    }

    // Attach entry/exit counts
    for (const [url, st] of map.entries()) {
      st.entry = entryCount[url] || 0;
      st.exit = exitCount[url] || 0;
    }

    const arr: Row[] = Array.from(map.entries()).map(([url, s]) => ({
      url,
      views: s.views,
      visitors: s.visitors.size,
      avgDurationMs: s.durN ? s.dur / s.durN : 0,
      avgScroll: s.scrN ? s.scr / s.scrN : 0,
      entry: s.entry,
      exit: s.exit,
      exitRate: s.views ? (s.exit / s.views) * 100 : 0,
    }));

    const filtered = q.trim() ? arr.filter((r) => r.url.toLowerCase().includes(q.trim().toLowerCase())) : arr;

    return filtered.sort((a, b) => b.views - a.views);
  }, [hits, q]);

  return (
    <div data-testid="pages-page" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 data-testid="pages-title" className="text-2xl font-semibold tracking-tight">
            {t("sidebarPages", lang)}
          </h1>
          <p data-testid="pages-subtitle" className="mt-1 text-sm text-muted-foreground">
            {lang === "ar" ? "جدول الصفحات (بحث + فرز مبسط)." : "Pages table (search + simple sorting)."}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <Input
            data-testid="pages-search"
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالرابط..." : "Search by URL..."}
          />
        </div>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="pages-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "اختر موقعاً من صفحة المواقع." : "Select a site from Sites page."}</div>
        </Card>
      ) : (
        <Card data-testid="pages-table" className="rounded-2xl border-border/60 bg-card/60 p-0 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <div className="col-span-6" data-testid="pages-col-url">URL</div>
            <div className="col-span-2" data-testid="pages-col-views">Views</div>
            <div className="col-span-2" data-testid="pages-col-visitors">Visitors</div>
            <div className="col-span-1" data-testid="pages-col-scroll">Scroll%</div>
            <div className="col-span-1" data-testid="pages-col-dur">Avg</div>
          </div>
          <div className="divide-y divide-border/60">
            {rows.slice(0, 100).map((r) => (
              <div
                key={r.url}
                data-testid={`pages-row-${r.url}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-background/40"
              >
                <div className="col-span-6 truncate" title={r.url}>
                  {r.url}
                </div>
                <div className="col-span-2">{r.views}</div>
                <div className="col-span-2">{r.visitors}</div>
                <div className="col-span-1">{r.avgScroll.toFixed(0)}</div>
                <div className="col-span-1">{Math.round(r.avgDurationMs / 1000)}s</div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div data-testid="pages-empty" className="px-4 py-6 text-sm text-muted-foreground">
                {lang === "ar" ? "لا توجد بيانات بعد." : "No data yet."}
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
