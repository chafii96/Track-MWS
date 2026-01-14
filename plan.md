# خطة MVP — تطبيق PWA لتحليل الزوار (Client‑Side)

> اختيارك: **بدون خادم 100%**. هذا يعني أن التتبع سيعمل عملياً كـ **First‑party** فقط (يجب استضافة ملف التتبع والـ Service Worker على **نفس الدومين** الذي تريد تتبّعه). لن نستطيع جمع بيانات زوار من دومينات أخرى داخل هذا المشروع بدون نقطة تجميع (Collector).

## 1) المعمارية (Architecture)

### Frontend (React + TypeScript + Tailwind)
- PWA Dashboard (لوحة تحكم)
- إدارة المواقع (Sites)
- تحليلات (Overview / Pages / Sources / Tech / Geo / Visitors)
- إعدادات (لغة + Theme + تخزين + تصدير)

### التخزين المحلي
- IndexedDB عبر **Dexie** لسهولة الاستعلامات والفهرسة.
- Service Worker يقوم بدور:
  1) Cache للتطبيق للعمل بدون اتصال
  2) مستقبل رسائل من كود التتبع لتخزين الأحداث في IndexedDB

### Tracking Snippet (أقل من ~5KB تقريباً)
- ملف JavaScript خام داخل `public/sa/insight.js`.
- يعمل async ولا يوقف تحميل الصفحة.
- يولّد:
  - Visitor ID دائم (localStorage)
  - Session ID (sessionStorage + انتهاء بعد فترة)
- يجمع:
  - page url/title/referrer/time(ms)
  - time on page + scroll depth
  - device/browser/os تقريبياً عبر userAgent + viewport/screen
  - timezone + language
  - UTM + traffic channel (Direct/Referral/Search/Social)
  - external link clicks
  - Custom events عبر `window.sa.track(name, props)`
- يرسل البيانات للـ Service Worker عبر `postMessage` (بدون أي API خارجي).

## 2) قاعدة البيانات (IndexedDB Schema)

**DB name:** `sa_db`

### Table: `sites`
- `id` (string, siteId)
- `name` (string)
- `domain` (string)
- `createdAt` (number ms)
- `isActive` (boolean)
- `sessionTimeoutMin` (number)

Indexes:
- `domain`
- `createdAt`

### Table: `hits`
- `id` (string)
- `siteId` (string)
- `type` ("pageview" | "event" | "outbound")
- `ts` (number ms)
- `url` (string)
- `title` (string)
- `referrer` (string)
- `visitorId` (string)
- `sessionId` (string)
- `durationMs` (number, optional)
- `scrollMax` (number 0..100, optional)
- `deviceType` ("desktop"|"mobile"|"tablet")
- `browser` (string)
- `os` (string)
- `lang` (string)
- `tz` (string)
- `countryHint` (string, from timezone region)
- `utm_*` (strings optional)
- `channel` (string)
- `eventName` (string optional)
- `eventProps` (object optional)

Indexes:
- `[siteId+ts]`
- `visitorId`
- `sessionId`
- `type`
- `url`
- `channel`
- `browser`
- `os`
- `deviceType`
- `countryHint`

> ملاحظة: للـ MVP سنحسب المؤشرات من `hits` مباشرة مع كاش بسيط داخل الذاكرة.

## 3) الواجهات (APIs)
- لا يوجد Backend API للتتبع حسب اختيارك.
- Backend الموجود في المشروع سيبقى فقط افتراضي (غير مستخدم للـ analytics).

## 4) تدفّقات الواجهة (Frontend Flows)

### (A) Sites
- إنشاء Site (name + domain) => توليد siteId (Web Crypto)
- عرض Tracking snippet للنسخ
- زر "تحميل ملفات التتبع" (اختياري لاحقاً)

### (B) Dashboard
- اختيار Site
- Overview:
  - Real‑time: زوار نشطون + pageviews آخر 30 دقيقة
  - KPI Cards: Total Visits, Unique Visitors, Pageviews, Bounce Rate, Avg Session, Pages/Session
  - Chart: visitors/pageviews over time

### (C) Pages Analytics
- جدول صفحات مع فرز/بحث

### (D) Traffic Sources
- Channels + Referrers

### (E) Technology / Geo
- مخططات دائرية + جداول

### (F) Settings
- Language (AR/EN) + RTL
- Theme (Light/Dark)
- Storage: حجم البيانات + مسح
- Export: CSV/JSON

### (G) Help
- شرح الاستضافة First‑party
- أمثلة `window.sa.track(...)`

## 5) الاختبارات (Testing)
- تشغيل testing agent end‑to‑end:
  - إنشاء Site
  - نسخ snippet
  - محاكاة تسجيل Hit داخل IndexedDB
  - التأكد من ظهور KPIs و Charts
  - اختبار Export CSV/JSON
  - اختبار تبديل اللغة + RTL و Dark mode
- Screenshot للتأكد من التصميم.
