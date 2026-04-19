"""
Поиск тендеров по ключевым словам через ЕИС (zakupki.gov.ru) и ИИ-анализ тендера с генерацией КП.
"""
import json
import os
import urllib.request
import urllib.parse
import urllib.error
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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


def search_eis(query: str, page: int = 0, per_page: int = 20) -> dict:
    """Поиск через публичный API ЕИС закупки.gov.ru"""
    encoded_query = urllib.parse.quote(query)
    url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.html"
        f"?searchString={encoded_query}&morphology=on&search-filter=Дате+обновления"
        f"&pageNumber={page + 1}&sortDirection=false&recordsPerPage=_{per_page}"
        f"&showLotsInfoHidden=false&savedSearchSettingsIdHidden=&fz44=on&fz223=on"
        f"&af=on&ca=on&statusList=ON"
    )

    api_url = (
        f"https://zakupki.gov.ru/epz/order/extendedsearch/results.json"
        f"?searchString={encoded_query}&morphology=on"
        f"&pageNumber={page + 1}&sortDirection=false&recordsPerPage=_{per_page}"
        f"&showLotsInfoHidden=false&fz44=on&fz223=on&af=on&ca=on&statusList=ON"
    )

    req = urllib.request.Request(
        api_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (compatible; TenderBot/1.0)',
            'Accept': 'application/json, text/javascript, */*',
            'Referer': 'https://zakupki.gov.ru/',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
            data = json.loads(raw)
            return {'ok': True, 'data': data, 'search_url': url}
    except Exception as e:
        return {'ok': False, 'error': str(e), 'search_url': url}


def parse_eis_results(data: dict, query: str, search_url: str) -> list:
    """Парсим результаты ЕИС в единый формат"""
    tenders = []
    items = []

    if isinstance(data, dict):
        items = (
            data.get('data', {}).get('list', []) or
            data.get('list', []) or
            data.get('orders', []) or
            []
        )

    for item in items:
        try:
            # Извлекаем поля в зависимости от структуры ответа
            number = item.get('regNum') or item.get('purchaseNumber') or item.get('number', '—')
            name = (item.get('purchaseObjectInfo') or item.get('name') or item.get('subject') or '').strip()
            if not name:
                continue

            price_raw = item.get('nmck') or item.get('maxPrice') or item.get('price') or 0
            try:
                price = float(price_raw)
            except Exception:
                price = 0

            customer = (
                item.get('customer', {}).get('mainInfo', {}).get('fullName') or
                item.get('customerName') or
                item.get('organizer', {}).get('name') or
                '—'
            )

            end_date = (
                item.get('endDT') or item.get('endDate') or
                item.get('applicationDeadline') or '—'
            )

            law = item.get('fzType') or item.get('law') or '44-ФЗ'
            status = item.get('purchaseState', {}).get('name') or item.get('status') or 'Активный'
            region = (
                item.get('customer', {}).get('mainInfo', {}).get('factAddress') or
                item.get('region') or '—'
            )

            tender_url = (
                f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNum={number}"
                if number != '—' else search_url
            )

            tenders.append({
                'id': number,
                'name': name,
                'price': price,
                'price_fmt': f"{price:,.0f} ₽".replace(',', ' ') if price > 0 else 'Не указана',
                'customer': customer,
                'end_date': end_date[:10] if end_date and len(end_date) > 10 else end_date,
                'law': law,
                'status': status,
                'region': region,
                'url': tender_url,
                'source': 'ЕИС zakupki.gov.ru',
            })
        except Exception:
            continue

    return tenders


def ai_analyze(tender: dict, api_key: str) -> dict:
    """ИИ-анализ тендера: шансы победы + структура КП"""
    prompt = f"""Ты эксперт по тендерам и коммерческим предложениям для IT-компании.

ПРОФИЛЬ КОМПАНИИ:
{COMPANY_PROFILE}

ТЕНДЕР:
- Название: {tender.get('name')}
- Номер: {tender.get('id')}
- НМЦ (бюджет): {tender.get('price_fmt')}
- Заказчик: {tender.get('customer')}
- Закон: {tender.get('law')}
- Регион: {tender.get('region')}
- Срок подачи: {tender.get('end_date')}
- Источник: {tender.get('source')}

Предоставь детальный анализ в формате JSON со следующей структурой:
{{
  "relevance_score": <число 0-100, насколько тендер подходит компании>,
  "win_probability": <число 0-100, прогноз шанса победы>,
  "relevance_comment": "<краткий вывод о релевантности>",
  "win_factors": ["<фактор 1>", "<фактор 2>", "<фактор 3>"],
  "risks": ["<риск 1>", "<риск 2>"],
  "recommended_price": "<рекомендованная цена предложения с обоснованием>",
  "kp_structure": {{
    "title": "<заголовок КП>",
    "sections": [
      {{"title": "<раздел>", "content": "<содержание раздела, 2-4 предложения>"}},
      ...
    ]
  }},
  "key_requirements": ["<ключевое требование 1>", "<ключевое требование 2>"],
  "timeline": "<реалистичные сроки реализации>",
  "team": "<рекомендуемый состав команды>",
  "conclusion": "<итоговая рекомендация: участвовать или нет, и почему>"
}}

Отвечай ТОЛЬКО валидным JSON без markdown-блоков."""

    payload = json.dumps({
        'model': 'gpt-4o',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
        'max_tokens': 2000,
    }).encode('utf-8')

    req = urllib.request.Request(
        AI_URL,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            content = result['choices'][0]['message']['content'].strip()
            # Убираем возможные markdown блоки
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return {'ok': True, 'analysis': json.loads(content)}
    except json.JSONDecodeError as e:
        return {'ok': False, 'error': f'Ошибка парсинга ответа ИИ: {str(e)}'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def handler(event: dict, context) -> dict:
    """Поиск тендеров и ИИ-анализ для МАТ-Лабс"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token', '')

    if not is_admin(token):
        return {'statusCode': 403, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет доступа'})}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body') or '{}')

    # POST /search — поиск тендеров
    if method == 'POST' and (path.endswith('/search') or path == '/'):
        query = body.get('query', '').strip()
        page = body.get('page', 0)

        if not query:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Введите ключевые слова'})}

        print(f"[tender-search] query={query}, page={page}")
        result = search_eis(query, page=page)

        if not result['ok']:
            # Если ЕИС не отвечает — возвращаем понятную ошибку с ссылкой
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'tenders': [],
                    'total': 0,
                    'search_url': result.get('search_url', ''),
                    'warning': f"ЕИС API временно недоступен: {result['error']}. Используйте прямую ссылку для поиска.",
                }, ensure_ascii=False)
            }

        tenders = parse_eis_results(result['data'], query, result['search_url'])
        total = 0
        raw = result.get('data', {})
        if isinstance(raw, dict):
            total = (
                raw.get('data', {}).get('totalCount') or
                raw.get('totalCount') or
                raw.get('total') or
                len(tenders)
            )

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'tenders': tenders,
                'total': total,
                'search_url': result['search_url'],
            }, ensure_ascii=False)
        }

    # POST /analyze — ИИ-анализ конкретного тендера
    if method == 'POST' and path.endswith('/analyze'):
        tender = body.get('tender')
        if not tender:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет данных тендера'})}

        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'AI API ключ не настроен'})}

        print(f"[tender-analyze] tender={tender.get('id')}")
        result = ai_analyze(tender, api_key)

        if not result['ok']:
            return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': result['error']})}

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'analysis': result['analysis']}, ensure_ascii=False)
        }

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}
