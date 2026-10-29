"""
Журнал «Масштаб»: рейтинг «Масштаб-500» самых быстрорастущих компаний по данным ФНС (ГИР БО),
интервью с предпринимателями, рекламные места, заявки рекламодателей и героев, редакция.
"""
import hashlib
import json
import os
import re
import time

import psycopg2
import psycopg2.extras

from data import REGIONS, SECTIONS
import ingest
import market
import notify

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Secret, X-Ingest-Key',
    'Access-Control-Max-Age': '86400',
}
INGEST_HASH = 'e20c1f21efe92e56eb7b3ca93caa72c688c6648dd408af5cbc38a36c73c63277'
MIN_REV = 100_000_000
MIN_BASE = 10_000_000
EXCLUDE = ('64', '65', '66', '84', '99')


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
    t = hdr(event, 'x-session-token')
    if not t:
        return False
    raw = t.rsplit('.', 1)[0] if '.' in t else t
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM {S}.admin_sessions WHERE token=%s AND expires_at > NOW()", (raw,))
    return cur.fetchone() is not None


def section_codes(section):
    return SECTIONS.get(section, [])


# ---------- рейтинг ----------

def rating_where(p):
    w = ['m.ok']
    a = []
    region = re.sub(r'\D', '', p.get('region') or '')[:2]
    if region:
        w.append('c.region = %s')
        a.append(region)
    sec = p.get('section') or ''
    if sec in SECTIONS:
        w.append('c.okved2 = ANY(%s)')
        a.append(SECTIONS[sec])
    return ' AND '.join(w), a, bool(a)


def action_rating(conn, p):
    w, a, local = rating_where(p)
    page = max(0, min(9, int(p.get('page') or 0)))
    q = (p.get('q') or '').strip()[:80]
    cur = conn.cursor()
    base = f"""SELECT c.inn, c.name, c.region, c.okved2, c.staff, m.rev2022, m.rev2023, m.rev2024, m.rev2025, m.growth, m.rank_ru,
                ROW_NUMBER() OVER (ORDER BY m.growth DESC, m.rev2025 DESC) AS rk
                FROM {S}.m500_companies m JOIN {S}.biz_companies c ON c.inn = m.inn WHERE {w}"""
    extra, ea = '', []
    if q:
        extra = ' AND (t.name ILIKE %s OR t.inn = %s)'
        ea = [f'%{q}%', re.sub(r'\D', '', q) or '-']
    cur.execute(f"SELECT * FROM ({base}) t WHERE t.rk <= 500{extra} ORDER BY t.rk LIMIT 50 OFFSET %s", a + ea + [page * 50])
    items = [dict(r) for r in cur.fetchall()]
    cur.execute(f"""SELECT COUNT(*) n, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.growth) med, COUNT(DISTINCT t.region) regions,
                    SUM(t.rev2025) rev FROM ({base}) t WHERE t.rk <= 500""", a)
    st = dict(cur.fetchone())
    sec_by_code = {c: s2 for s2, codes in SECTIONS.items() for c in codes}
    for it in items:
        it['rank'] = it.pop('rk')
        it['region_name'] = REGIONS.get(it['region'], '')
        it['section'] = sec_by_code.get(it['okved2'], '')
        it['growth'] = float(it['growth'])
    cur.execute(f"SELECT COUNT(*) n, COUNT(*) FILTER (WHERE ok) e, MAX(checked_at) t FROM {S}.m500_companies")
    b = cur.fetchone()
    total = st['n'] or 0
    return resp({'items': items, 'local': local,
                 'stats': {'companies': total, 'median': float(st['med'] or 0), 'regions': st['regions'] or 0, 'revenue': st['rev'] or 0},
                 'checked': b['n'], 'eligible': b['e'], 'updated_at': b['t'], 'page': page,
                 'more': not q and (page + 1) * 50 < total}, cache=600)


def action_filters(conn):
    return resp({'regions': [{'code': k, 'name': v} for k, v in sorted(REGIONS.items(), key=lambda x: x[1])],
                 'sections': [s for s in SECTIONS]}, cache=86400)


# ---------- публикации ----------

POST_COLS = 'id, slug, kind, rubric, title, lead, hero_name, hero_role, company_inn, cover_url, author, read_min, published, published_at, created_at, data_date'


def action_posts(conn, p, admin):
    cur = conn.cursor()
    lim = max(1, min(50, int(p.get('limit') or 20)))
    if admin and p.get('all'):
        cur.execute(f"SELECT {POST_COLS} FROM {S}.mag_posts ORDER BY created_at DESC LIMIT 200")
    else:
        rubric = (p.get('rubric') or '').strip()[:60]
        if rubric:
            cur.execute(f"SELECT {POST_COLS} FROM {S}.mag_posts WHERE published AND rubric=%s ORDER BY published_at DESC LIMIT %s", (rubric, lim))
        else:
            cur.execute(f"SELECT {POST_COLS} FROM {S}.mag_posts WHERE published ORDER BY published_at DESC LIMIT %s", (lim,))
    return resp({'posts': [dict(r) for r in cur.fetchall()]}, cache=0 if admin else 120)


def company_card(cur, inn):
    if not inn:
        return None
    cur.execute(f"""SELECT c.inn, c.name, c.region, c.okved2, c.staff, c.revenue, c.expenses,
                    m.rev2021, m.rev2022, m.rev2023, m.rev2024, m.rev2025, m.growth
                    FROM {S}.biz_companies c LEFT JOIN {S}.m500_companies m ON m.inn = c.inn WHERE c.inn = %s""", (inn,))
    r = cur.fetchone()
    if not r:
        return None
    r = dict(r)
    r['region_name'] = REGIONS.get(r['region'], '')
    if r.get('growth') is not None:
        r['growth'] = float(r['growth'])
    return r


def action_post(conn, p, admin):
    slug = (p.get('slug') or '').strip()[:200]
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.mag_posts WHERE slug=%s" + ('' if admin else ' AND published'), (slug,))
    r = cur.fetchone()
    if not r:
        return resp({'error': 'Материал не найден'}, 404)
    post = dict(r)
    post['company'] = company_card(cur, post.get('company_inn'))
    cur.execute(f"SELECT {POST_COLS} FROM {S}.mag_posts WHERE published AND id <> %s ORDER BY published_at DESC LIMIT 3", (post['id'],))
    post['more'] = [dict(x) for x in cur.fetchall()]
    return resp({'post': post}, cache=0 if admin else 120)


def slugify(s):
    tr = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya']))
    out = ''.join(tr.get(ch, ch) for ch in s.lower())
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', out)).strip('-')[:80] or f'post-{int(time.time())}'


def action_save_post(conn, b):
    f = {k: b.get(k) for k in ('kind', 'rubric', 'title', 'lead', 'hero_name', 'hero_role', 'company_inn', 'cover_url', 'content', 'author', 'read_min', 'published',
                               'data_date', 'sources', 'takeaways', 'question')}
    f['data_date'] = f['data_date'] if re.match(r'^\d{4}-\d{2}-\d{2}$', str(f['data_date'] or '')) else None
    for k in ('sources', 'takeaways', 'question'):
        f[k] = (f[k] or '').strip()[:4000]
    if not (f['title'] or '').strip():
        return resp({'error': 'Укажите заголовок'}, 400)
    f['kind'] = f['kind'] if f['kind'] in ('interview', 'article', 'partner') else 'article'
    f['company_inn'] = re.sub(r'\D', '', f['company_inn'] or '')[:12] or None
    f['read_min'] = max(1, min(90, int(f['read_min'] or max(2, len(f['content'] or '') // 1500))))
    f['published'] = bool(f['published'])
    for k in ('rubric', 'title', 'lead', 'hero_name', 'hero_role', 'content', 'author'):
        f[k] = (f[k] or '').strip()
    f['rubric'] = f['rubric'][:60] or 'Люди и роли'
    f['author'] = f['author'][:200] or 'Редакция «Масштаба»'
    cur = conn.cursor()
    pid = b.get('id')
    if pid:
        cur.execute(f"""UPDATE {S}.mag_posts SET kind=%s, rubric=%s, title=%s, lead=%s, hero_name=%s, hero_role=%s, company_inn=%s,
                        cover_url=%s, content=%s, author=%s, read_min=%s, published=%s, data_date=%s, sources=%s, takeaways=%s, question=%s,
                        published_at = CASE WHEN %s AND published_at IS NULL THEN NOW() ELSE published_at END, updated_at=NOW()
                        WHERE id=%s RETURNING id, slug""",
                    (f['kind'], f['rubric'], f['title'][:300], f['lead'], f['hero_name'][:200], f['hero_role'][:300], f['company_inn'],
                     f['cover_url'], f['content'], f['author'], f['read_min'], f['published'], f['data_date'], f['sources'], f['takeaways'],
                     f['question'], f['published'], int(pid)))
    else:
        slug = slugify(f['title'])
        cur.execute(f"SELECT 1 FROM {S}.mag_posts WHERE slug=%s", (slug,))
        if cur.fetchone():
            slug = f'{slug[:70]}-{int(time.time()) % 100000}'
        cur.execute(f"""INSERT INTO {S}.mag_posts (slug, kind, rubric, title, lead, hero_name, hero_role, company_inn, cover_url, content, author,
                        read_min, published, data_date, sources, takeaways, question, published_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s THEN NOW() END) RETURNING id, slug""",
                    (slug, f['kind'], f['rubric'], f['title'][:300], f['lead'], f['hero_name'][:200], f['hero_role'][:300], f['company_inn'],
                     f['cover_url'], f['content'], f['author'], f['read_min'], f['published'], f['data_date'], f['sources'], f['takeaways'],
                     f['question'], f['published']))
    r = cur.fetchone()
    conn.commit()
    if not r:
        return resp({'error': 'Материал не найден'}, 404)
    return resp({'ok': True, 'id': r['id'], 'slug': r['slug']})


def action_delete_post(conn, b):
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {S}.mag_posts WHERE id=%s", (int(b.get('id') or 0),))
    conn.commit()
    return resp({'ok': True})


# ---------- реклама ----------

def action_ads(conn, p, admin):
    cur = conn.cursor()
    if admin and p.get('all'):
        cur.execute(f"SELECT * FROM {S}.mag_ads ORDER BY id DESC")
    else:
        cur.execute(f"SELECT id, slot, advertiser, title, text, image_url, link, cta FROM {S}.mag_ads WHERE active ORDER BY id DESC")
    return resp({'ads': [dict(r) for r in cur.fetchall()]}, cache=0 if admin else 300)


def action_save_ad(conn, b):
    slot = b.get('slot') if b.get('slot') in ('top', 'side', 'inline') else 'side'
    link = (b.get('link') or '').strip()
    if link and not re.match(r'^https?://', link):
        return resp({'error': 'Ссылка должна начинаться с https://'}, 400)
    vals = (slot, (b.get('advertiser') or '').strip()[:200], (b.get('title') or '').strip()[:200], (b.get('text') or '').strip()[:600],
            b.get('image_url') or None, link, (b.get('cta') or 'Подробнее').strip()[:60], bool(b.get('active', True)))
    cur = conn.cursor()
    if b.get('id'):
        cur.execute(f"""UPDATE {S}.mag_ads SET slot=%s, advertiser=%s, title=%s, text=%s, image_url=%s, link=%s, cta=%s, active=%s
                        WHERE id=%s RETURNING id""", vals + (int(b['id']),))
    else:
        cur.execute(f"""INSERT INTO {S}.mag_ads (slot, advertiser, title, text, image_url, link, cta, active)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""", vals)
    r = cur.fetchone()
    conn.commit()
    return resp({'ok': True, 'id': r['id'] if r else None})


def action_delete_ad(conn, b):
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {S}.mag_ads WHERE id=%s", (int(b.get('id') or 0),))
    conn.commit()
    return resp({'ok': True})


def action_click(conn, b):
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.mag_ads SET clicks = clicks + 1 WHERE id=%s", (int(b.get('id') or 0),))
    conn.commit()
    return resp({'ok': True})


# ---------- заявки ----------

LEAD_KIND = {'ad': 'Размещение рекламы', 'hero': 'Заявка героя интервью', 'rating': 'Вопрос по рейтингу «Масштаб-500»', 'subscribe': 'Подписка на рассылку'}


def action_lead(conn, b):
    kind = b.get('kind') if b.get('kind') in LEAD_KIND else 'ad'
    contact = (b.get('contact') or '').strip()[:200]
    if len(contact) < 5:
        return resp({'error': 'Укажите телефон или email'}, 400)
    name, company, msg = (b.get('name') or '').strip()[:200], (b.get('company') or '').strip()[:300], (b.get('message') or '').strip()[:3000]
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) n FROM {S}.mag_leads WHERE contact=%s AND created_at > NOW() - INTERVAL '1 hour'", (contact,))
    if cur.fetchone()['n'] >= 3:
        return resp({'ok': True})
    cur.execute(f"INSERT INTO {S}.mag_leads (kind, name, company, contact, message) VALUES (%s,%s,%s,%s,%s)", (kind, name, company, contact, msg))
    conn.commit()
    notify.send(f'«Масштаб»: {LEAD_KIND[kind]} — {company or name or contact}',
                f'<h3>{LEAD_KIND[kind]}</h3><p><b>Имя:</b> {notify.esc(name)}</p><p><b>Компания:</b> {notify.esc(company)}</p>'
                f'<p><b>Контакт:</b> {notify.esc(contact)}</p><p><b>Сообщение:</b><br>{notify.esc(msg)}</p>')
    return resp({'ok': True})


def action_leads(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.mag_leads ORDER BY id DESC LIMIT 200")
    return resp({'leads': [dict(r) for r in cur.fetchall()]})


# ---------- обработчик ----------

def handler(event: dict, context) -> dict:
    """Журнал «Масштаб»: рейтинг «Масштаб-500», интервью, реклама, заявки, редакция и загрузка отчётности ФНС."""
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
    if action in ('', 'ping'):
        return resp({'ok': True})
    conn = db()
    try:
        if action == 'ingest':
            key = hdr(event, 'x-ingest-key')
            cron = hdr(event, 'x-cron-secret')
            ok = (key and hashlib.sha256(key.encode()).hexdigest() == INGEST_HASH) or \
                 (cron and os.environ.get('CRON_SECRET') and cron == os.environ['CRON_SECRET'])
            if not ok:
                return resp({'error': 'Unauthorized'}, 401)
            if b.get('mode') == 'candidates':
                return resp(ingest.candidates(conn, S, b))
            if b.get('mode') == 'rerank':
                return resp(ingest.rerank(conn, S))
            if b.get('mode') == 'save':
                return resp(ingest.save(conn, S, b))
            left = context.get_remaining_time_in_millis() / 1000 if hasattr(context, 'get_remaining_time_in_millis') else 25
            return resp(ingest.run(conn, S, b, time.time() + max(3, left - 3)))
        if action == 'market':
            tass, t1 = market.get(conn, S, 'tass')
            cbr, t2 = market.get(conn, S, 'cbr')
            return resp({'news': (tass or {}).get('items', []), 'news_at': t1, 'cbr': cbr or {}, 'cbr_at': t2}, cache=300)
        if action == 'filters':
            return action_filters(conn)
        if action == 'rating':
            return action_rating(conn, p)
        if action == 'lead' and method == 'POST':
            return action_lead(conn, b)
        if action == 'click' and method == 'POST':
            return action_click(conn, b)
        admin = is_admin(conn, event)
        if action == 'posts':
            return action_posts(conn, p, admin)
        if action == 'post':
            return action_post(conn, p, admin)
        if action == 'ads':
            return action_ads(conn, p, admin)
        if not admin:
            return resp({'error': 'Войдите в админку'}, 401)
        if method != 'POST' and action != 'leads':
            return resp({'error': 'Нужен POST'}, 405)
        handlers = {'save_post': action_save_post, 'delete_post': action_delete_post, 'save_ad': action_save_ad, 'delete_ad': action_delete_ad}
        if action in handlers:
            return handlers[action](conn, b)
        if action == 'leads':
            return action_leads(conn)
        return resp({'error': 'Неизвестное действие'}, 400)
    finally:
        conn.close()
