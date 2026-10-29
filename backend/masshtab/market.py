"""Лента ТАСС «Экономика и бизнес» и показатели Банка России (ключевая ставка, курсы). Кэш в БД."""
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

UA = {'User-Agent': 'Mozilla/5.0 (compatible; MasshtabBot/1.0; +https://mat-labs.ru/masshtab)'}
TTL = {'tass': 600, 'cbr': 3 * 3600}
TASS_RSS = 'https://tass.ru/rss/v2.xml'
SKIP = ('Спорт', 'Происшествия')


def tass():
    r = requests.get(TASS_RSS, headers=UA, timeout=6)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    out = []
    for it in root.findall('.//item'):
        cats = [c.text or '' for c in it.findall('category')]
        if not cats or cats[0] != 'Экономика и бизнес':
            continue
        enc = it.find('enclosure')
        try:
            dt = parsedate_to_datetime(it.findtext('pubDate') or '').isoformat()
        except (TypeError, ValueError):
            dt = None
        out.append({'title': (it.findtext('title') or '').strip(), 'link': it.findtext('link') or '', 'date': dt,
                    'desc': (it.findtext('description') or '').strip()[:300], 'tag': cats[1] if len(cats) > 1 else '',
                    'image': enc.get('url') if enc is not None else None})
    return {'items': out[:30]}


def _num(s):
    return float(str(s).replace(',', '.').replace('\xa0', '').strip())


def cbr():
    out = {}
    r = requests.get('https://www.cbr.ru/scripts/XML_daily.asp', headers=UA, timeout=6)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    out['rates_date'] = root.get('Date')
    for v in root.findall('Valute'):
        code = v.findtext('CharCode')
        if code in ('USD', 'EUR', 'CNY'):
            out[code] = round(_num(v.findtext('Value')) / _num(v.findtext('Nominal')), 4)
    try:
        prev = requests.get('https://www.cbr-xml-daily.ru/daily_json.js', headers=UA, timeout=5).json()
        out['prev'] = {k: prev['Valute'][k]['Previous'] for k in ('USD', 'EUR', 'CNY') if k in prev.get('Valute', {})}
    except Exception:
        out['prev'] = {}
    try:
        k = requests.get('https://www.cbr.ru/hd_base/KeyRate/', headers=UA, timeout=6).text
        rows = re.findall(r'<td>(\d\d\.\d\d\.\d{4})</td>\s*<td>([\d,]+)</td>', k)
        if rows:
            out['key_rate'] = _num(rows[0][1])
            out['key_rate_date'] = rows[0][0]
    except Exception as e:
        print(f'[masshtab] keyrate: {e}')
    return out


SOURCES = {'tass': tass, 'cbr': cbr}


def get(conn, S, key):
    cur = conn.cursor()
    cur.execute(f"SELECT data, updated_at FROM {S}.mag_cache WHERE key=%s", (key,))
    row = cur.fetchone()
    age = (datetime.now(timezone.utc) - row['updated_at']).total_seconds() if row else 1e9
    if row and age < TTL[key]:
        return row['data'], row['updated_at']
    try:
        data = SOURCES[key]()
    except Exception as e:
        print(f'[masshtab] {key}: {e}')
        return (row['data'], row['updated_at']) if row else ({}, None)
    if key == 'cbr' and row and not data.get('key_rate') and row['data'].get('key_rate'):
        data['key_rate'], data['key_rate_date'] = row['data']['key_rate'], row['data'].get('key_rate_date')
    cur.execute(f"""INSERT INTO {S}.mag_cache (key, data, updated_at) VALUES (%s, %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW() RETURNING updated_at""",
                (key, json.dumps(data, ensure_ascii=False)))
    conn.commit()
    return data, cur.fetchone()['updated_at']
