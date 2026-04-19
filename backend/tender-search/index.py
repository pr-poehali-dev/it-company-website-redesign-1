"""
Поиск тендеров и заданий по ключевым словам: ЕИС (zakupki.gov.ru), фриланс-биржи (HH.ru, FL.ru, Habr Freelance, Upwork, Kwork).
Сохранение в избранное. ИИ-анализ тендера с генерацией КП.
"""
import json
import os
import urllib.request
import urllib.parse
import urllib.error
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

AI_URL = 'https://api.polza.ai/v1/chat/completions'

COMPANY_PROFILE = """
МАТ-Лабс — российская IT-компания полного цикла.
Специализация: разработка цифровых продуктов мирового уровня — от стартапа до корпорации.
Ключевые компетенции: искусственный интеллект (AI/ML), облачные решения, кибербезопасность,
веб и мобильная разработка, CRM/ERP системы, автоматизация бизнес-процессов, ИИ-агенты,
чат-боты, платформы управления данными, DevOps и MLOps.
Опыт: более 50 реализованных проектов, команда 50+ инженеров, дизайнеров и аналитиков.
"""


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}")


def is_admin(token: str) -> bool:
    if not token:
        return False
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM admin_sessions WHERE token = %s", (token,))
        return cur.fetchone() is not None
    finally:
        conn.close()


def http_get(url: str, headers: dict = None, timeout: int = 12) -> dict:
    req = urllib.request.Request(url, headers=headers or {
        'User-Agent': 'Mozilla/5.0 (compatible; TenderBot/1.0)',
        'Accept': 'application/json, text/html, */*',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            try:
                return {'ok': True, 'data': json.loads(raw), 'text': raw}
            except Exception:
                return {'ok': True, 'data': None, 'text': raw}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# ─── ИСТОЧНИКИ ПОИСКА ────────────────────────────────────────────────────────

def search_eis(query: str, page: int = 0) -> dict:
    """ЕИС zakupki.gov.ru — 44-ФЗ, 223-ФЗ, коммерческие"""
    encoded = urllib.parse.quote(query)
    api_url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.json"
        f"?searchString={encoded}&morphology=on"
        f"&pageNumber={page + 1}&sortDirection=false&recordsPerPage=_20"
        f"&showLotsInfoHidden=false&fz44=on&fz223=on&af=on&ca=on&statusList=ON"
    )
    search_url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.html"
        f"?searchString={encoded}&morphology=on&fz44=on&fz223=on&statusList=ON"
    )
    result = http_get(api_url)
    tenders = []
    if result['ok'] and result['data']:
        items = (result['data'].get('data', {}) or {}).get('list', []) or []
        for item in items:
            try:
                number = item.get('regNum') or item.get('purchaseNumber', '—')
                name = (item.get('purchaseObjectInfo') or '').strip()
                if not name:
                    continue
                price = float(item.get('nmck') or 0)
                customer = (item.get('customer', {}) or {}).get('mainInfo', {}).get('fullName', '—')
                end_date = (item.get('endDT') or '—')[:10]
                law = item.get('fzType', '44-ФЗ')
                status = (item.get('purchaseState', {}) or {}).get('name', 'Активный')
                tenders.append({
                    'id': number, 'name': name,
                    'price': price, 'price_fmt': f"{price:,.0f} ₽".replace(',', ' ') if price > 0 else 'Не указана',
                    'customer': customer, 'end_date': end_date, 'law': law,
                    'status': status, 'region': '—',
                    'url': f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNum={number}",
                    'source': 'ЕИС zakupki.gov.ru',
                })
            except Exception:
                continue
    total = 0
    if result['ok'] and result['data']:
        total = (result['data'].get('data', {}) or {}).get('totalCount', 0) or 0
    return {'tenders': tenders, 'total': total, 'search_url': search_url,
            'ok': result['ok'], 'error': result.get('error', '')}


def search_hh(query: str) -> dict:
    """HH.ru — вакансии и проекты для IT-компаний"""
    encoded = urllib.parse.quote(query)
    url = f"https://api.hh.ru/vacancies?text={encoded}&per_page=20&area=113&search_field=name&employment=project"
    search_url = f"https://hh.ru/search/vacancy?text={encoded}&employment=project"
    result = http_get(url, headers={'User-Agent': 'TenderBot/1.0 (mat-labs.ru)'})
    tenders = []
    if result['ok'] and result['data']:
        items = result['data'].get('items', [])
        for item in items:
            try:
                sal = item.get('salary') or {}
                price = sal.get('to') or sal.get('from') or 0
                price_fmt = '—'
                if sal.get('from') and sal.get('to'):
                    price_fmt = f"{sal['from']:,}–{sal['to']:,} {sal.get('currency','RUR')}".replace(',', ' ')
                elif sal.get('from'):
                    price_fmt = f"от {sal['from']:,} {sal.get('currency','RUR')}".replace(',', ' ')
                elif sal.get('to'):
                    price_fmt = f"до {sal['to']:,} {sal.get('currency','RUR')}".replace(',', ' ')
                tenders.append({
                    'id': f"hh_{item['id']}", 'name': item.get('name', ''),
                    'price': float(price), 'price_fmt': price_fmt,
                    'customer': (item.get('employer') or {}).get('name', '—'),
                    'end_date': '—', 'law': 'Проект/Фриланс',
                    'status': 'Активный',
                    'region': (item.get('area') or {}).get('name', '—'),
                    'url': item.get('alternate_url', search_url),
                    'source': 'HH.ru',
                })
            except Exception:
                continue
    return {'tenders': tenders, 'total': result['data'].get('found', len(tenders)) if result['ok'] and result['data'] else 0,
            'search_url': search_url, 'ok': result['ok'], 'error': result.get('error', '')}


def search_habr(query: str) -> dict:
    """Habr Freelance — IT-проекты"""
    encoded = urllib.parse.quote(query)
    url = f"https://freelance.habr.com/tasks?q={encoded}&page=1"
    search_url = f"https://freelance.habr.com/tasks?q={encoded}"
    result = http_get(url)
    tenders = []
    # Habr отдаёт HTML — парсим базово
    if result['ok'] and result['text']:
        import re
        text = result['text']
        # Ищем блоки задач
        task_blocks = re.findall(r'class="task__title"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>', text)
        price_blocks = re.findall(r'class="task__cost"[^>]*>([^<]+)</[^>]+>', text)
        customer_blocks = re.findall(r'class="task__author"[^>]*>.*?<a[^>]*>([^<]+)</a>', text, re.DOTALL)
        for i, (link, name) in enumerate(task_blocks[:20]):
            price_raw = price_blocks[i] if i < len(price_blocks) else '—'
            price_str = price_raw.strip()
            try:
                price = float(''.join(filter(str.isdigit, price_str)) or '0')
            except Exception:
                price = 0
            tenders.append({
                'id': f"habr_{abs(hash(link))}",
                'name': name.strip(),
                'price': price,
                'price_fmt': price_str if price_str else 'Договорная',
                'customer': customer_blocks[i].strip() if i < len(customer_blocks) else '—',
                'end_date': '—', 'law': 'Фриланс',
                'status': 'Активный',
                'region': 'Удалённо',
                'url': f"https://freelance.habr.com{link}" if link.startswith('/') else link,
                'source': 'Habr Freelance',
            })
    return {'tenders': tenders, 'total': len(tenders), 'search_url': search_url,
            'ok': result['ok'], 'error': result.get('error', '')}


def search_fl(query: str) -> dict:
    """FL.ru — фриланс-проекты"""
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.fl.ru/projects/?kind=1&search={encoded}"
    url = f"https://www.fl.ru/api/projects/?kind=1&search={encoded}&page=1&count=20"
    result = http_get(url)
    tenders = []
    if result['ok'] and result['data']:
        items = result['data'].get('models', []) or result['data'].get('projects', []) or []
        for item in items:
            try:
                price = float(item.get('price') or item.get('budget_max') or 0)
                tenders.append({
                    'id': f"fl_{item.get('id', abs(hash(item.get('name',''))))}",
                    'name': item.get('name', '') or item.get('title', ''),
                    'price': price,
                    'price_fmt': f"{price:,.0f} ₽".replace(',', ' ') if price > 0 else 'Договорная',
                    'customer': item.get('employer_name', '—') or '—',
                    'end_date': '—', 'law': 'Фриланс',
                    'status': 'Активный', 'region': 'Удалённо',
                    'url': f"https://www.fl.ru/projects/{item.get('id', '')}/",
                    'source': 'FL.ru',
                })
            except Exception:
                continue
    return {'tenders': tenders, 'total': len(tenders), 'search_url': search_url,
            'ok': result['ok'], 'error': result.get('error', '')}


def search_kwork(query: str) -> dict:
    """Kwork — биржа задач"""
    encoded = urllib.parse.quote(query)
    search_url = f"https://kwork.ru/projects?c=41&query={encoded}"
    url = f"https://kwork.ru/api/projects/list?c=41&query={encoded}&page=1"
    result = http_get(url)
    tenders = []
    if result['ok'] and result['data']:
        items = (result['data'].get('response') or {}).get('projects', []) or []
        for item in items:
            try:
                price = float(item.get('price') or 0)
                tenders.append({
                    'id': f"kwork_{item.get('id', abs(hash(item.get('name',''))))}",
                    'name': item.get('name', '') or item.get('title', ''),
                    'price': price,
                    'price_fmt': f"{price:,.0f} ₽".replace(',', ' ') if price > 0 else 'Договорная',
                    'customer': item.get('user_name', '—') or '—',
                    'end_date': '—', 'law': 'Фриланс',
                    'status': 'Активный', 'region': 'Удалённо',
                    'url': f"https://kwork.ru/projects/{item.get('id', '')}/view",
                    'source': 'Kwork',
                })
            except Exception:
                continue
    return {'tenders': tenders, 'total': len(tenders), 'search_url': search_url,
            'ok': result['ok'], 'error': result.get('error', '')}


def search_upwork(query: str) -> dict:
    """Upwork — международные IT-проекты (прямые ссылки)"""
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.upwork.com/nx/jobs/search/?q={encoded}&sort=recency"
    # Upwork требует авторизацию для API, возвращаем ссылку
    return {
        'tenders': [], 'total': 0, 'search_url': search_url,
        'ok': True, 'error': '',
        'link_only': True,
        'source': 'Upwork',
    }


# ─── ИИ-АНАЛИЗ ───────────────────────────────────────────────────────────────

def ai_analyze(tender: dict, api_key: str) -> dict:
    prompt = f"""Ты эксперт по тендерам и коммерческим предложениям для IT-компании.

ПРОФИЛЬ КОМПАНИИ:
{COMPANY_PROFILE}

ТЕНДЕР/ЗАДАНИЕ:
- Название: {tender.get('name')}
- Номер/ID: {tender.get('id')}
- Бюджет: {tender.get('price_fmt')}
- Заказчик: {tender.get('customer')}
- Тип: {tender.get('law')}
- Регион: {tender.get('region')}
- Срок подачи: {tender.get('end_date')}
- Источник: {tender.get('source')}

Предоставь детальный анализ в формате JSON:
{{
  "relevance_score": <0-100>,
  "win_probability": <0-100>,
  "relevance_comment": "<вывод о релевантности>",
  "win_factors": ["<фактор 1>", "<фактор 2>", "<фактор 3>"],
  "risks": ["<риск 1>", "<риск 2>"],
  "recommended_price": "<рекомендованная цена с обоснованием>",
  "kp_structure": {{
    "title": "<заголовок КП>",
    "sections": [
      {{"title": "<раздел>", "content": "<содержание, 2-4 предложения>"}},
      {{"title": "<раздел>", "content": "<содержание>"}},
      {{"title": "<раздел>", "content": "<содержание>"}},
      {{"title": "<раздел>", "content": "<содержание>"}},
      {{"title": "<раздел>", "content": "<содержание>"}}
    ]
  }},
  "key_requirements": ["<требование 1>", "<требование 2>", "<требование 3>"],
  "timeline": "<реалистичные сроки реализации>",
  "team": "<рекомендуемый состав команды>",
  "conclusion": "<итоговая рекомендация: участвовать или нет, и почему>"
}}

Отвечай ТОЛЬКО валидным JSON без markdown."""

    payload = json.dumps({
        'model': 'gpt-4o',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
        'max_tokens': 2000,
    }).encode('utf-8')

    req = urllib.request.Request(AI_URL, data=payload, headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            content = result['choices'][0]['message']['content'].strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return {'ok': True, 'analysis': json.loads(content.strip())}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# ─── HANDLER ─────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Поиск тендеров, фриланс-заданий, избранное и ИИ-анализ"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token', '')

    if not is_admin(token):
        return {'statusCode': 403, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет доступа'})}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body') or '{}')

    # ── POST / (search) ──────────────────────────────────────────────────────
    if method == 'POST' and (path == '/' or path.endswith('/tender-search')):
        query = body.get('query', '').strip()
        sources = body.get('sources', ['eis', 'hh', 'habr', 'fl', 'kwork', 'upwork'])
        if not query:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Введите ключевые слова'})}

        print(f"[tender-search] query={query} sources={sources}")

        all_tenders = []
        meta = []
        warnings = []
        links = []

        searchers = {
            'eis': ('ЕИС zakupki.gov.ru', search_eis),
            'hh': ('HH.ru', search_hh),
            'habr': ('Habr Freelance', search_habr),
            'fl': ('FL.ru', search_fl),
            'kwork': ('Kwork', search_kwork),
            'upwork': ('Upwork', search_upwork),
        }

        for src_key in sources:
            if src_key not in searchers:
                continue
            src_name, fn = searchers[src_key]
            try:
                r = fn(query)
                if r.get('link_only'):
                    links.append({'source': src_name, 'url': r['search_url']})
                    continue
                if not r['ok']:
                    warnings.append(f"{src_name}: {r.get('error', 'недоступен')}")
                    if r.get('search_url'):
                        links.append({'source': src_name, 'url': r['search_url']})
                else:
                    all_tenders.extend(r['tenders'])
                    meta.append({'source': src_name, 'count': len(r['tenders']), 'total': r.get('total', 0), 'search_url': r.get('search_url', '')})
            except Exception as e:
                warnings.append(f"{src_name}: ошибка ({str(e)[:60]})")

        # Помечаем сохранённые
        saved_ids = set()
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT external_id, source FROM saved_tenders")
            for row in cur.fetchall():
                saved_ids.add(f"{row[0]}::{row[1]}")
        finally:
            conn.close()

        for t in all_tenders:
            t['saved'] = f"{t['id']}::{t['source']}" in saved_ids

        return {
            'statusCode': 200, 'headers': CORS_HEADERS,
            'body': json.dumps({
                'tenders': all_tenders,
                'total': len(all_tenders),
                'meta': meta,
                'warnings': warnings,
                'links': links,
            }, ensure_ascii=False)
        }

    # ── POST /analyze ────────────────────────────────────────────────────────
    if method == 'POST' and path.endswith('/analyze'):
        tender = body.get('tender')
        if not tender:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет данных тендера'})}
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'AI API ключ не настроен'})}
        result = ai_analyze(tender, api_key)
        if not result['ok']:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': result['error']})}
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'analysis': result['analysis']}, ensure_ascii=False)}

    # ── POST /save ───────────────────────────────────────────────────────────
    if method == 'POST' and path.endswith('/save'):
        tender = body.get('tender')
        analysis = body.get('analysis')
        note = body.get('note', '')
        if not tender:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет данных'})}
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO saved_tenders (external_id, source, name, price, price_fmt, customer, end_date, law, status, region, url, note, analysis)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (external_id, source) DO UPDATE SET
                    note = EXCLUDED.note,
                    analysis = COALESCE(EXCLUDED.analysis, saved_tenders.analysis),
                    name = EXCLUDED.name
                RETURNING id
            """, (
                tender.get('id'), tender.get('source', '—'),
                tender.get('name', ''), float(tender.get('price') or 0),
                tender.get('price_fmt', ''), tender.get('customer', ''),
                tender.get('end_date', ''), tender.get('law', ''),
                tender.get('status', ''), tender.get('region', ''),
                tender.get('url', ''), note,
                json.dumps(analysis, ensure_ascii=False) if analysis else None,
            ))
            saved_id = cur.fetchone()[0]
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True, 'saved_id': saved_id})}

    # ── DELETE /save ─────────────────────────────────────────────────────────
    if method == 'DELETE' and path.endswith('/save'):
        external_id = body.get('external_id')
        source = body.get('source')
        if not external_id:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет ID'})}
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM saved_tenders WHERE external_id = %s AND source = %s", (external_id, source))
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    # ── GET /saved ───────────────────────────────────────────────────────────
    if method == 'GET' and path.endswith('/saved'):
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute("SELECT * FROM saved_tenders ORDER BY created_at DESC")
            rows = cur.fetchall()
        finally:
            conn.close()
        result = []
        for row in rows:
            r = dict(row)
            r['created_at'] = r['created_at'].isoformat() if r.get('created_at') else ''
            r['price'] = float(r['price']) if r.get('price') else 0
            if r.get('analysis') and isinstance(r['analysis'], str):
                try:
                    r['analysis'] = json.loads(r['analysis'])
                except Exception:
                    r['analysis'] = None
            result.append(r)
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'saved': result}, ensure_ascii=False)}

    # ── POST /save/note ──────────────────────────────────────────────────────
    if method == 'POST' and path.endswith('/note'):
        saved_id = body.get('id')
        note = body.get('note', '')
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("UPDATE saved_tenders SET note = %s WHERE id = %s", (note, saved_id))
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
