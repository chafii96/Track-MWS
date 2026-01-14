export type Lang = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

export const dict: Dict = {
  appName: { ar: "تحليلاتي", en: "Self Analytics" },
  sidebarOverview: { ar: "نظرة عامة", en: "Overview" },
  sidebarPages: { ar: "الصفحات", en: "Pages" },
  sidebarSources: { ar: "المصادر", en: "Sources" },
  sidebarTech: { ar: "التقنيات", en: "Technology" },
  sidebarGeo: { ar: "الجغرافيا", en: "Geographic" },
  sidebarVisitors: { ar: "الزوار", en: "Visitors" },
  sidebarSites: { ar: "المواقع", en: "Sites" },
  sidebarSettings: { ar: "الإعدادات", en: "Settings" },
  sidebarHelp: { ar: "مساعدة", en: "Help" },

  emptyStateTitle: { ar: "أضف موقعك الأول", en: "Add your first site" },
  emptyStateDesc: {
    ar: "لنبدأ: أنشئ Site ID وخذ كود التتبع وضعه في موقعك (First‑party).",
    en: "Get started: create a Site ID and paste the tracking snippet on your site (first‑party).",
  },
  createSite: { ar: "إضافة موقع", en: "Create Site" },
  siteName: { ar: "اسم الموقع", en: "Site name" },
  siteDomain: { ar: "الدومين", en: "Domain" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },

  trackingSnippet: { ar: "كود التتبع", en: "Tracking snippet" },
  copy: { ar: "نسخ", en: "Copy" },
  copied: { ar: "تم النسخ", en: "Copied" },

  timeRange: { ar: "الفترة", en: "Time range" },
  last7: { ar: "آخر 7 أيام", en: "Last 7 days" },
  last30: { ar: "آخر 30 يوم", en: "Last 30 days" },
  last90: { ar: "آخر 90 يوم", en: "Last 90 days" },
  realtime: { ar: "الوقت الحقيقي", en: "Real‑time" },
  activeNow: { ar: "نشط الآن", en: "Active now" },
  last30min: { ar: "آخر 30 دقيقة", en: "Last 30 minutes" },

  kpiVisits: { ar: "الزيارات", en: "Visits" },
  kpiVisitors: { ar: "زوار فريدون", en: "Unique visitors" },
  kpiPageviews: { ar: "مشاهدات", en: "Pageviews" },
  kpiBounce: { ar: "الارتداد", en: "Bounce rate" },
  kpiAvgSession: { ar: "متوسط مدة الجلسة", en: "Avg session" },
  kpiPagesPerSession: { ar: "صفحات/جلسة", en: "Pages/session" },

  export: { ar: "تصدير", en: "Export" },
  exportJson: { ar: "JSON", en: "JSON" },
  exportCsv: { ar: "CSV", en: "CSV" },
  exportDone: { ar: "تم تجهيز التصدير", en: "Export ready" },

  respectOffline: { ar: "يعمل بدون اتصال", en: "Works offline" },
  online: { ar: "متصل", en: "Online" },
  offline: { ar: "بدون اتصال", en: "Offline" },

  settingsLang: { ar: "اللغة", en: "Language" },
  settingsTheme: { ar: "المظهر", en: "Theme" },
  themeLight: { ar: "فاتح", en: "Light" },
  themeDark: { ar: "داكن", en: "Dark" },

  storage: { ar: "التخزين", en: "Storage" },
  clearData: { ar: "حذف كل البيانات", en: "Clear all data" },
  clearConfirm: { ar: "تأكيد الحذف", en: "Confirm delete" },

  helpTitle: { ar: "كيف يعمل التتبع هنا؟", en: "How tracking works here" },
  helpFirstParty: {
    ar: "هذا التطبيق يعمل بدون خادم. لذلك يجب أن تُستضاف ملفات التتبع على نفس الدومين (First‑party) حتى ترسل الأحداث للـ Service Worker وتُخزّن في IndexedDB.",
    en: "This app is client-only. So tracking must be hosted on the same domain (first‑party) to send events to the Service Worker and store them in IndexedDB.",
  },
  helpCustomEvents: {
    ar: "أمثلة أحداث مخصصة: window.sa.track('signup_click', { plan: 'pro' })",
    en: "Custom events: window.sa.track('signup_click', { plan: 'pro' })",
  },
};

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key]?.[lang] ?? String(key);
}
