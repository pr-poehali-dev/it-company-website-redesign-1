"""
Персональный выпуск журнала «Масштаб»: пользователь в личном кабинете собирает свой журнал из модулей
(статьи онлайн-версии, полосы вышедших номеров, рейтинг «Масштаб-500», индикаторы рынка, обложка с именем),
оплачивает разовую услугу через ЮKassa и получает PDF.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from datetime import datetime

import boto3
import psycopg2
import psycopg2.extras
import requests

import notify
import uch
from archive import ARCHIVE
from data import REGIONS, SECTIONS

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
PRICE = 990
MAX_MODULES = 20
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Token, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}


def resp(data, status=200, cache=0):
    h = {**CORS, 'Content-Type': 'application/json'}
    if cache:
        h['Cache-Control'] = f'public, max-age={cache}'
    return {'statusCode': status, 'headers': h, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=psycopg2.extras.RealDictCursor)


def hdr(event, name):
    return {k.lower(): v for k, v in (event.get('headers') or {}).items()}.get(name, '')


def user_id(event):
    parts = (hdr(event, 'x-user-token') or '').split('.')
    if len(parts) != 3 or not os.environ.get('ADMIN_TOKEN_SECRET'):
        return None
    key = hashlib.sha256(('pipes:' + os.environ['ADMIN_TOKEN_SECRET']).encode()).digest()
    raw = f'{parts[0]}.{parts[1]}'
    if not hmac.compare_digest(parts[2], hmac.new(key, raw.encode(), hashlib.sha256).hexdigest()[:32]):
        return None
    try:
        return int(parts[0]) if int(parts[1]) > time.time() else None
    except ValueError:
        return None


def is_admin(conn, event):
    t = hdr(event, 'x-session-token')
    if not t:
        return False
    raw = t.rsplit('.', 1)[0] if '.' in t else t
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM {S}.admin_sessions WHERE token=%s AND expires_at > NOW()", (raw,))
    return cur.fetchone() is not None


# ---------- каталог модулей ----------

def catalog(conn):
    cur = conn.cursor()
    cur.execute(f"""SELECT id, rubric, title, lead, read_min, published_at FROM {S}.mag_posts
                    WHERE published AND kind <> 'partner' ORDER BY published_at DESC LIMIT 200""")
    posts = [dict(r) for r in cur.fetchall()]
    archive = [{'issue': k, 'issue_title': v['title'], 'articles': [{'id': f'{k}:{a[0]}', 'from': a[0], 'to': a[1], 'rubric': a[2], 'title': a[3],
                                                                     'pages': a[1] - a[0] + 1} for a in v['articles']]}
               for k, v in sorted(ARCHIVE.items(), reverse=True)]
    try:
        uch_items = uch.catalog(conn, S)
    except Exception as e:
        print(f'[custom] uch catalog: {e}')
        uch_items = []
    return {'price': PRICE, 'max_modules': MAX_MODULES, 'posts': posts, 'archive': archive,
            'uch': uch_items, 'uch_topics': [{'slug': k, 'name': v} for k, v in uch.TOPICS],
            'regions': [{'code': k, 'name': v} for k, v in sorted(REGIONS.items(), key=lambda x: x[1])], 'sections': list(SECTIONS)}


def clean_modules(raw):
    out, seen = [], set()
    for m in (raw if isinstance(raw, list) else [])[:MAX_MODULES]:
        if not isinstance(m, dict):
            continue
        kind = m.get('kind')
        if kind == 'post':
            try:
                key = ('post', int(m.get('id')))
            except (TypeError, ValueError):
                continue
            item = {'kind': 'post', 'id': key[1]}
        elif kind == 'archive':
            iid = str(m.get('id') or '')
            issue, _, frm = iid.partition(':')
            if issue not in ARCHIVE or not any(str(a[0]) == frm for a in ARCHIVE[issue]['articles']):
                continue
            key = ('archive', iid)
            item = {'kind': 'archive', 'id': iid}
        elif kind == 'rating':
            region = re.sub(r'\D', '', str(m.get('region') or ''))[:2]
            region = region if region in REGIONS else ''
            section = m.get('section') if m.get('section') in SECTIONS else ''
            top = max(10, min(100, int(m.get('top') or 50)))
            key = ('rating', region, section)
            item = {'kind': 'rating', 'region': region, 'section': section, 'top': top}
        elif kind == 'uch':
            slug = str(m.get('id') or '')[:200]
            if not re.fullmatch(r'[a-z0-9%_-]+', slug):
                continue
            key = ('uch', slug)
            item = {'kind': 'uch', 'id': slug}
        elif kind == 'indicators':
            key = ('indicators',)
            item = {'kind': 'indicators'}
        elif kind == 'market':
            region = re.sub(r'\D', '', str(m.get('region') or ''))[:2]
            region = region if region in REGIONS else ''
            section = m.get('section') if m.get('section') in SECTIONS else ''
            if not region and not section:
                continue
            key = ('market', region, section)
            item = {'kind': 'market', 'region': region, 'section': section}
        elif kind in ('quotes', 'notes'):
            key = (kind,)
            item = {'kind': kind}
        else:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def issue_row(r):
    d = dict(r)
    d['modules'] = d.get('modules') or []
    return d


def list_issues(conn, uid):
    cur = conn.cursor()
    cur.execute(f"""SELECT id, title, cover_name, cover_company, modules, price, status, pdf_url, pages, error, created_at, updated_at, paid_at, built_at
                    FROM {S}.mag_custom_issues WHERE user_id=%s AND status <> 'deleted' ORDER BY id DESC LIMIT 50""", (uid,))
    return [issue_row(r) for r in cur.fetchall()]


def get_issue(conn, uid, iid):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.mag_custom_issues WHERE id=%s AND user_id=%s AND status <> 'deleted'", (iid, uid))
    r = cur.fetchone()
    return issue_row(r) if r else None


def save(conn, uid, b):
    title = (b.get('title') or '').strip()[:200] or 'Мой «Масштаб»'
    name = (b.get('cover_name') or '').strip()[:200] or None
    company = (b.get('cover_company') or '').strip()[:200] or None
    mods = clean_modules(b.get('modules'))
    cur = conn.cursor()
    iid = b.get('id')
    if iid:
        it = get_issue(conn, uid, int(iid))
        if not it:
            return {'error': 'Выпуск не найден'}, 404
        if it['status'] not in ('draft', 'pending'):
            return {'error': 'Оплаченный выпуск изменить нельзя — соберите новый'}, 400
        cur.execute(f"""UPDATE {S}.mag_custom_issues SET title=%s, cover_name=%s, cover_company=%s, modules=%s, status='draft', order_id=NULL, updated_at=NOW()
                        WHERE id=%s RETURNING id""", (title, name, company, json.dumps(mods, ensure_ascii=False), it['id']))
    else:
        cur.execute(f"SELECT COUNT(*) n FROM {S}.mag_custom_issues WHERE user_id=%s AND status='draft'", (uid,))
        if cur.fetchone()['n'] >= 20:
            return {'error': 'Слишком много черновиков — удалите ненужные'}, 400
        cur.execute(f"""INSERT INTO {S}.mag_custom_issues (user_id, title, cover_name, cover_company, modules, price)
                        VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""", (uid, title, name, company, json.dumps(mods, ensure_ascii=False), PRICE))
    new_id = cur.fetchone()['id']
    conn.commit()
    return {'ok': True, 'issue': get_issue(conn, uid, new_id)}, 200


# ---------- оплата ----------

def yk_auth():
    shop, key = os.environ.get('YOOKASSA_SHOP_ID'), os.environ.get('YOOKASSA_SECRET_KEY')
    if not shop or not key:
        return None
    return 'Basic ' + base64.b64encode(f'{shop}:{key}'.encode()).decode()


def pay(conn, uid, b):
    it = get_issue(conn, uid, int(b.get('id') or 0))
    if not it:
        return {'error': 'Выпуск не найден'}, 404
    if it['status'] in ('paid', 'building', 'ready', 'failed'):
        return {'error': 'Выпуск уже оплачен'}, 400
    if not it['modules']:
        return {'error': 'Добавьте в выпуск хотя бы один модуль'}, 400
    auth = yk_auth()
    if not auth:
        return {'error': 'Онлайн-оплата ещё не подключена. Напишите нам — пришлём счёт.'}, 503
    ret = (b.get('return_url') or '').strip()
    if not ret.startswith('https://'):
        return {'error': 'Неверный адрес возврата'}, 400
    cur = conn.cursor()
    cur.execute(f"SELECT email, name FROM {S}.pipe_users WHERE id=%s", (uid,))
    u = cur.fetchone()
    if not u:
        return {'error': 'Войдите заново'}, 401
    number = f"MSH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    desc = f'Персональный выпуск журнала «Масштаб» №{it["id"]}'
    cur.execute(f"""INSERT INTO {S}.orders (order_number, user_name, user_email, amount, status) VALUES (%s,%s,%s,%s,'pending') RETURNING id""",
                (number, u.get('name') or '', u['email'], it['price']))
    oid = cur.fetchone()['id']
    cur.execute(f"INSERT INTO {S}.order_items (order_id, product_id, product_name, product_price, quantity) VALUES (%s,%s,%s,%s,1)",
                (oid, f'masshtab-custom-{it["id"]}', desc, it['price']))
    sep = '&' if '?' in ret else '?'
    payload = {'amount': {'value': f'{it["price"]:.2f}', 'currency': 'RUB'}, 'capture': True,
               'confirmation': {'type': 'redirect', 'return_url': f'{ret}{sep}paid={it["id"]}'},
               'description': f'{desc} ({number})', 'metadata': {'order_id': str(oid), 'order_number': number, 'custom_issue': str(it['id'])},
               'receipt': {'customer': {'email': u['email']}, 'items': [{'description': desc[:128], 'quantity': '1.000',
                                                                          'amount': {'value': f'{it["price"]:.2f}', 'currency': 'RUB'},
                                                                          'vat_code': 1, 'payment_subject': 'service', 'payment_mode': 'full_payment'}]}}
    r = requests.post('https://api.yookassa.ru/v3/payments', json=payload, timeout=20,
                      headers={'Authorization': auth, 'Idempotence-Key': str(uuid.uuid4())})
    if r.status_code >= 300:
        conn.rollback()
        print(f'[custom] yookassa {r.status_code}: {r.text[:500]}')
        return {'error': 'Платёжная система не ответила — попробуйте через минуту'}, 502
    p = r.json()
    url = (p.get('confirmation') or {}).get('confirmation_url', '')
    cur.execute(f"UPDATE {S}.orders SET yookassa_payment_id=%s, payment_url=%s, updated_at=NOW() WHERE id=%s", (p.get('id'), url, oid))
    cur.execute(f"UPDATE {S}.mag_custom_issues SET status='pending', order_id=%s, updated_at=NOW() WHERE id=%s", (oid, it['id']))
    conn.commit()
    return {'ok': True, 'payment_url': url}, 200


def check_paid(conn, it):
    if it['status'] in ('paid', 'building', 'ready', 'failed'):
        return True
    if it['status'] != 'pending' or not it.get('order_id'):
        return False
    cur = conn.cursor()
    cur.execute(f"SELECT status, yookassa_payment_id FROM {S}.orders WHERE id=%s", (it['order_id'],))
    o = cur.fetchone()
    if not o:
        return False
    paid = o['status'] == 'paid'
    if not paid and o['yookassa_payment_id'] and yk_auth():
        try:
            p = requests.get(f'https://api.yookassa.ru/v3/payments/{o["yookassa_payment_id"]}', headers={'Authorization': yk_auth()}, timeout=10).json()
            paid = p.get('status') == 'succeeded' and p.get('paid') is True
            if paid:
                cur.execute(f"UPDATE {S}.orders SET status='paid', paid_at=NOW(), updated_at=NOW() WHERE id=%s AND status <> 'paid'", (it['order_id'],))
            elif p.get('status') == 'canceled':
                cur.execute(f"UPDATE {S}.mag_custom_issues SET status='draft', order_id=NULL, updated_at=NOW() WHERE id=%s", (it['id'],))
                conn.commit()
        except Exception as e:
            print(f'[custom] check payment: {e}')
    if paid:
        cur.execute(f"UPDATE {S}.mag_custom_issues SET status='paid', paid_at=NOW(), updated_at=NOW() WHERE id=%s AND status='pending'", (it['id'],))
        conn.commit()
        cur.execute(f"SELECT email FROM {S}.pipe_users WHERE id=%s", (it['user_id'],))
        u = cur.fetchone()
        notify.send(f'«Масштаб»: оплачен персональный выпуск №{it["id"]} — {it["price"]} ₽',
                    f'<p>Клиент: {notify.esc(u and u["email"])}</p><p>Выпуск: {notify.esc(it["title"])}</p><p>Модулей: {len(it["modules"])}</p>')
    return paid


# ---------- сборка ----------

def module_data(conn, mods):
    cur = conn.cursor()
    ids = [m['id'] for m in mods if m['kind'] == 'post']
    posts = {}
    if ids:
        cur.execute(f"""SELECT id, slug, rubric, title, lead, author, read_min, data_date, cover_url, content, takeaways, sources, question
                        FROM {S}.mag_posts WHERE id = ANY(%s) AND published""", (ids,))
        posts = {r['id']: dict(r) for r in cur.fetchall()}
    uch_slugs = [m['id'] for m in mods if m['kind'] == 'uch']
    uch_full = uch.fetch_many(uch_slugs) if uch_slugs else {}
    out, need_archive = [], set()
    sec_by_code = {c: s2 for s2, codes in SECTIONS.items() for c in codes}
    for m in mods:
        if m['kind'] == 'post' and m['id'] in posts:
            p = posts[m['id']]
            out.append({'kind': 'post', 'rub': p['rubric'] or 'Материал', 'title': p['title'], 'data': p})
        elif m['kind'] == 'uch' and m['id'] in uch_full:
            p = uch_full[m['id']]
            out.append({'kind': 'uch', 'rub': 'Обучение · учисьпро.рф', 'title': p['title'], 'data': p})
        elif m['kind'] == 'archive':
            issue, _, frm = m['id'].partition(':')
            a = next(x for x in ARCHIVE[issue]['articles'] if str(x[0]) == frm)
            need_archive.add(issue)
            out.append({'kind': 'archive', 'rub': f'{a[2]} · из номера', 'title': a[3], 'data': {'issue': issue, 'from': a[0], 'to': a[1]}})
        elif m['kind'] == 'rating':
            w, a = ['m.ok'], []
            if m['region']:
                w.append('c.region = %s')
                a.append(m['region'])
            if m['section']:
                w.append('c.okved2 = ANY(%s)')
                a.append(SECTIONS[m['section']])
            base = f"""SELECT c.name, c.region, c.okved2, m.rev2025, m.growth, ROW_NUMBER() OVER (ORDER BY m.growth DESC, m.rev2025 DESC) rk
                       FROM {S}.m500_companies m JOIN {S}.biz_companies c ON c.inn = m.inn WHERE {' AND '.join(w)}"""
            cur.execute(f"SELECT * FROM ({base}) t WHERE t.rk <= 500 ORDER BY t.rk LIMIT %s", a + [m['top']])
            items = [{'rank': r['rk'], 'name': r['name'], 'region_name': REGIONS.get(r['region'], ''), 'section': sec_by_code.get(r['okved2'], ''),
                      'rev2025': r['rev2025'], 'x': f"{float(r['growth']) / 100 + 1:.1f}".replace('.', ',')} for r in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) n, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.growth) med FROM ({base}) t WHERE t.rk <= 500", a)
            stt = cur.fetchone()
            reg = REGIONS.get(m['region'], '')
            label = ' · '.join(x for x in (reg, m['section']) if x)
            out.append({'kind': 'rating', 'rub': 'Рейтинг', 'title': f'«Масштаб-500»{": " + label if label else ""} — топ-{len(items)}',
                        'data': {'items': items, 'total': stt['n'] or 0, 'median_x': f"{float(stt['med'] or 0) / 100 + 1:.1f}".replace('.', ','),
                                 'region_name': reg, 'section': m['section']}})
        elif m['kind'] == 'market':
            w, a = ['revenue > 0'], []
            if m['region']:
                w.append('region = %s')
                a.append(m['region'])
            if m['section']:
                w.append('okved2 = ANY(%s)')
                a.append(SECTIONS[m['section']])
            cur.execute(f"""SELECT msp_cat, COUNT(*) n, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) med_rev,
                               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (revenue - expenses)::float / revenue) med_margin,
                               COUNT(*) FILTER (WHERE expenses > revenue) loss, SUM(revenue) rev, SUM(staff) staff,
                               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue::float / NULLIF(staff, 0)) med_out
                               FROM {S}.biz_companies WHERE {' AND '.join(w)} AND msp_cat IN (1, 2, 3) GROUP BY msp_cat ORDER BY msp_cat""", a)
            rows = [dict(r) for r in cur.fetchall()]
            cur.execute(f"""SELECT COALESCE(tax_mode, '') mode, COUNT(*) n FROM {S}.biz_companies WHERE {' AND '.join(w)} AND msp_cat IN (1, 2, 3)
                            GROUP BY 1 ORDER BY 2 DESC""", a)
            modes = [dict(r) for r in cur.fetchall()]
            reg = REGIONS.get(m['region'], '')
            label = ' · '.join(x for x in (reg or 'Россия', m['section'] or 'все отрасли') if x)
            out.append({'kind': 'market', 'rub': 'Портрет рынка', 'title': f'Портрет рынка: {label}',
                        'data': {'label': label, 'rows': rows, 'modes': modes}})
        elif m['kind'] == 'quotes':
            cur.execute(f"SELECT text, author, author_role, source FROM {S}.mag_quotes WHERE active ORDER BY random() LIMIT 8")
            out.append({'kind': 'quotes', 'rub': 'Мысли для руководителя', 'title': 'Восемь цитат об управлении, деньгах и людях',
                        'data': {'items': [dict(r) for r in cur.fetchall()]}})
        elif m['kind'] == 'notes':
            out.append({'kind': 'notes', 'rub': 'Рабочие страницы', 'title': 'План на месяц, ключевые цифры и заметки', 'data': {}})
        elif m['kind'] == 'indicators':
            cur.execute(f"SELECT key, data FROM {S}.mag_cache WHERE key IN ('cbr', 'tass')")
            c = {r['key']: r['data'] for r in cur.fetchall()}
            out.append({'kind': 'indicators', 'rub': 'Индикаторы рынка', 'title': 'Ставка, курсы и главные новости экономики на дату выпуска',
                        'data': {'cbr': c.get('cbr') or {}, 'news': (c.get('tass') or {}).get('items', [])}})
    return out, need_archive


def s3():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])


def build(conn, it, force=False):
    import render
    cur = conn.cursor()
    if not force:
        cur.execute(f"""UPDATE {S}.mag_custom_issues SET status='building', updated_at=NOW()
                        WHERE id=%s AND (status IN ('paid', 'failed') OR (status='building' AND updated_at < NOW() - INTERVAL '3 minutes')) RETURNING id""", (it['id'],))
        if not cur.fetchone():
            conn.commit()
            return
        conn.commit()
    try:
        mods, need = module_data(conn, it['modules'])
        if not mods:
            raise ValueError('В выпуске не осталось доступных материалов')
        pdfs = {}
        for k in need:
            r = requests.get(ARCHIVE[k]['pdf'], timeout=20, headers=render.UA)
            r.raise_for_status()
            pdfs[k] = r.content
        data, pages = render.build({'title': it['title'], 'cover_name': it.get('cover_name'), 'cover_company': it.get('cover_company')}, mods, pdfs)
        key = f'masshtab/custom/{it["id"]}-{secrets.token_hex(10)}.pdf'
        s3().put_object(Bucket='files', Key=key, Body=data, ContentType='application/pdf',
                        ContentDisposition=f'attachment; filename="masshtab-personal-{it["id"]}.pdf"')
        url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        cur.execute(f"""UPDATE {S}.mag_custom_issues SET status='ready', pdf_url=%s, pages=%s, error=NULL, built_at=NOW(), updated_at=NOW()
                        WHERE id=%s""", (url, pages, it['id']))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[custom] build {it["id"]}: {e!r}')
        cur.execute(f"UPDATE {S}.mag_custom_issues SET status='failed', error=%s, updated_at=NOW() WHERE id=%s", (str(e)[:500], it['id']))
        conn.commit()


def preview(conn, b):
    import render
    mods = clean_modules(b.get('modules'))
    data, need = module_data(conn, mods)
    pdfs = {}
    for k in need:
        r = requests.get(ARCHIVE[k]['pdf'], timeout=20, headers=render.UA)
        r.raise_for_status()
        pdfs[k] = r.content
    pdf, pages = render.build({'title': (b.get('title') or 'Мой «Масштаб»')[:200], 'cover_name': b.get('cover_name'),
                               'cover_company': b.get('cover_company')}, data, pdfs)
    key = f'masshtab/custom/preview-{secrets.token_hex(10)}.pdf'
    s3().put_object(Bucket='files', Key=key, Body=pdf, ContentType='application/pdf')
    return {'ok': True, 'pdf_url': f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}", 'pages': pages}


# ---------- обработчик ----------

def handler(event: dict, context) -> dict:
    """Персональный выпуск «Масштаба»: каталог модулей, черновики в кабинете, оплата 990 ₽ через ЮKassa и сборка PDF."""
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
        return resp({'ok': True, 'price': PRICE})
    conn = db()
    try:
        if action == 'catalog':
            return resp(catalog(conn), cache=300)
        if action == 'admin_preview' and method == 'POST':
            if not is_admin(conn, event):
                return resp({'error': 'Только для администратора'}, 401)
            return resp(preview(conn, b))
        uid = user_id(event)
        if not uid:
            return resp({'error': 'Войдите в личный кабинет'}, 401)
        if action == 'list':
            items = list_issues(conn, uid)
            for it in items:
                if it['status'] == 'pending':
                    full = get_issue(conn, uid, it['id'])
                    if check_paid(conn, full):
                        it['status'] = 'paid'
            return resp({'issues': items, 'price': PRICE})
        if method != 'POST':
            return resp({'error': 'Нужен POST'}, 405)
        if action == 'save':
            data, code = save(conn, uid, b)
            return resp(data, code)
        if action == 'delete':
            cur = conn.cursor()
            cur.execute(f"UPDATE {S}.mag_custom_issues SET status='deleted', updated_at=NOW() WHERE id=%s AND user_id=%s AND status IN ('draft','pending')",
                        (int(b.get('id') or 0), uid))
            conn.commit()
            return resp({'ok': True})
        if action == 'pay':
            data, code = pay(conn, uid, b)
            return resp(data, code)
        if action == 'build':
            it = get_issue(conn, uid, int(b.get('id') or 0))
            if not it:
                return resp({'error': 'Выпуск не найден'}, 404)
            if it['status'] == 'ready':
                return resp({'ok': True, 'issue': it})
            if not check_paid(conn, it):
                return resp({'error': 'Оплата ещё не поступила. Если вы уже оплатили — подождите минуту и обновите страницу.', 'status': it['status']}, 402)
            build(conn, get_issue(conn, uid, it['id']))
            return resp({'ok': True, 'issue': get_issue(conn, uid, it['id'])})
        return resp({'error': 'Неизвестное действие'}, 400)
    finally:
        conn.close()
