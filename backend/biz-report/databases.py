"""Справочник баз компаний: готовые базы по отраслям, регионам и сегментам + конструктор с анализом."""
import json
import re

import psycopg2.extras

SIZE_BUCKETS = ['до 10 млн', '10–120 млн', '120–800 млн', '0,8–2 млрд', '2–10 млрд', 'более 10 млрд']
SORTS = {'revenue': 'b.revenue DESC NULLS LAST', 'profit': '(b.revenue - b.expenses) DESC NULLS LAST',
         'staff': 'b.staff DESC NULLS LAST', 'debt': 'b.tax_debt DESC', 'new': 'b.msp_year DESC, b.revenue DESC NULLS LAST'}


def norm_filters(raw):
    """Приводит фильтры из запроса или из базы к безопасному виду."""
    f = raw or {}
    if isinstance(f, str):
        try:
            f = json.loads(f)
        except Exception:
            f = {}
    out = {}

    def lst(key, rx, n):
        v = f.get(key)
        if isinstance(v, str):
            v = [x for x in v.split(',') if x]
        if isinstance(v, list):
            vals = [str(x) for x in v if re.fullmatch(rx, str(x))][:n]
            if vals:
                out[key] = vals
    lst('okved2', r'\d{2}', 40)
    lst('okved', r'\d{2}(\.\d{1,2}){0,2}', 20)
    lst('region', r'\d{2}', 30)
    lst('msp_cat', r'[0-3]', 4)
    lst('tax_mode', r'(ОСН|УСН|АУСН|ЕСХН)', 4)
    for k in ('min_revenue', 'max_revenue', 'min_staff', 'max_staff', 'min_debt', 'msp_year_from'):
        try:
            v = int(float(f.get(k)))
            if v > 0:
                out[k] = v
        except (TypeError, ValueError):
            pass
    for k in ('profitable', 'no_debt', 'grants', 'has_contacts', 'loss'):
        if f.get(k) in (True, 'true', '1', 1):
            out[k] = True
    return out


def build_where(f, alias='b'):
    p = f'{alias}.'
    w, a = [], []
    if f.get('okved2'):
        w.append(f'{p}okved2 = ANY(%s)')
        a.append(f['okved2'])
    if f.get('okved'):
        parts = []
        for code in f['okved']:
            parts.append(f'({p}okved = %s OR {p}okved LIKE %s)')
            a += [code, code + '.%']
        w.append('(' + ' OR '.join(parts) + ')')
    if f.get('region'):
        w.append(f'{p}region = ANY(%s)')
        a.append(f['region'])
    if f.get('msp_cat'):
        w.append(f'{p}msp_cat = ANY(%s)')
        a.append([int(x) for x in f['msp_cat']])
    if f.get('tax_mode'):
        w.append(f'{p}tax_mode = ANY(%s)')
        a.append(f['tax_mode'])
    if f.get('min_revenue'):
        w.append(f'{p}revenue >= %s')
        a.append(f['min_revenue'])
    if f.get('max_revenue'):
        w.append(f'{p}revenue <= %s')
        a.append(f['max_revenue'])
    if f.get('min_staff'):
        w.append(f'{p}staff >= %s')
        a.append(f['min_staff'])
    if f.get('max_staff'):
        w.append(f'{p}staff <= %s')
        a.append(f['max_staff'])
    if f.get('min_debt'):
        w.append(f'{p}tax_debt >= %s')
        a.append(f['min_debt'])
    if f.get('msp_year_from'):
        w.append(f'{p}msp_year >= %s')
        a.append(f['msp_year_from'])
    if f.get('profitable'):
        w.append(f'{p}revenue > {p}expenses')
    if f.get('loss'):
        w.append(f'{p}revenue < {p}expenses')
    if f.get('no_debt'):
        w.append(f'{p}tax_debt = 0')
    joins = ''
    if f.get('grants') or f.get('has_contacts'):
        joins = f' JOIN {{S}}.radar_companies r ON r.inn = {alias}.inn'
        if f.get('has_contacts'):
            w.append("(r.phones <> '' OR r.emails <> '')")
    return joins, (' WHERE ' + ' AND '.join(w)) if w else ' WHERE TRUE', a


def analyze(cur, S, f, regions, okved_names_fn):
    joins, w, a = build_where(f)
    joins = joins.replace('{S}', S)
    base = f'FROM {S}.biz_companies b{joins}{w}'
    cur.execute(f"""SELECT COUNT(*) AS companies, COUNT(*) FILTER (WHERE b.revenue > 0) AS with_revenue,
        COALESCE(SUM(b.revenue) FILTER (WHERE b.revenue > 0), 0) AS revenue,
        COALESCE(SUM(b.expenses) FILTER (WHERE b.revenue > 0), 0) AS expenses,
        COUNT(*) FILTER (WHERE b.revenue > b.expenses) AS profitable, COALESCE(SUM(b.staff), 0) AS staff,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b.revenue) FILTER (WHERE b.revenue > 0), 0)::bigint AS median_revenue,
        COUNT(*) FILTER (WHERE b.msp_cat = 1) AS micro, COUNT(*) FILTER (WHERE b.msp_cat = 2) AS small,
        COUNT(*) FILTER (WHERE b.msp_cat = 3) AS medium, COUNT(*) FILTER (WHERE b.msp_cat = 0) AS non_msp,
        COUNT(*) FILTER (WHERE b.msp_year >= 2024) AS new_3y, COUNT(*) FILTER (WHERE b.tax_debt > 0) AS with_debt,
        COALESCE(SUM(b.tax_debt), 0) AS debt_sum, COUNT(*) FILTER (WHERE b.tax_mode IN ('УСН','АУСН')) AS usn,
        COUNT(*) FILTER (WHERE b.tax_mode = 'ОСН') AS osn {base}""", a)
    m = dict(cur.fetchone())
    if not m['companies']:
        return {'metrics': m, 'by_region': [], 'by_okved': [], 'size_dist': [], 'cohorts': [], 'tax': []}
    cur.execute(f"""SELECT b.region, COUNT(*) AS companies, COALESCE(SUM(b.revenue) FILTER (WHERE b.revenue>0),0) AS revenue,
                    COALESCE(SUM(b.staff),0) AS staff {base} GROUP BY 1 ORDER BY 3 DESC LIMIT 25""", a)
    by_region = [dict(r, name=regions.get(r['region'], r['region'])) for r in cur.fetchall()]
    multi_okved = not f.get('okved2') or len(f['okved2']) > 1
    grp = 'b.okved2' if multi_okved and not f.get('okved') else 'left(b.okved, 4)'
    cur.execute(f"""SELECT {grp} AS code, COUNT(*) AS companies, COALESCE(SUM(b.revenue) FILTER (WHERE b.revenue>0),0) AS revenue
                    {base} AND b.okved <> '' GROUP BY 1 ORDER BY 3 DESC LIMIT 15""", a)
    by_okved = [dict(r) for r in cur.fetchall()]
    names = okved_names_fn(cur, [x['code'] for x in by_okved])
    for x in by_okved:
        x['name'] = (names.get(x['code']) or {}).get('name', '')
    cur.execute(f"""SELECT width_bucket(b.revenue, ARRAY[10000000, 120000000, 800000000, 2000000000, 10000000000]::bigint[]) AS k,
                    COUNT(*) AS companies, SUM(b.revenue) AS revenue {base} AND b.revenue > 0 GROUP BY 1 ORDER BY 1""", a)
    size_dist = [{'label': SIZE_BUCKETS[r['k']], 'companies': r['companies'], 'revenue': r['revenue']} for r in cur.fetchall()]
    cur.execute(f"""SELECT b.msp_year AS y, COUNT(*) AS n {base} AND b.msp_year >= 2016 GROUP BY 1 ORDER BY 1""", a)
    cohorts = [dict(r) for r in cur.fetchall()]
    tax = [{'mode': k, 'n': m[v]} for k, v in (('ОСН', 'osn'), ('УСН / АУСН', 'usn'))]
    return {'metrics': m, 'by_region': by_region, 'by_okved': by_okved, 'size_dist': size_dist, 'cohorts': cohorts, 'tax': tax}


def companies_page(cur, S, f, sort, page, per, admin, regions):
    joins, w, a = build_where(f)
    joins = joins.replace('{S}', S)
    order = SORTS.get(sort, SORTS['revenue'])
    cur.execute(f"""SELECT b.inn, b.name, b.region, b.city, b.okved, b.revenue, b.expenses, b.staff, b.msp_cat, b.msp_year,
                    b.tax_mode, b.tax_debt FROM {S}.biz_companies b{joins}{w}
                    ORDER BY {order} LIMIT %s OFFSET %s""", a + [per, (page - 1) * per])
    items = [dict(r) for r in cur.fetchall()]
    free = 10
    for i, it in enumerate(items):
        it['region_name'] = regions.get(it['region'], '')
        gi = (page - 1) * per + i
        if not admin and gi >= free:
            it['name'], it['inn'], it['city'], it['locked'] = '', '', '', True
    return items


def list_databases(conn, S, refresh_fn):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT slug, title, subtitle, description, category, icon, filters, price, sort, stats, stats_at
                    FROM {S}.biz_databases WHERE is_active ORDER BY sort""")
    rows = [dict(r) for r in cur.fetchall()]
    stale = [r for r in rows if not r['stats']]
    for r in stale[:3]:
        r['stats'] = refresh_fn(conn, r['slug'], r['filters'])
    return rows


def compute_stats(cur, S, f):
    joins, w, a = build_where(f)
    joins = joins.replace('{S}', S)
    cur.execute(f"""SELECT COUNT(*) AS companies, COALESCE(SUM(b.revenue) FILTER (WHERE b.revenue > 0), 0) AS revenue,
                    COUNT(*) FILTER (WHERE b.revenue > 0) AS with_revenue, COUNT(*) FILTER (WHERE b.revenue > b.expenses) AS profitable,
                    COALESCE(SUM(b.staff), 0) AS staff, COUNT(DISTINCT b.region) AS regions
                    FROM {S}.biz_companies b{joins}{w}""", a)
    st = dict(cur.fetchone())
    join = joins or f' JOIN {S}.radar_companies r ON r.inn = b.inn'
    cur.execute(f"""SELECT COUNT(*) AS n FROM {S}.biz_companies b{join}{w} AND (r.phones <> '' OR r.emails <> '')""", a)
    st['with_contacts'] = cur.fetchone()['n']
    return st