import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { topBy } from "@/lib/metrics";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function mkPie(rows: { key: string; value: number }[]) {
  const colors = ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#fb7185", "#94a3b8", "#60a5fa"];
  return rows.map((r, i) => ({ name: r.key || "(unknown)", value: r.value, fill: colors[i % colors.length] }));
}

export default function TechPage() {
  const { lang, selectedSiteId } = useAppStore();
  const hits = useLiveQuery(async () => {
    if (!selectedSiteId) return [];
    return db.hits.where("siteId").equals(selectedSiteId).toArray();
  }, [selectedSiteId]);

  const browsers = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.browser as any, 6), [hits]);
  const os = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.os as any, 6), [hits]);
  const devices = useMemo(() => topBy((hits || []).filter((h) => h.type === "pageview"), (h) => h.deviceType as any, 6), [hits]);

  return (
    <div data-testid="tech-page" className="space-y-4">
      <div>
        <h1 data-testid="tech-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarTech", lang)}
        </h1>
        <p data-testid="tech-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "المتصفحات / الأنظمة / الأجهزة." : "Browsers / OS / devices."}
        </p>
      </div>

      {!selectedSiteId ? (
        <Card data-testid="tech-no-site" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "اختر موقعاً." : "Select a site."}</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card data-testid="tech-browsers" className="rounded-2xl border-border/60 bg-card/60 p-5">
            <div data-testid="tech-browsers-title" className="text-sm font-semibold">{lang === "ar" ? "المتصفحات" : "Browsers"}</div>
            <div className="mt-4 h-56">
              {browsers.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={mkPie(browsers)} innerRadius={45} outerRadius={78} stroke="transparent" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div data-testid="tech-browsers-empty" className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/30 text-sm text-muted-foreground">
                  {lang === "ar" ? "لا بيانات." : "No data."}
                </div>
              )}
            </div>
          </Card>
          <Card data-testid="tech-os" className="rounded-2xl border-border/60 bg-card/60 p-5">
            <div data-testid="tech-os-title" className="text-sm font-semibold">{lang === "ar" ? "أنظمة التشغيل" : "Operating systems"}</div>
            <div className="mt-4 h-56">
              {os.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={mkPie(os)} innerRadius={45} outerRadius={78} stroke="transparent" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div data-testid="tech-os-empty" className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/30 text-sm text-muted-foreground">
                  {lang === "ar" ? "لا بيانات." : "No data."}
                </div>
              )}
            </div>
          </Card>
          <Card data-testid="tech-devices" className="rounded-2xl border-border/60 bg-card/60 p-5">
            <div data-testid="tech-devices-title" className="text-sm font-semibold">{lang === "ar" ? "الأجهزة" : "Devices"}</div>
            <div className="mt-4 h-56">
              {devices.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={mkPie(devices)} innerRadius={45} outerRadius={78} stroke="transparent" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div data-testid="tech-devices-empty" className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/30 text-sm text-muted-foreground">
                  {lang === "ar" ? "لا بيانات." : "No data."}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
