import React from "react";
import { useAppStore } from "@/store/appStore";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function HelpPage() {
  const { lang } = useAppStore();

  return (
    <div data-testid="help-page" className="space-y-4">
      <div>
        <h1 data-testid="help-title" className="text-2xl font-semibold tracking-tight">
          {t("sidebarHelp", lang)}
        </h1>
        <p data-testid="help-subtitle" className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "شرح سريع + FAQ." : "Quick start + FAQ."}
        </p>
      </div>

      <Card data-testid="help-card" className="rounded-2xl border-border/60 bg-card/60 p-5">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="a">
            <AccordionTrigger data-testid="help-what-is">{t("helpTitle", lang)}</AccordionTrigger>
            <AccordionContent data-testid="help-what-is-content" className="text-sm text-muted-foreground">
              {t("helpFirstParty", lang)}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger data-testid="help-snippet">{lang === "ar" ? "كود التتبع" : "Tracking snippet"}</AccordionTrigger>
            <AccordionContent data-testid="help-snippet-content" className="text-sm text-muted-foreground">
              <div className="space-y-3">
                <div>
                  {lang === "ar" ? "الصقه قبل إغلاق وسم body:" : "Paste it before closing body:"}
                </div>
                <pre data-testid="help-snippet-code" className="overflow-auto rounded-2xl border border-border/60 bg-background/40 p-4 text-xs" dir="ltr">
{`<script async src="/sa/insight.js?v=4" data-site="YOUR_SITE_ID"></script>`}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionTrigger data-testid="help-events">{lang === "ar" ? "الأحداث المخصصة" : "Custom events"}</AccordionTrigger>
            <AccordionContent data-testid="help-events-content" className="text-sm text-muted-foreground">
              <pre data-testid="help-events-code" className="overflow-auto rounded-2xl border border-border/60 bg-background/40 p-4 text-xs" dir="ltr">
{`window.sa.track('signup_click', { plan: 'pro' });\nwindow.sa.track('file_download', { file: 'pricing.pdf' });`}
              </pre>
              <div className="mt-2">{t("helpCustomEvents", lang)}</div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="d">
            <AccordionTrigger data-testid="help-adblock">{lang === "ar" ? "ملاحظة AdBlock" : "AdBlock note"}</AccordionTrigger>
            <AccordionContent data-testid="help-adblock-content" className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "استخدمنا مساراً غير نمطي (/sa/insight.js) لتقليل الحظر. لكن لا يوجد ضمان 100%."
                : "We use a non-standard path (/sa/insight.js) to reduce blocking, but nothing is 100%."}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
