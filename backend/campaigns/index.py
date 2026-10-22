"""
Кампании CRM: загрузка компаний 1-й волны, шаблоны писем с автоподстановкой
(название, регион, год гранта и др.), предпросмотр и отправка писем и напоминаний.
"""
import base64
import gzip
import hashlib
import hmac
import html
import json
import os
import re
import time
import urllib.request
from datetime import datetime, timezone, timedelta

import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
UNISENDER_URLS = [
    'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json',
    'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
]
EMAIL_RE = re.compile(r'^[\w.+\-]+@[\w\-]+(\.[\w\-]+)*\.[a-zA-Zа-яА-Я]{2,}$')
FOLLOWUP_DAYS = 5
CAMPAIGN = 'wave1'


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(data, status=200):
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return resp({'error': msg}, status)


def auth_check(event):
    h = event.get('headers') or {}
    token = h.get('X-Session-Token') or h.get('x-session-token') or ''
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    expected = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected)


def plural_years(n):
    n = int(n)
    if n % 10 == 1 and n % 100 != 11:
        return 'год'
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return 'года'
    return 'лет'


def get_settings(cur):
    cur.execute(f"SELECT key, value FROM {S}.campaign_settings")
    return {r['key']: r['value'] for r in cur.fetchall()}


def variables(p, tpl):
    """Значения для подстановки в шаблон."""
    company = (p.get('company_name') or '').strip()
    region = (p.get('region') or '').strip()
    year = p.get('grant_year')
    years = p.get('support_years') or 0
    payments = p.get('support_payments') or 0
    place = p.get('rating_place')
    return {
        'company': company,
        'region': region,
        'grant_year': str(year) if year else '',
        'article_url': (tpl.get('article_url') or '').strip(),
        'grant_phrase': f'Ваша компания {company} получила грант фонда в {year} году' if year else f'Ваша компания {company} — среди получателей грантов фонда',
        'multi_year_phrase': f', причём получала её {years} {plural_years(years)} из последних шести' if years >= 3 else '',
        'regular_phrase': ' регулярно' if years >= 3 or payments >= 3 else '',
        'rating_phrase': f', а в рейтинге 2024–2026 годов — на {place} месте' if place else '',
    }


def render(text, vals):
    def sub(m):
        return vals.get(m.group(1), m.group(0))
    out = re.sub(r'\{(\w+)\}', sub, text or '')
    out = out.replace(' ()', '')
    out = re.sub(r'[ \t]+([,.])', r'\1', out)
    return out


def unresolved(text):
    return sorted(set(re.findall(r'\{(\w+)\}', text or '')))


def to_html(text, settings):
    paras = [p.strip() for p in (text or '').split('\n\n') if p.strip()]
    body = ''
    for p in paras:
        safe = html.escape(p).replace('\n', '<br>')
        safe = re.sub(r'(https?://[^\s<]+?)([.,;:!?)]*)(?=\s|<|$)', r'<a href="\1" style="color:#6d28d9;">\1</a>\2', safe)
        body += f'<p style="margin:0 0 14px;">{safe}</p>'
    name = html.escape(settings.get('sender_name', ''))
    phone = html.escape(settings.get('sender_phone', ''))
    sign = f'<p style="margin:20px 0 0;">{name}<br>МАТ-Лабс, <a href="https://mat-labs.ru" style="color:#6d28d9;">mat-labs.ru</a>' + (f'<br>{phone}' if phone else '') + '</p>'
    unsub = '<p style="margin:24px 0 0;font-size:12px;color:#888;">Если тема неактуальна — ответьте «нет», и я больше не напишу.</p>'
    return f'<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="margin:0;padding:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;"><div style="max-width:620px;">{body}{sign}{unsub}</div></body></html>'


def send_email(to_email, to_name, subject, body_html, reply_to=''):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    if not api_key:
        raise ValueError('Не задан ключ отправки писем UNISENDER_API_KEY')
    msg = {
        'recipients': [{'email': to_email, 'substitutions': {'to_name': to_name or to_email}}],
        'sender_email': os.environ.get('UNISENDER_SENDER_EMAIL', 'info@mat-labs.ru'),
        'sender_name': os.environ.get('UNISENDER_SENDER_NAME', 'МАТ-Лабс'),
        'subject': subject,
        'body': {'html': body_html},
        'track_links': 0,
        'track_read': 0,
    }
    if reply_to:
        msg['reply_to'] = reply_to
    data = json.dumps({'message': msg}).encode()
    last = None
    for url in UNISENDER_URLS:
        try:
            req = urllib.request.Request(url, data=data, method='POST',
                                         headers={'Content-Type': 'application/json', 'X-API-KEY': api_key})
            with urllib.request.urlopen(req, timeout=15) as r:
                res = json.loads(r.read().decode())
            if res.get('status') == 'success':
                return res
            last = Exception(str(res)[:200])
        except Exception as e:
            last = e
    raise last


# ── Действия ──────────────────────────────────────────────────────────────────

def action_import(body):
    """Загружает компании 1-й волны частями: offset/limit."""
    offset = int(body.get('offset') or 0)
    limit = min(int(body.get('limit') or 300), 400)
    from wave1_data import DATA
    rows = json.loads(gzip.decompress(base64.b64decode(DATA)).decode('utf-8'))
    chunk = rows[offset:offset + limit]
    if not chunk:
        return resp({'ok': True, 'done': True, 'total': len(rows), 'inserted': 0, 'updated': 0, 'next_offset': offset})

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    inns = [r['inn'] for r in chunk]
    cur.execute(f"SELECT id, inn FROM {S}.prospects WHERE inn = ANY(%s)", (inns,))
    existing = {}
    for r in cur.fetchall():
        existing.setdefault(r['inn'], []).append(r['id'])

    camp_cols = ('campaign_template', 'subsegment', 'grant_year', 'grant_source',
                 'support_years', 'support_payments', 'rating_place', 'campaign_priority')
    to_insert, upd_rows = [], []
    for r in chunk:
        if r['inn'] in existing:
            for pid in existing[r['inn']]:
                upd_rows.append((pid, r['campaign_template'] or None, r['subsegment'], r['grant_year'], r['grant_source'],
                                 r['support_years'], r['support_payments'], r['rating_place'], r['campaign_priority'],
                                 r['region'], r['email'], r['phone'], r['website'], r['note']))
        else:
            to_insert.append(r)
    updated = len({u[0] for u in upd_rows})
    if upd_rows:
        psycopg2.extras.execute_values(cur, f"""
            UPDATE {S}.prospects p SET campaign = 'wave1', campaign_template = v.tpl, subsegment = v.sub,
                grant_year = v.gy::int, grant_source = v.gs, support_years = v.sy::int, support_payments = v.sp::int,
                rating_place = v.rp::int, campaign_priority = v.cp::int,
                region = COALESCE(NULLIF(p.region,''), v.reg), email = COALESCE(NULLIF(p.email,''), v.em),
                phone = COALESCE(NULLIF(p.phone,''), v.ph), website = COALESCE(NULLIF(p.website,''), v.web),
                note = CASE WHEN COALESCE(p.note,'') LIKE '%%Волна 1,%%' THEN p.note ELSE TRIM(COALESCE(p.note,'') || ' ' || v.note) END,
                updated_at = NOW()
            FROM (VALUES %s) AS v(id, tpl, sub, gy, gs, sy, sp, rp, cp, reg, em, ph, web, note)
            WHERE p.id = v.id""", upd_rows, page_size=500)
    if to_insert:
        psycopg2.extras.execute_values(cur, f"""
            INSERT INTO {S}.prospects (company_name, inn, industry, description, website, email, phone, region,
                source, source_url, employee_count, status, priority, note, campaign, {', '.join(camp_cols)},
                created_at, updated_at)
            VALUES %s""", [
            (r['company_name'], r['inn'], r['industry'], r['description'], r['website'], r['email'], r['phone'],
             r['region'], 'Реестр ФНС: гранты и субсидии', r['source_url'], r['employee_count'], 'new', r['priority'],
             r['note'], CAMPAIGN, r['campaign_template'] or None, r['subsegment'], r['grant_year'], r['grant_source'],
             r['support_years'], r['support_payments'], r['rating_place'], r['campaign_priority'],
             datetime.now(timezone.utc), datetime.now(timezone.utc)) for r in to_insert], page_size=500)
    conn.commit()
    conn.close()
    nxt = offset + len(chunk)
    return resp({'ok': True, 'done': nxt >= len(rows), 'total': len(rows), 'inserted': len(to_insert),
                 'updated': updated, 'next_offset': nxt})


def action_stats(cur):
    cur.execute(f"""
        SELECT COALESCE(campaign_template, '') AS tpl,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE COALESCE(email,'') <> '') AS with_email,
               COUNT(*) FILTER (WHERE campaign_step >= 1) AS sent,
               COUNT(*) FILTER (WHERE campaign_step >= 2) AS followups,
               COUNT(*) FILTER (WHERE campaign_step = 1 AND campaign_followup_at <= NOW()
                                AND status IN ('new','contacted')) AS followup_due,
               COUNT(*) FILTER (WHERE status IN ('interested','negotiation','won')) AS replied
        FROM {S}.prospects WHERE campaign = %s GROUP BY 1""", (CAMPAIGN,))
    by = {r['tpl']: dict(r) for r in cur.fetchall()}
    cur.execute(f"""SELECT COUNT(*) AS n FROM {S}.prospect_activities a JOIN {S}.prospects p ON p.id = a.prospect_id
                    WHERE p.campaign = %s AND a.activity_type = 'email' AND a.content LIKE 'Кампания%%'
                    AND a.created_at >= date_trunc('day', NOW())""", (CAMPAIGN,))
    sent_today = cur.fetchone()['n']
    return by, sent_today


def action_overview():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT * FROM {S}.email_templates ORDER BY sort_order")
    templates = [dict(r) for r in cur.fetchall()]
    by, sent_today = action_stats(cur)
    settings = get_settings(cur)
    conn.close()
    total = sum(v['total'] for v in by.values())
    return resp({'templates': templates, 'stats': by, 'total': total, 'sent_today': sent_today,
                 'settings': settings})


def action_list(params):
    tpl = params.get('template') or ''
    flt = params.get('filter') or 'all'
    search = (params.get('search') or '').strip()
    page = max(int(params.get('page') or 1), 1)
    per = 50
    where = ["campaign = %s"]
    args = [CAMPAIGN]
    if tpl == 'none':
        where.append("campaign_template IS NULL")
    elif tpl:
        where.append("campaign_template = %s")
        args.append(tpl)
    if flt == 'with_email':
        where.append("COALESCE(email,'') <> ''")
    elif flt == 'no_email':
        where.append("COALESCE(email,'') = ''")
    elif flt == 'ready':
        where.append("COALESCE(email,'') <> '' AND COALESCE(campaign_step,0) = 0")
    elif flt == 'sent':
        where.append("campaign_step >= 1")
    elif flt == 'followup_due':
        where.append("campaign_step = 1 AND campaign_followup_at <= NOW() AND status IN ('new','contacted')")
    if search:
        where.append("(company_name ILIKE %s OR inn = %s OR region ILIKE %s)")
        args += [f'%{search}%', search, f'%{search}%']
    w = ' AND '.join(where)
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT COUNT(*) AS n FROM {S}.prospects WHERE {w}", args)
    total = cur.fetchone()['n']
    cur.execute(f"""SELECT id, company_name, inn, region, email, phone, website, source_url, status, subsegment,
                   campaign_template, grant_year, grant_source, support_years, support_payments, rating_place,
                   campaign_priority, campaign_step, campaign_sent_at, campaign_followup_at
                   FROM {S}.prospects WHERE {w}
                   ORDER BY campaign_priority DESC NULLS LAST, id LIMIT %s OFFSET %s""",
                args + [per, (page - 1) * per])
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': rows, 'total': total, 'page': page, 'per_page': per})


def build_message(cur, p, step, settings):
    code = p.get('campaign_template')
    if not code:
        raise ValueError('Для этой компании шаблон не назначен')
    cur.execute(f"SELECT * FROM {S}.email_templates WHERE code = %s", (code,))
    tpl = cur.fetchone()
    if not tpl:
        raise ValueError('Шаблон не найден')
    tpl = dict(tpl)
    vals = variables(p, tpl)
    if step == 2:
        subject = render(tpl['followup_subject'] or ('Re: ' + tpl['subject']), vals)
        text = render(tpl['followup_body'], vals)
    else:
        subject = render(tpl['subject'], vals)
        text = render(tpl['body'], vals)
    problems = unresolved(subject + text)
    if not vals['article_url'] and step == 1:
        problems.append('article_url')
    return subject, text, to_html(text, settings), sorted(set(problems))


def action_preview(body):
    pid = body.get('prospect_id')
    step = int(body.get('step') or 1)
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    settings = get_settings(cur)
    if pid:
        cur.execute(f"SELECT * FROM {S}.prospects WHERE id = %s", (pid,))
    else:
        cur.execute(f"""SELECT * FROM {S}.prospects WHERE campaign = %s AND campaign_template = %s
                        ORDER BY campaign_priority DESC NULLS LAST LIMIT 1""", (CAMPAIGN, body.get('template')))
    p = cur.fetchone()
    if not p:
        conn.close()
        return err('Компания не найдена', 404)
    try:
        subject, text, _, problems = build_message(cur, dict(p), step, settings)
    except ValueError as e:
        conn.close()
        return err(str(e))
    conn.close()
    return resp({'prospect': {'id': p['id'], 'company_name': p['company_name'], 'region': p['region'],
                              'email': p['email']}, 'subject': subject, 'text': text, 'problems': problems})


def action_save_template(body):
    code = body.get('code')
    fields = ['subject', 'body', 'followup_subject', 'followup_body', 'article_url']
    upd = {k: (body.get(k) or '').strip() for k in fields if k in body}
    if not code or not upd:
        return err('Нет данных для сохранения')
    url = upd.get('article_url', '')
    if url and not re.match(r'^https?://\S+$', url):
        return err('Ссылка на статью должна начинаться с http:// или https://')
    sets = ', '.join(f"{k} = %s" for k in upd) + ', updated_at = NOW()'
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.email_templates SET {sets} WHERE code = %s", list(upd.values()) + [code])
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_save_settings(body):
    allowed = ['sender_name', 'sender_phone', 'daily_limit', 'reply_to']
    conn = get_db()
    cur = conn.cursor()
    for k in allowed:
        if k in body:
            v = str(body[k]).strip()
            if k == 'daily_limit':
                v = str(max(1, min(int(v or 50), 300)))
            cur.execute(f"""INSERT INTO {S}.campaign_settings (key, value) VALUES (%s, %s)
                            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""", (k, v))
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_set_email(body):
    pid = body.get('prospect_id')
    email = (body.get('email') or '').strip().lower()
    if not pid or (email and not EMAIL_RE.match(email)):
        return err('Укажите корректный email')
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.prospects SET email = %s, updated_at = NOW() WHERE id = %s", (email, pid))
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_send(body):
    """Отправляет письмо (step=1) или напоминание (step=2) выбранным компаниям."""
    step = 2 if int(body.get('step') or 1) == 2 else 1
    ids = [int(i) for i in (body.get('ids') or [])][:30]
    tpl = body.get('template')
    count = min(int(body.get('count') or 0), 30)
    started = time.time()

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    settings = get_settings(cur)
    limit = int(settings.get('daily_limit') or 50)
    _, sent_today = action_stats(cur)
    left = max(limit - sent_today, 0)
    if left == 0:
        conn.close()
        return err(f'Дневной лимит {limit} писем исчерпан. Продолжите завтра или поменяйте лимит в настройках.')

    base = f"""SELECT * FROM {S}.prospects WHERE campaign = %s AND campaign_template IS NOT NULL
               AND COALESCE(email,'') <> '' AND status NOT IN ('lost','won')"""
    cond = " AND COALESCE(campaign_step,0) = 0" if step == 1 else \
        " AND campaign_step = 1 AND campaign_followup_at <= NOW() AND status IN ('new','contacted')"
    if ids:
        cur.execute(base + cond + " AND id = ANY(%s)", (CAMPAIGN, ids))
    elif tpl and count:
        cur.execute(base + cond + " AND campaign_template = %s ORDER BY campaign_priority DESC NULLS LAST LIMIT %s",
                    (CAMPAIGN, tpl, min(count, left)))
    else:
        conn.close()
        return err('Выберите компании или укажите шаблон и количество')
    targets = [dict(r) for r in cur.fetchall()][:left]

    sent, errors, skipped = 0, [], []
    for p in targets:
        if time.time() - started > 3.2:
            skipped.append({'id': p['id'], 'reason': 'не успели — отправьте ещё раз'})
            continue
        email = (p.get('email') or '').split(',')[0].strip().lower()
        if not EMAIL_RE.match(email):
            errors.append({'id': p['id'], 'company': p['company_name'], 'error': 'некорректный email'})
            continue
        try:
            subject, text, body_html, problems = build_message(cur, p, step, settings)
        except ValueError as e:
            errors.append({'id': p['id'], 'company': p['company_name'], 'error': str(e)})
            continue
        if problems:
            conn.close()
            return err('В шаблоне не заполнено: ' + ', '.join(problems) +
                       '. Укажите ссылку на статью в настройках шаблона.')
        try:
            send_email(email, p['company_name'], subject, body_html, settings.get('reply_to', ''))
        except Exception as e:
            errors.append({'id': p['id'], 'company': p['company_name'], 'error': str(e)[:160]})
            cur.execute(f"UPDATE {S}.prospects SET email_delivery_status = 'failed' WHERE id = %s", (p['id'],))
            conn.commit()
            continue
        now = datetime.now(timezone.utc)
        if step == 1:
            cur.execute(f"""UPDATE {S}.prospects SET campaign_step = 1, campaign_sent_at = %s,
                            campaign_followup_at = %s, status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
                            auto_email_sent = TRUE, auto_email_sent_at = %s, email_delivery_status = 'sent',
                            email_delivery_provider = 'unisender', updated_at = NOW() WHERE id = %s""",
                        (now, now + timedelta(days=FOLLOWUP_DAYS), now, p['id']))
        else:
            cur.execute(f"""UPDATE {S}.prospects SET campaign_step = 2, campaign_followup_at = NULL,
                            updated_at = NOW() WHERE id = %s""", (p['id'],))
        label = 'письмо' if step == 1 else 'напоминание'
        cur.execute(f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, 'email', %s)",
                    (p['id'], f'Кампания «1-я волна»: {label} на {email} — «{subject}»'))
        conn.commit()
        sent += 1
    conn.close()
    return resp({'ok': True, 'sent': sent, 'errors': errors, 'skipped': len(skipped),
                 'left_today': max(left - sent, 0)})


def handler(event: dict, context) -> dict:
    """Кампании: загрузка 1-й волны, шаблоны писем, предпросмотр и отправка."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    if not auth_check(event):
        return err('Не авторизован', 401)
    action = body.get('action') or params.get('action') or 'overview'

    if method == 'GET':
        if action == 'overview':
            return action_overview()
        if action == 'list':
            return action_list(params)
        return err('Неизвестное действие')

    routes = {
        'import': action_import,
        'preview': action_preview,
        'save_template': action_save_template,
        'save_settings': action_save_settings,
        'set_email': action_set_email,
        'send': action_send,
    }
    fn = routes.get(action)
    if not fn:
        return err('Неизвестное действие')
    return fn(body)