"""Коннекторы к источникам данных. Каждый возвращает (rows: list[dict], note: str)."""
import csv
import io
import json
import re
import time
from urllib.parse import urlparse, parse_qs, quote

import requests
import urllib3

urllib3.disable_warnings()

UA = {'User-Agent': 'MatLabs-DataPipes/1.0'}


class SourceError(Exception):
    pass


SECRET_FIELDS = {
    'postgres': ['password'],
    'mysql': ['password'],
    'amocrm': ['token'],
    'bitrix24': ['webhook'],
    'onec': ['password'],
    'metrika': ['token'],
    'moysklad': ['token'],
    'json_api': ['header_value'],
    'google_sheets': [],
    'file_url': [],
    'zakupki': [],
}

KINDS = set(SECRET_FIELDS)


def flatten(obj, prefix='', out=None, depth=0):
    if out is None:
        out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).startswith('@odata') or str(k).startswith('_links') or k == 'meta':
                continue
            key = f'{prefix}.{k}' if prefix else str(k)
            if isinstance(v, dict) and depth < 2:
                flatten(v, key, out, depth + 1)
            elif isinstance(v, list):
                scal = [x for x in v if not isinstance(x, (dict, list))]
                if scal:
                    out[key] = ', '.join(str(x) for x in scal[:20])
            elif not isinstance(v, dict):
                out[key] = v
    return out


def http_get(url, budget, **kw):
    left = budget - time.time()
    if left < 0.6:
        raise TimeoutError
    try:
        r = requests.get(url, timeout=min(20, max(0.5, left - 0.2)), headers={**UA, **kw.pop('headers', {})}, **kw)
    except requests.exceptions.SSLError:
        raise SourceError('Ошибка SSL-сертификата сервера источника')
    except requests.exceptions.ConnectionError:
        raise SourceError('Сервер источника недоступен — проверьте адрес и что он открыт из интернета')
    except requests.exceptions.Timeout:
        raise SourceError('Источник не ответил вовремя')
    if r.status_code in (401, 403):
        raise SourceError('Доступ запрещён: проверьте токен, логин и пароль или права доступа')
    if r.status_code == 404:
        raise SourceError('Адрес не найден (404) — проверьте ссылку или название объекта')
    if r.status_code == 429:
        raise SourceError('Источник ограничил частоту запросов — попробуйте через несколько минут')
    if r.status_code >= 400:
        raise SourceError(f'Источник вернул ошибку {r.status_code}: {r.text[:200]}')
    return r


def parse_table_bytes(data: bytes, name: str = '') -> list:
    if data[:2] == b'PK' or name.lower().endswith(('.xlsx', '.xlsm')):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        ws = wb.worksheets[0]
        it = ws.iter_rows(values_only=True)
        head = None
        rows = []
        for r in it:
            if head is None:
                if r and any(c not in (None, '') for c in r):
                    head = [str(c).strip() if c not in (None, '') else f'Колонка {i + 1}' for i, c in enumerate(r)]
                continue
            rows.append({head[i]: (v.isoformat() if hasattr(v, 'isoformat') else v) for i, v in enumerate(r[:len(head)])})
        return rows
    try:
        text = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = data.decode('cp1251', errors='replace')
    if text.lstrip().startswith('<'):
        raise SourceError('По ссылке открылась веб-страница, а не таблица — проверьте доступ по ссылке')
    first = text.split('\n', 1)[0]
    sep = max([';', ',', '\t', '|'], key=lambda s: first.count(s))
    reader = csv.reader(io.StringIO(text), delimiter=sep)
    head = None
    rows = []
    for r in reader:
        if head is None:
            if any(c.strip() for c in r):
                head = [c.strip() or f'Колонка {i + 1}' for i, c in enumerate(r)]
            continue
        rows.append({head[i]: v for i, v in enumerate(r[:len(head)])})
    return rows


def c_google_sheets(cfg, budget, limit):
    url = (cfg.get('url') or '').strip()
    m = re.search(r'/spreadsheets/d/([\w-]+)', url)
    if not m:
        raise SourceError('Нужна ссылка вида docs.google.com/spreadsheets/d/…')
    gid = parse_qs(urlparse(url).query).get('gid', [None])[0] or (re.search(r'gid=(\d+)', url) or [None, None])[1] or '0'
    r = http_get(f'https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=csv&gid={gid}', budget, allow_redirects=True)
    if 'text/html' in r.headers.get('Content-Type', ''):
        raise SourceError('Таблица закрыта. Откройте доступ: «Настройки доступа» → «Все, у кого есть ссылка» → «Читатель»')
    return parse_table_bytes(r.content)[:limit], 'Google Таблица прочитана'


def c_file_url(cfg, budget, limit):
    url = (cfg.get('url') or '').strip()
    if not url.startswith(('http://', 'https://')):
        raise SourceError('Укажите ссылку, начинающуюся с https://')
    name = urlparse(url).path
    if re.search(r'(disk\.yandex\.\w+|yadi\.sk)/', url):
        meta = http_get(f'https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key={quote(url, safe="")}', budget).json()
        if not meta.get('href'):
            raise SourceError('Не удалось получить файл с Яндекс Диска — проверьте, что ссылка публичная')
        url = meta['href']
        name = parse_qs(urlparse(url).query).get('filename', [''])[0]
    r = http_get(url, budget, allow_redirects=True)
    if len(r.content) > 60 * 1024 * 1024:
        raise SourceError('Файл больше 60 МБ')
    return parse_table_bytes(r.content, name)[:limit], 'Файл прочитан'


SELECT_RE = re.compile(r'^\s*(select|with)\b', re.I)
FORBID_RE = re.compile(r'\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do)\b', re.I)


def check_sql(q):
    q = (q or '').strip().rstrip(';')
    if not SELECT_RE.match(q) or FORBID_RE.search(q) or ';' in q:
        raise SourceError('Разрешён только один запрос SELECT — изменять данные в вашей базе мы не можем')
    return q


def c_postgres(cfg, budget, limit):
    import psycopg2
    q = check_sql(cfg.get('query'))
    try:
        conn = psycopg2.connect(host=cfg.get('host'), port=int(cfg.get('port') or 5432), dbname=cfg.get('database'),
                                user=cfg.get('user'), password=cfg.get('password'), connect_timeout=8,
                                sslmode=cfg.get('sslmode') or 'prefer', options='-c default_transaction_read_only=on -c statement_timeout=20000')
    except Exception as e:
        raise SourceError(f'Не удалось подключиться к PostgreSQL: {str(e).splitlines()[0][:200]}')
    try:
        cur = conn.cursor()
        cur.execute(q)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchmany(limit)]
    except Exception as e:
        raise SourceError(f'Ошибка в запросе: {str(e).splitlines()[0][:200]}')
    finally:
        conn.close()
    return [{k: (v.isoformat() if hasattr(v, 'isoformat') else (float(v) if type(v).__name__ == 'Decimal' else v)) for k, v in r.items()} for r in rows], 'Запрос выполнен'


def c_mysql(cfg, budget, limit):
    import pymysql
    q = check_sql(cfg.get('query'))
    try:
        conn = pymysql.connect(host=cfg.get('host'), port=int(cfg.get('port') or 3306), database=cfg.get('database'),
                               user=cfg.get('user'), password=cfg.get('password'), connect_timeout=8, read_timeout=20, charset='utf8mb4')
    except Exception as e:
        raise SourceError(f'Не удалось подключиться к MySQL: {str(e)[:200]}')
    try:
        cur = conn.cursor()
        cur.execute('SET SESSION TRANSACTION READ ONLY')
        cur.execute(q)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchmany(limit)]
    except Exception as e:
        raise SourceError(f'Ошибка в запросе: {str(e)[:200]}')
    finally:
        conn.close()
    return [{k: (v.isoformat() if hasattr(v, 'isoformat') else (float(v) if type(v).__name__ == 'Decimal' else v)) for k, v in r.items()} for r in rows], 'Запрос выполнен'


def c_amocrm(cfg, budget, limit):
    sub = re.sub(r'^https?://|\.amocrm\.(ru|com).*$', '', (cfg.get('subdomain') or '').strip())
    if not re.match(r'^[\w-]+$', sub):
        raise SourceError('Укажите поддомен amoCRM, например: mycompany')
    base = f'https://{sub}.amocrm.ru/api/v4'
    h = {'Authorization': f'Bearer {(cfg.get("token") or "").strip()}'}
    stages, users = {}, {}
    for p in http_get(f'{base}/leads/pipelines', budget, headers=h).json().get('_embedded', {}).get('pipelines', []):
        for s in p.get('_embedded', {}).get('statuses', []):
            stages[s['id']] = (p['name'], s['name'])
    ur = http_get(f'{base}/users?limit=250', budget, headers=h)
    for u in (ur.json().get('_embedded', {}).get('users', []) if ur.status_code == 200 and ur.content else []):
        users[u['id']] = u['name']
    rows, page = [], 1
    while len(rows) < limit:
        try:
            r = http_get(f'{base}/leads?limit=250&page={page}&order[id]=asc', budget, headers=h)
        except TimeoutError:
            break
        if r.status_code == 204 or not r.content:
            break
        items = r.json().get('_embedded', {}).get('leads', [])
        for l in items:
            pipe, stage = stages.get(l.get('status_id'), ('', ''))
            row = {
                'ID сделки': l['id'], 'Название': l.get('name'), 'Бюджет': l.get('price'), 'Воронка': pipe, 'Этап': stage,
                'Ответственный': users.get(l.get('responsible_user_id'), l.get('responsible_user_id')),
                'Создана': _ts(l.get('created_at')), 'Закрыта': _ts(l.get('closed_at')),
                'Результат': 'Успешно' if l.get('status_id') == 142 else 'Отказ' if l.get('status_id') == 143 else 'В работе',
            }
            for f in l.get('custom_fields_values') or []:
                vals = [str(v.get('value')) for v in f.get('values') or [] if v.get('value') is not None]
                row[f.get('field_name') or str(f.get('field_id'))] = ', '.join(vals)
            rows.append(row)
        if len(items) < 250:
            break
        page += 1
    return rows[:limit], f'Сделки amoCRM: {len(rows)}'


def _ts(v):
    if not v:
        return None
    return time.strftime('%Y-%m-%dT%H:%M:%S+00:00', time.gmtime(int(v)))


def c_bitrix24(cfg, budget, limit):
    hook = (cfg.get('webhook') or '').strip().rstrip('/') + '/'
    if not re.match(r'^https://[\w.-]+/rest/\d+/\w+/$', hook):
        raise SourceError('Нужен адрес входящего вебхука вида https://ваш.bitrix24.ru/rest/1/xxxxxxxx/')
    entity = cfg.get('entity') or 'deal'
    method = {'deal': 'crm.deal.list', 'lead': 'crm.lead.list', 'contact': 'crm.contact.list', 'company': 'crm.company.list'}.get(entity, 'crm.deal.list')
    statuses = {}
    st = http_get(hook + 'crm.status.list.json', budget).json()
    for s in st.get('result', []):
        statuses[s['STATUS_ID']] = s['NAME']
    rows, start = [], 0
    while len(rows) < limit:
        cmd = {f'p{i}': f'{method}?order[ID]=ASC&select[]=*&select[]=UF_*&start={start + i * 50}' for i in range(25)}
        try:
            r = requests.post(hook + 'batch.json', json={'halt': 0, 'cmd': cmd}, headers=UA, timeout=max(2, min(25, budget - time.time() - 0.5)))
        except requests.exceptions.RequestException:
            break
        if r.status_code >= 400:
            raise SourceError(f'Битрикс24 вернул ошибку {r.status_code}: {r.text[:200]}')
        res = r.json().get('result', {})
        if res.get('result_error'):
            err = next(iter(res['result_error'].values()), {})
            raise SourceError(f'Битрикс24: {err.get("error_description") or err}')
        got = 0
        for i in range(25):
            part = res.get('result', {}).get(f'p{i}') or []
            for d in part:
                for k in ('STAGE_ID', 'STATUS_ID', 'SOURCE_ID'):
                    if d.get(k) in statuses:
                        d[k + '_NAME'] = statuses[d[k]]
                rows.append(flatten(d))
            got += len(part)
            if len(part) < 50:
                got = -1
                break
        if got == -1 or time.time() > budget - 3:
            break
        start += 25 * 50
    return rows[:limit], f'Записей Битрикс24: {len(rows)}'


def c_onec(cfg, budget, limit):
    base = (cfg.get('url') or '').strip().rstrip('/')
    ent = (cfg.get('entity') or '').strip()
    if not base.startswith('http') or 'odata' not in base.lower():
        raise SourceError('Нужен адрес OData вида https://сервер/база/odata/standard.odata')
    if not ent:
        raise SourceError('Укажите объект, например Document_РеализацияТоваровУслуг')
    auth = (cfg.get('user') or '', cfg.get('password') or '')
    rows, skip, page = [], 0, 2000
    extra = ''
    if cfg.get('filter'):
        extra += '&$filter=' + quote(cfg['filter'])
    if cfg.get('select'):
        extra += '&$select=' + quote(cfg['select'])
    while len(rows) < limit:
        try:
            r = http_get(f'{base}/{quote(ent)}?$format=json&$top={page}&$skip={skip}{extra}', budget, auth=auth)
        except TimeoutError:
            break
        items = r.json().get('value', [])
        rows += [flatten(x) for x in items]
        if len(items) < page:
            break
        skip += page
    return rows[:limit], f'Записей 1С: {len(rows)}'


def c_metrika(cfg, budget, limit):
    counter = re.sub(r'\D', '', str(cfg.get('counter') or ''))
    if not counter:
        raise SourceError('Укажите номер счётчика Метрики')
    days = int(cfg.get('days') or 90)
    dims = {
        'sources': 'ym:s:date,ym:s:lastTrafficSource,ym:s:lastUTMSource,ym:s:lastUTMCampaign',
        'pages': 'ym:s:date,ym:s:startURLPath',
        'geo': 'ym:s:date,ym:s:regionCity,ym:s:deviceCategory',
    }.get(cfg.get('report') or 'sources')
    metrics = 'ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds'
    if cfg.get('goal'):
        g = re.sub(r'\D', '', str(cfg['goal']))
        metrics += f',ym:s:goal{g}reaches,ym:s:goal{g}conversionRate'
    url = (f'https://api-metrika.yandex.net/stat/v1/data?ids={counter}&metrics={metrics}&dimensions={dims}'
           f'&date1={days}daysAgo&date2=today&limit={min(limit, 100000)}&accuracy=full&lang=ru')
    r = http_get(url, budget, headers={'Authorization': f'OAuth {(cfg.get("token") or "").strip()}'})
    js = r.json()
    dn = [d.split(':')[-1] for d in dims.split(',')]
    names = {'date': 'Дата', 'lastTrafficSource': 'Источник', 'lastUTMSource': 'utm_source', 'lastUTMCampaign': 'utm_campaign',
             'startURLPath': 'Страница входа', 'regionCity': 'Город', 'deviceCategory': 'Устройство'}
    mn = ['Визиты', 'Посетители', 'Просмотры', 'Отказы, %', 'Время на сайте, сек', 'Достижения цели', 'Конверсия в цель, %']
    rows = []
    for item in js.get('data', []):
        row = {names.get(dn[i], dn[i]): (d.get('name') or d.get('id')) for i, d in enumerate(item['dimensions'])}
        for i, v in enumerate(item['metrics']):
            row[mn[i]] = round(v, 2)
        rows.append(row)
    return rows[:limit], f'Строк отчёта Метрики: {len(rows)}'


def c_moysklad(cfg, budget, limit):
    h = {'Authorization': f'Bearer {(cfg.get("token") or "").strip()}', 'Accept-Encoding': 'gzip'}
    rep = cfg.get('report') or 'demand'
    path = {'demand': 'entity/demand?expand=agent,state,store&order=moment,desc', 'customerorder': 'entity/customerorder?expand=agent,state&order=moment,desc',
            'product': 'entity/product?', 'stock': 'report/stock/all?', 'counterparty': 'entity/counterparty?'}.get(rep, 'entity/demand?')
    rows, offset = [], 0
    while len(rows) < limit:
        sep = '&' if '?' in path and not path.endswith('?') else ''
        try:
            r = http_get(f'https://api.moysklad.ru/api/remap/1.2/{path}{sep}limit=1000&offset={offset}', budget, headers=h)
        except TimeoutError:
            break
        items = r.json().get('rows', [])
        for x in items:
            f = flatten(x)
            for k in list(f):
                if k.endswith(('.href', '.metadataHref', '.type', '.mediaType', '.uuidHref', '.downloadHref')) or k in ('accountId', 'shared', 'printed', 'applicable'):
                    f.pop(k, None)
                elif re.search(r'(^|\.)(sum|price|payedSum|shippedSum|vatSum|salePrice|buyPrice)$', k) and isinstance(f[k], (int, float)):
                    f[k] = f[k] / 100
            rows.append(f)
        if len(items) < 1000:
            break
        offset += 1000
    return rows[:limit], f'Записей МойСклад: {len(rows)}'


def c_json_api(cfg, budget, limit):
    url = (cfg.get('url') or '').strip()
    if not url.startswith('https://'):
        raise SourceError('Нужна ссылка https://')
    headers = {}
    if cfg.get('header_name') and cfg.get('header_value'):
        headers[cfg['header_name'].strip()] = cfg['header_value'].strip()
    js = http_get(url, budget, headers=headers).json()
    for p in [x for x in (cfg.get('path') or '').split('.') if x]:
        js = js.get(p) if isinstance(js, dict) else None
    if isinstance(js, dict):
        js = next((v for v in js.values() if isinstance(v, list)), None)
    if not isinstance(js, list):
        raise SourceError('В ответе не найден список записей — укажите путь к массиву, например data.items')
    return [flatten(x) if isinstance(x, dict) else {'value': x} for x in js[:limit]], 'Ответ API прочитан'


EIS = 'https://zakupki.gov.ru/epz/order/extendedsearch/results.html'
EIS_KEYS = {'Объект закупки': 'Объект закупки', 'Заказчик': 'Заказчик', 'Организация, осуществляющая размещение': 'Заказчик',
            'Начальная цена': 'НМЦ, ₽', 'Размещено': 'Размещено', 'Окончание подачи заявок': 'Окончание подачи заявок'}


def _eis_words(v):
    return [w.strip() for w in re.split(r'[\n,;]+', v or '') if w.strip()][:15]


def _eis_parse(page):
    import html as h
    out = []
    for blk in page.split('search-registry-entry-block')[1:]:
        blk = re.sub(r'</?(span|b|em|mark)\b[^>]*>', '', re.sub(r'<script[\s\S]*?</script>', '', blk))
        t = h.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '|', blk)))
        parts = [re.sub(r'\s+', ' ', p).strip() for p in t.split('|') if p.strip() and not p.strip().startswith('<') and p.strip() != "'>"]
        e = {}
        for i, p in enumerate(parts):
            if p.startswith('№ ') and 'Номер' not in e:
                e['Номер'] = p[2:].strip()
                e['Статус'] = parts[i + 1] if i + 1 < len(parts) else ''
            elif p in EIS_KEYS and i + 1 < len(parts) and EIS_KEYS[p] not in e:
                e[EIS_KEYS[p]] = parts[i + 1]
            elif re.match(r'^(44|223)-ФЗ', p) and 'Способ' not in e:
                e['Способ'] = p.split(' ', 1)[1] if ' ' in p else ''
        if e.get('Номер'):
            e['Закон'] = '44-ФЗ' if e['Номер'].startswith('0') else '223-ФЗ'
            out.append(e)
    return out


def c_zakupki(cfg, budget, limit):
    from datetime import datetime, timedelta, timezone
    words = _eis_words(cfg.get('keywords'))
    if not words:
        raise SourceError('Укажите хотя бы одно ключевое слово или фразу')
    minus = [w.lower() for w in _eis_words(cfg.get('exclude'))]
    days = max(1, min(14, int(cfg.get('days') or 2)))
    law = cfg.get('law') or 'both'
    active = (cfg.get('only_active') or 'yes') == 'yes'
    msk = datetime.now(timezone(timedelta(hours=3)))
    base = {'morphology': 'on', 'recordsPerPage': '_100', 'sortBy': 'PUBLISH_DATE', 'sortDirection': 'false',
            'publishDateFrom': (msk - timedelta(days=days - 1)).strftime('%d.%m.%Y'), 'publishDateTo': msk.strftime('%d.%m.%Y')}
    if law in ('both', '44'):
        base['fz44'] = 'on'
    if law in ('both', '223'):
        base['fz223'] = 'on'
    if cfg.get('price_from') or cfg.get('price_to'):
        base['currencyIdGeneral'] = '-1'
        if cfg.get('price_from'):
            base['priceFromGeneral'] = re.sub(r'\D', '', cfg['price_from'])
        if cfg.get('price_to'):
            base['priceToGeneral'] = re.sub(r'\D', '', cfg['price_to'])
    if active:
        base['af'] = 'on'
    rows, seen, done = [], {}, 0
    for w in words:
        if budget - time.time() < 3:
            break
        left = budget - time.time()
        try:
            r = requests.get(EIS, params={**base, 'searchString': w}, timeout=min(20, max(2, left - 1)), verify=False,
                             headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
                                      'Accept-Language': 'ru-RU,ru;q=0.9'})
        except requests.exceptions.RequestException:
            continue
        if r.status_code == 429:
            time.sleep(2)
            continue
        if r.status_code >= 400:
            continue
        done += 1
        for e in _eis_parse(r.text):
            if e['Номер'] in seen:
                kw = seen[e['Номер']]
                if w not in kw['Ключевые слова']:
                    kw['Ключевые слова'] += ', ' + w
                continue
            text = (e.get('Объект закупки') or '').lower()
            if any(m in text for m in minus):
                continue
            if active and 'подача заявок' not in (e.get('Статус') or '').lower():
                continue
            e['Ключевые слова'] = w
            e['Ссылка'] = f"{EIS}?searchString={e['Номер']}"
            seen[e['Номер']] = e
            rows.append(e)
        time.sleep(0.4)
    if not done:
        raise SourceError('Сайт госзакупок не ответил — повторим попытку автоматически')
    order = ['Номер', 'Закон', 'Способ', 'Статус', 'Объект закупки', 'Заказчик', 'НМЦ, ₽', 'Размещено', 'Окончание подачи заявок', 'Ключевые слова', 'Ссылка']
    rows = [{k: r.get(k) for k in order} for r in rows]
    skipped = len(words) - done
    return rows[:limit], f'Закупок по {done} из {len(words)} запросов: {len(rows)}' + (f' (не ответили: {skipped})' if skipped else '')


CONNECTORS = {
    'google_sheets': c_google_sheets, 'file_url': c_file_url, 'postgres': c_postgres, 'mysql': c_mysql,
    'amocrm': c_amocrm, 'bitrix24': c_bitrix24, 'onec': c_onec, 'metrika': c_metrika, 'moysklad': c_moysklad, 'json_api': c_json_api,
    'zakupki': c_zakupki,
}


def fetch(kind, cfg, budget, limit):
    try:
        return CONNECTORS[kind](cfg, budget, limit)
    except TimeoutError:
        raise SourceError('Источник отвечает слишком медленно — не успели получить данные')
    except json.JSONDecodeError:
        raise SourceError('Источник вернул ответ не в формате JSON — проверьте адрес')
