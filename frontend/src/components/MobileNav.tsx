import React from "react";
import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/appStore";

export function MobileNav() {
  const { lang } = useAppStore();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button data-testid="mobile-nav-open" variant="outline" className="rounded-full md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side={lang === "ar" ? "right" : "left"} className="w-[320px]">
        <SheetHeader>
          <SheetTitle data-testid="mobile-nav-title">{t("appName", lang)}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                data-testid={`mobile-nav-link-${it.key}`}
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
