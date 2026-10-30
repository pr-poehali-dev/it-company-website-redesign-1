"""
Раздел «Обучение» журнала «Масштаб»: материалы для руководителей.
GET  /?action=tracks              — направления и счётчики материалов
GET  /?action=list&track=..       — материалы раздела (опубликованные)
GET  /?action=tick                — плановое пополнение (не чаще раза в 6 часов): импорт с учисьпро.рф + 1 новый кейс в сутки
POST {action:'import'}            — импорт с учисьпро.рф (админ)
POST {action:'generate', track, topic?} — сгенерировать кейс (админ), сохраняется черновиком или сразу публикуется
GET  /?action=log                 — журнал пополнения (админ)
"""
import json
import os
import re
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

import cases
import uchispro

from seed_data import CASES as SEED_CASES

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
RUBRIC = 'Обучение руководителей'
TICK_HOURS = 6
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Secret',
    'Access-Control-Max-Age': '86400',
}
COLS = 'id, slug, kind, rubric, track, origin, title, lead, cover_url, author, read_min, published, published_at, created_at'


def resp(data, status=200, cache=0):
    h = {**CORS, 'Content-Type': 'application/json'}
    if cache:
        h['Cache-Control'] = f'public, max-age={cache}'
    return {'statusCode': status, 'headers': h, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=psycopg2.extras.RealDictCursor)


def hdr(event, name):
    return {k.lower(): v for k, v in (event.get('headers') or {}).items()}.get(name, '')


def is_admin(conn, event):
    cron = hdr(event, 'x-cron-secret')
    if cron and os.environ.get('CRON_SECRET') and cron == os.environ['CRON_SECRET']:
        return True
    t = hdr(event, 'x-session-token')
    if not t:
        return False
    raw = t.rsplit('.', 1)[0] if '.' in t else t
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM {S}.admin_sessions WHERE token=%s AND expires_at > NOW()", (raw,))
    return cur.fetchone() is not None


def log(conn, kind, ok, info):
    cur = conn.cursor()
    cur.execute(f"INSERT INTO {S}.mag_learn_log (kind, ok, info) VALUES (%s, %s, %s)", (kind, ok, json.dumps(info, ensure_ascii=False, default=str)))
    conn.commit()


def tracks(conn):
    cur = conn.cursor()
    cur.execute(f"""SELECT track, COUNT(*) n, MAX(published_at) last FROM {S}.mag_posts
                    WHERE published AND rubric=%s GROUP BY track""", (RUBRIC,))
    counts = {r['track']: {'n': r['n'], 'last': r['last']} for r in cur.fetchall()}
    return [{**t, 'count': counts.get(t['slug'], {}).get('n', 0)} for t in cases.TRACKS]


def action_list(conn, p):
    lim = max(1, min(60, int(p.get('limit') or 30)))
    tr = (p.get('track') or '').strip()
    cur = conn.cursor()
    if tr and tr in cases.TRACK_SLUGS:
        cur.execute(f"SELECT {COLS} FROM {S}.mag_posts WHERE published AND rubric=%s AND track=%s ORDER BY published_at DESC LIMIT %s", (RUBRIC, tr, lim))
    else:
        cur.execute(f"SELECT {COLS} FROM {S}.mag_posts WHERE published AND rubric=%s ORDER BY published_at DESC LIMIT %s", (RUBRIC, lim))
    return [dict(r) for r in cur.fetchall()]


def generate(conn, track, topic, publish, deadline):
    used = []
    cur = conn.cursor()
    cur.execute(f"SELECT title FROM {S}.mag_posts WHERE rubric=%s ORDER BY created_at DESC LIMIT 60", (RUBRIC,))
    used = [r['title'] for r in cur.fetchall()]
    art = cases.generate_case(track, topic, used, deadline)
    slug = uchispro.slugify(art['title'])
    cur.execute(f"SELECT 1 FROM {S}.mag_posts WHERE slug=%s", (slug,))
    if cur.fetchone():
        slug = f'{slug[:70]}-{int(time.time()) % 100000}'
    cur.execute(f"""INSERT INTO {S}.mag_posts (slug, kind, rubric, track, origin, title, lead, content, takeaways, question, sources,
                    author, read_min, cover_url, published, published_at)
                    VALUES (%s,'article',%s,%s,'ai_case',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s THEN NOW() END) RETURNING id, slug, published""",
                (slug, RUBRIC, art['track'], art['title'], art['lead'], art['content'], art['takeaways'], art['question'], art['sources'],
                 'Редакция «Масштаба» · учебный кейс', art['read_min'], cases.cover_for(art['track']), publish, publish))
    r = dict(cur.fetchone())
    conn.commit()
    return {**r, 'title': art['title'], 'track': art['track']}


def seed(conn):
    cur = conn.cursor()
    items = SEED_CASES
    added = 0
    for i, c in enumerate(items):
        words = len(re.findall(r'\S+', c['content']))
        cur.execute(f"""INSERT INTO {S}.mag_posts (slug, kind, rubric, track, origin, title, lead, content, takeaways, question, sources,
                        author, read_min, cover_url, published, published_at)
                        VALUES (%s,'article',%s,%s,'ai_case',%s,%s,%s,%s,%s,'','Редакция «Масштаба» · учебный кейс',%s,%s,TRUE,
                                NOW() - make_interval(hours => %s))
                        ON CONFLICT (slug) DO NOTHING RETURNING id""",
                    (c['slug'], RUBRIC, c['track'], c['title'], c['lead'], c['content'], c['takeaways'], c['question'],
                     max(3, round(words / 180)), c['cover'], (len(items) - 1 - i) * 3))
        if cur.fetchone():
            added += 1
    conn.commit()
    return added


def tick(conn, deadline, force=False):
    cur = conn.cursor()
    cur.execute(f"""SELECT MAX(created_at) t FROM {S}.mag_learn_log WHERE kind='tick' AND ok""")
    last = cur.fetchone()['t']
    cur.execute(f"SELECT COUNT(*) n FROM {S}.mag_posts WHERE rubric=%s AND origin='ai_case'", (RUBRIC,))
    seeding = cur.fetchone()['n'] < len(cases.TRACKS)
    if not force and not seeding and last and (datetime.now(timezone.utc) - last).total_seconds() < TICK_HOURS * 3600:
        return {'skipped': True}
    cur.execute(f"INSERT INTO {S}.mag_learn_log (kind, ok, info) VALUES ('tick', FALSE, '{{}}') RETURNING id")
    tick_id = cur.fetchone()['id']
    conn.commit()
    out = {}
    if seeding:
        out['seeded'] = seed(conn)
        cur.execute(f"SELECT COUNT(*) n FROM {S}.mag_posts WHERE rubric=%s AND origin='ai_case'", (RUBRIC,))
        seeding = cur.fetchone()['n'] < len(cases.TRACKS)
    try:
        out['import'] = uchispro.run(conn, S, RUBRIC, deadline=min(deadline - 30 if seeding else deadline, time.time() + 10))
        log(conn, 'import', True, out['import'])
    except Exception as e:
        out['import_error'] = str(e)[:300]
        log(conn, 'import', False, {'error': str(e)[:300]})
    cur.execute(f"""SELECT COUNT(*) n FROM {S}.mag_posts WHERE rubric=%s AND origin='ai_case' AND created_at > NOW() - INTERVAL '20 hours'""", (RUBRIC,))
    fresh = cur.fetchone()['n']
    out['time_left'] = round(deadline - time.time())
    if (seeding or fresh == 0) and os.environ.get('POLZA_AI_API_KEY') and deadline - time.time() > 25:
        cur.execute(f"""SELECT track, COUNT(*) n FROM {S}.mag_posts WHERE rubric=%s AND published GROUP BY track""", (RUBRIC,))
        have = {r['track']: r['n'] for r in cur.fetchall()}
        track = min(cases.TRACK_SLUGS, key=lambda t: (have.get(t, 0), t))
        try:
            out['case'] = generate(conn, track, '', True, deadline)
            log(conn, 'generate', True, out['case'])
        except Exception as e:
            out['case_error'] = str(e)[:300]
            log(conn, 'generate', False, {'error': str(e)[:300], 'track': track})
    good = 'import' in out or 'case' in out or bool(out.get('seeded'))
    cur.execute(f"UPDATE {S}.mag_learn_log SET ok=%s, info=%s WHERE id=%s", (good, json.dumps(out, ensure_ascii=False, default=str)[:4000], tick_id))
    conn.commit()
    return out


def handler(event: dict, context) -> dict:
    """Раздел «Обучение руководителей» журнала «Масштаб»: импорт материалов с учисьпро.рф и ежедневные учебные кейсы."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    p = event.get('queryStringParameters') or {}
    b = {}
    if method == 'POST':
        try:
            b = json.loads(event.get('body') or '{}')
        except ValueError:
            return resp({'error': 'Неверный JSON'}, 400)
    action = b.get('action') or p.get('action') or ''
    left = context.get_remaining_time_in_millis() / 1000 if hasattr(context, 'get_remaining_time_in_millis') else 25
    deadline = time.time() + max(3, left - 3)
    if action in ('', 'ping'):
        return resp({'ok': True})
    conn = db()
    try:
        if action == 'tracks':
            return resp({'tracks': tracks(conn), 'rubric': RUBRIC}, cache=300)
        if action == 'list':
            return resp({'posts': action_list(conn, p)}, cache=120)
        if action == 'tick':
            return resp(tick(conn, deadline))
        if not is_admin(conn, event):
            return resp({'error': 'Войдите в админку'}, 401)
        if action == 'log':
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM {S}.mag_learn_log ORDER BY id DESC LIMIT 40")
            return resp({'log': [dict(r) for r in cur.fetchall()]})
        if method != 'POST':
            return resp({'error': 'Нужен POST'}, 405)
        if action == 'run':
            return resp(tick(conn, deadline, force=True))
        if action == 'import':
            r = uchispro.run(conn, S, RUBRIC, deadline=deadline, publish=bool(b.get('publish', True)))
            log(conn, 'import', True, r)
            return resp(r)
        if action == 'generate':
            track = b.get('track') if b.get('track') in cases.TRACK_SLUGS else cases.TRACK_SLUGS[0]
            if not os.environ.get('POLZA_AI_API_KEY'):
                return resp({'error': 'Не задан ключ POLZA_AI_API_KEY'}, 400)
            try:
                r = generate(conn, track, (b.get('topic') or '').strip()[:300], bool(b.get('publish')), deadline)
            except Exception as e:
                log(conn, 'generate', False, {'error': str(e)[:300], 'track': track})
                return resp({'error': f'Не удалось сгенерировать кейс: {str(e)[:200]}'}, 502)
            log(conn, 'generate', True, r)
            return resp({'ok': True, **r})
        return resp({'error': 'Неизвестное действие'}, 400)
    finally:
        conn.close()
