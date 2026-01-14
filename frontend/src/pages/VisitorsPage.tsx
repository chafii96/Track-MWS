import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export default function VisitorsPage() {
  const { lang, selectedSiteId } = useAppStore();
  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    return db.hits.where("siteId").equals(selectedSiteId).toArray();
  }, [selectedSiteId]);

  const sessions = useMemo(() => {
    const map = new Map<string, { ts: number; country: string; browser: string; os: string; pages: number; channel: string }>();
    for (const h of hits || []) {
      if (h.type !== "pageview") continue;
      const s = map.get(h.sessionId) || { ts: h.ts, country: h.countryHint, browser: h.browser, os: h.os, pages: 0, channel: h.channel };
      s.ts = Math.min(s.ts, h.ts);
      s.pages += 1;
      map.set(h.sessionId, s);
    }
    return Array.from(map.entries())
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
  }, [hits]);

  return (
    <div data-testid="visitors-page" className="space-y-4">
      <div>
        <h1 data-testid="visitors-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarVisitors", lang)}
        </h1>
        <p data-testid="visitors-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "آخر الجلسات (مبسط للـ MVP)." : "Recent sessions (MVP)."}
        </p>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="visitors-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "اختر موقعاً." : "Select a site."}</div>
        </Card>
      ) : (
        <Card data-testid="sessions-card" className="rounded-2xl border-border/60 bg-card/60 p-0 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <div className="col-span-4" data-testid="sessions-col-time">Time</div>
            <div className="col-span-2" data-testid="sessions-col-country">Region</div>
            <div className="col-span-2" data-testid="sessions-col-browser">Browser</div>
            <div className="col-span-2" data-testid="sessions-col-os">OS</div>
            <div className="col-span-1" data-testid="sessions-col-pages">Pages</div>
            <div className="col-span-1" data-testid="sessions-col-channel">Ch</div>
          </div>
          <div className="divide-y divide-border/60">
            {sessions.map((s) => (
              <div key={s.id} data-testid={`session-row-${s.id}`} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-background/40">
                <div className="col-span-4">{new Date(s.ts).toLocaleString(lang === "ar" ? "ar" : "en")}</div>
                <div className="col-span-2">{s.country}</div>
                <div className="col-span-2">{s.browser}</div>
                <div className="col-span-2">{s.os}</div>
                <div className="col-span-1">{s.pages}</div>
                <div className="col-span-1">{s.channel.slice(0, 1)}</div>
              </div>
            ))}
            {sessions.length === 0 ? (
              <div data-testid="sessions-empty" className="px-4 py-6 text-sm text-muted-foreground">
                {lang === "ar" ? "لا جلسات بعد." : "No sessions yet."}
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
