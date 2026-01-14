import React from "react";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Languages, Wifi, WifiOff } from "lucide-react";

export function Topbar({ isOnline }: { isOnline: boolean }) {
  const { lang, theme, setLang, setTheme } = useAppStore();

  return (
    <div
      data-testid="topbar"
      className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/90 to-cyan-400/90 shadow-[0_10px_30px_-12px_rgba(56,189,248,0.55)]" />
          <div className="leading-tight">
            <div data-testid="topbar-app-name" className="text-sm font-semibold">
              {t("appName", lang)}
            </div>
            <div data-testid="topbar-subtitle" className="text-xs text-muted-foreground">
              {t("respectOffline", lang)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            data-testid="topbar-online-badge"
            variant={isOnline ? "secondary" : "destructive"}
            className="flex items-center gap-1 rounded-full"
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="text-xs">{isOnline ? t("online", lang) : t("offline", lang)}</span>
          </Badge>

          <Button
            data-testid="topbar-theme-toggle"
            variant="outline"
            className="rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="topbar-lang-menu" variant="outline" className="rounded-full">
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem data-testid="topbar-lang-ar" onClick={() => setLang("ar")}>
                العربية
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="topbar-lang-en" onClick={() => setLang("en")}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
