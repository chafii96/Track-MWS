import { differenceInMinutes } from "date-fns";
import { Hit } from "@/lib/db";

export type RangeKey = "7d" | "30d" | "90d";

export function rangeToMs(range: RangeKey): number {
  const day = 24 * 60 * 60 * 1000;
  if (range === "7d") return 7 * day;
  if (range === "30d") return 30 * day;
  return 90 * day;
}

export function withinRange(h: Hit, rangeMs: number, now = Date.now()): boolean {
  return h.ts >= now - rangeMs;
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function groupByDay(hits: Hit[]): { day: string; pageviews: number; visitors: number; sessions: number }[] {
  const by: Record<string, { pv: number; visitors: Set<string>; sessions: Set<string> }> = {};
  for (const h of hits) {
    if (h.type !== "pageview") continue;
    const day = new Date(h.ts).toISOString().slice(0, 10);
    if (!by[day]) by[day] = { pv: 0, visitors: new Set(), sessions: new Set() };
    by[day].pv += 1;
    by[day].visitors.add(h.visitorId);
    by[day].sessions.add(h.sessionId);
  }
  return Object.keys(by)
    .sort()
    .map((day) => ({ day, pageviews: by[day].pv, visitors: by[day].visitors.size, sessions: by[day].sessions.size }));
}

export function calcKpis(hits: Hit[]): {
  visits: number;
  visitors: number;
  pageviews: number;
  bounceRate: number;
  avgSessionMs: number;
  pagesPerSession: number;
} {
  const pageviews = hits.filter((h) => h.type === "pageview");
  const visits = pageviews.length;
  const visitors = uniq(pageviews.map((h) => h.visitorId)).length;

  const sessions = new Map<string, Hit[]>();
  for (const h of pageviews) {
    const list = sessions.get(h.sessionId) || [];
    list.push(h);
    sessions.set(h.sessionId, list);
  }

  const sessionCount = sessions.size || 1;
  const pagesPerSession = visits / sessionCount;

  // Bounce: sessions with exactly 1 pageview
  let bounced = 0;
  sessions.forEach((list) => {
    if (list.length === 1) bounced += 1;
  });
  const bounceRate = sessions.size ? (bounced / sessions.size) * 100 : 0;

  // Avg session duration: use durationMs from first hit of session if present, else estimate by last-first timestamp.
  let totalDur = 0;
  let durCount = 0;
  sessions.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.ts - b.ts);
    const explicit = sorted.find((h) => typeof h.durationMs === "number" && (h.durationMs || 0) > 0);
    if (explicit && explicit.durationMs) {
      totalDur += explicit.durationMs;
      durCount += 1;
    } else {
      totalDur += Math.max(0, sorted[sorted.length - 1].ts - sorted[0].ts);
      durCount += 1;
    }
  });
  const avgSessionMs = durCount ? totalDur / durCount : 0;

  return { visits, visitors, pageviews: visits, bounceRate, avgSessionMs, pagesPerSession };
}

export function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return "0s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function realtimeWindow(hits: Hit[], minutes = 30, now = Date.now()): Hit[] {
  const start = now - minutes * 60 * 1000;
  return hits.filter((h) => h.ts >= start && h.type === "pageview");
}

export function activeVisitors(hits: Hit[], minutes = 5, now = Date.now()): number {
  const start = now - minutes * 60 * 1000;
  const ids = new Set(hits.filter((h) => h.type === "pageview" && h.ts >= start).map((h) => h.visitorId));
  return ids.size;
}

export function topBy<T extends string>(items: Hit[], keyFn: (h: Hit) => T, limit = 8): { key: string; value: number }[] {
  const m: Record<string, number> = {};
  for (const h of items) {
    const k = keyFn(h);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return Object.keys(m)
    .map((k) => ({ key: k, value: m[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function parseReferrerHost(ref: string): string {
  try {
    if (!ref) return "";
    return new URL(ref).hostname;
  } catch {
    return "";
  }
}

export function hourOfDay(h: Hit): number {
  return new Date(h.ts).getHours();
}

export function dayOfWeek(h: Hit): number {
  return new Date(h.ts).getDay();
}

export function histogram(items: Hit[], bucketFn: (h: Hit) => number, buckets = 24): number[] {
  const arr = Array.from({ length: buckets }, () => 0);
  for (const h of items) {
    const b = bucketFn(h);
    if (b >= 0 && b < buckets) arr[b] += 1;
  }
  return arr;
}

export function minutesSince(ts: number, now = Date.now()): number {
  return differenceInMinutes(new Date(now), new Date(ts));
}
