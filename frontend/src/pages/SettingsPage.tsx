import React, { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import { exportSiteCsv, exportSiteJson } from "@/lib/exporters";

export default function SettingsPage() {
  const { lang, theme, setTheme, setLang, selectedSiteId } = useAppStore();
  const [open, setOpen] = useState(false);

  async function clearAll() {
    await db.delete();
    toast({ title: lang === "ar" ? "تم الحذف" : "Deleted", description: lang === "ar" ? "تم حذف قاعدة البيانات المحلية" : "Local DB deleted" });
    window.location.reload();
  }

  return (
    <div data-testid="settings-page" className="space-y-4">
      <div>
        <h1 data-testid="settings-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarSettings", lang)}
        </h1>
        <p data-testid="settings-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "لغة، مظهر، تصدير، وتنظيف البيانات." : "Language, theme, export and cleanup."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="settings-appearance" className="rounded-2xl border-border/60 bg-card/60 p-5">
          <div className="text-sm font-semibold">{t("settingsLang", lang)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button data-testid="set-lang-ar" variant={lang === "ar" ? "default" : "outline"} className="rounded-full" onClick={() => setLang("ar")}>
              العربية
            </Button>
            <Button data-testid="set-lang-en" variant={lang === "en" ? "default" : "outline"} className="rounded-full" onClick={() => setLang("en")}>
              English
            </Button>
          </div>

          <div className="mt-6 text-sm font-semibold">{t("settingsTheme", lang)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              data-testid="set-theme-dark"
              variant={theme === "dark" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setTheme("dark")}
            >
              {t("themeDark", lang)}
            </Button>
            <Button
              data-testid="set-theme-light"
              variant={theme === "light" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setTheme("light")}
            >
              {t("themeLight", lang)}
            </Button>
          </div>
        </Card>

        <Card data-testid="settings-export" className="rounded-2xl border-border/60 bg-card/60 p-5">
          <div className="text-sm font-semibold">{t("export", lang)}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedSiteId
              ? lang === "ar"
                ? "يمكنك تصدير بيانات الموقع المحدد."
                : "Export data for the selected site."
              : lang === "ar"
                ? "اختر موقعاً أولاً."
                : "Select a site first."}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              data-testid="export-json"
              className="rounded-full"
              disabled={!selectedSiteId}
              onClick={async () => {
                if (!selectedSiteId) return;
                await exportSiteJson(selectedSiteId);
                toast({ title: t("exportDone", lang), description: "JSON" });
              }}
            >
              {t("exportJson", lang)}
            </Button>
            <Button
              data-testid="export-csv"
              variant="outline"
              className="rounded-full"
              disabled={!selectedSiteId}
              onClick={async () => {
                if (!selectedSiteId) return;
                await exportSiteCsv(selectedSiteId);
                toast({ title: t("exportDone", lang), description: "CSV" });
              }}
            >
              {t("exportCsv", lang)}
            </Button>
          </div>
        </Card>

        <Card data-testid="settings-storage" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-2">
          <div className="text-sm font-semibold">{t("storage", lang)}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {lang === "ar" ? "يمكنك تنظيف كل البيانات المحلية (IndexedDB)." : "You can clear local IndexedDB data."}
          </div>
          <div className="mt-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="clear-data-open" variant="destructive" className="rounded-full">
                  {t("clearData", lang)}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle data-testid="clear-data-title">{t("clearConfirm", lang)}</DialogTitle>
                </DialogHeader>
                <div data-testid="clear-data-body" className="text-sm text-muted-foreground">
                  {lang === "ar"
                    ? "سيتم حذف كل المواقع والزيارات المخزنة في هذا المتصفح." 
                    : "This will delete all sites and hits stored in this browser."}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button data-testid="clear-data-cancel" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
                    {t("cancel", lang)}
                  </Button>
                  <Button data-testid="clear-data-confirm" variant="destructive" className="rounded-full" onClick={clearAll}>
                    {lang === "ar" ? "حذف" : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>
    </div>
  );
}
