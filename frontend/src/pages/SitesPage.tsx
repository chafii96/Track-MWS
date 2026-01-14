import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Site } from "@/lib/db";
import { siteId } from "@/lib/crypto";
import { useAppStore } from "@/store/appStore";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";

function snippet(siteIdVal: string) {
  // Build without escaping quotes to keep linters happy
  return `<!-- Self Analytics (first-party) -->\n<script async src="/sa/insight.js" data-site="${siteIdVal}"></script>`;
}

export default function SitesPage() {
  const { lang, selectedSiteId, setSelectedSiteId } = useAppStore();
  const sites = useLiveQuery(() => db.sites.orderBy("createdAt").reverse().toArray(), []);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  const selected = useMemo(() => {
    if (!sites || sites.length === 0) return null;
    return sites.find((s) => s.id === selectedSiteId) || sites[0];
  }, [sites, selectedSiteId]);

  async function create() {
    const n = name.trim();
    const d = domain.trim();
    if (!n || !d) {
      toast({
        title: lang === "ar" ? "أكمل البيانات" : "Missing fields",
        description: lang === "ar" ? "أدخل الاسم والدومين" : "Enter name & domain",
      });
      return;
    }
    const id = await siteId();
    const site: Site = { id, name: n, domain: d, createdAt: Date.now(), isActive: true, sessionTimeoutMin: 30 };
    await db.sites.put(site);
    setSelectedSiteId(id);
    setOpen(false);
    setName("");
    setDomain("");
    toast({ title: lang === "ar" ? "تم إنشاء الموقع" : "Site created", description: id });
  }

  async function copySnippet() {
    if (!selected) return;
    await navigator.clipboard.writeText(snippet(selected.id));
    toast({ title: t("copied", lang), description: t("trackingSnippet", lang) });
  }

  async function removeSite(id: string) {
    await db.sites.delete(id);
    await db.hits.where("siteId").equals(id).delete();
    if (selectedSiteId === id) setSelectedSiteId(null);
    toast({ title: lang === "ar" ? "تم الحذف" : "Deleted", description: id });
  }

  return (
    <div data-testid="sites-page" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 data-testid="sites-title" className="text-2xl font-semibold tracking-tight">
            {t("sidebarSites", lang)}
          </h1>
          <p data-testid="sites-subtitle" className="mt-1 text-sm text-muted-foreground">
            {lang === "ar" ? "أنشئ Site ID وخذ الكود للنسخ." : "Create a Site ID and copy the snippet."}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-site-open" className="rounded-full">
              <Plus className="h-4 w-4" />
              <span className="ms-2">{t("createSite", lang)}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle data-testid="create-site-title">{t("createSite", lang)}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label data-testid="create-site-name-label">{t("siteName", lang)}</Label>
                <Input
                  data-testid="create-site-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === "ar" ? "مثال: متجري" : "e.g. My Shop"}
                />
              </div>
              <div className="grid gap-2">
                <Label data-testid="create-site-domain-label">{t("siteDomain", lang)}</Label>
                <Input
                  data-testid="create-site-domain-input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={lang === "ar" ? "example.com" : "example.com"}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button data-testid="create-site-cancel" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
                  {t("cancel", lang)}
                </Button>
                <Button data-testid="create-site-save" className="rounded-full" onClick={create}>
                  {t("save", lang)}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!sites || sites.length === 0) && (
        <Card data-testid="sites-empty" className="rounded-2xl border-border/60 bg-card/60 p-6">
          <div className="text-lg font-semibold">{t("emptyStateTitle", lang)}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptyStateDesc", lang)}</div>
        </Card>
      )}

      {sites && sites.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card data-testid="sites-list" className="rounded-2xl border-border/60 bg-card/60 p-3 lg:col-span-2">
            <div className="space-y-2">
              {sites.map((s) => (
                <button
                  key={s.id}
                  data-testid={`site-row-${s.id}`}
                  onClick={() => setSelectedSiteId(s.id)}
                  className={
                    [
                      "w-full rounded-2xl border px-3 py-3 text-start",
                      selected?.id === s.id
                        ? "border-indigo-500/30 bg-indigo-500/10"
                        : "border-border/60 bg-background/40 hover:bg-muted/40",
                    ].join(" ")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.domain}</div>
                    </div>
                    <Badge
                      data-testid={`site-active-${s.id}`}
                      variant={s.isActive ? "secondary" : "outline"}
                      className="rounded-full"
                    >
                      {s.isActive ? (lang === "ar" ? "نشط" : "Active") : lang === "ar" ? "موقوف" : "Paused"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Site ID: {s.id}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card data-testid="site-details" className="rounded-2xl border-border/60 bg-card/60 p-5 lg:col-span-3">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold">{selected.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{selected.domain}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button data-testid="copy-snippet" variant="outline" className="rounded-full" onClick={copySnippet}>
                      <Copy className="h-4 w-4" />
                      <span className="ms-2">{t("copy", lang)}</span>
                    </Button>
                    <Button
                      data-testid="open-demo-page"
                      variant="outline"
                      className="rounded-full"
                      asChild
                    >
                      <a href={`/demo.html?site=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        <span className="ms-2">{lang === "ar" ? "صفحة تجريبية" : "Demo page"}</span>
                      </a>
                    </Button>
                    <Button
                      data-testid="delete-site"
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => removeSite(selected.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ms-2">{lang === "ar" ? "حذف" : "Delete"}</span>
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <div data-testid="tracking-snippet-title" className="text-sm font-semibold">
                    {t("trackingSnippet", lang)}
                  </div>
                  <pre
                    data-testid="tracking-snippet-code"
                    className="mt-2 overflow-auto rounded-2xl border border-border/60 bg-background/40 p-4 text-xs leading-relaxed"
                    dir="ltr"
                  >
                    {snippet(selected.id)}
                  </pre>
                  <div data-testid="tracking-snippet-note" className="mt-2 text-xs text-muted-foreground">
                    {lang === "ar"
                      ? "مهم: ضع الملف /sa/insight.js و /sw.js على نفس الدومين. هذا التطبيق Client‑only."
                      : "Important: host /sa/insight.js and /sw.js on the same domain. This app is client-only."}
                  </div>
                </div>
              </>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
