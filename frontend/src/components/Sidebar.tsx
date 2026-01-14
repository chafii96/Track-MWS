import React from "react";
import { NavLink } from "react-router-dom";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/appStore";
import {
  LayoutDashboard,
  Globe2,
  FileText,
  Compass,
  Cpu,
  MapPinned,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";

const items = [
  { to: "/", key: "sidebarOverview", icon: LayoutDashboard },
  { to: "/pages", key: "sidebarPages", icon: FileText },
  { to: "/sources", key: "sidebarSources", icon: Compass },
  { to: "/tech", key: "sidebarTech", icon: Cpu },
  { to: "/geo", key: "sidebarGeo", icon: MapPinned },
  { to: "/visitors", key: "sidebarVisitors", icon: Users },
  { to: "/sites", key: "sidebarSites", icon: Globe2 },
  { to: "/settings", key: "sidebarSettings", icon: Settings },
  { to: "/help", key: "sidebarHelp", icon: HelpCircle },
] as const;

export function Sidebar() {
  const { lang } = useAppStore();

  return (
    <aside
      data-testid="sidebar"
      className="hidden h-[calc(100vh-56px)] w-72 shrink-0 border-r border-border/60 bg-card/40 px-3 py-4 backdrop-blur md:block"
    >
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              data-testid={`sidebar-link-${it.to.replace("/", "root")}`}
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/15 to-cyan-400/10 text-foreground ring-1 ring-indigo-500/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" />
              <span>{t(it.key as any, lang)}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-3">
        <div data-testid="sidebar-note-title" className="text-xs font-semibold">
          First‑party
        </div>
        <div data-testid="sidebar-note-body" className="mt-1 text-xs text-muted-foreground">
          {lang === "ar"
            ? "التتبع يعمل عند استضافة ملف التتبع على نفس الدومين."
            : "Tracking works when hosted on the same domain."}
        </div>
      </div>
    </aside>
  );
}
