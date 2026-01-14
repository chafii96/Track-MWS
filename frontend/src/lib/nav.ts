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

export const navItems = [
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
