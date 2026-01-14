import React from "react";
import "@/index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAppStore } from "@/store/appStore";
import { ensureServiceWorker } from "@/lib/pwa";

import OverviewPage from "@/pages/OverviewPage";
import PagesPage from "@/pages/PagesPage";
import SourcesPage from "@/pages/SourcesPage";
import TechPage from "@/pages/TechPage";
import GeoPage from "@/pages/GeoPage";
import VisitorsPage from "@/pages/VisitorsPage";
import SitesPage from "@/pages/SitesPage";
import SettingsPage from "@/pages/SettingsPage";
import HelpPage from "@/pages/HelpPage";

function useOnlineStatus() {
  const [online, setOnline] = React.useState<boolean>(navigator.onLine);
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export default function App() {
  const { lang, theme } = useAppStore();
  const online = useOnlineStatus();

  React.useEffect(() => {
    ensureServiceWorker();
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, theme]);

  return (
    <div data-testid="app-root" className="min-h-screen bg-[radial-gradient(1200px_circle_at_10%_0%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(900px_circle_at_95%_10%,rgba(34,211,238,0.12),transparent_45%)]">
      <BrowserRouter>
        <Topbar isOnline={online} />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 md:grid-cols-[18rem_1fr]">
          <Sidebar />
          <main data-testid="main-content" className="min-h-[calc(100vh-56px)] px-4 py-5 md:px-6">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/pages" element={<PagesPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/tech" element={<TechPage />} />
              <Route path="/geo" element={<GeoPage />} />
              <Route path="/visitors" element={<VisitorsPage />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}
