"""Сбор данных для полных отчётов: рынок, компания, проверка контрагента."""
import json
import os
import re
import time
import urllib.request

import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')

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
MSP = {0: 'Крупная / без статуса', 1: 'Микро', 2: 'Малое', 3: 'Среднее'}
MARKET_COLS = ('companies, with_revenue, revenue, expenses, profitable, staff, median_revenue, top10_share, hhi, micro, '
               'small, medium, non_msp, new_3y, with_debt, debt_sum, usn, grants_companies, grants_sum')


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def money(v):
    v = float(v or 0)
    a = abs(v)
    if a >= 1e12:
        s = f'{v / 1e12:.1f} трлн ₽'
    elif a >= 1e9:
        s = f'{v / 1e9:.1f} млрд ₽'
    elif a >= 1e6:
        s = f'{v / 1e6:.1f} млн ₽'
    elif a >= 1e3:
        s = f'{v / 1e3:.0f} тыс. ₽'
    else:
        s = f'{v:.0f} ₽'
    return s.replace('.', ',')


def num(v):
    return f'{int(v or 0):,}'.replace(',', ' ')


def pct(a, b):
    return round(float(a or 0) / float(b) * 100, 1) if b else 0


def pf(a, b=None, d=1):
    v = pct(a, b) if b is not None else float(a or 0)
    return f'{v:.{d}f}'.replace('.', ',') + '%'


def dt(v):
    s = str(v or '')[:10]
    return '.'.join(reversed(s.split('-'))) if len(s) == 10 and s[4] == '-' else s


def pretty(name):
    s = re.sub(r'\s+', ' ', name or '').strip()
    for long, short in (('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', 'ООО'), ('ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ПАО'),
                        ('НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'АО'), ('АКЦИОНЕРНОЕ ОБЩЕСТВО', 'АО'),
                        ('ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ЗАО'), ('ОТКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ОАО'),
                        ('СЕЛЬСКОХОЗЯЙСТВЕННЫЙ ПРОИЗВОДСТВЕННЫЙ КООПЕРАТИВ', 'СПК'),
                        ('КРЕСТЬЯНСКОЕ (ФЕРМЕРСКОЕ) ХОЗЯЙСТВО', 'КФХ')):
        if s.upper().startswith(long):
            s = short + s[len(long):]
            break
    return re.sub(r'"([^"]+)"', r'«\1»', s.replace('""', '"'))


def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def okved_names(cur, codes):
    codes = [c for c in set(codes) if c]
    if not codes:
        return {}
    cur.execute(f'SELECT code, name, section FROM {S}.biz_okved WHERE code = ANY(%s)', (codes,))
    return {r['code']: r for r in cur.fetchall()}


def mfilter(okved, region, alias=''):
    p = f'{alias}.' if alias else ''
    where, args = [], []
    if okved and okved != 'ALL':
        if len(okved) == 2:
            where.append(f'{p}okved2 = %s')
            args.append(okved)
        else:
            where.append(f'({p}okved = %s OR {p}okved LIKE %s)')
            args += [okved, okved + '.%']
    if region and region != 'RU':
        where.append(f'{p}region = %s')
        args.append(region)
    return (' WHERE ' + ' AND '.join(where)) if where else ' WHERE TRUE', args


def market(okved, region, limit_all=20000):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    w, a = mfilter(okved, region)
    cur.execute(f"""SELECT COUNT(*) AS companies, COUNT(*) FILTER (WHERE revenue > 0) AS with_revenue,
        COALESCE(SUM(revenue) FILTER (WHERE revenue > 0), 0) AS revenue,
        COALESCE(SUM(expenses) FILTER (WHERE revenue > 0), 0) AS expenses,
        COUNT(*) FILTER (WHERE revenue > expenses) AS profitable, COALESCE(SUM(staff), 0) AS staff,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) FILTER (WHERE revenue > 0), 0)::bigint AS median_revenue,
        COUNT(*) FILTER (WHERE msp_cat = 1) AS micro, COUNT(*) FILTER (WHERE msp_cat = 2) AS small,
        COUNT(*) FILTER (WHERE msp_cat = 3) AS medium, COUNT(*) FILTER (WHERE msp_cat = 0) AS non_msp,
        COUNT(*) FILTER (WHERE msp_year >= 2024) AS new_3y, COUNT(*) FILTER (WHERE tax_debt > 0) AS with_debt,
        COALESCE(SUM(tax_debt), 0) AS debt_sum, COUNT(*) FILTER (WHERE tax_mode IN ('УСН','АУСН')) AS usn
        FROM {S}.biz_companies{w}""", a)
    m = dict(cur.fetchone())
    okv2 = okved[:2] if okved != 'ALL' else 'ALL'
    cur.execute(f"SELECT {MARKET_COLS} FROM {S}.biz_markets WHERE okved2=%s AND region='RU'", (okv2,))
    nat = cur.fetchone()
    nat = dict(nat) if nat else None
    cur.execute(f"""SELECT inn, name, region, city, okved, revenue, expenses, staff, msp_cat, msp_year, tax_mode, tax_debt
                    FROM {S}.biz_companies{w} AND revenue > 0 ORDER BY revenue DESC LIMIT 50""", a)
    top = rows(cur)
    tot = float(m['revenue'] or 0) or 1
    hhi = 0.0
    cur.execute(f"SELECT revenue FROM {S}.biz_companies{w} AND revenue > 0", a)
    for r in cur.fetchall():
        hhi += (float(r['revenue']) / tot * 100) ** 2
    m['hhi'] = round(hhi, 1)
    m['top10_share'] = round(sum(float(t['revenue']) for t in top[:10]) / tot * 100, 1)
    sub_len = 5 if len(okved) >= 4 else 4
    cur.execute(f"""SELECT left(okved, %s) AS code, COUNT(*) AS companies, COALESCE(SUM(revenue) FILTER (WHERE revenue>0),0) AS revenue,
                    COALESCE(SUM(staff),0) AS staff FROM {S}.biz_companies{w} AND okved <> '' GROUP BY 1 ORDER BY 3 DESC LIMIT 15""",
                [sub_len] + a)
    segments = rows(cur)
    gw, ga = mfilter(okved, 'RU')
    cur.execute(f"""SELECT region, COUNT(*) AS companies, COALESCE(SUM(revenue) FILTER (WHERE revenue>0),0) AS revenue,
                    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) FILTER (WHERE revenue > 0), 0)::bigint AS median
                    FROM {S}.biz_companies{gw} GROUP BY 1 ORDER BY 3 DESC LIMIT 20""", ga)
    geo = rows(cur)
    cur.execute(f"""SELECT msp_year AS y, COUNT(*) AS n FROM {S}.biz_companies{w} AND msp_year >= 2016 GROUP BY 1 ORDER BY 1""", a)
    cohorts = rows(cur)
    cur.execute(f"""SELECT width_bucket(revenue, ARRAY[10000000, 120000000, 800000000, 2000000000, 10000000000]::bigint[]) AS b,
                    COUNT(*) AS n, SUM(revenue) AS s FROM {S}.biz_companies{w} AND revenue > 0 GROUP BY 1 ORDER BY 1""", a)
    labels = ['до 10 млн', '10–120 млн', '120–800 млн', '0,8–2 млрд', '2–10 млрд', 'более 10 млрд']
    size_dist = [{'label': labels[r['b']], 'companies': r['n'], 'revenue': r['s']} for r in cur.fetchall()]
    wa, aa = mfilter(okved, region, 'b')
    cur.execute(f"""SELECT r.inn, r.name, r.total_amount, r.last_date, r.source FROM {S}.radar_companies r
                    JOIN {S}.biz_companies b ON b.inn = r.inn{wa} ORDER BY r.total_amount DESC LIMIT 30""", aa)
    grants = rows(cur)
    cur.execute(f"""SELECT b.inn, b.name, b.region, b.city, b.okved, b.revenue, b.expenses, b.staff, b.msp_cat, b.msp_year,
                    b.tax_mode, b.tax_debt, r.website, r.phones, r.emails, r.head
                    FROM {S}.biz_companies b LEFT JOIN {S}.radar_companies r ON r.inn = b.inn{wa}
                    ORDER BY b.revenue DESC NULLS LAST LIMIT %s""", aa + [limit_all])
    all_rows = rows(cur)
    names = okved_names(cur, [s['code'] for s in segments] + [okved, okv2] + [x['okved'][:5] for x in all_rows[:2000]])
    conn.close()
    for s in segments:
        s['name'] = (names.get(s['code']) or {}).get('name', '')
    for g in geo:
        g['name'] = REGIONS.get(g['region'], g['region'])
    title = (names.get(okved) or names.get(okv2) or {}).get('name', 'Все отрасли') if okved != 'ALL' else 'Все отрасли'
    return {
        'okved': okved, 'region': region, 'okved_name': title, 'section': (names.get(okv2) or {}).get('section', ''),
        'region_name': 'Россия' if region == 'RU' else REGIONS.get(region, region), 'metrics': m, 'national': nat,
        'top': top, 'segments': segments, 'geo': geo, 'cohorts': cohorts, 'size_dist': size_dist, 'grants': grants,
        'all': all_rows, 'okved_names': {k: v['name'] for k, v in names.items()},
    }


def market_conclusions(d):
    m, nat = d['metrics'], d['national']
    out = []
    wr = m['with_revenue'] or 0
    t10 = float(m['top10_share'] or 0)
    hhi = float(m['hhi'] or 0)
    if hhi >= 2500:
        out.append(f'Высококонцентрированный рынок (HHI {hhi:.0f}): несколько игроков определяют цены. Вход — через узкую нишу, '
                   f'субподряд или партнёрство с лидерами.')
    elif hhi >= 1500:
        out.append(f'Умеренно концентрированный рынок (HHI {hhi:.0f}). Топ-10 держат {t10:.0f}% выручки — '
                   f'конкурировать с лидерами напрямую дорого, но средний сегмент открыт.')
    else:
        out.append(f'Конкурентный, раздробленный рынок (HHI {hhi:.0f}, топ-10 — {t10:.0f}% выручки). '
                   f'Порог входа ниже, выигрывают сервис, скорость и цена.')
    if wr:
        prof = pct(m['profitable'], wr)
        margin = pf(float(m['revenue']) - float(m['expenses']), float(m['revenue']))
        out.append(f'{prof:.0f}% компаний с выручкой закончили 2025 год с доходами выше расходов; совокупная рентабельность '
                   f'рынка — {margin}. ' + ('Рынок здоровый, у клиентов есть деньги на развитие.' if prof >= 70 else
                                                 'Заметная доля убыточных — проверяйте платёжеспособность клиентов.'))
    if m['companies']:
        new = pct(m['new_3y'], m['companies'])
        out.append(f'{new:.0f}% игроков появились в реестре МСП в 2024–2026 годах. ' +
                   ('Высокий приток новичков — им нужны поставщики, оборудование, бухгалтерия, ИТ.' if new >= 25 else
                    'Рынок зрелый, состав игроков стабилен.'))
        debt = pct(m['with_debt'], m['companies'])
        if debt >= 10:
            out.append(f'У {debt:.0f}% компаний есть налоговая недоимка на {money(m["debt_sum"])}. '
                       f'Работайте по предоплате или проверяйте каждого контрагента.')
    if nat and d['region'] != 'RU' and nat.get('median_revenue'):
        k = float(m['median_revenue'] or 0) / float(nat['median_revenue'])
        out.append(f'Медианная выручка компании в регионе — {money(m["median_revenue"])}, это {k:.1f}'.replace('.', ',') +
                   f' от уровня России ({money(nat["median_revenue"])}).')
    if d['grants']:
        s = sum(float(g['total_amount'] or 0) for g in d['grants'])
        out.append(f'{len(d["grants"])} компаний рынка получили {money(s)} господдержки в 2024–2026 годах — у них есть бюджет '
                   f'на закупки и модернизацию; список — в приложении Excel.')
    mid = [t for t in d['top'][10:50] if t.get('msp_cat') in (2, 3)]
    if mid:
        out.append(f'Потенциальные партнёры и клиенты второго эшелона: {", ".join(pretty(t["name"]) for t in mid[:5])} — '
                   f'выручка от {money(mid[min(4, len(mid) - 1)]["revenue"])} до {money(mid[0]["revenue"])}.')
    return out


def dadata(inn):
    key = os.environ.get('DADATA_API_KEY', '')
    if not key:
        return None
    req = urllib.request.Request('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
                                 data=json.dumps({'query': inn, 'count': 1}).encode(),
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json',
                                          'Authorization': f'Token {key}'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=4) as r:
            s = json.loads(r.read()).get('suggestions') or []
            return s[0] if s else None
    except Exception:
        return None


def risk(c, d):
    factors, score = [], 0
    st = ((d or {}).get('state') or {}).get('status') or ''
    if st in ('LIQUIDATED', 'BANKRUPT'):
        factors.append(('high', 'Компания ликвидирована или признана банкротом'))
        score += 80
    elif st in ('LIQUIDATING', 'REORGANIZING'):
        factors.append(('high', 'Компания в процессе ликвидации или реорганизации'))
        score += 50
    debt = c.get('tax_debt') or 0
    rev = c.get('revenue')
    if debt > 0:
        rel = debt / rev * 100 if rev else None
        lvl = 'high' if (debt > 1_000_000 or (rel and rel > 5)) else 'mid'
        factors.append((lvl, f'Налоговая недоимка {money(debt)}' + (f' — {rel:.1f}% от выручки' if rel else '')))
        score += 25 if lvl == 'high' else 10
    if rev is not None and c.get('expenses') is not None and rev < c['expenses']:
        factors.append(('mid', f'Расходы превысили доходы на {money(c["expenses"] - rev)} по итогам 2025 года'))
        score += 15
    if rev is None:
        factors.append(('mid', 'Нет данных о выручке за 2025 год в открытой отчётности'))
        score += 10
    elif rev == 0:
        factors.append(('mid', 'Нулевая выручка за 2025 год'))
        score += 15
    if c.get('staff') is not None and c['staff'] <= 1 and (rev or 0) > 100_000_000:
        factors.append(('mid', 'Выручка более 100 млн ₽ при 0–1 сотруднике — признак транзитной компании'))
        score += 15
    reg = ((d or {}).get('state') or {}).get('registration_date')
    if reg:
        age = (time.time() - reg / 1000) / (365.25 * 86400)
        if age < 1:
            factors.append(('mid', 'Компании меньше года'))
            score += 10
        elif age >= 5:
            factors.append(('good', f'Работает {int(age)} лет'))
    if ((d or {}).get('address') or {}).get('invalidity'):
        factors.append(('high', 'Адрес отмечен как недостоверный в ЕГРЮЛ'))
        score += 25
    if not debt and rev and c.get('expenses') is not None and rev >= c['expenses']:
        factors.append(('good', 'Нет налоговых долгов, доходы выше расходов'))
    score = min(100, score)
    return {'score': score, 'level': 'high' if score >= 50 else 'mid' if score >= 20 else 'low', 'factors': factors}


def company(inn):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f'SELECT * FROM {S}.biz_companies WHERE inn = %s', (inn,))
    c = cur.fetchone()
    c = dict(c) if c else {'inn': inn, 'name': '', 'region': inn[:2], 'okved': '', 'okved2': '', 'revenue': None,
                           'expenses': None, 'staff': None, 'tax_mode': '', 'tax_debt': 0, 'msp_cat': 0, 'msp_year': 0, 'city': ''}
    eg = dadata(inn)
    d = (eg or {}).get('data') or {}
    if eg and not c['name']:
        c['name'] = eg.get('value') or ''
    if not c['okved'] and d.get('okved'):
        c['okved'], c['okved2'] = d['okved'], d['okved'][:2]
    peers = None
    if c.get('okved2') and c.get('revenue') is not None:
        cur.execute(f"""SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE revenue > %s) + 1 AS rank,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) AS med,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (revenue - expenses)::float / NULLIF(revenue, 0)) AS med_margin,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue::float / NULLIF(staff, 0)) FILTER (WHERE staff > 0) AS med_rps
                        FROM {S}.biz_companies WHERE okved2 = %s AND region = %s AND revenue > 0""",
                    (c['revenue'], c['okved2'], c['region']))
        peers = dict(cur.fetchone())
        cur.execute(f"""SELECT COUNT(*) FILTER (WHERE revenue > %s) + 1 AS rank, COUNT(*) AS n FROM {S}.biz_companies
                        WHERE okved2 = %s AND revenue > 0""", (c['revenue'], c['okved2']))
        r = cur.fetchone()
        peers['rank_ru'], peers['n_ru'] = r['rank'], r['n']
    cur.execute(f"""SELECT b.inn, b.name, b.city, b.revenue, b.expenses, b.staff, b.msp_cat, b.tax_debt, r.website, r.phones, r.emails
                    FROM {S}.biz_companies b LEFT JOIN {S}.radar_companies r ON r.inn = b.inn
                    WHERE b.okved2 = %s AND b.region = %s AND b.inn <> %s AND b.revenue > 0
                    ORDER BY abs(b.revenue - %s) LIMIT 30""",
                (c.get('okved2') or '', c.get('region') or '', inn, c.get('revenue') or 0))
    competitors = rows(cur)
    cur.execute(f"""SELECT total_amount, last_date, last_amount, source, source_full, payments, website, phones, emails, head
                    FROM {S}.radar_companies WHERE inn = %s""", (inn,))
    rc = cur.fetchone()
    ok = c.get('okved') or ''
    prefixes = [ok[:n] for n in (len(ok), 5, 4, 2) if ok]
    names = okved_names(cur, prefixes + [c.get('okved2') or ''])
    conn.close()
    rev, exp = c.get('revenue'), c.get('expenses')
    mg = d.get('management') or {}
    founders = [{'name': (f.get('name') or ((f.get('fio') or {}).get('source')) or ''), 'share': ((f.get('share') or {}).get('value'))}
                for f in (d.get('founders') or [])][:10]
    return {
        'inn': inn, 'name': c['name'], 'short': ((d.get('name') or {}).get('short_with_opf')) or pretty(c['name']),
        'full_name': ((d.get('name') or {}).get('full_with_opf')) or c['name'],
        'ogrn': d.get('ogrn') or '', 'kpp': d.get('kpp') or '', 'okpo': d.get('okpo') or '',
        'status': (d.get('state') or {}).get('status') or '', 'registered': (d.get('state') or {}).get('registration_date'),
        'region': c.get('region'), 'region_name': REGIONS.get(c.get('region'), ''),
        'address': ((d.get('address') or {}).get('unrestricted_value')) or ((d.get('address') or {}).get('value')) or '',
        'okved': ok, 'okved_name': next((names[x]['name'] for x in prefixes if x in names), ''),
        'okved2': c.get('okved2'), 'okved2_name': (names.get(c.get('okved2') or '') or {}).get('name', ''),
        'head': mg.get('name') or (rc or {}).get('head') or '', 'head_post': mg.get('post') or '',
        'founders': founders, 'capital': ((d.get('capital') or {}).get('value')), 'branches': d.get('branch_count'),
        'msp': MSP.get(c.get('msp_cat') or 0), 'msp_year': c.get('msp_year') or None, 'staff': c.get('staff'),
        'tax_mode': c.get('tax_mode') or '', 'tax_debt': c.get('tax_debt') or 0,
        'revenue': rev, 'expenses': exp, 'profit': (rev - exp) if rev is not None and exp is not None else None,
        'margin': round((rev - exp) / rev * 100, 1) if rev and exp is not None else None,
        'rev_per_staff': round(rev / c['staff']) if rev and c.get('staff') else None,
        'peers': peers, 'competitors': competitors, 'grant': dict(rc) if rc and rc.get('total_amount') else None,
        'contacts': {k: (rc or {}).get(k) or '' for k in ('website', 'phones', 'emails')},
        'risk': risk(c, d), 'egrul': bool(eg),
    }


def database(db_slug, extra):
    """Данные для выгрузки базы: те же разделы, что в отчёте о рынке, но по произвольным фильтрам."""
    import databases as dbs
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    title, base = 'Своя база компаний', {}
    if db_slug:
        cur.execute(f'SELECT title, filters FROM {S}.biz_databases WHERE slug = %s', (db_slug,))
        r = cur.fetchone()
        if r:
            title, base = r['title'], dbs.norm_filters(r['filters'])
    f = {**base, **dbs.norm_filters(extra)}
    an = dbs.analyze(cur, S, f, REGIONS, okved_names)
    m = an['metrics']
    joins, w, a = dbs.build_where(f)
    joins = joins.replace('{S}', S)
    cur.execute(f"""SELECT b.inn, b.name, b.region, b.city, b.okved, b.revenue, b.expenses, b.staff, b.msp_cat, b.msp_year,
                    b.tax_mode, b.tax_debt FROM {S}.biz_companies b{joins}{w} AND b.revenue > 0
                    ORDER BY b.revenue DESC LIMIT 50""", a)
    top = rows(cur)
    tot = float(m['revenue'] or 0) or 1
    m['top10_share'] = round(sum(float(t['revenue']) for t in top[:10]) / tot * 100, 1)
    cur.execute(f"SELECT b.revenue FROM {S}.biz_companies b{joins}{w} AND b.revenue > 0", a)
    m['hhi'] = round(sum((float(r['revenue']) / tot * 100) ** 2 for r in cur.fetchall()), 1)
    gj = joins if joins else ''
    cur.execute(f"""SELECT r2.inn, r2.name, r2.total_amount, r2.last_date, r2.source FROM {S}.radar_companies r2
                    JOIN {S}.biz_companies b ON b.inn = r2.inn{gj}{w} ORDER BY r2.total_amount DESC LIMIT 30""", a)
    grants = rows(cur)
    cur.execute(f"""SELECT b.inn, b.name, b.region, b.city, b.okved, b.revenue, b.expenses, b.staff, b.msp_cat, b.msp_year,
                    b.tax_mode, b.tax_debt, rc.website, rc.phones, rc.emails, rc.head
                    FROM {S}.biz_companies b{joins} LEFT JOIN {S}.radar_companies rc ON rc.inn = b.inn{w}
                    ORDER BY b.revenue DESC NULLS LAST LIMIT 150000""", a)
    all_rows = rows(cur)
    names = okved_names(cur, list({x['okved'][:5] for x in all_rows if x['okved']} | {x['okved'][:4] for x in all_rows if x['okved']})[:3000])
    conn.close()
    geo = [{'region': r['region'], 'name': r['name'], 'companies': r['companies'], 'revenue': r['revenue'], 'median': 0} for r in an['by_region']]
    regions_txt = ', '.join(REGIONS.get(x, x) for x in f.get('region', [])) or 'Россия'
    return {
        'okved': ','.join(f.get('okved2', []) + f.get('okved', [])) or 'ALL', 'region': 'RU' if not f.get('region') else ','.join(f['region']),
        'okved_name': title, 'section': '', 'region_name': regions_txt, 'metrics': m, 'national': None, 'top': top,
        'segments': an['by_okved'], 'geo': geo, 'cohorts': an['cohorts'], 'size_dist': an['size_dist'], 'grants': grants,
        'all': all_rows, 'okved_names': {k: v['name'] for k, v in names.items()}, 'filters': f,
    }
