import os
import logging
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Query, Request, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


def _require_env(key: str) -> str:
    v = os.environ.get(key)
    if not v:
        raise RuntimeError(f"Missing required env var: {key}")
    return v


# MongoDB connection (MUST use MONGO_URL from backend/.env)
mongo_url = _require_env("MONGO_URL")
db_name = _require_env("DB_NAME")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# -----------------------------
# Models
# -----------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class Site(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    domain: str
    createdAt: int
    isActive: bool = True
    sessionTimeoutMin: int = 30


class SiteCreate(BaseModel):
    name: str
    domain: str
    sessionTimeoutMin: int = 30


HitType = Literal["pageview", "event", "outbound"]


class HitIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # client-generated id is accepted (recommended). if missing, server generates one.
    id: Optional[str] = None

    siteId: str
    type: HitType
    ts: int

    url: str
    title: str = ""
    referrer: str = ""

    visitorId: str
    sessionId: str

    durationMs: Optional[int] = None
    scrollMax: Optional[float] = None

    deviceType: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    lang: Optional[str] = None
    tz: Optional[str] = None
    countryHint: Optional[str] = None
    channel: Optional[str] = None

    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None

    eventName: Optional[str] = None
    eventProps: Optional[Dict[str, Any]] = None


class CollectResponse(BaseModel):
    ok: bool


class OverviewSeriesPoint(BaseModel):
    day: str
    pageviews: int
    visitors: int
    sessions: int


class OverviewTopItem(BaseModel):
    key: str
    value: int


class OverviewResponse(BaseModel):
    siteId: str
    startTs: int
    endTs: int

    kpis: Dict[str, Any]
    series: List[OverviewSeriesPoint]
    realtime: List[Dict[str, Any]]
    activeVisitors: int
    topPages: List[OverviewTopItem]


# -----------------------------
# Helpers
# -----------------------------
class SimpleRateLimiter:
    """Very small in-memory limiter (best-effort).

    Not meant for multi-instance production; good enough for personal MVP.
    """

    def __init__(self, limit: int, window_sec: int):
        self.limit = limit
        self.window_sec = window_sec
        self._bucket: Dict[str, List[int]] = {}

    def allow(self, key: str, now_ms: int) -> bool:
        now_sec = now_ms // 1000
        start = now_sec - self.window_sec
        arr = self._bucket.get(key) or []
        arr = [t for t in arr if t >= start]
        if len(arr) >= self.limit:
            self._bucket[key] = arr
            return False
        arr.append(now_sec)
        self._bucket[key] = arr
        return True


limiter_collect = SimpleRateLimiter(limit=120, window_sec=60)  # 120 events/min per IP+site


def _client_ip(req: Request) -> str:
    # Prefer X-Forwarded-For (ingress) then fallback
    xff = req.headers.get("x-forwarded-for")
    if xff:
        # take first
        return xff.split(",")[0].strip()
    return req.client.host if req.client else ""


def _ip_hash(ip: str, site_id: str) -> str:
    if not ip:
        return ""
    return hashlib.sha256(f"{site_id}:{ip}".encode("utf-8")).hexdigest()


def _uniq(arr: List[str]) -> List[str]:
    return list(dict.fromkeys(arr))


def _group_by_day(pageviews: List[Dict[str, Any]]) -> List[OverviewSeriesPoint]:
    by: Dict[str, Dict[str, Any]] = {}
    for h in pageviews:
        day = datetime.fromtimestamp(h["ts"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        if day not in by:
            by[day] = {"pv": 0, "visitors": set(), "sessions": set()}
        by[day]["pv"] += 1
        by[day]["visitors"].add(h.get("visitorId", ""))
        by[day]["sessions"].add(h.get("sessionId", ""))

    out: List[OverviewSeriesPoint] = []
    for day in sorted(by.keys()):
        out.append(
            OverviewSeriesPoint(
                day=day,
                pageviews=int(by[day]["pv"]),
                visitors=len(by[day]["visitors"]),
                sessions=len(by[day]["sessions"]),
            )
        )
    return out


def _calc_kpis(pageviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    visits = len(pageviews)
    visitors = len(set([h.get("visitorId") for h in pageviews if h.get("visitorId")] ))

    sessions: Dict[str, List[Dict[str, Any]]] = {}
    for h in pageviews:
        sid = h.get("sessionId") or ""
        if not sid:
            continue
        sessions.setdefault(sid, []).append(h)

    session_count = max(1, len(sessions))
    pages_per_session = visits / session_count if session_count else 0

    bounced = 0
    for _, items in sessions.items():
        if len(items) == 1:
            bounced += 1
    bounce_rate = (bounced / len(sessions)) * 100 if sessions else 0

    total_dur = 0
    dur_n = 0
    for _, items in sessions.items():
        items_sorted = sorted(items, key=lambda x: x.get("ts", 0))
        explicit = next(
            (it for it in items_sorted if isinstance(it.get("durationMs"), int) and (it.get("durationMs") or 0) > 0),
            None,
        )
        if explicit:
            total_dur += int(explicit.get("durationMs") or 0)
            dur_n += 1
        elif items_sorted:
            total_dur += max(0, int(items_sorted[-1].get("ts", 0)) - int(items_sorted[0].get("ts", 0)))
            dur_n += 1

    avg_session_ms = total_dur / dur_n if dur_n else 0

    return {
        "visits": visits,
        "visitors": visitors,
        "pageviews": visits,
        "bounceRate": bounce_rate,
        "avgSessionMs": avg_session_ms,
        "pagesPerSession": pages_per_session,
    }


def _top_by(pageviews: List[Dict[str, Any]], key: str, limit: int = 8) -> List[OverviewTopItem]:
    m: Dict[str, int] = {}
    for h in pageviews:
        k = (h.get(key) or "").strip()
        if not k:
            continue
        m[k] = m.get(k, 0) + 1
    return [OverviewTopItem(key=k, value=v) for k, v in sorted(m.items(), key=lambda x: x[1], reverse=True)[:limit]]


# -----------------------------
# Routes
# -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Self Analytics API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check.get("timestamp"), str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return status_checks


@api_router.post("/sites", response_model=Site)
async def create_site(payload: SiteCreate):
    site_id = f"site_{uuid.uuid4().hex[:12]}"
    site = Site(
        id=site_id,
        name=payload.name.strip(),
        domain=payload.domain.strip(),
        createdAt=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
        isActive=True,
        sessionTimeoutMin=int(payload.sessionTimeoutMin or 30),
    )
    await db.sites.insert_one(site.model_dump())
    return site


@api_router.get("/sites", response_model=List[Site])
async def list_sites():
    rows = await db.sites.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return rows


@api_router.delete("/sites/{site_id}")
async def delete_site(site_id: str):
    await db.sites.delete_one({"id": site_id})
    await db.hits.delete_many({"siteId": site_id})
    return {"ok": True}


@api_router.post("/collect", response_model=CollectResponse)
async def collect_hit(
    request: Request,
    payload: HitIn,
    dnt: Optional[str] = Header(default=None, alias="DNT"),
):
    # Respect Do Not Track
    if dnt == "1":
        return CollectResponse(ok=True)

    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    ip = _client_ip(request)

    # Best-effort rate limit
    rl_key = f"{payload.siteId}:{ip}"
    if not limiter_collect.allow(rl_key, now_ms):
        raise HTTPException(status_code=429, detail="rate_limited")

    # Validate site exists and active
    site = await db.sites.find_one({"id": payload.siteId, "isActive": True}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=400, detail="invalid_site")

    doc = payload.model_dump()
    if not doc.get("id"):
        doc["id"] = f"h_{uuid.uuid4().hex}"  # uuid string

    # Store only hashed IP (privacy). Keep empty if unavailable.
    doc["ipHash"] = _ip_hash(ip, payload.siteId)

    # Basic sanity limits
    if len(doc.get("url") or "") > 2048:
        doc["url"] = (doc.get("url") or "")[:2048]
    if len(doc.get("referrer") or "") > 2048:
        doc["referrer"] = (doc.get("referrer") or "")[:2048]
    if len(doc.get("title") or "") > 512:
        doc["title"] = (doc.get("title") or "")[:512]

    await db.hits.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return CollectResponse(ok=True)


@api_router.get("/hits")
async def list_hits(
    siteId: str = Query(...),
    startTs: int = Query(...),
    endTs: int = Query(...),
    limit: int = Query(5000, ge=1, le=20000),
):
    cur = (
        db.hits.find({"siteId": siteId, "ts": {"$gte": startTs, "$lte": endTs}}, {"_id": 0})
        .sort("ts", 1)
        .limit(limit)
    )
    rows = await cur.to_list(length=limit)
    return {"hits": rows}


@api_router.get("/overview", response_model=OverviewResponse)
async def overview(
    siteId: str = Query(...),
    startTs: int = Query(...),
    endTs: int = Query(...),
):
    # Pull only pageviews for KPI + series; realtime uses last 30m.
    pageviews = await db.hits.find(
        {"siteId": siteId, "type": "pageview", "ts": {"$gte": startTs, "$lte": endTs}}, {"_id": 0}
    ).to_list(length=200000)

    series = _group_by_day(pageviews)
    kpis = _calc_kpis(pageviews)

    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    rt_start = max(startTs, now_ms - 30 * 60 * 1000)
    realtime_hits = await db.hits.find(
        {"siteId": siteId, "type": "pageview", "ts": {"$gte": rt_start, "$lte": endTs}}, {"_id": 0}
    ).sort("ts", -1).limit(50).to_list(length=50)

    active_start = max(startTs, now_ms - 5 * 60 * 1000)
    active_ids = await db.hits.distinct(
        "visitorId", {"siteId": siteId, "type": "pageview", "ts": {"$gte": active_start, "$lte": endTs}}
    )

    top_pages = _top_by(pageviews, "url", limit=8)

    return OverviewResponse(
        siteId=siteId,
        startTs=startTs,
        endTs=endTs,
        kpis=kpis,
        series=series,
        realtime=realtime_hits,
        activeVisitors=len(active_ids or []),
        topPages=top_pages,
    )


TRACKER_JS = (
    "!function(){var w=window,d=document;var sc=d.currentScript||function(){var s=d.getElementsByTagName('script');return s[s.length-1]}();"
    "var sid=(sc&&sc.getAttribute&&sc.getAttribute('data-site'))||'';if(!sid||!w||!d)return;"
    "if(navigator.doNotTrack==='1'||w.doNotTrack==='1')return;"
    "function rid(n){var a=new Uint8Array(n);(w.crypto||w.msCrypto).getRandomValues(a);for(var s='',i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);"
    "return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')}"
    "function key(p){return'sa_'+p+'_'+sid}"
    "var LS=w.localStorage,SS=w.sessionStorage;"
    "function vid(){var k=key('vid'),v='';try{v=LS.getItem(k)||''}catch(e){}if(!v){v=rid(16);try{LS.setItem(k,v)}catch(e){}}return v}"
    "function sess(){var k=key('sess'),lk=key('last'),now=Date.now(),last=0;try{last=parseInt(SS.getItem(lk)||'0',10)||0}catch(e){}"
    "var ttl=30*60*1e3,s='';try{s=SS.getItem(k)||''}catch(e){}if(!s||!last||now-last>ttl){s=rid(12);try{SS.setItem(k,s)}catch(e){}}"
    "try{SS.setItem(lk,String(now))}catch(e){}return s}"
    "function dev(){var ua=navigator.userAgent||'';return/iPad|Tablet/.test(ua)?'tablet':/Mobile|Android|iP(hone|od)/.test(ua)?'mobile':'desktop'}"
    "function os(){var ua=navigator.userAgent||'';return/Windows/.test(ua)?'Windows':/Mac OS X/.test(ua)&&!/iPhone|iPad/.test(ua)?'macOS':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Linux/.test(ua)?'Linux':'Other'}"
    "function br(){var ua=navigator.userAgent||'';return/Edg\\//.test(ua)?'Edge':/Chrome\\//.test(ua)&&!/Edg\\//.test(ua)?'Chrome':/Firefox\\//.test(ua)?'Firefox':/Safari\\//.test(ua)&&!/Chrome\\//.test(ua)?'Safari':'Other'}"
    "function tz(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){return''}}"
    "function regn(t){var p=(t||'').split('/');return p.length>1?p[0]:''}"
    "function chan(ref){try{if(!ref)return'Direct';var u=new URL(ref),h=u.hostname||'';if(/(google\\.|bing\\.|duckduckgo\\.)/.test(h))return'Search';if(/(facebook\\.|twitter\\.|x\\.com|t\\.co|instagram\\.|linkedin\\.|tiktok\\.)/.test(h))return'Social';return'Referral'}catch(e){return ref?'Referral':'Direct'}}"
    "function utm(){var o={};try{var p=new URLSearchParams(w.location.search),ks=['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];for(var i=0;i<ks.length;i++){var v=p.get(ks[i]);if(v)o[ks[i]]=v}}catch(e){}return o}"
    "var V=vid(),S=sess(),hitId='',scrollMax=0;"
    "function send(obj){try{var ep=(sc&&sc.getAttribute&&sc.getAttribute('data-endpoint'))||'/api/collect';"
    "fetch(ep,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj),keepalive:true,mode:'cors',credentials:'omit'}).catch(function(){})}catch(e){}}"
    "function pv(){S=sess();var now=Date.now(),tzv=tz(),u=utm();hitId=rid(10)+'_'+now;scrollMax=0;send({id:hitId,siteId:sid,type:'pageview',ts:now,url:w.location.href,title:d.title||'',referrer:d.referrer||'',visitorId:V,sessionId:S,durationMs:null,scrollMax:null,deviceType:dev(),browser:br(),os:os(),lang:navigator.language||'',tz:tzv,countryHint:regn(tzv),channel:chan(d.referrer||''),utm_source:u.utm_source||null,utm_medium:u.utm_medium||null,utm_campaign:u.utm_campaign||null,utm_term:u.utm_term||null,utm_content:u.utm_content||null,eventName:null,eventProps:null})}"
    "function patch(){try{if(!hitId)return;var started=parseInt(hitId.split('_')[1]||String(Date.now()),10),dur=Date.now()-started;send({id:hitId,siteId:sid,type:'pageview',ts:started,url:w.location.href,title:d.title||'',referrer:d.referrer||'',visitorId:V,sessionId:S,durationMs:dur,scrollMax:scrollMax,deviceType:dev(),browser:br(),os:os(),lang:navigator.language||'',tz:tz(),countryHint:regn(tz()),channel:chan(d.referrer||'')})}catch(e){}}"
    "function onScroll(){var de=d.documentElement,stp=w.pageYOffset||de.scrollTop||0,h=de.scrollHeight-w.innerHeight,p=h>0?Math.min(100,Math.round(stp/h*100)):100;if(p>scrollMax)scrollMax=p}"
    "function hookHistory(){try{var ps=history.pushState,rs=history.replaceState;history.pushState=function(){ps.apply(history,arguments);setTimeout(pv,0)};history.replaceState=function(){rs.apply(history,arguments);setTimeout(pv,0)};w.addEventListener('popstate',function(){setTimeout(pv,0)})}catch(e){}}"
    "function hookClicks(){d.addEventListener('click',function(e){try{var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a||!a.href)return;var u=new URL(a.href);if(u.host&&u.host!==w.location.host)send({id:rid(10)+'_'+Date.now(),siteId:sid,type:'outbound',ts:Date.now(),url:w.location.href,title:d.title||'',referrer:d.referrer||'',visitorId:V,sessionId:sess(),deviceType:dev(),browser:br(),os:os(),lang:navigator.language||'',tz:tz(),countryHint:regn(tz()),channel:chan(d.referrer||''),eventName:'outbound',eventProps:{to:a.href}})}catch(err){}},true)}"
    "w.sa=w.sa||{};w.sa.track=function(name,props){send({id:rid(10)+'_'+Date.now(),siteId:sid,type:'event',ts:Date.now(),url:w.location.href,title:d.title||'',referrer:d.referrer||'',visitorId:V,sessionId:sess(),deviceType:dev(),browser:br(),os:os(),lang:navigator.language||'',tz:tz(),countryHint:regn(tz()),channel:chan(d.referrer||''),eventName:String(name||'event'),eventProps:props||null})};"
    "hookHistory();hookClicks();w.addEventListener('scroll',onScroll,{passive:true});w.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')patch()});w.addEventListener('pagehide',patch);pv();}();"
)


@api_router.get("/i.js")
async def tracker_js():
    return Response(content=TRACKER_JS, media_type="application/javascript")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    # Speed up queries
    try:
        await db.sites.create_index("id", unique=True)
        await db.hits.create_index([("siteId", 1), ("ts", 1)])
        await db.hits.create_index([("siteId", 1), ("type", 1), ("ts", 1)])
        await db.hits.create_index("id", unique=True)
    except Exception as e:
        logger.warning("index_create_failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()