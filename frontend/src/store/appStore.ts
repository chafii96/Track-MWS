import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n";

export type ThemeMode = "light" | "dark";

type AppState = {
  lang: Lang;
  theme: ThemeMode;
  selectedSiteId: string | null;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  setSelectedSiteId: (id: string | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: "ar",
      theme: "dark",
      selectedSiteId: null,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setSelectedSiteId: (selectedSiteId) => set({ selectedSiteId }),
    }),
    { name: "sa_app" },
  ),
);
