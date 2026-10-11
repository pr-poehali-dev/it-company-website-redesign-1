"""
Импорт статей из раздела «Лента» сайта учисьпро.рф в блог МАТ-Лабс.
Берёт только редакционные статьи деловых рубрик, новые публикует сразу, существующие обновляет.
GET  /       — статус последнего импорта
GET  /?action=tick — запустить импорт, если с прошлого прошло больше MIN_INTERVAL_HOURS (безопасно звать с сайта)
POST /       — принудительный импорт (нужен X-Cron-Secret)
"""
import json
import time
import os
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone
import psycopg2

FEED_URL = "https://functions.poehali.dev/b9f58dbe-702c-46d3-a9b1-02d5076735ef"
SITE = "https://учисьпро.рф"
SOURCE = "uchispro"
CATEGORIES = ["business", "ai", "tech", "grants"]
TAGS = {"business": "Бизнес", "ai": "AI/ML", "tech": "IT", "grants": "Гранты"}
COLORS = {
    "business": "from-orange-500 to-amber-600",
    "ai": "from-violet-500 to-purple-600",
    "tech": "from-sky-500 to-cyan-600",
    "grants": "from-yellow-500 to-orange-600",
}
MAX_PAGES = 5
TIME_BUDGET_SEC = float(os.environ.get("SYNC_TIME_BUDGET", "3.5"))
MIN_INTERVAL_HOURS = 6
S = os.environ.get("MAIN_DB_SCHEMA", "public")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Cron-Secret",
}


def resp(data, status=200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def get_json(params: dict, timeout=3) -> dict:
    url = FEED_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "MAT-Labs-Blog-Sync/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def read_time(text: str) -> str:
    words = len(re.findall(r"\S+", text or ""))
    return f"{max(1, round(words / 180))} мин"


def clean_content(text: str) -> str:
    text = re.sub(r"^:::spoiler\s*(.*)$", r"**\1**", text or "", flags=re.M)
    text = re.sub(r"^:::\s*$", "", text, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_dt(v):
    if not v:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d.astimezone(timezone.utc).replace(tzinfo=None) if d.tzinfo else d
    except ValueError:
        return datetime.now(timezone.utc).replace(tzinfo=None)


def collect_candidates(log: list, deadline: float) -> list:
    found = {}
    for cat in CATEGORIES:
        for page in range(1, MAX_PAGES + 1):
            if time.monotonic() > deadline:
                break
            try:
                data = get_json({"action": "list", "page": page, "category": cat})
            except Exception as e:
                log.append(f"{cat} p{page}: {e}")
                break
            for it in data.get("items") or []:
                if it.get("source_kind") in ("user", "agent"):
                    continue
                if it.get("category") not in CATEGORIES or not it.get("slug"):
                    continue
                found[it["slug"]] = it
            if not data.get("has_more"):
                break
    return list(found.values())


def run_sync() -> dict:
    log = []
    started = time.monotonic()
    deadline = started + TIME_BUDGET_SEC
    items = collect_candidates(log, started + TIME_BUDGET_SEC * 0.5)
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(f"SELECT source_slug, updated_at FROM {S}.blog_posts WHERE source = %s", (SOURCE,))
    existing = {r[0]: r[1] for r in cur.fetchall()}

    added, updated, skipped = 0, 0, 0
    incomplete = time.monotonic() > started + TIME_BUDGET_SEC * 0.5
    for it in items:
        if time.monotonic() > deadline:
            incomplete = True
            break
        slug = it["slug"]
        src_updated = parse_dt(it.get("updated_at") or it.get("published_at"))
        if slug in existing and existing[slug] and existing[slug] >= src_updated:
            skipped += 1
            continue
        try:
            full = get_json({"action": "item", "slug": slug}).get("item") or {}
        except Exception as e:
            log.append(f"item {slug}: {e}")
            continue
        if full.get("source_kind") in ("user", "agent"):
            continue
        content = clean_content(full.get("content") or full.get("summary") or "")
        if len(content) < 300 or not full.get("title"):
            skipped += 1
            continue
        cat = full.get("category") or it.get("category")
        title = full["title"].strip()[:500]
        cur.execute(
            f"""INSERT INTO {S}.blog_posts
                (title, tag, read_time, color, content, published, created_at, updated_at, cover_url,
                 source, source_slug, source_url, summary)
                VALUES (%s,%s,%s,%s,%s,true,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (source, source_slug) DO UPDATE SET
                  title=EXCLUDED.title, tag=EXCLUDED.tag, read_time=EXCLUDED.read_time, color=EXCLUDED.color,
                  content=EXCLUDED.content, updated_at=EXCLUDED.updated_at, cover_url=EXCLUDED.cover_url,
                  source_url=EXCLUDED.source_url, summary=EXCLUDED.summary""",
            (title, TAGS.get(cat, "AI/ML"), read_time(content), COLORS.get(cat, COLORS["ai"]), content,
             parse_dt(full.get("published_at") or it.get("published_at")), src_updated,
             full.get("cover_url"), SOURCE, slug, f"{SITE}/feed/{slug}", (full.get("summary") or "")[:1000]),
        )
        if slug in existing:
            updated += 1
        else:
            added += 1
        conn.commit()

    result = {"ok": True, "incomplete": incomplete, "found": len(items), "added": added, "updated": updated,
              "skipped": skipped, "errors": log[:10], "finished_at": datetime.now(timezone.utc).isoformat()}
    cur.execute(
        f"""INSERT INTO {S}.cron_state (key, last_run, last_result, updated_at)
            VALUES ('uchispro_sync', CASE WHEN %s THEN NULL ELSE now() END, %s, now())
            ON CONFLICT (key) DO UPDATE SET last_run=CASE WHEN %s THEN NULL ELSE now() END, last_result=%s, updated_at=now()""",
        (incomplete, json.dumps(result, ensure_ascii=False), incomplete, json.dumps(result, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()
    print(f"[uchispro-sync] {result}")
    return result


def handler(event: dict, context) -> dict:
    """Синхронизирует статьи «Ленты» учисьпро.рф (деловые рубрики, только редакция) с блогом МАТ-Лабс."""
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    if method == "GET" and params.get("action") == "tick":
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {S}.cron_state SET last_run = now(), updated_at = now()
                WHERE key = 'uchispro_sync'
                  AND (last_run IS NULL OR last_run < now() - interval '{MIN_INTERVAL_HOURS} hours')
                RETURNING key"""
        )
        due = cur.fetchone() is not None
        conn.commit()
        conn.close()
        if not due:
            return resp({"ok": True, "skipped": True})
        return resp(run_sync())

    if method == "GET":
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(f"SELECT last_run, last_result FROM {S}.cron_state WHERE key='uchispro_sync'")
        row = cur.fetchone()
        cur.execute(f"SELECT count(*) FROM {S}.blog_posts WHERE source=%s", (SOURCE,))
        total = cur.fetchone()[0]
        conn.close()
        return resp({"ok": True, "last_run": row[0] if row else None,
                     "last_result": row[1] if row else None, "imported_total": total})

    secret = os.environ.get("CRON_SECRET", "")
    headers = event.get("headers") or {}
    incoming = headers.get("X-Cron-Secret") or headers.get("x-cron-secret") or ""
    if secret and incoming != secret:
        return resp({"error": "Unauthorized"}, 401)

    return resp(run_sync())
