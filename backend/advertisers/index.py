"""
Рекламодатели журнала «Масштаб»: база потенциальных клиентов по сегментам ЦА (из реестра МСП ФНС),
поиск почты и телефонов (ЕГРЮЛ → сайт), шаблоны писем, тестовая и боевая рассылка с напоминанием.
"""
import hashlib
import hmac
import html
import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

import psycopg2
import psycopg2.extras

import enrich
from regions import REGIONS

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CAMPAIGN = 'masshtab_ads'
SOURCE = 'Масштаб: рекламодатели'
FOLLOWUP_DAYS = 5
SITE = 'https://mat-labs.ru'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
UNISENDER_URLS = [
    'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json',
    'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
]
EMAIL_OK = re.compile(r'^[\w.+\-]+@[\w\-]+(\.[\w\-]+)*\.[a-zA-Z]{2,}$')

SEGMENTS = {
    'leasing': {'name': 'Лизинг', 'okved': r'^64\.91', 'min_rev': 30_000_000, 'pitch': 'лизинга для бизнеса'},
    'finance': {'name': 'Факторинг и кредиты для бизнеса', 'okved': r'^(64\.92|64\.99|66\.1[29])', 'min_rev': 30_000_000, 'pitch': 'финансовых услуг для бизнеса'},
    'insurance': {'name': 'Страхование бизнеса', 'okved': r'^65\.', 'min_rev': 30_000_000, 'pitch': 'страхования бизнеса'},
    'accounting': {'name': 'Бухгалтерия, аудит, юристы', 'okved': r'^69\.', 'min_rev': 30_000_000, 'pitch': 'бухгалтерских и юридических услуг'},
    'it': {'name': 'IT и SaaS для бизнеса', 'okved': r'^(62\.0|63\.11|58\.29)', 'min_rev': 60_000_000, 'pitch': 'IT-решений для бизнеса'},
    'consulting': {'name': 'Консалтинг', 'okved': r'^70\.22', 'min_rev': 30_000_000, 'pitch': 'консалтинга'},
    'education': {'name': 'Бизнес-образование', 'okved': r'^(85\.41|85\.42|85\.23)', 'min_rev': 20_000_000, 'pitch': 'обучения для руководителей'},
    'hr': {'name': 'HR и рекрутинг', 'okved': r'^78\.', 'min_rev': 30_000_000, 'pitch': 'подбора персонала'},
    'realty': {'name': 'Коммерческая недвижимость', 'okved': r'^68\.20', 'min_rev': 100_000_000, 'pitch': 'коммерческой недвижимости'},
    'events': {'name': 'Деловые мероприятия', 'okved': r'^82\.30', 'min_rev': 20_000_000, 'pitch': 'деловых мероприятий'},
    'auto': {'name': 'Автодилеры и аренда авто', 'okved': r'^(45\.11|77\.1)', 'min_rev': 100_000_000, 'pitch': 'автомобилей для бизнеса'},
}

TEMPLATES = [
    {
        'code': 'ads_finance', 'title': 'Финансы: лизинг, банки, страхование', 'sort_order': 101,
        'audience': 'Лизинговые и страховые компании, факторинг, кредиты для бизнеса',
        'subject': 'Ваши клиенты — собственники МСБ. Они читают «Масштаб»',
        'body': 'Добрый день!\n\nПишу из делового журнала «Масштаб» ({site}/masshtab). Наши читатели — собственники и финансовые директора малого и среднего бизнеса: они выбирают, где взять деньги на развитие, технику и оборудование.\n\n{company} работает в сфере {pitch} — для вас это прямая аудитория. Мы каждый день публикуем разборы с цифрами ФНС и Банка России: ставка, кредиты, лизинг, субсидии. Рядом с такими материалами реклама финансовых услуг читается как совет, а не как баннер.\n\nФорматы — от бокового блока за 9 000 ₽ в месяц до партнёрского материала о вашей компании. Медиакит с ценами: {mediakit_url}\n\nПодобрать формат под вашу задачу? Ответьте на это письмо — пришлю медиаплан за один день.',
        'followup_subject': 'Re: Ваши клиенты — собственники МСБ',
        'followup_body': 'Добрый день!\n\nКоротко вернусь к своему письму. Для первых партнёров журнала у нас стартовые цены: пакет «Старт» — боковой блок и блок внутри статьи за 25 000 ₽ в месяц.\n\nЕсли тема неактуальна — просто ответьте «нет», и я больше не напишу.',
    },
    {
        'code': 'ads_services', 'title': 'B2B-услуги: IT, бухгалтерия, консалтинг, HR', 'sort_order': 102,
        'audience': 'IT и SaaS, бухгалтерия и аудит, юристы, консалтинг, рекрутинг, бизнес-образование',
        'subject': 'Партнёрский материал о {company} в деловом журнале',
        'body': 'Добрый день!\n\nЯ из делового журнала «Масштаб» ({site}/masshtab). Мы пишем для собственников и руководителей малого и среднего бизнеса: разборы, учебные кейсы для руководителей, рейтинг быстрорастущих компаний «Масштаб-500».\n\nВаши потенциальные клиенты читают у нас о том, как наладить учёт, найм, продажи и автоматизацию. Предлагаю рассказать о {company} в формате партнёрского материала: редакция берёт у вас интервью и пишет статью с цифрами и примерами. Материал выходит на сайте, в канале журнала в Дзене и в ежемесячном PDF-номере.\n\nЦены и все форматы — в медиаките: {mediakit_url}\n\nЕсли интересно, ответьте на письмо — предложу тему, которая сработает именно на вашу аудиторию.',
        'followup_subject': 'Re: Партнёрский материал о {company}',
        'followup_body': 'Добрый день!\n\nДополню своё письмо: можем начать с недорогого формата — боковой блок рядом с каждой статьёй от 9 000 ₽ в месяц, чтобы проверить отклик аудитории.\n\nЕсли сейчас не время — ответьте «позже», напишу через пару месяцев.',
    },
    {
        'code': 'ads_realty', 'title': 'Недвижимость, авто, мероприятия', 'sort_order': 103,
        'audience': 'Коммерческая недвижимость и коворкинги, автодилеры и аренда авто, деловые мероприятия',
        'subject': 'Реклама для руководителей МСБ: журнал «Масштаб»',
        'body': 'Добрый день!\n\nПишу из делового журнала «Масштаб» ({site}/masshtab). Наши читатели — собственники и директора компаний, которые сами решают, где арендовать офис, какую машину взять в лизинг и на какую выставку поехать.\n\nУ нас есть рубрики «Недвижимость», «Автомобили», «Путешествия» и «Отдых», где {pitch} — естественная тема. {company} может разместить блок внутри профильных статей или выпустить партнёрский материал.\n\nФорматы и цены: {mediakit_url}\n\nОтветьте на письмо, и я пришлю подборку материалов, рядом с которыми ваша реклама будет смотреться уместно.',
        'followup_subject': 'Re: Реклама для руководителей МСБ',
        'followup_body': 'Добрый день!\n\nНапомню о своём письме. Ближайший PDF-номер журнала собираем в конце месяца — партнёры, которые подключатся сейчас, попадут в него без доплаты.\n\nЕсли неинтересно — ответьте «нет», больше не побеспокою.',
    },
]
SEG_TEMPLATE = {'leasing': 'ads_finance', 'finance': 'ads_finance', 'insurance': 'ads_finance',
                'it': 'ads_services', 'accounting': 'ads_services', 'consulting': 'ads_services',
                'education': 'ads_services', 'hr': 'ads_services',
                'realty': 'ads_realty', 'events': 'ads_realty', 'auto': 'ads_realty'}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return resp({'error': msg}, status)


def authorized(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def pretty_name(raw):
    raw = re.sub(r'\s+', ' ', (raw or '').strip())
    raw = re.sub(r'^ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', 'ООО', raw, flags=re.I)
    raw = re.sub(r'^(ПУБЛИЧНОЕ |НЕПУБЛИЧНОЕ )?АКЦИОНЕРНОЕ ОБЩЕСТВО', lambda m: 'ПАО' if m.group(1) and 'ПУБ' in m.group(1).upper() and 'НЕ' not in m.group(1).upper() else 'АО', raw, flags=re.I)
    m = re.match(r'^([^"]*?) ?"(.+?)"?$', raw)
    if not m or not m.group(2).strip():
        return raw.replace('"', '')
    name = re.sub(r'\s+', ' ', m.group(2).replace('"', ' ')).strip()
    head = m.group(1).strip()
    return f'{head} «{name}»' if head else f'«{name}»'


def ensure_templates(cur):
    for t in TEMPLATES:
        cur.execute(f"""INSERT INTO {S}.email_templates (code, title, audience, subject, body, followup_subject, followup_body,
                        article_url, sort_order, campaign, updated_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT (code) DO NOTHING""",
                    (t['code'], t['title'], t['audience'], t['subject'], t['body'], t['followup_subject'],
                     t['followup_body'], f'{SITE}/masshtab/mediakit', t['sort_order'], CAMPAIGN))


def get_settings(cur):
    cur.execute(f"SELECT key, value FROM {S}.campaign_settings")
    return {r['key']: r['value'] for r in cur.fetchall()}


# ── Обзор ────────────────────────────────────────────────────────────────────

def action_overview():
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    ensure_templates(cur)
    conn.commit()
    cur.execute(f"""SELECT subsegment AS seg, COUNT(*) total,
        COUNT(*) FILTER (WHERE COALESCE(email,'') <> '') with_email,
        COUNT(*) FILTER (WHERE COALESCE(phone,'') <> '') with_phone,
        COUNT(*) FILTER (WHERE COALESCE(enrich_status,'') IN ('', 'new')) to_enrich,
        COUNT(*) FILTER (WHERE campaign_step >= 1) sent,
        COUNT(*) FILTER (WHERE campaign_step >= 2) followups,
        COUNT(*) FILTER (WHERE campaign_step = 1 AND campaign_followup_at <= NOW() AND status IN ('new','contacted')) followup_due,
        COUNT(*) FILTER (WHERE status IN ('interested','negotiation','won')) replied
        FROM {S}.prospects WHERE campaign = %s GROUP BY 1""", (CAMPAIGN,))
    stats = {r['seg']: dict(r) for r in cur.fetchall()}
    cur.execute(f"SELECT * FROM {S}.email_templates WHERE campaign = %s ORDER BY sort_order", (CAMPAIGN,))
    templates = [dict(r) for r in cur.fetchall()]
    cur.execute(f"""SELECT COUNT(*) n FROM {S}.prospect_activities a JOIN {S}.prospects p ON p.id = a.prospect_id
                    WHERE p.campaign = %s AND a.activity_type = 'email' AND a.created_at >= date_trunc('day', NOW())""", (CAMPAIGN,))
    sent_today = cur.fetchone()['n']
    settings = get_settings(cur)
    conn.close()
    segs = [{'code': k, 'name': v['name'], 'template': SEG_TEMPLATE[k], **(stats.get(k) or {})} for k, v in SEGMENTS.items()]
    return resp({'segments': segs, 'templates': templates, 'sent_today': sent_today, 'settings': settings,
                 'daily_limit': int(settings.get('ads_daily_limit') or 40)})


# ── Сбор базы из реестра МСП ────────────────────────────────────────────────

def action_build(body):
    """Добавляет в базу компании сегмента: действующие МСП с выручкой выше порога, крупные — первыми."""
    seg = body.get('segment')
    if seg not in SEGMENTS:
        return err('Неизвестный сегмент')
    cfg = SEGMENTS[seg]
    limit = max(10, min(int(body.get('limit') or 200), 500))
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT b.inn, b.name, b.region, b.city, b.okved, b.revenue, b.staff FROM {S}.biz_companies b
        WHERE b.okved ~ %s AND b.revenue >= %s AND COALESCE(b.staff, 0) >= 3
          AND NOT EXISTS (SELECT 1 FROM {S}.prospects p WHERE p.inn = b.inn AND p.campaign = %s)
        ORDER BY b.revenue DESC LIMIT %s""", (cfg['okved'], cfg['min_rev'], CAMPAIGN, limit))
    rows = cur.fetchall()
    now = datetime.now(timezone.utc)
    if rows:
        psycopg2.extras.execute_values(cur, f"""INSERT INTO {S}.prospects (company_name, inn, industry, region, source,
            source_url, revenue, revenue_range, employee_count, status, priority, campaign, campaign_template, subsegment,
            campaign_priority, enrich_status, note, created_at, updated_at) VALUES %s""", [
            (pretty_name(r['name']), r['inn'], cfg['name'], REGIONS.get(r['region'] or '', r['region'] or ''), SOURCE,
             f"{SITE}/analytics/company/{r['inn']}", r['revenue'], f"{round((r['revenue'] or 0) / 1e6)} млн ₽",
             str(r['staff'] or ''), 'new', 'high' if (r['revenue'] or 0) >= 1e9 else 'medium', CAMPAIGN,
             SEG_TEMPLATE[seg], seg, int((r['revenue'] or 0) // 1_000_000), 'new',
             f"ОКВЭД {r['okved']}{', ' + r['city'] if r['city'] else ''}", now, now) for r in rows], page_size=500)
    conn.commit()
    conn.close()
    return resp({'ok': True, 'added': len(rows)})


# ── Поиск контактов ──────────────────────────────────────────────────────────

def action_enrich(body, context):
    """Ищет почту, телефон, сайт и руководителя для очередной пачки компаний (параллельно)."""
    started = time.time()
    fn = getattr(context, 'get_remaining_time_in_millis', None)
    left = int(fn()) if callable(fn) else 5000
    deadline = started + max(2.0, (min(left, 28000) - 2500) / 1000)
    enrich._DEADLINE['t'] = deadline
    size = max(1, min(int(body.get('size') or 8), 24, int((deadline - started) / 2.5 * 8)))
    seg = body.get('segment') or ''
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""UPDATE {S}.prospects SET enrich_status = 'new' WHERE campaign = %s AND enrich_status = 'processing'
                    AND updated_at < NOW() - INTERVAL '3 minutes'""", (CAMPAIGN,))
    cur.execute(f"""UPDATE {S}.prospects SET enrich_status = 'processing', updated_at = NOW()
        WHERE id IN (SELECT id FROM {S}.prospects WHERE campaign = %s AND COALESCE(enrich_status,'') IN ('', 'new')
                     {'AND subsegment = %s' if seg else ''}
                     ORDER BY campaign_priority DESC NULLS LAST LIMIT %s FOR UPDATE SKIP LOCKED)
        RETURNING id, inn, company_name AS name, region, website""", [CAMPAIGN] + ([seg] if seg else []) + [size])
    rows = [dict(r) for r in cur.fetchall()]
    conn.commit()

    def one(c):
        try:
            return c, enrich.enrich_one({**c, 'egrul_status': '', 'short_name': ''}, deadline), ''
        except Exception as e:
            return c, None, str(e)[:150]

    found = {'email': 0, 'phone': 0, 'site': 0}
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(rows)))) as ex:
        results = list(ex.map(one, rows))
    for c, r, e in results:
        if not r:
            cur.execute(f"UPDATE {S}.prospects SET enrich_status='error', enrich_note=%s, updated_at=NOW() WHERE id=%s", (e, c['id']))
            continue
        timed = r.get('timed_out') and 'site' not in r['found']
        closed = r.get('egrul_status') in ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT')
        emails, phones = r.get('emails') or [], r.get('phones') or []
        st = 'new' if timed else 'closed' if closed else 'done' if (emails or phones) else 'empty'
        for k, v in (('email', emails), ('phone', phones), ('site', r.get('website'))):
            found[k] += int(bool(v))
        cur.execute(f"""UPDATE {S}.prospects SET
            email = CASE WHEN COALESCE(email,'') = '' THEN %s ELSE email END,
            phone = CASE WHEN COALESCE(phone,'') = '' THEN %s ELSE phone END,
            website = CASE WHEN COALESCE(website,'') = '' THEN %s ELSE website END,
            contact_name = CASE WHEN %s <> '' THEN %s ELSE contact_name END,
            contact_post = CASE WHEN %s <> '' THEN %s ELSE contact_post END,
            address = CASE WHEN COALESCE(address,'') = '' THEN %s ELSE address END,
            status = CASE WHEN %s THEN 'lost' ELSE status END,
            enrich_status = %s, enrich_note = %s, updated_at = NOW() WHERE id = %s""",
                    (', '.join(emails[:3]), ', '.join(phones[:3]), r.get('website') or '',
                     r.get('head') or '', r.get('head') or '', r.get('head_post') or '', r.get('head_post') or '',
                     r.get('address') or '', closed, st, '; '.join(r.get('note') or [])[:250], c['id']))
    conn.commit()
    cur.execute(f"""SELECT COUNT(*) n FROM {S}.prospects WHERE campaign = %s AND COALESCE(enrich_status,'') IN ('', 'new', 'processing')
                    {'AND subsegment = %s' if seg else ''}""", [CAMPAIGN] + ([seg] if seg else []))
    queue = cur.fetchone()['n']
    conn.close()
    enrich._DEADLINE['t'] = 0.0
    return resp({'ok': True, 'processed': len(rows), 'queue': queue, **found, 'ms': int((time.time() - started) * 1000)})


# ── Список ───────────────────────────────────────────────────────────────────

def action_list(p):
    where, args = ["campaign = %s"], [CAMPAIGN]
    if p.get('segment'):
        where.append("subsegment = %s")
        args.append(p['segment'])
    flt = p.get('filter') or 'all'
    conds = {
        'with_email': "COALESCE(email,'') <> ''",
        'no_contacts': "COALESCE(email,'') = '' AND COALESCE(phone,'') = ''",
        'ready': "COALESCE(email,'') <> '' AND COALESCE(campaign_step,0) = 0 AND status NOT IN ('lost','won')",
        'sent': "campaign_step >= 1",
        'followup_due': "campaign_step = 1 AND campaign_followup_at <= NOW() AND status IN ('new','contacted')",
        'replied': "status IN ('interested','negotiation','won')",
    }
    if flt in conds:
        where.append(conds[flt])
    q = (p.get('search') or '').strip()
    if q:
        where.append("(company_name ILIKE %s OR inn = %s OR region ILIKE %s OR email ILIKE %s)")
        args += [f'%{q}%', q, f'%{q}%', f'%{q}%']
    w = ' AND '.join(where)
    page = max(int(p.get('page') or 1), 1)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT COUNT(*) n FROM {S}.prospects WHERE {w}", args)
    total = cur.fetchone()['n']
    cur.execute(f"""SELECT id, company_name, inn, region, subsegment, revenue, employee_count, email, phone, website,
        contact_name, contact_post, status, enrich_status, enrich_note, campaign_step, campaign_sent_at, campaign_followup_at, note
        FROM {S}.prospects WHERE {w} ORDER BY campaign_priority DESC NULLS LAST, id LIMIT 50 OFFSET %s""", args + [(page - 1) * 50])
    items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': items, 'total': total, 'page': page})


def action_update(body):
    pid = body.get('id')
    allowed = {'email', 'phone', 'contact_name', 'contact_post', 'status', 'note'}
    upd = {k: str(body[k]).strip() for k in allowed if k in body}
    if not pid or not upd:
        return err('Нет данных')
    if upd.get('email'):
        upd['email'] = upd['email'].lower()
        if not all(EMAIL_OK.match(x.strip()) for x in upd['email'].split(',')):
            return err('Проверьте email')
    conn = db()
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.prospects SET {', '.join(f'{k} = %s' for k in upd)}, updated_at = NOW() WHERE id = %s AND campaign = %s",
                list(upd.values()) + [pid, CAMPAIGN])
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_export(p):
    where, args = ["campaign = %s"], [CAMPAIGN]
    if p.get('segment'):
        where.append("subsegment = %s")
        args.append(p['segment'])
    if p.get('filter') == 'with_email':
        where.append("COALESCE(email,'') <> ''")
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT company_name, inn, subsegment, region, revenue, employee_count, contact_name, contact_post,
        email, phone, website, status, campaign_step FROM {S}.prospects WHERE {' AND '.join(where)}
        ORDER BY campaign_priority DESC NULLS LAST LIMIT 5000""", args)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    for r in rows:
        r['subsegment'] = SEGMENTS.get(r['subsegment'], {}).get('name', r['subsegment'])
    return resp({'rows': rows})


# ── Письма ───────────────────────────────────────────────────────────────────

def render(text, p):
    seg = SEGMENTS.get(p.get('subsegment') or '', {})
    vals = {'company': p.get('company_name') or 'ваша компания', 'region': p.get('region') or '',
            'pitch': seg.get('pitch', 'услуг для бизнеса'), 'segment': seg.get('name', ''),
            'mediakit_url': f'{SITE}/masshtab/mediakit', 'site': SITE,
            'contact_name': (p.get('contact_name') or '').split(' ')[1] if len((p.get('contact_name') or '').split(' ')) >= 2 else ''}
    return re.sub(r'\{(\w+)\}', lambda m: vals.get(m.group(1), m.group(0)), text or '')


def to_html(text, settings):
    body = ''
    for para in [x.strip() for x in (text or '').split('\n\n') if x.strip()]:
        safe = html.escape(para).replace('\n', '<br>')
        safe = re.sub(r'(https?://[^\s<]+?)([.,;:!?)]*)(?=\s|<|$)', r'<a href="\1" style="color:#d6402b;">\1</a>\2', safe)
        body += f'<p style="margin:0 0 14px;">{safe}</p>'
    name = html.escape(settings.get('sender_name', ''))
    phone = html.escape(settings.get('sender_phone', ''))
    sign = (f'<p style="margin:20px 0 0;">{name + "<br>" if name else ""}Журнал «Масштаб» · '
            f'<a href="{SITE}/masshtab" style="color:#d6402b;">mat-labs.ru/masshtab</a>{"<br>" + phone if phone else ""}</p>')
    unsub = '<p style="margin:24px 0 0;font-size:12px;color:#888;">Если тема неактуальна — ответьте «нет», и мы больше не напишем.</p>'
    return (f'<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="margin:0;padding:24px;'
            f'font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;"><div style="max-width:620px;">'
            f'{body}{sign}{unsub}</div></body></html>')


def to_plain(text, settings):
    sign = '\n\n' + (settings.get('sender_name', '') + '\n' if settings.get('sender_name') else '') + 'Журнал «Масштаб» · mat-labs.ru/masshtab'
    if settings.get('sender_phone'):
        sign += '\n' + settings['sender_phone']
    return (text or '').strip() + sign + '\n\nЕсли тема неактуальна — ответьте «нет», и мы больше не напишем.'


def build(cur, p, step, settings):
    cur.execute(f"SELECT * FROM {S}.email_templates WHERE code = %s", (p.get('campaign_template'),))
    t = cur.fetchone()
    if not t:
        raise ValueError('Шаблон не найден')
    subj = render(t['followup_subject'] if step == 2 else t['subject'], p)
    text = render(t['followup_body'] if step == 2 else t['body'], p)
    left = sorted(set(re.findall(r'\{(\w+)\}', subj + text)))
    return subj, text, left


def send_email(to, subject, text, settings):
    key = os.environ.get('UNISENDER_API_KEY', '')
    if not key:
        raise ValueError('Не задан ключ отправки писем UNISENDER_API_KEY')
    name = (settings.get('sender_name') or '').strip()
    msg = {'recipients': [{'email': to}], 'sender_email': os.environ.get('UNISENDER_SENDER_EMAIL', ''),
           'sender_name': f'{name} | Журнал «Масштаб»' if name else 'Журнал «Масштаб»', 'subject': subject,
           'body': {'html': to_html(text, settings), 'plaintext': to_plain(text, settings)}, 'track_links': 0, 'track_read': 0}
    if settings.get('reply_to'):
        msg['reply_to'] = settings['reply_to']
    data = json.dumps({'message': msg}).encode()
    last = None
    for url in UNISENDER_URLS:
        try:
            req = urllib.request.Request(url, data=data, method='POST', headers={'Content-Type': 'application/json', 'X-API-KEY': key})
            with urllib.request.urlopen(req, timeout=12) as r:
                res = json.loads(r.read().decode())
            if res.get('status') == 'success':
                return
            last = Exception(str(res)[:200])
        except Exception as e:
            last = e
    raise last


def action_preview(body):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if body.get('id'):
        cur.execute(f"SELECT * FROM {S}.prospects WHERE id = %s", (body['id'],))
    else:
        cur.execute(f"""SELECT * FROM {S}.prospects WHERE campaign = %s AND campaign_template = %s
                        ORDER BY (COALESCE(email,'') <> '') DESC, campaign_priority DESC NULLS LAST LIMIT 1""", (CAMPAIGN, body.get('template')))
    p = cur.fetchone()
    if not p:
        conn.close()
        return err('Сначала соберите базу для этого сегмента', 404)
    try:
        subj, text, left = build(cur, dict(p), 2 if int(body.get('step') or 1) == 2 else 1, get_settings(cur))
    except ValueError as e:
        conn.close()
        return err(str(e))
    conn.close()
    return resp({'company': p['company_name'], 'email': p['email'], 'subject': subj, 'text': text, 'problems': left})


def action_save_template(body):
    code = body.get('code')
    fields = ['subject', 'body', 'followup_subject', 'followup_body']
    upd = {k: (body.get(k) or '').strip() for k in fields if k in body}
    if not code or not upd:
        return err('Нет данных')
    conn = db()
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.email_templates SET {', '.join(f'{k} = %s' for k in upd)}, updated_at = NOW() WHERE code = %s AND campaign = %s",
                list(upd.values()) + [code, CAMPAIGN])
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_save_settings(body):
    conn = db()
    cur = conn.cursor()
    for k in ('sender_name', 'sender_phone', 'reply_to', 'ads_daily_limit'):
        if k in body:
            v = str(body[k]).strip()
            if k == 'ads_daily_limit':
                v = str(max(1, min(int(v or 40), 300)))
            cur.execute(f"""INSERT INTO {S}.campaign_settings (key, value) VALUES (%s, %s)
                            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""", (k, v))
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_test_send(body):
    to = (body.get('to') or '').strip().lower()
    if not EMAIL_OK.match(to):
        return err('Укажите свой email для теста')
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    settings = get_settings(cur)
    cur.execute(f"""SELECT * FROM {S}.prospects WHERE campaign = %s AND campaign_template = %s
                    ORDER BY (COALESCE(email,'') <> '') DESC, campaign_priority DESC NULLS LAST LIMIT 1""", (CAMPAIGN, body.get('template')))
    p = cur.fetchone()
    if not p:
        conn.close()
        return err('Сначала соберите базу для этого сегмента')
    step = 2 if int(body.get('step') or 1) == 2 else 1
    subj, text, left = build(cur, dict(p), step, settings)
    conn.close()
    if left:
        return err('В шаблоне неизвестные поля: ' + ', '.join(left))
    try:
        send_email(to, '[ТЕСТ] ' + subj, text, settings)
    except Exception as e:
        return err(f'Не отправилось: {str(e)[:200]}')
    return resp({'ok': True, 'company': p['company_name']})


def action_send(body, context):
    """Отправка письма (step=1) или напоминания (step=2) с учётом дневного лимита."""
    step = 2 if int(body.get('step') or 1) == 2 else 1
    ids = [int(i) for i in (body.get('ids') or [])][:20]
    seg = body.get('segment') or ''
    count = min(int(body.get('count') or 0), 20)
    started = time.time()
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    settings = get_settings(cur)
    limit = int(settings.get('ads_daily_limit') or 40)
    cur.execute(f"""SELECT COUNT(*) n FROM {S}.prospect_activities a JOIN {S}.prospects p ON p.id = a.prospect_id
                    WHERE p.campaign = %s AND a.activity_type = 'email' AND a.created_at >= date_trunc('day', NOW())""", (CAMPAIGN,))
    left = max(limit - cur.fetchone()['n'], 0)
    if not left:
        conn.close()
        return err(f'Дневной лимит {limit} писем исчерпан — продолжите завтра или поменяйте лимит в настройках.')
    base = f"""SELECT * FROM {S}.prospects WHERE campaign = %s AND COALESCE(email,'') <> '' AND status NOT IN ('lost','won')"""
    base += " AND COALESCE(campaign_step,0) = 0" if step == 1 else \
        " AND campaign_step = 1 AND campaign_followup_at <= NOW() AND status IN ('new','contacted')"
    if ids:
        cur.execute(base + " AND id = ANY(%s)", (CAMPAIGN, ids))
    elif count:
        cur.execute(base + (" AND subsegment = %s" if seg else "") + " ORDER BY campaign_priority DESC NULLS LAST LIMIT %s",
                    [CAMPAIGN] + ([seg] if seg else []) + [min(count, left)])
    else:
        conn.close()
        return err('Выберите компании или количество')
    targets = [dict(r) for r in cur.fetchall()][:left]
    fn = getattr(context, 'get_remaining_time_in_millis', None)
    budget = max(2.0, ((int(fn()) if callable(fn) else 5000) - 2000) / 1000)
    sent, errors, skipped = 0, [], 0
    for p in targets:
        if time.time() - started > budget:
            skipped += 1
            continue
        email = (p['email'] or '').split(',')[0].strip().lower()
        if not EMAIL_OK.match(email):
            errors.append({'company': p['company_name'], 'error': 'некорректный email'})
            continue
        subj, text, unk = build(cur, p, step, settings)
        if unk:
            conn.close()
            return err('В шаблоне неизвестные поля: ' + ', '.join(unk))
        try:
            send_email(email, subj, text, settings)
        except Exception as e:
            errors.append({'company': p['company_name'], 'error': str(e)[:160]})
            cur.execute(f"UPDATE {S}.prospects SET email_delivery_status = 'failed' WHERE id = %s", (p['id'],))
            conn.commit()
            continue
        now = datetime.now(timezone.utc)
        if step == 1:
            cur.execute(f"""UPDATE {S}.prospects SET campaign_step = 1, campaign_sent_at = %s, campaign_followup_at = %s,
                status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END, email_delivery_status = 'sent',
                email_delivery_provider = 'unisender', updated_at = NOW() WHERE id = %s""",
                        (now, now + timedelta(days=FOLLOWUP_DAYS), p['id']))
        else:
            cur.execute(f"UPDATE {S}.prospects SET campaign_step = 2, campaign_followup_at = NULL, updated_at = NOW() WHERE id = %s", (p['id'],))
        cur.execute(f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, 'email', %s)",
                    (p['id'], f"Масштаб, реклама: {'письмо' if step == 1 else 'напоминание'} на {email} — «{subj}»"))
        conn.commit()
        sent += 1
    conn.close()
    return resp({'ok': True, 'sent': sent, 'errors': errors, 'skipped': skipped, 'left_today': max(left - sent, 0)})


def handler(event: dict, context) -> dict:
    """База рекламодателей журнала «Масштаб»: сбор, поиск контактов, шаблоны и рассылка."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}
    if not authorized(event):
        return err('Не авторизован', 401)
    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = body.get('action') or params.get('action') or 'overview'
    if method == 'GET':
        fn = {'overview': lambda: action_overview(), 'list': lambda: action_list(params),
              'export': lambda: action_export(params)}.get(action)
        return fn() if fn else err('Неизвестное действие')
    if action == 'enrich':
        return action_enrich(body, context)
    if action == 'send':
        return action_send(body, context)
    fn = {'build': action_build, 'update': action_update, 'preview': action_preview, 'save_template': action_save_template,
          'save_settings': action_save_settings, 'test_send': action_test_send}.get(action)
    return fn(body) if fn else err('Неизвестное действие')
