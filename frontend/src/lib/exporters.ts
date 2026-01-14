import { db, Hit } from "@/lib/db";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportSiteJson(siteId: string): Promise<void> {
  const hits = await db.hits.where("siteId").equals(siteId).toArray();
  const blob = new Blob([JSON.stringify(hits, null, 2)], { type: "application/json" });
  downloadBlob(blob, `sa_${siteId}_hits.json`);
}

function escapeCsv(value: any): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportSiteCsv(siteId: string): Promise<void> {
  const hits = await db.hits.where("siteId").equals(siteId).toArray();
  const columns: (keyof Hit)[] = [
    "id",
    "siteId",
    "type",
    "ts",
    "url",
    "title",
    "referrer",
    "visitorId",
    "sessionId",
    "durationMs",
    "scrollMax",
    "deviceType",
    "browser",
    "os",
    "lang",
    "tz",
    "countryHint",
    "channel",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "eventName",
  ];
  const lines = [columns.join(",")];
  for (const h of hits) {
    lines.push(columns.map((c) => escapeCsv((h as any)[c])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  downloadBlob(blob, `sa_${siteId}_hits.csv`);
}
