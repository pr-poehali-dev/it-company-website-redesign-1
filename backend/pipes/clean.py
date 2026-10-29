"""Очистка и нормализация: пробелы, пустые строки, дубли, числа, даты, часовые пояса."""
import re
from datetime import datetime, timezone, timedelta

NUM_RE = re.compile(r'^-?[\d\s\u00a0]+([.,]\d+)?$')
DMY_RE = re.compile(r'^(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$')
ISO_RE = re.compile(r'^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$')

TZ = {'MSK': 3, 'UTC': 0, 'SAMT': 4, 'YEKT': 5, 'OMST': 6, 'KRAT': 7, 'IRKT': 8, 'VLAT': 10}

DEFAULT = {'trim': True, 'drop_empty': True, 'dedupe': True, 'numbers': True, 'dates': True, 'tz': 'MSK',
           'rename': {}, 'drop_columns': [], 'dedupe_key': ''}


def to_number(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return v
    s = str(v).strip().replace('₽', '').replace('руб.', '').replace('%', '').strip()
    if not s or not NUM_RE.match(s):
        return None
    s = s.replace(' ', '').replace('\u00a0', '').replace(',', '.')
    try:
        n = float(s)
    except ValueError:
        return None
    return int(n) if n.is_integer() and abs(n) < 1e15 else n


def to_date(v, tz_hours):
    if isinstance(v, datetime):
        dt = v
    else:
        s = str(v).strip()
        m = ISO_RE.match(s)
        if m:
            y, mo, d, hh, mi, ss, z = m.groups()
            try:
                dt = datetime(int(y), int(mo), int(d), int(hh or 0), int(mi or 0), int(ss or 0))
            except ValueError:
                return None
            if z:
                if z == 'Z':
                    off = timedelta(0)
                else:
                    sign = 1 if z[0] == '+' else -1
                    zz = z[1:].replace(':', '')
                    off = sign * timedelta(hours=int(zz[:2]), minutes=int(zz[2:]))
                dt = dt.replace(tzinfo=timezone(off))
            if not hh:
                return dt.strftime('%Y-%m-%d')
        else:
            m = DMY_RE.match(s)
            if not m:
                return None
            d, mo, y, hh, mi, ss = m.groups()
            y = int(y) + (2000 if len(y) == 2 else 0)
            try:
                dt = datetime(y, int(mo), int(d), int(hh or 0), int(mi or 0), int(ss or 0))
            except ValueError:
                return None
            if not hh:
                return dt.strftime('%Y-%m-%d')
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone(timedelta(hours=tz_hours))).replace(tzinfo=None)
    if dt.hour == 0 and dt.minute == 0 and dt.second == 0:
        return dt.strftime('%Y-%m-%d')
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def detect(rows, col):
    vals = [r.get(col) for r in rows[:3000] if r.get(col) not in (None, '')]
    if not vals:
        return 'text'
    nums = sum(1 for v in vals if to_number(v) is not None)
    dates = sum(1 for v in vals if not isinstance(v, (int, float)) and to_date(v, 3) is not None)
    if dates / len(vals) > 0.8:
        return 'date'
    if nums / len(vals) > 0.9 and not re.search(r'(инн|огрн|телефон|phone|кпп|бик|счёт|счет|индекс|номер|^id$)', col, re.I):
        return 'number'
    return 'text'


def clean(rows, opts):
    o = {**DEFAULT, **(opts or {})}
    tz = TZ.get(o.get('tz'), 3)
    stats = {'rows_in': len(rows), 'empty_rows': 0, 'dupes': 0, 'fixed_values': 0}
    rename = {k: v.strip() for k, v in (o.get('rename') or {}).items() if v and v.strip()}
    drop = set(o.get('drop_columns') or [])
    cols = []
    for r in rows[:500]:
        for k in r:
            if k not in cols:
                cols.append(k)
    cols = [c for c in cols if c not in drop]
    out = []
    for r in rows:
        row = {}
        for c in cols:
            v = r.get(c)
            if isinstance(v, str) and o['trim']:
                nv = re.sub(r'\s+', ' ', v).strip()
                if nv != v:
                    stats['fixed_values'] += 1
                v = nv if nv not in ('', '-', '—', 'NULL', 'null', 'None', '#N/A', 'н/д') else None
            row[c] = v
        if o['drop_empty'] and all(v in (None, '') for v in row.values()):
            stats['empty_rows'] += 1
            continue
        out.append(row)
    types = {}
    for c in cols:
        t = detect(out, c)
        types[c] = t
        if t == 'number' and o['numbers']:
            for row in out:
                v = row.get(c)
                if v is not None and not isinstance(v, (int, float)):
                    n = to_number(v)
                    row[c] = n
                    stats['fixed_values'] += 1
        elif t == 'date' and o['dates']:
            for row in out:
                v = row.get(c)
                if v is not None:
                    nv = to_date(v, tz)
                    if nv != v:
                        stats['fixed_values'] += 1
                    row[c] = nv
    if o['dedupe']:
        key = o.get('dedupe_key')
        seen = set()
        uniq = []
        for row in out:
            k = str(row.get(key)) if key and key in row else repr(tuple(row.get(c) for c in cols))
            if key and row.get(key) in (None, ''):
                uniq.append(row)
                continue
            if k in seen:
                stats['dupes'] += 1
                continue
            seen.add(k)
            uniq.append(row)
        out = uniq
    if rename:
        out = [{rename.get(k, k): v for k, v in row.items()} for row in out]
    columns = [{'name': rename.get(c, c), 'source': c, 'type': types[c],
                'empty': sum(1 for r in out if r.get(rename.get(c, c)) in (None, ''))} for c in cols]
    stats['rows_out'] = len(out)
    return out, columns, stats
