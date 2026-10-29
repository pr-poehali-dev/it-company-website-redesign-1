"""Загрузка истории выручки 2021–2025 из ГИР БО (bo.nalog.gov.ru) для кандидатов в «Масштаб-500»."""
import time

import psycopg2.extras
import requests

BO = 'https://bo.nalog.gov.ru'
H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0', 'Accept': 'application/json', 'Referer': 'https://bo.nalog.gov.ru/'}


def history(s, inn):
    r = s.get(f'{BO}/advanced-search/organizations/search', params={'query': inn, 'page': 0}, timeout=6)
    if r.status_code == 429:
        raise RuntimeError('rate')
    r.raise_for_status()
    c = [x for x in r.json().get('content') or [] if (x.get('inn') or '').replace('<strong>', '').replace('</strong>', '') == inn]
    if not c:
        return {}
    b = s.get(f"{BO}/nbo/organizations/{c[0]['id']}/bfo/", timeout=6)
    if b.status_code == 429:
        raise RuntimeError('rate')
    b.raise_for_status()
    out = {}
    for x in b.json():
        y = str(x.get('period') or '')
        if y in ('2021', '2022', '2023', '2024', '2025') and x.get('gainSum') is not None:
            out[y] = int(x['gainSum']) * 1000
    return out


def growth(h):
    base = h.get('2022')
    last = h.get('2025')
    if not base or not last or base <= 0:
        return None
    return round((last / base - 1) * 100, 2)


def run(conn, S, b, deadline):
    cur = conn.cursor()
    n = max(1, min(400, int(b.get('n') or 120)))
    cur.execute(f"""SELECT c.inn FROM {S}.biz_companies c LEFT JOIN {S}.m500_companies m ON m.inn = c.inn
                    WHERE m.inn IS NULL AND length(c.inn) = 10 AND c.revenue >= 300000000
                    AND c.okved2 NOT IN ('64','65','66','84','99') AND NOT (c.msp_year BETWEEN 2023 AND 2026)
                    ORDER BY c.msp_year DESC, c.revenue DESC LIMIT %s""", (n,))
    inns = [r['inn'] for r in cur.fetchall()]
    s = requests.Session()
    s.headers.update(H)
    done, rows, errors = 0, [], 0
    for inn in inns:
        if time.time() > deadline:
            break
        try:
            h = history(s, inn)
        except RuntimeError:
            time.sleep(2)
            break
        except Exception:
            errors += 1
            if errors > 15:
                break
            continue
        rows.append((inn, h.get('2021'), h.get('2022'), h.get('2023'), h.get('2024'), h.get('2025'), growth(h)))
        done += 1
        time.sleep(0.05)
    if rows:
        psycopg2.extras.execute_values(cur, f"""INSERT INTO {S}.m500_companies (inn, rev2021, rev2022, rev2023, rev2024, rev2025, growth)
            VALUES %s ON CONFLICT (inn) DO UPDATE SET rev2021=EXCLUDED.rev2021, rev2022=EXCLUDED.rev2022, rev2023=EXCLUDED.rev2023,
            rev2024=EXCLUDED.rev2024, rev2025=EXCLUDED.rev2025, growth=EXCLUDED.growth, checked_at=NOW()""", rows)
        conn.commit()
    cur.execute(f"SELECT COUNT(*) n FROM {S}.m500_companies")
    return {'ok': True, 'done': done, 'errors': errors, 'total': cur.fetchone()['n'], 'left': len(inns) - done}


def candidates(conn, S, b):
    cur = conn.cursor()
    after = str(b.get('after') or '')
    cur.execute(f"""SELECT c.inn FROM {S}.biz_companies c LEFT JOIN {S}.m500_companies m ON m.inn = c.inn
                    WHERE m.inn IS NULL AND length(c.inn) = 10 AND c.revenue >= 300000000 AND c.inn > %s
                    AND c.okved2 NOT IN ('64','65','66','84','99') AND NOT (c.msp_year BETWEEN 2023 AND 2026)
                    ORDER BY c.inn LIMIT 20000""", (after,))
    return {'inns': [r['inn'] for r in cur.fetchall()]}


def save(conn, S, b):
    rows = []
    for r in (b.get('rows') or [])[:3000]:
        h = {str(k): (int(v) if v is not None else None) for k, v in (r.get('h') or {}).items()}
        rows.append((str(r['inn'])[:12], h.get('2021'), h.get('2022'), h.get('2023'), h.get('2024'), h.get('2025'), growth(h)))
    if rows:
        cur = conn.cursor()
        psycopg2.extras.execute_values(cur, f"""INSERT INTO {S}.m500_companies (inn, rev2021, rev2022, rev2023, rev2024, rev2025, growth)
            VALUES %s ON CONFLICT (inn) DO UPDATE SET rev2021=EXCLUDED.rev2021, rev2022=EXCLUDED.rev2022, rev2023=EXCLUDED.rev2023,
            rev2024=EXCLUDED.rev2024, rev2025=EXCLUDED.rev2025, growth=EXCLUDED.growth, checked_at=NOW()""", rows, page_size=1000)
        conn.commit()
    return {'ok': True, 'saved': len(rows)}


def rerank(conn, S):
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.m500_companies SET ok = FALSE, rank_ru = NULL WHERE ok OR rank_ru IS NOT NULL")
    cur.execute(f"""UPDATE {S}.m500_companies m SET ok = TRUE FROM {S}.biz_companies c
        WHERE c.inn = m.inn AND m.growth IS NOT NULL AND m.rev2025 >= 100000000 AND m.rev2022 >= 30000000
        AND m.rev2023 > 0 AND m.rev2024 > 0 AND c.okved2 NOT IN ('', '64', '65', '66', '84', '99')
        AND c.name NOT LIKE '%%ЗАСТРОЙЩИК%%' AND c.name NOT ILIKE '%%застройщик%%'
        AND m.rev2023::float / m.rev2022 BETWEEN 0.3 AND 12 AND m.rev2024::float / m.rev2023 BETWEEN 0.3 AND 12
        AND m.rev2025::float / m.rev2024 BETWEEN 0.3 AND 12
        AND abs(c.revenue - m.rev2025) < 0.2 * greatest(c.revenue, m.rev2025)""")
    ok = cur.rowcount
    cur.execute(f"""UPDATE {S}.m500_companies m SET rank_ru = r.rk FROM (
        SELECT inn, ROW_NUMBER() OVER (ORDER BY growth DESC, rev2025 DESC) rk FROM {S}.m500_companies WHERE ok) r
        WHERE r.inn = m.inn AND r.rk <= 500""")
    conn.commit()
    return {'ok': True, 'eligible': ok}
