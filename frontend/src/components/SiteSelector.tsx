import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/appStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/i18n";

export function SiteSelector() {
  const { selectedSiteId, setSelectedSiteId, lang } = useAppStore();
  const sites = useLiveQuery(() => db.sites.orderBy("createdAt").reverse().toArray(), []);

  const value = useMemo(() => {
    if (selectedSiteId) return selectedSiteId;
    const first = sites && sites[0];
    return first ? first.id : "";
  }, [selectedSiteId, sites]);

  React.useEffect(() => {
    if (!selectedSiteId && sites && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [selectedSiteId, sites, setSelectedSiteId]);

  if (!sites || sites.length === 0) return null;

  return (
    <div data-testid="site-selector" className="w-full max-w-sm">
      <Select value={value} onValueChange={(v) => setSelectedSiteId(v)}>
        <SelectTrigger data-testid="site-selector-trigger" className="h-10 rounded-full">
          <SelectValue placeholder={t("sidebarSites", lang)} />
        </SelectTrigger>
        <SelectContent>
          {sites.map((s) => (
            <SelectItem data-testid={`site-selector-item-${s.id}`} key={s.id} value={s.id}>
              {s.name} — {s.domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
