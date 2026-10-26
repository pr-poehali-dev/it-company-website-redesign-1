"""
Бизнес-аналитика МАТ-Лабс: рынки (отрасль × регион), отчёт о компании, проверка контрагента.
Источник — открытые данные ФНС за 2025 год: выручка и расходы, численность, налоговый режим,
недоимки, реестр МСП; господдержка — реестр получателей поддержки. Живые данные ЕГРЮЛ — DaData.
"""
import hashlib
import hmac
import json
import os
import re
import smtplib
import urllib.request
from email.mime.text import MIMEText
from email.utils import formataddr

import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
NOTIFY_EMAIL = 'atyurin2@yandex.ru'
PRICES = {'market': 4900, 'company': 1490, 'check': 490, 'custom': 0}
REPORT_NAMES = {'market': 'Отчёт о рынке', 'company': 'Отчёт о компании', 'check': 'Проверка контрагента',
                'custom': 'Индивидуальное исследование'}
REGIONS = {
    '01': 'Адыгея', '02': 'Башкортостан', '03': 'Бурятия', '04': 'Алтай Респ.', '05': 'Дагестан', '06': 'Ингушетия',
    '07': 'Кабардино-Балкария', '08': 'Калмыкия', '09': 'Карачаево-Черкесия', '10': 'Карелия', '11': 'Коми',
    '12': 'Марий Эл', '13': 'Мордовия', '14': 'Якутия', '15': 'Северная Осетия', '16': 'Татарстан', '17': 'Тыва',
    '18': 'Удмуртия', '19': 'Хакасия', '20': 'Чечня', '21': 'Чувашия', '22': 'Алтайский край',
    '23': 'Краснодарский край', '24': 'Красноярский край', '25': 'Приморский край', '26': 'Ставропольский край',
    '27': 'Хабаровский край', '28': 'Амурская обл.', '29': 'Архангельская обл.', '30': 'Астраханская обл.',
    '31': 'Белгородская обл.', '32': 'Брянская обл.', '33': 'Владимирская обл.', '34': 'Волгоградская обл.',
    '35': 'Вологодская обл.', '36': 'Воронежская обл.', '37': 'Ивановская обл.', '38': 'Иркутская обл.',
    '39': 'Калининградская обл.', '40': 'Калужская обл.', '41': 'Камчатский край', '42': 'Кемеровская обл.',
    '43': 'Кировская обл.', '44': 'Костромская обл.', '45': 'Курганская обл.', '46': 'Курская обл.',
    '47': 'Ленинградская обл.', '48': 'Липецкая обл.', '49': 'Магаданская обл.', '50': 'Московская обл.',
    '51': 'Мурманская обл.', '52': 'Нижегородская обл.', '53': 'Новгородская обл.', '54': 'Новосибирская обл.',
    '55': 'Омская обл.', '56': 'Оренбургская обл.', '57': 'Орловская обл.', '58': 'Пензенская обл.',
    '59': 'Пермский край', '60': 'Псковская обл.', '61': 'Ростовская обл.', '62': 'Рязанская обл.',
    '63': 'Самарская обл.', '64': 'Саратовская обл.', '65': 'Сахалинская обл.', '66': 'Свердловская обл.',
    '67': 'Смоленская обл.', '68': 'Тамбовская обл.', '69': 'Тверская обл.', '70': 'Томская обл.',
    '71': 'Тульская обл.', '72': 'Тюменская обл.', '73': 'Ульяновская обл.', '74': 'Челябинская обл.',
    '75': 'Забайкальский край', '76': 'Ярославская обл.', '77': 'Москва', '78': 'Санкт-Петербург',
    '79': 'Еврейская АО', '83': 'Ненецкий АО', '86': 'ХМАО — Югра', '87': 'Чукотский АО', '89': 'ЯНАО',
    '90': 'Запорожская обл.', '91': 'Крым', '92': 'Севастополь', '93': 'ДНР', '94': 'ЛНР', '95': 'Херсонская обл.',
}
MSP_CAT = {0: 'не МСП (крупная или без статуса)', 1: 'микропредприятие', 2: 'малое предприятие', 3: 'среднее предприятие'}
MARKET_COLS = ('companies, with_revenue, revenue, expenses, profitable, staff, median_revenue, top10_share, hhi, micro, '
               'small, medium, non_msp, new_3y, with_debt, debt_sum, usn, grants_companies, grants_sum')


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
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def okved_names(cur, codes):
    codes = [c for c in set(codes) if c]
    if not codes:
        return {}
    cur.execute(f'SELECT code, name, section FROM {S}.biz_okved WHERE code = ANY(%s)', (codes,))
    return {r['code']: {'name': r['name'], 'section': r['section']} for r in cur.fetchall()}


# ── Обзор ───────────────────────────────────────────────────────────────────

def action_overview():
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT {MARKET_COLS} FROM {S}.biz_markets WHERE okved2='ALL' AND region='RU'")
    total = cur.fetchone()
    cur.execute(f"""SELECT m.okved2, o.name, o.section, m.companies, m.revenue, m.median_revenue, m.top10_share, m.hhi,
                    m.profitable, m.with_revenue, m.staff, m.grants_sum
                    FROM {S}.biz_markets m LEFT JOIN {S}.biz_okved o ON o.code = m.okved2
                    WHERE m.region='RU' AND m.okved2 NOT IN ('ALL','—') ORDER BY m.revenue DESC""")
    industries = rows(cur)
    cur.execute(f"""SELECT region, companies, revenue, staff, median_revenue, with_revenue, profitable, new_3y, grants_sum
                    FROM {S}.biz_markets WHERE okved2='ALL' AND region <> 'RU' ORDER BY revenue DESC""")
    regions = rows(cur)
    for r in regions:
        r['name'] = REGIONS.get(r['region'], r['region'])
    conn.close()
    return resp({'total': total, 'industries': industries, 'regions': regions, 'period': '2025'}, cache=3600)


def action_okved(p):
    q = (p.get('q') or '').strip().lower()[:60]
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if q:
        cur.execute(f"""SELECT code, name, section FROM {S}.biz_okved
                        WHERE code LIKE %s OR lower(name) LIKE %s ORDER BY length(code), code LIMIT 40""", (q + '%', f'%{q}%'))
    else:
        cur.execute(f"SELECT code, name, section FROM {S}.biz_okved WHERE length(code) = 2 ORDER BY code")
    out = rows(cur)
    conn.close()
    return resp({'items': out}, cache=86400)


# ── Рынок ───────────────────────────────────────────────────────────────────

def market_filter(okved, region):
    where, args = [], []
    if len(okved) == 2:
        where.append('okved2 = %s')
        args.append(okved)
    elif okved and okved != 'ALL':
        where.append('(okved = %s OR okved LIKE %s)')
        args += [okved, okved + '.%']
    if region and region != 'RU':
        where.append('region = %s')
        args.append(region)
    return (' WHERE ' + ' AND '.join(where)) if where else '', args


def live_market(cur, okved, region):
    """Агрегаты на лету — для кодов ОКВЭД глубже 2 знаков."""
    w, a = market_filter(okved, region)
    cur.execute(f"""SELECT COUNT(*) AS companies, COUNT(*) FILTER (WHERE revenue > 0) AS with_revenue,
        COALESCE(SUM(revenue) FILTER (WHERE revenue > 0), 0) AS revenue,
        COALESCE(SUM(expenses) FILTER (WHERE revenue > 0), 0) AS expenses,
        COUNT(*) FILTER (WHERE revenue > expenses) AS profitable, COALESCE(SUM(staff), 0) AS staff,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) FILTER (WHERE revenue > 0), 0)::bigint AS median_revenue,
        COUNT(*) FILTER (WHERE msp_cat = 1) AS micro, COUNT(*) FILTER (WHERE msp_cat = 2) AS small,
        COUNT(*) FILTER (WHERE msp_cat = 3) AS medium, COUNT(*) FILTER (WHERE msp_cat = 0) AS non_msp,
        COUNT(*) FILTER (WHERE msp_year >= 2024) AS new_3y, COUNT(*) FILTER (WHERE tax_debt > 0) AS with_debt,
        COALESCE(SUM(tax_debt), 0) AS debt_sum, COUNT(*) FILTER (WHERE tax_mode IN ('УСН','АУСН')) AS usn,
        0 AS grants_companies, 0 AS grants_sum
        FROM {S}.biz_companies{w}""", a)
    m = dict(cur.fetchone())
    cur.execute(f"""SELECT revenue FROM {S}.biz_companies{w}{' AND' if w else ' WHERE'} revenue > 0
                    ORDER BY revenue DESC LIMIT 10""", a)
    top = [r['revenue'] for r in cur.fetchall()]
    tot = m['revenue'] or 0
    m['top10_share'] = round(sum(top) / tot * 100, 2) if tot else 0
    m['hhi'] = None
    return m


def action_market(p, admin):
    okved = re.sub(r'[^\d.]', '', p.get('okved') or '')[:8] or 'ALL'
    region = re.sub(r'[^\dRU]', '', p.get('region') or 'RU')[:2] or 'RU'
    ckey = f'market:{okved}:{region}:{int(admin)}'
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT data FROM {S}.biz_market_cache WHERE key = %s AND updated_at > NOW() - INTERVAL '7 days'", (ckey,))
    hit = cur.fetchone()
    if hit:
        conn.close()
        return resp(hit['data'], cache=0 if admin else 1800)
    okv2 = okved[:2] if okved != 'ALL' else 'ALL'
    if len(okved) <= 2:
        cur.execute(f"SELECT {MARKET_COLS} FROM {S}.biz_markets WHERE okved2=%s AND region=%s", (okved, region))
        m = cur.fetchone()
        m = dict(m) if m else None
    else:
        m = live_market(cur, okved, region)
    if not m or not m['companies']:
        conn.close()
        return err('По этому рынку нет данных', 404)

    cur.execute(f"SELECT {MARKET_COLS} FROM {S}.biz_markets WHERE okved2=%s AND region='RU'", (okv2,))
    national = cur.fetchone()

    w, a = market_filter(okved, region)
    and_ = ' AND' if w else ' WHERE'
    sub_len = 5 if len(okved) >= 4 else 4
    cur.execute(f"""SELECT left(okved, %s) AS code, COUNT(*) AS companies, COALESCE(SUM(revenue) FILTER (WHERE revenue>0),0) AS revenue,
                    COALESCE(SUM(staff),0) AS staff
                    FROM {S}.biz_companies{w}{and_} okved <> '' GROUP BY 1 ORDER BY 3 DESC LIMIT 15""", [sub_len] + a)
    segments = rows(cur)
    names = okved_names(cur, [s['code'] for s in segments] + [okved, okv2])
    for s in segments:
        s['name'] = (names.get(s['code']) or {}).get('name', '')

    if region == 'RU' and len(okved) <= 2:
        cur.execute(f"""SELECT region, companies, revenue, median_revenue, staff, top10_share FROM {S}.biz_markets
                        WHERE okved2=%s AND region <> 'RU' ORDER BY revenue DESC""", (okved,))
        geo = rows(cur)
    else:
        gw, ga = market_filter(okved, 'RU')
        cur.execute(f"""SELECT region, COUNT(*) AS companies, COALESCE(SUM(revenue) FILTER (WHERE revenue>0),0) AS revenue
                        FROM {S}.biz_companies{gw} GROUP BY 1 ORDER BY 3 DESC LIMIT 15""", ga)
        geo = rows(cur)
    for g in geo:
        g['name'] = REGIONS.get(g['region'], g['region'])

    cur.execute(f"""SELECT width_bucket(revenue, ARRAY[10000000, 120000000, 800000000, 2000000000, 10000000000]::bigint[]) AS b,
                    COUNT(*) AS n, SUM(revenue) AS s FROM {S}.biz_companies{w}{and_} revenue > 0 GROUP BY 1 ORDER BY 1""", a)
    labels = ['до 10 млн', '10–120 млн', '120–800 млн', '0,8–2 млрд', '2–10 млрд', 'более 10 млрд']
    size_dist = [{'label': labels[r['b']], 'companies': r['n'], 'revenue': r['s']} for r in cur.fetchall()]

    cur.execute(f"""SELECT msp_year AS y, COUNT(*) AS n FROM {S}.biz_companies{w}{and_} msp_year >= 2016
                    GROUP BY 1 ORDER BY 1""", a)
    cohorts = rows(cur)

    limit = 50 if admin else 10
    cur.execute(f"""SELECT inn, name, region, city, okved, revenue, expenses, staff, msp_cat, tax_mode
                    FROM {S}.biz_companies{w}{and_} revenue > 0 ORDER BY revenue DESC LIMIT %s""", a + [limit])
    top = rows(cur)
    tot = m['revenue'] or 1
    for i, t in enumerate(top):
        t['share'] = round((t['revenue'] or 0) / tot * 100, 2)
        t['rank'] = i + 1
        if not admin and i >= 3:
            t['name'] = ''
            t['inn'] = ''
            t['city'] = ''
            t['locked'] = True

    if len(okved) > 2 or region != 'RU':
        cur.execute(f"""SELECT COUNT(*) AS n, COALESCE(SUM(r.total_amount),0) AS s FROM {S}.radar_companies r
                        JOIN {S}.biz_companies b ON b.inn = r.inn{w.replace('okved', 'b.okved').replace('region', 'b.region') if w else ''}""", a)
        grants = dict(cur.fetchone())
    else:
        grants = {'n': m.get('grants_companies'), 's': m.get('grants_sum')}
    conn.close()

    title_okved = (names.get(okved) or names.get(okv2) or {}).get('name', 'Все отрасли') if okved != 'ALL' else 'Все отрасли'
    data = {
        'okved': okved, 'region': region, 'okved_name': title_okved,
        'section': (names.get(okv2) or {}).get('section', ''),
        'region_name': 'Россия' if region == 'RU' else REGIONS.get(region, region),
        'metrics': m, 'national': national, 'segments': segments, 'geo': geo, 'size_dist': size_dist,
        'cohorts': cohorts, 'top': top, 'grants': grants, 'insights': market_insights(m, national, region),
        'period': '2025', 'full_access': admin,
    }
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""INSERT INTO {S}.biz_market_cache (key, data) VALUES (%s, %s)
                    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()""",
                (ckey, json.dumps(data, ensure_ascii=False, default=str)))
    conn.commit()
    conn.close()
    return resp(data, cache=0 if admin else 1800)


def fmt_money(v):
    v = float(v or 0)
    if v >= 1e12:
        return f'{v / 1e12:.1f} трлн ₽'.replace('.', ',')
    if v >= 1e9:
        return f'{v / 1e9:.1f} млрд ₽'.replace('.', ',')
    if v >= 1e6:
        return f'{v / 1e6:.1f} млн ₽'.replace('.', ',')
    return f'{v / 1e3:.0f} тыс. ₽'


def market_insights(m, nat, region):
    out = []
    wr = m.get('with_revenue') or 0
    if wr:
        prof = (m.get('profitable') or 0) / max(1, wr) * 100
        out.append({'kind': 'profit', 'text': f'{prof:.0f}% компаний с выручкой закончили 2025 год с доходами выше расходов'})
    t10 = float(m.get('top10_share') or 0)
    if t10 >= 60:
        out.append({'kind': 'conc', 'text': f'Рынок сильно концентрирован: 10 крупнейших игроков держат {t10:.0f}% выручки — входить через нишу или партнёрство'})
    elif t10 >= 25:
        out.append({'kind': 'conc', 'text': f'Умеренная концентрация: на топ-10 приходится {t10:.0f}% выручки'})
    elif t10:
        out.append({'kind': 'conc', 'text': f'Рынок раздроблен: топ-10 — лишь {t10:.0f}% выручки, место для новых игроков есть'})
    if m.get('companies'):
        new = (m.get('new_3y') or 0) / m['companies'] * 100
        out.append({'kind': 'new', 'text': f'{new:.0f}% компаний вошли в реестр МСП в 2024–2026 годах — показатель притока новых игроков'})
        debt = (m.get('with_debt') or 0) / m['companies'] * 100
        if debt >= 10:
            out.append({'kind': 'risk', 'text': f'У {debt:.0f}% компаний есть налоговая недоимка — повышенный риск неплатежей, проверяйте контрагентов'})
    if nat and region != 'RU' and nat.get('median_revenue') and m.get('median_revenue'):
        k = m['median_revenue'] / nat['median_revenue']
        if k >= 1.2:
            out.append({'kind': 'geo', 'text': f'Типичная компания здесь в {k:.1f} раза крупнее, чем в среднем по стране'.replace('.', ',')})
        elif k <= 0.8:
            out.append({'kind': 'geo', 'text': f'Типичная компания здесь мельче средней по стране: медианная выручка {fmt_money(m["median_revenue"])} против {fmt_money(nat["median_revenue"])}'})
    if m.get('grants_sum'):
        out.append({'kind': 'grant', 'text': f'{m["grants_companies"]} компаний получили {fmt_money(m["grants_sum"])} господдержки в 2024–2026 годах'})
    return out


# ── Компания и проверка ─────────────────────────────────────────────────────

def dadata(inn):
    key = os.environ.get('DADATA_API_KEY', '')
    if not key:
        return None
    req = urllib.request.Request('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
                                 data=json.dumps({'query': inn, 'count': 1}).encode(),
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json',
                                          'Authorization': f'Token {key}'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=2.5) as r:
            s = json.loads(r.read()).get('suggestions') or []
            return s[0] if s else None
    except Exception:
        return None


def risk_score(c, egrul):
    """Простая модель рисков контрагента: 0–100, чем выше — тем рискованнее."""
    factors = []
    score = 0
    st = ((egrul or {}).get('state') or {}).get('status') or ''
    if st in ('LIQUIDATED', 'BANKRUPT'):
        factors.append({'level': 'high', 'text': 'Компания ликвидирована или признана банкротом'})
        score += 80
    elif st in ('LIQUIDATING', 'REORGANIZING'):
        factors.append({'level': 'high', 'text': 'Компания в процессе ликвидации или реорганизации'})
        score += 50
    debt = c.get('tax_debt') or 0
    rev = c.get('revenue')
    if debt > 0:
        rel = debt / rev * 100 if rev else None
        lvl = 'high' if (debt > 1_000_000 or (rel and rel > 5)) else 'mid'
        factors.append({'level': lvl, 'text': f'Налоговая недоимка {fmt_money(debt)}' + (f' — {rel:.1f}% от выручки' if rel else '')})
        score += 25 if lvl == 'high' else 10
    if rev is not None and c.get('expenses') is not None and rev < c['expenses']:
        loss = c['expenses'] - rev
        factors.append({'level': 'mid', 'text': f'Расходы превысили доходы на {fmt_money(loss)} по итогам 2025 года'})
        score += 15
    if rev is None:
        factors.append({'level': 'mid', 'text': 'Нет данных о выручке за 2025 год в открытой отчётности'})
        score += 10
    elif rev == 0:
        factors.append({'level': 'mid', 'text': 'Нулевая выручка за 2025 год'})
        score += 15
    if c.get('staff') is not None and c['staff'] <= 1 and (rev or 0) > 100_000_000:
        factors.append({'level': 'mid', 'text': 'Выручка более 100 млн ₽ при 0–1 сотруднике — признак транзитной компании'})
        score += 15
    reg = (egrul or {}).get('state', {}).get('registration_date')
    if reg:
        import time
        age = (time.time() - reg / 1000) / (365.25 * 86400)
        if age < 1:
            factors.append({'level': 'mid', 'text': 'Компании меньше года'})
            score += 10
        elif age >= 5:
            factors.append({'level': 'good', 'text': f'Работает {int(age)} лет'})
    if (egrul or {}).get('address', {}).get('invalidity'):
        factors.append({'level': 'high', 'text': 'Адрес отмечен как недостоверный в ЕГРЮЛ'})
        score += 25
    if not debt and rev and c.get('expenses') is not None and rev >= c['expenses']:
        factors.append({'level': 'good', 'text': 'Нет налоговых долгов, доходы выше расходов'})
    score = min(100, score)
    level = 'high' if score >= 50 else 'mid' if score >= 20 else 'low'
    return {'score': score, 'level': level, 'factors': factors}


def action_company(p, admin):
    inn = re.sub(r'\D', '', p.get('inn') or '')[:12]
    if len(inn) not in (10, 12):
        return err('Укажите ИНН из 10 или 12 цифр')
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f'SELECT * FROM {S}.biz_companies WHERE inn = %s', (inn,))
    c = cur.fetchone()
    c = dict(c) if c else {'inn': inn, 'name': '', 'region': inn[:2], 'okved': '', 'okved2': '', 'revenue': None,
                           'expenses': None, 'staff': None, 'tax_mode': '', 'tax_debt': 0, 'msp_cat': 0, 'msp_year': 0, 'city': ''}
    egrul = dadata(inn)
    d = (egrul or {}).get('data') or {}
    if egrul:
        c['name'] = c['name'] or egrul.get('value') or ''
        if not c['okved'] and d.get('okved'):
            c['okved'] = d['okved']
            c['okved2'] = d['okved'][:2]
    if not c['name'] and not egrul:
        conn.close()
        return err('Компания не найдена', 404)

    peers = None
    if c.get('okved2') and c.get('revenue') is not None:
        cur.execute(f"""SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE revenue > %s) AS above,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) AS med,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (revenue - expenses)::float / NULLIF(revenue, 0))
                          FILTER (WHERE revenue > 0) AS med_margin,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue::float / NULLIF(staff, 0))
                          FILTER (WHERE staff > 0 AND revenue > 0) AS med_rps
                        FROM {S}.biz_companies WHERE okved2 = %s AND region = %s AND revenue > 0""",
                    (c['revenue'], c['okved2'], c['region']))
        peers = dict(cur.fetchone())
        peers['rank'] = (peers['above'] or 0) + 1
        cur.execute(f"""SELECT COUNT(*) FILTER (WHERE revenue > %s) + 1 AS rank, COUNT(*) AS n FROM {S}.biz_companies
                        WHERE okved2 = %s AND revenue > 0""", (c['revenue'], c['okved2']))
        nr = cur.fetchone()
        peers['rank_ru'], peers['n_ru'] = nr['rank'], nr['n']
    cur.execute(f"""SELECT inn, name, revenue, staff FROM {S}.biz_companies WHERE okved2 = %s AND region = %s AND inn <> %s
                    AND revenue > 0 ORDER BY abs(revenue - %s) LIMIT 6""",
                (c.get('okved2') or '', c.get('region') or '', inn, c.get('revenue') or 0))
    competitors = rows(cur)
    cur.execute(f"""SELECT total_amount, last_date, last_amount, source, source_full, payments FROM {S}.radar_companies
                    WHERE inn = %s""", (inn,))
    grant = cur.fetchone()
    ok = c.get('okved') or ''
    prefixes = [ok[:n] for n in (len(ok), 5, 4, 2) if ok]
    names = okved_names(cur, prefixes + [c.get('okved2') or ''])
    conn.close()
    okved_full = next((names[x]['name'] for x in prefixes if x in names), '')

    rev, exp = c.get('revenue'), c.get('expenses')
    fin = {
        'revenue': rev, 'expenses': exp, 'profit': (rev - exp) if rev is not None and exp is not None else None,
        'margin': round((rev - exp) / rev * 100, 1) if rev and exp is not None else None,
        'rev_per_staff': round(rev / c['staff']) if rev and c.get('staff') else None,
    }
    mg = d.get('management') or {}
    out = {
        'inn': inn, 'name': c['name'], 'short_name': ((d.get('name') or {}).get('short_with_opf')) or c['name'],
        'ogrn': d.get('ogrn') or '', 'kpp': d.get('kpp') or '',
        'status': (d.get('state') or {}).get('status') or ('ACTIVE' if c.get('revenue') is not None else ''),
        'registered': (d.get('state') or {}).get('registration_date'),
        'liquidated': (d.get('state') or {}).get('liquidation_date'),
        'region': c.get('region'), 'region_name': REGIONS.get(c.get('region'), ''), 'city': c.get('city') or '',
        'address': ((d.get('address') or {}).get('value')) or '',
        'okved': c.get('okved'), 'okved_name': okved_full,
        'okved2': c.get('okved2'), 'okved2_name': (names.get(c.get('okved2') or '') or {}).get('name', ''),
        'head': mg.get('name') or '', 'head_post': mg.get('post') or '',
        'opf': ((d.get('opf') or {}).get('short')) or '', 'capital': ((d.get('capital') or {}).get('value')),
        'branches': d.get('branch_count'), 'msp': MSP_CAT.get(c.get('msp_cat') or 0), 'msp_year': c.get('msp_year') or None,
        'staff': c.get('staff'), 'tax_mode': c.get('tax_mode') or '', 'tax_debt': c.get('tax_debt') or 0,
        'finance': fin, 'peers': peers, 'competitors': competitors,
        'grant': dict(grant) if grant else None, 'risk': risk_score(c, d),
        'egrul_live': bool(egrul), 'period': '2025', 'full_access': admin,
    }
    if not admin:
        out['address'] = ', '.join(out['address'].split(',')[:2]) + (', •••' if out['address'].count(',') > 1 else '')
        out['head'] = ' '.join(w[0] + '•' * (len(w) - 1) for w in out['head'].split()) if out['head'] else ''
        for comp in out['competitors'][2:]:
            comp['name'], comp['inn'], comp['locked'] = '', '', True
    return resp(out)


def action_search(p):
    q = (p.get('q') or '').strip()[:100]
    if not q:
        return resp({'items': []})
    digits = re.sub(r'\D', '', q)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    items = []
    if digits and len(digits) >= 4 and len(digits) == len(q.replace(' ', '')):
        cur.execute(f"""SELECT inn, name, region, okved, revenue FROM {S}.biz_companies WHERE inn LIKE %s
                        ORDER BY revenue DESC NULLS LAST LIMIT 10""", (digits + '%',))
        items = rows(cur)
    else:
        key = os.environ.get('DADATA_API_KEY', '')
        found = []
        if key:
            req = urllib.request.Request('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party',
                                         data=json.dumps({'query': q, 'count': 10, 'status': ['ACTIVE']}).encode(),
                                         headers={'Content-Type': 'application/json', 'Authorization': f'Token {key}'},
                                         method='POST')
            try:
                with urllib.request.urlopen(req, timeout=2.5) as r:
                    found = json.loads(r.read()).get('suggestions') or []
            except Exception:
                found = []
        inns = [((s.get('data') or {}).get('inn')) for s in found if (s.get('data') or {}).get('inn')]
        db_rows = {}
        if inns:
            cur.execute(f'SELECT inn, revenue, region, okved FROM {S}.biz_companies WHERE inn = ANY(%s)', (inns,))
            db_rows = {r['inn']: r for r in cur.fetchall()}
        for s in found:
            dd = s.get('data') or {}
            inn = dd.get('inn')
            if not inn:
                continue
            r = db_rows.get(inn) or {}
            items.append({'inn': inn, 'name': s.get('value'), 'region': r.get('region') or inn[:2],
                          'okved': r.get('okved') or dd.get('okved') or '', 'revenue': r.get('revenue'),
                          'address': ((dd.get('address') or {}).get('value') or '')[:80]})
    conn.close()
    for it in items:
        it['region_name'] = REGIONS.get(it.get('region') or '', '')
    return resp({'items': items})


def action_rating(p, admin):
    region = re.sub(r'[^\dRU]', '', p.get('region') or 'RU')[:2] or 'RU'
    okved = re.sub(r'[^\d.]', '', p.get('okved') or '')[:8]
    sort = p.get('sort') if p.get('sort') in ('revenue', 'staff', 'profit') else 'revenue'
    w, a = market_filter(okved or 'ALL', region)
    order = {'revenue': 'revenue DESC NULLS LAST', 'staff': 'staff DESC NULLS LAST',
             'profit': '(revenue - expenses) DESC NULLS LAST'}[sort]
    and_ = ' AND' if w else ' WHERE'
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT inn, name, region, okved, revenue, expenses, staff, msp_cat FROM {S}.biz_companies{w}{and_}
                    revenue > 0 ORDER BY {order} LIMIT %s""", a + [100 if admin else 25])
    items = rows(cur)
    conn.close()
    for i, it in enumerate(items):
        it['rank'] = i + 1
        it['region_name'] = REGIONS.get(it['region'], '')
        if not admin and i >= 10:
            it['name'], it['inn'], it['locked'] = '', '', True
    return resp({'items': items, 'full_access': admin}, cache=0 if admin else 1800)


# ── Заказы ──────────────────────────────────────────────────────────────────

def notify(subject, text):
    password = os.environ.get('SMTP_PASSWORD', '')
    if not password:
        return
    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('Бизнес-аналитика МАТ-Лабс', NOTIFY_EMAIL))
    msg['To'] = NOTIFY_EMAIL
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=4) as srv:
            srv.login(NOTIFY_EMAIL, password)
            srv.sendmail(NOTIFY_EMAIL, [NOTIFY_EMAIL], msg.as_bytes())
    except Exception as e:
        print(f'[biz] notify failed: {e}')


def action_order(body):
    if (body.get('website') or '').strip():
        return resp({'ok': True})
    rtype = body.get('report_type') if body.get('report_type') in PRICES else 'custom'
    name = (body.get('name') or '').strip()[:200]
    phone = (body.get('phone') or '').strip()[:60]
    email = (body.get('email') or '').strip()[:200]
    if not name or not (phone or email):
        return err('Укажите имя и телефон или email')
    if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return err('Проверьте email')
    key = (body.get('report_key') or '')[:100]
    title = (body.get('report_title') or REPORT_NAMES[rtype])[:300]
    company = (body.get('company') or '').strip()[:300]
    inn = re.sub(r'\D', '', body.get('inn') or '')[:12]
    comment = (body.get('comment') or '').strip()[:2000]
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""INSERT INTO {S}.biz_report_orders (report_type, report_key, report_title, price, name, phone, email, company, inn, comment)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (rtype, key, title, PRICES[rtype], name, phone, email, company, inn, comment))
    oid = cur.fetchone()[0]
    msg = (f"Заказ №{oid}: {REPORT_NAMES[rtype]}\n{title}\nЦена: {PRICES[rtype]:,} ₽\n".replace(',', ' ') +
           f"Ключ отчёта: {key or '—'}\nКомпания клиента: {company or '—'} {('ИНН ' + inn) if inn else ''}\nКомментарий: {comment or '—'}")
    cur.execute(f"""INSERT INTO {S}.contact_requests (name, email, phone, company, message, source)
                    VALUES (%s,%s,%s,%s,%s,'analytics')""", (name, email or '—', phone or '—', company or None, msg))
    conn.commit()
    conn.close()
    notify(f'Аналитика: заказ №{oid} — {REPORT_NAMES[rtype]}', f'Имя: {name}\nТелефон: {phone or "—"}\nEmail: {email or "—"}\n{msg}')
    return resp({'ok': True, 'order_id': oid})


def action_orders(admin):
    if not admin:
        return err('Не авторизован', 401)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f'SELECT * FROM {S}.biz_report_orders ORDER BY id DESC LIMIT 200')
    out = rows(cur)
    conn.close()
    return resp({'items': out})


def handler(event: dict, context) -> dict:
    """Бизнес-аналитика: обзор, рынки, рейтинги, отчёт о компании, проверка контрагента, заказы отчётов."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    p = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = body.get('action') or p.get('action') or 'overview'
    admin = is_admin(event)
    if action == 'overview':
        return action_overview()
    if action == 'okved':
        return action_okved(p)
    if action == 'market':
        return action_market(p, admin)
    if action == 'company':
        return action_company(p, admin)
    if action == 'search':
        return action_search(p)
    if action == 'rating':
        return action_rating(p, admin)
    if action == 'order' and method == 'POST':
        return action_order(body)
    if action == 'orders':
        return action_orders(admin)
    return err('Неизвестное действие')
