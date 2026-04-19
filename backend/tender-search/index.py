"""
Агрегатор тендеров: ЕИС (zakupki.gov.ru), фриланс-биржи (HH, FL, Habr, Kwork, Upwork),
корпоративные закупки крупных компаний (Сбер, Газпром, РЖД, Ростелеком, Лукойл и др.).
Сохранение в избранное, ИИ-анализ, генерация КП.
"""
import json
import os
import re
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

# ─── Корпоративные площадки ─────────────────────────────────────────────────
# Формат: {key, name, search_url_template, api_url_template, parser_fn_name}
CORPORATE_SOURCES = [
    {
        'key': 'sber',
        'name': 'Сбербанк',
        'icon': '🟢',
        'search_url': 'https://zakupki.sberbank.ru/223/purchaseList/page/1',
        'api_url': 'https://zakupki.sberbank.ru/api/search?text={query}&size=10&from=0&status=ACTIVE',
        'type': 'corporate',
    },
    {
        'key': 'gazprom',
        'name': 'Газпром',
        'icon': '🔵',
        'search_url': 'https://zakupki.gazprom.ru/lots/?search={query}',
        'api_url': 'https://zakupki.gazprom.ru/api/lots/?search={query}&limit=10&offset=0&status=active',
        'type': 'corporate',
    },
    {
        'key': 'rzd',
        'name': 'РЖД',
        'icon': '🚂',
        'search_url': 'https://zakupki.rzd.ru/item/index?searchString={query}',
        'api_url': 'https://zakupki.rzd.ru/api/v1/items?q={query}&limit=10&page=0',
        'type': 'corporate',
    },
    {
        'key': 'rostelecom',
        'name': 'Ростелеком',
        'icon': '📡',
        'search_url': 'https://zakupki.rostelecom.ru/purchases/?query={query}',
        'api_url': 'https://zakupki.rostelecom.ru/api/purchases?query={query}&size=10&page=0&status=ACTIVE',
        'type': 'corporate',
    },
    {
        'key': 'lukoil',
        'name': 'Лукойл',
        'icon': '🛢️',
        'search_url': 'https://lukoil.ru/Business/Tenders',
        'api_url': None,
        'type': 'corporate',
    },
    {
        'key': 'rosneft',
        'name': 'Роснефть',
        'icon': '⚡',
        'search_url': 'https://www.rosneft.ru/purchase/',
        'api_url': 'https://purchase.rosneft.ru/api/lots?keyword={query}&status=published&limit=10',
        'type': 'corporate',
    },
    {
        'key': 'vtb',
        'name': 'ВТБ',
        'icon': '🏦',
        'search_url': 'https://www.vtb.ru/o-banke/zakupki/',
        'api_url': None,
        'type': 'corporate',
    },
    {
        'key': 'magnit',
        'name': 'Магнит',
        'icon': '🛒',
        'search_url': 'https://magnit.ru/vendors/tenders/',
        'api_url': None,
        'type': 'corporate',
    },
    {
        'key': 'rosatom',
        'name': 'Росатом',
        'icon': '⚛️',
        'search_url': 'https://www.rosatom.ru/supplier-relations/tenders/',
        'api_url': 'https://zakupki.rosatom.ru/api/v1/tenders?search={query}&status=ACTIVE&limit=10',
        'type': 'corporate',
    },
    {
        'key': 'yandex',
        'name': 'Яндекс',
        'icon': '🔴',
        'search_url': 'https://yandex.ru/company/purchases',
        'api_url': None,
        'type': 'corporate',
    },
    {
        'key': 'mail',
        'name': 'VK / Mail.ru',
        'icon': '💙',
        'search_url': 'https://vk.company/ru/about/tenders/',
        'api_url': None,
        'type': 'corporate',
    },
    {
        'key': 'sbertech',
        'name': 'СберТех',
        'icon': '💻',
        'search_url': 'https://sbertech.ru/tenders',
        'api_url': None,
        'type': 'corporate',
    },
]


def get_conn():
    return psycopg2.connect(
        os.environ['DATABASE_URL'],
        options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}"
    )


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


def http_get(url: str, timeout: int = 10) -> dict:
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            try:
                return {'ok': True, 'data': json.loads(raw), 'text': raw, 'status': resp.status}
            except Exception:
                return {'ok': True, 'data': None, 'text': raw, 'status': resp.status}
    except urllib.error.HTTPError as e:
        return {'ok': False, 'error': f'HTTP {e.code}', 'status': e.code}
    except Exception as e:
        return {'ok': False, 'error': str(e)[:80], 'status': 0}


# ─── ЕИС ────────────────────────────────────────────────────────────────────

def search_eis(query: str, page: int = 0) -> dict:
    """
    ЕИС через открытый JSON API (работает без авторизации).
    Используем endpoint opendata — он не блокирует серверные запросы.
    """
    encoded = urllib.parse.quote(query)
    search_url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.html"
        f"?searchString={encoded}&morphology=on&fz44=on&fz223=on&statusList=ON"
    )

    # Официальный открытый API ЕИС (opendata endpoint, без блокировок)
    api_url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.json"
        f"?searchString={encoded}&morphology=on"
        f"&pageNumber={page + 1}&sortDirection=false&recordsPerPage=_20"
        f"&showLotsInfoHidden=false&fz44=on&fz223=on&af=on&ca=on&statusList=ON"
    )

    # Пробуем с расширенными заголовками браузера
    req = urllib.request.Request(api_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://zakupki.gov.ru/epz/order/extendedsearch/results.html',
        'X-Requested-With': 'XMLHttpRequest',
        'Connection': 'keep-alive',
    })

    tenders = []
    total = 0
    ok = False
    error = ''

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            ok = True
            try:
                data = json.loads(raw)
                items = (data.get('data') or {}).get('list', []) or []
                total = (data.get('data') or {}).get('totalCount', 0) or 0
                for item in items:
                    try:
                        number = item.get('regNum') or item.get('purchaseNumber', '—')
                        name = (item.get('purchaseObjectInfo') or '').strip()
                        if not name:
                            continue
                        price = float(item.get('nmck') or 0)
                        customer = ((item.get('customer') or {}).get('mainInfo') or {}).get('fullName', '—')
                        end_date = (item.get('endDT') or '—')[:10]
                        law = item.get('fzType', '44-ФЗ')
                        status = ((item.get('purchaseState') or {}).get('name') or 'Активный')
                        tenders.append({
                            'id': number, 'name': name,
                            'price': price, 'price_fmt': _fmt_price(price, 'RUB'),
                            'customer': customer, 'end_date': end_date, 'law': law,
                            'status': status, 'region': '—',
                            'url': f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNum={number}",
                            'source': 'ЕИС zakupki.gov.ru', 'source_key': 'eis',
                        })
                    except Exception:
                        continue
            except Exception as e:
                error = f'Ошибка парсинга: {str(e)[:50]}'
    except urllib.error.HTTPError as e:
        ok = False
        error = f'HTTP {e.code}'
    except Exception as e:
        ok = False
        error = str(e)[:80]

    # Если API недоступен — возвращаем как link_only чтобы показать прямую ссылку
    if not ok or (ok and not tenders and not total):
        return {
            'tenders': [], 'total': 0, 'search_url': search_url,
            'ok': False, 'error': error or 'Нет результатов',
            'link_only': True,
        }

    return {'tenders': tenders, 'total': total, 'search_url': search_url, 'ok': True, 'error': ''}


# ─── HH.ru ──────────────────────────────────────────────────────────────────

def search_hh(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    url = f"https://api.hh.ru/vacancies?text={encoded}&per_page=20&area=113&search_field=name&employment=project"
    search_url = f"https://hh.ru/search/vacancy?text={encoded}&employment=project"
    result = http_get(url)
    tenders = []
    total = 0
    if result['ok'] and result['data']:
        total = result['data'].get('found', 0)
        for item in result['data'].get('items', []):
            try:
                sal = item.get('salary') or {}
                price = sal.get('to') or sal.get('from') or 0
                price_fmt = _fmt_salary(sal)
                tenders.append({
                    'id': f"hh_{item['id']}", 'name': item.get('name', ''),
                    'price': float(price), 'price_fmt': price_fmt,
                    'customer': (item.get('employer') or {}).get('name', '—'),
                    'end_date': '—', 'law': 'Проект/Фриланс', 'status': 'Активный',
                    'region': (item.get('area') or {}).get('name', '—'),
                    'url': item.get('alternate_url', search_url),
                    'source': 'HH.ru', 'source_key': 'hh',
                })
            except Exception:
                continue
    return {'tenders': tenders, 'total': total, 'search_url': search_url, 'ok': result['ok'], 'error': result.get('error', '')}


# ─── Habr Freelance ─────────────────────────────────────────────────────────
# Habr закрыл HTML-парсинг (410 Gone). Возвращаем прямую ссылку на поиск.

def search_habr(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    search_url = f"https://freelance.habr.com/tasks?q={encoded}"
    return {
        'tenders': [], 'total': 0, 'search_url': search_url,
        'ok': True, 'error': '', 'link_only': True,
    }


# ─── FL.ru ───────────────────────────────────────────────────────────────────
# FL.ru закрыл API (405 Method Not Allowed). Возвращаем прямую ссылку.

def search_fl(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.fl.ru/projects/?kind=1&search={encoded}"
    return {
        'tenders': [], 'total': 0, 'search_url': search_url,
        'ok': True, 'error': '', 'link_only': True,
    }


# ─── Kwork ───────────────────────────────────────────────────────────────────
# Kwork закрыл API (404). Возвращаем прямую ссылку на поиск.

def search_kwork(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    search_url = f"https://kwork.ru/projects?c=41&query={encoded}"
    return {
        'tenders': [], 'total': 0, 'search_url': search_url,
        'ok': True, 'error': '', 'link_only': True,
    }


# ─── YouDo ───────────────────────────────────────────────────────────────────
# YouDo имеет открытый JSON API для бизнес-заданий

def search_youdo(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    search_url = f"https://youdo.com/tasks-all-opened-all?q={encoded}"
    api_url = f"https://youdo.com/api/tasks/list/?q={encoded}&status=opened&page=1&pageSize=20"
    result = http_get(api_url)
    tenders = []
    if result['ok'] and result['data']:
        items = (
            result['data'].get('tasks') or
            result['data'].get('items') or
            result['data'].get('data', {}).get('tasks', []) or []
        )
        for item in items:
            try:
                price = float(item.get('price') or item.get('budget') or 0)
                task_id = item.get('id') or item.get('taskId', '')
                name = item.get('name') or item.get('title') or item.get('subject') or ''
                if not name:
                    continue
                tenders.append({
                    'id': f"youdo_{task_id}",
                    'name': name,
                    'price': price,
                    'price_fmt': _fmt_price(price, 'RUB') if price > 0 else 'Договорная',
                    'customer': item.get('authorName') or '—',
                    'end_date': (item.get('deadline') or '—')[:10],
                    'law': 'Фриланс/Услуги', 'status': 'Активный',
                    'region': item.get('cityName') or 'Россия',
                    'url': f"https://youdo.com/t{task_id}" if task_id else search_url,
                    'source': 'YouDo', 'source_key': 'youdo',
                })
            except Exception:
                continue
    return {
        'tenders': tenders, 'total': len(tenders), 'search_url': search_url,
        'ok': result['ok'], 'error': result.get('error', ''),
        'link_only': len(tenders) == 0,
    }


# ─── Weblancer ───────────────────────────────────────────────────────────────
# Weblancer — крупная биржа с открытым поиском проектов

def search_weblancer(query: str) -> dict:
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.weblancer.net/jobs/?q={encoded}"
    api_url = f"https://www.weblancer.net/jobs/feed/?q={encoded}&format=json"
    result = http_get(api_url)
    tenders = []
    if result['ok'] and result['data']:
        items = result['data'].get('items') or result['data'].get('jobs') or []
        for item in items:
            try:
                price = float(item.get('price') or item.get('budget') or 0)
                job_id = item.get('id') or ''
                name = item.get('title') or item.get('name') or ''
                if not name:
                    continue
                tenders.append({
                    'id': f"weblancer_{job_id}",
                    'name': name,
                    'price': price,
                    'price_fmt': _fmt_price(price, 'RUB') if price > 0 else 'Договорная',
                    'customer': item.get('employer') or '—',
                    'end_date': '—', 'law': 'Фриланс', 'status': 'Активный',
                    'region': 'Удалённо',
                    'url': item.get('url') or f"https://www.weblancer.net/jobs/{job_id}/",
                    'source': 'Weblancer', 'source_key': 'weblancer',
                })
            except Exception:
                continue
    # Если API не ответил — прямая ссылка
    if not result['ok'] or not tenders:
        return {
            'tenders': [], 'total': 0, 'search_url': search_url,
            'ok': True, 'error': '', 'link_only': True,
        }
    return {'tenders': tenders, 'total': len(tenders), 'search_url': search_url, 'ok': True, 'error': ''}


# ─── Корпоративные закупки ───────────────────────────────────────────────────

def search_corporate(query: str, corp_keys: list) -> list:
    """
    Для каждой корпорации возвращаем либо результаты API (если доступен),
    либо прямую ссылку на их страницу закупок с query.
    """
    results = []
    encoded = urllib.parse.quote(query)

    for corp in CORPORATE_SOURCES:
        if corp['key'] not in corp_keys:
            continue

        search_url = corp['search_url'].replace('{query}', encoded)
        entry = {
            'key': corp['key'],
            'name': corp['name'],
            'icon': corp['icon'],
            'search_url': search_url,
            'tenders': [],
            'ok': False,
            'error': '',
            'link_only': True,
        }

        # Пробуем API если он задан
        if corp.get('api_url'):
            api_url = corp['api_url'].replace('{query}', encoded)
            r = http_get(api_url, timeout=8)
            entry['ok'] = r['ok']
            entry['error'] = r.get('error', '')

            if r['ok'] and r['data']:
                parsed = _parse_corporate_response(r['data'], corp['key'], corp['name'], search_url)
                if parsed:
                    entry['tenders'] = parsed
                    entry['link_only'] = False
        else:
            # Пробуем открыть главную страницу закупок для проверки доступности
            r = http_get(search_url, timeout=6)
            entry['ok'] = r['ok']
            entry['error'] = r.get('error', '')

        results.append(entry)

    return results


def _parse_corporate_response(data: dict, key: str, name: str, search_url: str) -> list:
    """Универсальный парсер ответов корпоративных API"""
    tenders = []
    # Пробуем разные форматы ответов
    items = (
        data.get('items') or data.get('lots') or data.get('tenders') or
        data.get('results') or data.get('purchases') or data.get('data', {}).get('items', []) or
        (data.get('data') if isinstance(data.get('data'), list) else []) or []
    )
    for item in items[:10]:
        if not isinstance(item, dict):
            continue
        try:
            name_val = (
                item.get('name') or item.get('title') or item.get('subject') or
                item.get('purchaseName') or item.get('lotName') or ''
            ).strip()
            if not name_val:
                continue
            price_raw = (
                item.get('price') or item.get('budget') or item.get('nmck') or
                item.get('initialPrice') or item.get('startPrice') or 0
            )
            try:
                price = float(price_raw)
            except Exception:
                price = 0
            item_id = str(item.get('id') or item.get('lotId') or item.get('purchaseId') or abs(hash(name_val)))
            url = (
                item.get('url') or item.get('href') or item.get('link') or
                item.get('detailUrl') or search_url
            )
            end_date = str(item.get('endDate') or item.get('deadline') or item.get('submissionDeadline') or '—')[:10]
            tenders.append({
                'id': f"{key}_{item_id}",
                'name': name_val,
                'price': price, 'price_fmt': _fmt_price(price, 'RUB') if price > 0 else 'Не указана',
                'customer': name,
                'end_date': end_date, 'law': '223-ФЗ / Корпоративные',
                'status': 'Активный', 'region': 'Россия',
                'url': url if url.startswith('http') else f"https://{url}",
                'source': name, 'source_key': key,
            })
        except Exception:
            continue
    return tenders


# ─── Вспомогательные ─────────────────────────────────────────────────────────

def _fmt_price(price: float, currency: str = 'RUB') -> str:
    if price <= 0:
        return 'Не указана'
    sym = '₽' if currency in ('RUB', 'RUR') else currency
    return f"{price:,.0f} {sym}".replace(',', ' ')


def _fmt_salary(sal: dict) -> str:
    if not sal:
        return '—'
    cur = sal.get('currency', 'RUR')
    sym = '₽' if cur in ('RUB', 'RUR') else cur
    lo, hi = sal.get('from'), sal.get('to')
    if lo and hi:
        return f"{lo:,}–{hi:,} {sym}".replace(',', ' ')
    if lo:
        return f"от {lo:,} {sym}".replace(',', ' ')
    if hi:
        return f"до {hi:,} {sym}".replace(',', ' ')
    return '—'


# ─── ИИ-анализ ───────────────────────────────────────────────────────────────

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
    """Агрегатор тендеров: ЕИС, биржи, корпорации + ИИ-анализ + избранное"""
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
        corp_keys = body.get('corp_keys', [c['key'] for c in CORPORATE_SOURCES])

        # Фильтры
        filters = body.get('filters', {})
        min_price     = float(filters.get('min_price', 0) or 0)
        min_days_left = int(filters.get('min_days_left', 0) or 0)
        prefer_commercial = bool(filters.get('prefer_commercial', False))
        prefer_advance    = bool(filters.get('prefer_advance', False))

        if not query:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Введите ключевые слова'})}

        print(f"[tender-search] query={query!r} sources={sources} corps={corp_keys}")

        all_tenders = []
        meta = []
        warnings = []
        links = []
        corp_results = []

        # Обычные источники
        searchers = {
            'eis':        ('ЕИС zakupki.gov.ru', search_eis),
            'hh':         ('HH.ru', search_hh),
            'habr':       ('Habr Freelance', search_habr),
            'fl':         ('FL.ru', search_fl),
            'kwork':      ('Kwork', search_kwork),
            'youdo':      ('YouDo', search_youdo),
            'weblancer':  ('Weblancer', search_weblancer),
            'upwork': ('Upwork', lambda q: {
                'tenders': [], 'total': 0,
                'search_url': f"https://www.upwork.com/nx/jobs/search/?q={urllib.parse.quote(q)}&sort=recency",
                'ok': True, 'error': '', 'link_only': True,
            }),
        }

        for src_key in sources:
            if src_key not in searchers:
                continue
            src_name, fn = searchers[src_key]
            try:
                r = fn(query)
                if r.get('link_only'):
                    links.append({'source': src_name, 'url': r['search_url']})
                elif not r['ok']:
                    warnings.append(f"{src_name}: {r.get('error', 'недоступен')}")
                    if r.get('search_url'):
                        links.append({'source': src_name, 'url': r['search_url']})
                else:
                    all_tenders.extend(r['tenders'])
                    meta.append({
                        'source': src_name, 'count': len(r['tenders']),
                        'total': r.get('total', 0), 'search_url': r.get('search_url', ''),
                    })
            except Exception as e:
                warnings.append(f"{src_name}: ошибка ({str(e)[:50]})")

        # Корпоративные источники
        if corp_keys:
            corp_results = search_corporate(query, corp_keys)
            for cr in corp_results:
                if cr.get('link_only') or not cr['tenders']:
                    links.append({'source': f"{cr['icon']} {cr['name']}", 'url': cr['search_url']})
                else:
                    all_tenders.extend(cr['tenders'])
                    meta.append({
                        'source': cr['name'], 'count': len(cr['tenders']),
                        'total': len(cr['tenders']), 'search_url': cr['search_url'],
                    })

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

        # ── Применяем фильтры ────────────────────────────────────────────
        from datetime import date, timedelta
        today = date.today()

        def passes_filters(t: dict) -> bool:
            # 1. Минимальная сумма
            if min_price > 0 and t.get('price', 0) < min_price:
                return False

            # 2. Срок подачи — не менее min_days_left дней от сегодня
            if min_days_left > 0:
                end_raw = t.get('end_date', '—')
                if end_raw and end_raw != '—':
                    try:
                        end = date.fromisoformat(end_raw[:10])
                        if (end - today).days < min_days_left:
                            return False
                    except Exception:
                        pass  # дата не распознана — пропускаем фильтр

            return True

        filtered = [t for t in all_tenders if passes_filters(t)]

        # 3. Предпочтение коммерческим заказам — поднимаем их в начало
        COMMERCIAL_KEYWORDS = ['коммерческ', 'фриланс', 'проект', 'услуг', 'задани']
        GOVT_KEYWORDS = ['44-ФЗ', '223-ФЗ', 'государствен', 'муниципальн']

        def commercial_score(t: dict) -> int:
            if not prefer_commercial:
                return 0
            law = t.get('law', '').lower()
            name = t.get('name', '').lower()
            # Понижаем госзакупки
            for kw in GOVT_KEYWORDS:
                if kw.lower() in law:
                    return -1
            # Повышаем коммерческие
            for kw in COMMERCIAL_KEYWORDS:
                if kw in law or kw in name:
                    return 1
            return 0

        # 4. Предпочтение авансу — ищем в названии
        ADVANCE_KEYWORDS = ['аванс', 'предоплат', 'prepay', 'advance', '50%', '30%', '100%']

        def advance_score(t: dict) -> int:
            if not prefer_advance:
                return 0
            name = t.get('name', '').lower()
            customer = t.get('customer', '').lower()
            for kw in ADVANCE_KEYWORDS:
                if kw in name or kw in customer:
                    return 1
            return 0

        # Сортировка: сначала по баллам предпочтений, затем по цене убыванием
        filtered.sort(
            key=lambda t: (
                commercial_score(t) + advance_score(t),
                t.get('price', 0),
            ),
            reverse=True,
        )

        # Статистика фильтрации
        filter_stats = {
            'total_before': len(all_tenders),
            'total_after': len(filtered),
            'filtered_out': len(all_tenders) - len(filtered),
        }

        all_tenders = filtered

        # Статус корпоративных источников
        corp_status = [{
            'key': cr['key'], 'name': cr['name'], 'icon': cr['icon'],
            'ok': cr['ok'], 'error': cr.get('error', ''),
            'count': len(cr['tenders']), 'link_only': cr.get('link_only', True),
            'search_url': cr['search_url'],
        } for cr in corp_results]

        return {
            'statusCode': 200, 'headers': CORS_HEADERS,
            'body': json.dumps({
                'tenders': all_tenders,
                'total': len(all_tenders),
                'meta': meta,
                'warnings': warnings,
                'links': links,
                'corp_status': corp_status,
                'filter_stats': filter_stats,
            }, ensure_ascii=False),
        }

    # ── POST /analyze ────────────────────────────────────────────────────────
    if method == 'POST' and path.endswith('/analyze'):
        tender = body.get('tender')
        if not tender:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет данных'})}
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'AI API ключ не настроен'})}
        result = ai_analyze(tender, api_key)
        if not result['ok']:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': result['error']})}
        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'analysis': result['analysis']}, ensure_ascii=False)}

    # ── GET /corporate-sources ───────────────────────────────────────────────
    if method == 'GET' and path.endswith('/corporate-sources'):
        return {
            'statusCode': 200, 'headers': CORS_HEADERS,
            'body': json.dumps({'sources': [
                {'key': c['key'], 'name': c['name'], 'icon': c['icon'],
                 'has_api': bool(c.get('api_url')),
                 'search_url': c['search_url']}
                for c in CORPORATE_SOURCES
            ]}, ensure_ascii=False),
        }

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
                INSERT INTO saved_tenders
                  (external_id, source, name, price, price_fmt, customer, end_date, law, status, region, url, note, analysis)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True, 'saved_id': saved_id})}

    # ── DELETE /save ─────────────────────────────────────────────────────────
    if method == 'DELETE' and path.endswith('/save'):
        external_id = body.get('external_id')
        source = body.get('source')
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM saved_tenders WHERE external_id=%s AND source=%s", (external_id, source))
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
            if isinstance(r.get('analysis'), str):
                try:
                    r['analysis'] = json.loads(r['analysis'])
                except Exception:
                    r['analysis'] = None
            result.append(r)
        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'saved': result}, ensure_ascii=False)}

    # ── POST /note ───────────────────────────────────────────────────────────
    if method == 'POST' and path.endswith('/note'):
        saved_id = body.get('id')
        note = body.get('note', '')
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("UPDATE saved_tenders SET note=%s WHERE id=%s", (note, saved_id))
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}