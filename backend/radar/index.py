"""
Радар заказчиков: открытый каталог получателей господдержки с фильтрами,
статистикой и карточками компаний. Контакты скрыты — выдаются по подписке.
Заявки на доступ сохраняются и уходят менеджеру.
"""
import hashlib
import hmac
import json
import os
import re
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import date

import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
SORTS = {
    'fresh': 'last_date DESC NULLS LAST, total_amount DESC',
    'amount': 'total_amount DESC',
    'score': 'score DESC, total_amount DESC',
    'staff': 'employees DESC NULLS LAST',
}
PER_PAGE = 30
PUBLIC_COLS = ('inn, name, region, industry, activity, segment, subsegment, size, employees, msp_year, source, '
               'source_full, last_date, last_amount, total_amount, payments, support_years, offer, score, '
               "(phones <> '' OR emails <> '') AS has_contacts, (website <> '') AS has_site, (head <> '') AS has_head, "
               "egrul_status, registered_at")


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(data, status=200, cache=0):
    h = {**CORS, 'Content-Type': 'application/json'}
    if cache:
        h['Cache-Control'] = f'public, max-age={cache}'
    return {'statusCode': status, 'headers': h, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return resp({'error': msg}, status)


def is_admin(event):
    h = event.get('headers') or {}
    token = h.get('X-Session-Token') or h.get('x-session-token') or ''
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def build_where(p):
    where, args = [], []
    q = (p.get('q') or '').strip()[:100]
    if q:
        if q.isdigit():
            where.append('inn LIKE %s')
            args.append(q + '%')
        else:
            where.append('(name ILIKE %s OR activity ILIKE %s)')
            args += [f'%{q}%', f'%{q}%']
    if p.get('has_contacts') == '1':
        where.append("(phones <> '' OR emails <> '')")
    if p.get('hide_closed', '1') == '1':
        where.append("egrul_status NOT IN ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT')")
    for key, col in (('region', 'region'), ('industry', 'industry'), ('source', 'source'), ('size', 'size'),
                     ('segment', 'segment')):
        v = (p.get(key) or '').strip()
        if v:
            where.append(f'{col} = %s')
            args.append(v)
    if p.get('min_amount'):
        where.append('total_amount >= %s')
        args.append(int(float(p['min_amount']) * 1_000_000))
    if p.get('year'):
        where.append('EXTRACT(YEAR FROM last_date) = %s')
        args.append(int(p['year']))
    if p.get('min_staff'):
        where.append('employees >= %s')
        args.append(int(p['min_staff']))
    return (' WHERE ' + ' AND '.join(where)) if where else '', args


def action_list(p):
    w, args = build_where(p)
    page = max(1, min(int(p.get('page') or 1), 200))
    order = SORTS.get(p.get('sort') or 'fresh', SORTS['fresh'])
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f'SELECT COUNT(*) AS n, COALESCE(SUM(total_amount),0) AS s FROM {S}.radar_companies{w}', args)
    agg = cur.fetchone()
    cur.execute(f'SELECT {PUBLIC_COLS} FROM {S}.radar_companies{w} ORDER BY {order} LIMIT %s OFFSET %s',
                args + [PER_PAGE, (page - 1) * PER_PAGE])
    items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': items, 'total': agg['n'], 'sum': agg['s'], 'page': page, 'per_page': PER_PAGE}, cache=300)


def action_facets():
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    out = {}
    for col in ('region', 'industry', 'source', 'size', 'segment'):
        cur.execute(f"""SELECT {col} AS v, COUNT(*) AS n, SUM(total_amount) AS s FROM {S}.radar_companies
                        WHERE {col} <> '' GROUP BY 1 ORDER BY 2 DESC""")
        out[col] = [dict(r) for r in cur.fetchall()]
    cur.execute(f"""SELECT COUNT(*) AS companies, SUM(total_amount) AS total, COUNT(DISTINCT region) AS regions,
                    MAX(last_date) AS updated, COUNT(*) FILTER (WHERE phones <> '' OR emails <> '') AS with_contacts,
                    COUNT(*) FILTER (WHERE head <> '') AS with_head
                    FROM {S}.radar_companies""")
    out['totals'] = dict(cur.fetchone())
    cur.execute(f"""SELECT COUNT(*) AS n FROM {S}.radar_companies
                    WHERE last_date >= (SELECT MAX(last_date) FROM {S}.radar_companies) - INTERVAL '30 days'""")
    out['totals']['last_30_days'] = cur.fetchone()['n']
    cur.execute(f"""SELECT to_char(date_trunc('month', last_date), 'YYYY-MM') AS m, COUNT(*) AS n
                    FROM {S}.radar_companies WHERE last_date >= DATE '2025-01-01' GROUP BY 1 ORDER BY 1""")
    out['months'] = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp(out, cache=3600)


def action_company(p, admin):
    inn = re.sub(r'\D', '', p.get('inn') or '')[:12]
    if not inn:
        return err('Не указан ИНН')
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT {PUBLIC_COLS}, ogrn, head, head_post, phones, emails, website, website_confidence, address, okved,
                    contacts_source FROM {S}.radar_companies WHERE inn = %s""", (inn,))
    r = cur.fetchone()
    if not r:
        conn.close()
        return err('Компания не найдена', 404)
    c = dict(r)
    if not admin:
        c['head'] = mask(c['head'])
        c['phones'] = mask_phone(c['phones'])
        c['emails'] = mask_email(c['emails'])
        c['website'] = mask_site(c['website'])
        c['address'] = mask_address(c['address'])
        c['locked'] = True
    cur.execute(f"""SELECT inn, name, total_amount, last_date, employees FROM {S}.radar_companies
                    WHERE region = %s AND industry = %s AND inn <> %s ORDER BY total_amount DESC LIMIT 6""",
                (c['region'], c['industry'], inn))
    similar = [dict(x) for x in cur.fetchall()]
    cur.execute(f"""SELECT COUNT(*) AS n, PERCENT_RANK(%s) WITHIN GROUP (ORDER BY total_amount) AS pr
                    FROM {S}.radar_companies WHERE industry = %s""", (c['total_amount'], c['industry']))
    rank = cur.fetchone()
    conn.close()
    c['industry_count'] = rank['n']
    c['industry_top_pct'] = max(1, round((1 - float(rank['pr'] or 0)) * 100))
    c['signals'] = signals(c)
    return resp({'company': c, 'similar': similar}, cache=0 if admin else 600)


def mask(v):
    if not v:
        return ''
    return ' '.join(w[0] + '•' * (len(w) - 1) for w in v.split())


def mask_site(v):
    if not v:
        return ''
    parts = v.split('.')
    return '•' * min(8, max(3, len(parts[0]))) + '.' + parts[-1]


def mask_address(v):
    if not v:
        return ''
    head = ', '.join(v.split(',')[:2])
    return head + ', •••' if len(v) > len(head) else head


def mask_phone(v):
    if not v:
        return ''
    first = v.split(',')[0].strip()
    return first[:6] + ' •••-••-••' + (f' (+{len(v.split(",")) - 1})' if ',' in v else '')


def mask_email(v):
    if not v:
        return ''
    first = v.split(',')[0].strip()
    if '@' not in first:
        return '•••'
    user, dom = first.split('@', 1)
    return user[:1] + '•••@' + dom + (f' (+{len(v.split(",")) - 1})' if ',' in v else '')


def signals(c):
    out = []
    ld = c.get('last_date')
    if isinstance(ld, str):
        ld = date.fromisoformat(ld)
    if ld and (date.today() - ld).days <= 120:
        out.append({'kind': 'fresh', 'text': 'Деньги пришли недавно — бюджет на закупки, скорее всего, ещё не распределён'})
    if (c.get('last_amount') or 0) >= 10_000_000:
        out.append({'kind': 'big', 'text': 'Крупная сумма последней выплаты — вероятны закупки оборудования и подрядов'})
    if (c.get('support_years') or 0) >= 3:
        out.append({'kind': 'regular', 'text': f"Получает поддержку {c['support_years']} лет — опытный заявитель, ведёт отчётность"})
    if c.get('egrul_status') in ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT'):
        out.insert(0, {'kind': 'closed', 'text': 'По данным ЕГРЮЛ компания ликвидирована или в процессе ликвидации'})
    if (c.get('employees') or 0) >= 100:
        out.append({'kind': 'staff', 'text': 'Больше 100 сотрудников — есть отделы закупок и ИТ'})
    if 'Минпромторг' in (c.get('source') or ''):
        out.append({'kind': 'industry', 'text': 'Субсидия Минпромторга — обычно на расширение или модернизацию производства'})
    if c.get('source') == 'ФСИ':
        out.append({'kind': 'tech', 'text': 'Грант Фонда содействия инновациям — команде нужны продажи и выход на рынок'})
    return out


NOTIFY_EMAIL = 'atyurin2@yandex.ru'


def notify(subject, text):
    """Письмо менеджеру о новой заявке с ящика atyurin2@yandex.ru. Ошибка не мешает сохранению заявки."""
    password = os.environ.get('SMTP_PASSWORD', '')
    if not password:
        print('[radar] notify skipped: SMTP_PASSWORD не задан')
        return
    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('Радар заказчиков', NOTIFY_EMAIL))
    msg['To'] = NOTIFY_EMAIL
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=4) as srv:
            srv.login(NOTIFY_EMAIL, password)
            srv.sendmail(NOTIFY_EMAIL, [NOTIFY_EMAIL], msg.as_bytes())
    except Exception as e:
        print(f'[radar] notify failed: {e}')


def action_request(body):
    if (body.get('website') or '').strip():
        return resp({'ok': True})
    name = (body.get('name') or '').strip()[:200]
    phone = (body.get('phone') or '').strip()[:60]
    email = (body.get('email') or '').strip()[:200]
    if not name or not (phone or email):
        return err('Укажите имя и телефон или email')
    if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return err('Проверьте email')
    rec = {k: (body.get(k) or '').strip()[:500] for k in ('company', 'interest', 'plan', 'company_inn', 'filters')}
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""INSERT INTO {S}.radar_access_requests (name, phone, email, company, interest, plan, company_inn, filters)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (name, phone, email, rec['company'], rec['interest'], rec['plan'], rec['company_inn'], rec['filters']))
    msg = (f"Тариф: {rec['plan'] or '—'}\nЧто ищет: {rec['interest'] or '—'}\n"
           f"Компания клиента: {rec['company'] or '—'}\nОткрыл карточку ИНН: {rec['company_inn'] or '—'}\nФильтры: {rec['filters'] or '—'}")
    cur.execute(f"""INSERT INTO {S}.contact_requests (name, email, phone, company, message, source)
                    VALUES (%s,%s,%s,%s,%s,'radar')""", (name, email or '—', phone or '—', rec['company'] or None, msg))
    conn.commit()
    conn.close()
    notify(f"Радар: заявка на доступ — {name}",
           f"Имя: {name}\nТелефон: {phone or '—'}\nEmail: {email or '—'}\n{msg}")
    return resp({'ok': True})


def handler(event: dict, context) -> dict:
    """Радар заказчиков: каталог получателей господдержки, карточки компаний, заявки на доступ."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    p = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = body.get('action') or p.get('action') or 'list'
    admin = is_admin(event)

    if method == 'GET':
        if action == 'list':
            return action_list(p)
        if action == 'facets':
            return action_facets()
        if action == 'company':
            return action_company(p, admin)
        return err('Неизвестное действие')

    if action == 'request':
        return action_request(body)
    return err('Неизвестное действие')