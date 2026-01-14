import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { topBy } from "@/lib/metrics";

export default function GeoPage() {
  const { lang, selectedSiteId } = useAppStore();
  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    return db.hits.where("siteId").equals(selectedSiteId).toArray();
  }, [selectedSiteId]);

  const countries = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.countryHint as any, 12), [hits]);
  const timezones = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.tz as any, 10), [hits]);

  return (
    <div data-testid="geo-page" className="space-y-4">
      <div>
        <h1 data-testid="geo-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarGeo", lang)}
        </h1>
        <p data-testid="geo-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "تقريب الدولة من الـ Timezone (بدون IP)." : "Country hint from timezone (no IP)."}
        </p>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="geo-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "اختر موقعاً." : "Select a site."}</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card data-testid="countries-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-2">
            <div data-testid="countries-title" className="text-sm font-semibold">{lang === "ar" ? "المناطق (Region)" : "Regions"}</div>
            <div className="mt-3 space-y-2">
              {countries.filter((c) => c.key).map((c) => (
                <div data-testid={`country-row-${c.key}`} key={c.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <div className="text-sm">{c.key}</div>
                  <div className="text-xs text-muted-foreground">{c.value}</div>
                </div>
              ))}
              {countries.filter((c) => c.key).length === 0 ? (
                <div data-testid="countries-empty" className="text-sm text-muted-foreground">{lang === "ar" ? "لا بيانات." : "No data."}</div>
              ) : null}
            </div>
          </Card>

          <Card data-testid="timezones-card" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-3">
            <div data-testid="timezones-title" className="text-sm font-semibold">{lang === "ar" ? "المناطق الزمنية" : "Timezones"}</div>
            <div className="mt-3 space-y-2">
              {timezones.filter((tz) => tz.key).map((tz) => (
                <div data-testid={`timezone-row-${tz.key}`} key={tz.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <div className="text-sm">{tz.key}</div>
                  <div className="text-xs text-muted-foreground">{tz.value}</div>
                </div>
              ))}
              {timezones.filter((tz) => tz.key).length === 0 ? (
                <div data-testid="timezones-empty" className="text-sm text-muted-foreground">{lang === "ar" ? "لا بيانات." : "No data."}</div>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
