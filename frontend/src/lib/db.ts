import Dexie, { Table } from "dexie";

export type Site = {
  id: string; // siteId
  name: string;
  domain: string;
  createdAt: number;
  isActive: boolean;
  sessionTimeoutMin: number;
};

export type HitType = "pageview" | "event" | "outbound";

export type Hit = {
  id: string;
  siteId: string;
  type: HitType;
  ts: number;
  url: string;
  title: string;
  referrer: string;
  visitorId: string;
  sessionId: string;
  durationMs?: number | null;
  scrollMax?: number | null;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  lang: string;
  tz: string;
  countryHint: string;
  channel: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  eventName?: string | null;
  eventProps?: Record<string, any> | null;
};

export class SADb extends Dexie {
  sites!: Table<Site, string>;
  hits!: Table<Hit, string>;

  constructor() {
    super("sa_db");
    this.version(1).stores({
      sites: "id, domain, createdAt",
      hits: "id, [siteId+ts], siteId, ts, type, url, channel, browser, os, deviceType, countryHint, visitorId, sessionId",
    });
  }
}

export const db = new SADb();
