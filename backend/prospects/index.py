"""
CRM-модуль поиска потенциальных клиентов. v3
Поиск по открытым источникам (ЕГРЮЛ/ФНС, 2ГИС, Контур.Фокус, ЕИС),
сохранение в базу, управление статусами, ИИ-анализ, аналитика.
"""
import json
import os
import re
import hmac
import hashlib
import base64
import uuid
import urllib.request
import urllib.parse
import urllib.error
import psycopg2
import psycopg2.extras
import boto3
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

AI_URL = 'https://api.polza.ai/v1/chat/completions'
AUTH_CHECK_URL = 'https://functions.poehali.dev/6f798d48-8951-473b-bde6-f8121977ddf4/check'

COMPANY_PROFILE = """
МАТ-Лабс — российская IT-компания полного цикла.
Специализация: разработка цифровых продуктов мирового уровня — от стартапа до корпорации.
Ключевые компетенции: искусственный интеллект (AI/ML), облачные решения, кибербезопасность,
веб и мобильная разработка, CRM/ERP системы, автоматизация бизнес-процессов, ИИ-агенты,
чат-боты, платформы управления данными, DevOps и MLOps.
Опыт: более 50 реализованных проектов, команда 50+ инженеров, дизайнеров и аналитиков.
"""

STATUS_LABELS = {
    'new': 'Новый',
    'contacted': 'Контакт установлен',
    'interested': 'Интерес проявлен',
    'negotiation': 'Переговоры',
    'won': 'Клиент',
    'lost': 'Отказ',
    'postponed': 'Отложен',
}

PRIORITY_LABELS = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
}


S = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def auth_check(event):
    token = (event.get('headers') or {}).get('x-session-token') or \
            (event.get('headers') or {}).get('X-Session-Token') or ''
    if not token:
        return False
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not secret:
        print("[auth_check] ADMIN_TOKEN_SECRET не задан")
        return False
    # Токен имеет формат: {raw_token}.{hmac_sig}
    if '.' not in token:
        return False
    parts = token.rsplit('.', 1)
    if len(parts) != 2:
        return False
    raw_token, sig = parts
    expected_sig = hmac.new(secret.encode(), raw_token.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected_sig)


def json_resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return json_resp({'error': msg}, status)


# ── Поиск по открытым источникам ────────────────────────────────────────────

def http_get(url, timeout=10, headers=None):
    try:
        h = {'User-Agent': 'Mozilla/5.0 (compatible; mat-labs-bot/1.0)', 'Accept': 'application/json, text/html'}
        if headers:
            h.update(headers)
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode('utf-8', errors='replace')
            try:
                return {'ok': True, 'data': json.loads(raw), 'text': raw}
            except Exception:
                return {'ok': True, 'data': None, 'text': raw}
    except urllib.error.HTTPError as e:
        print(f"[http_get] HTTP {e.code} for {url[:60]}")
        return {'ok': False, 'error': f'HTTP {e.code}', 'data': None, 'text': ''}
    except Exception as e:
        print(f"[http_get] ERR {type(e).__name__}: {str(e)[:80]} for {url[:60]}")
        return {'ok': False, 'error': str(e)[:120], 'data': None, 'text': ''}


def search_egrul(query: str) -> list:
    """Поиск по ЕГРЮЛ через DaData (юридические лица)"""
    encoded = urllib.parse.quote(query)
    try:
        suggestions = _dadata_suggest(query, count=20, extra={"type": ["LEGAL"]})
        return [
            _dadata_item_to_prospect(s, 'ЕГРЮЛ / ФНС', f"https://egrul.nalog.ru/?query={encoded}")
            for s in suggestions if s.get('value')
        ]
    except Exception as e:
        print(f"[search_egrul] {e}")
    return []


def search_zakupki_orgs(query: str) -> list:
    """Поиск организаций через ЕИС — они закупают и являются потенциальными клиентами"""
    results = []
    encoded = urllib.parse.quote(query)
    url = f"https://zakupki.gov.ru/epz/organization/search/results.json?searchString={encoded}&morphology=on&pageNumber=1&pageSize=15&sortDirection=false&recordsPerPage=_15&showLoading=false&sortBy=SORT_BY_ORG_NAME"
    r = http_get(url, timeout=10, headers={'Referer': 'https://zakupki.gov.ru/', 'Accept': 'application/json, text/javascript'})
    if r['ok'] and r['data']:
        items = r['data'].get('data', {}).get('list', []) or []
        for item in items[:15]:
            if not isinstance(item, dict):
                continue
            name = item.get('shortName') or item.get('fullName') or ''
            inn = item.get('inn') or ''
            region = item.get('regionName') or ''
            if name:
                results.append({
                    'company_name': name,
                    'inn': str(inn),
                    'ogrn': item.get('ogrn', '') or '',
                    'region': region,
                    'source': 'ЕИС (Гос. закупки)',
                    'source_url': f"https://zakupki.gov.ru/epz/organization/search/results.html?searchString={encoded}",
                    'industry': '',
                    'description': item.get('organizationKindName', ''),
                    'website': item.get('webSite', '') or '',
                    'email': item.get('email', '') or '',
                    'phone': item.get('phone', '') or '',
                    'address': item.get('postAddress', '') or '',
                    'revenue_range': '',
                    'employee_count': '',
                    'founded_year': None,
                })
    return results


def _dadata_suggest(query: str, count: int = 10, extra: dict = None) -> list:
    """Общий вызов DaData Suggestions API для поиска компаний"""
    api_key = os.environ.get('DADATA_API_KEY', '')
    if not api_key:
        print("[dadata] DADATA_API_KEY не задан")
        return []
    payload = {"query": query, "count": count}
    if extra:
        payload.update(extra)
    req = urllib.request.Request(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party",
        data=json.dumps(payload).encode(),
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Token {api_key}',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read()).get('suggestions') or []


def _dadata_item_to_prospect(item: dict, source: str, source_url: str) -> dict:
    d = item.get('data') or {}
    name = item.get('value') or ''
    inn = d.get('inn') or ''
    addr = d.get('address') or {}
    addr_data = addr.get('data') or {}
    return {
        'company_name': name, 'inn': str(inn), 'ogrn': d.get('ogrn') or '',
        'region': addr_data.get('region') or addr_data.get('city') or '',
        'source': source, 'source_url': source_url,
        'industry': d.get('okved') or d.get('okved_type') or '',
        'description': d.get('type') or '',
        'website': '', 'email': '', 'phone': '',
        'address': addr.get('unrestricted_value') or '',
        'revenue_range': '', 'employee_count': str(d.get('employee_count') or ''),
        'founded_year': None,
    }


def search_kontur(query: str) -> list:
    """Поиск компаний через DaData (подсказки по названию/ИНН)"""
    encoded = urllib.parse.quote(query)
    try:
        suggestions = _dadata_suggest(query, count=20)
        return [
            _dadata_item_to_prospect(s, 'DaData / ЕГРЮЛ', f"https://dadata.ru/find-by-id/party/{(s.get('data') or {}).get('inn', '')}/")
            for s in suggestions if s.get('value')
        ]
    except Exception as e:
        print(f"[search_kontur] {e}")
    return []


def search_2gis(query: str, region: str = '') -> list:
    """Поиск компаний через 2ГИС API"""
    results = []
    q = query + (' ' + region if region else '')
    encoded = urllib.parse.quote(q)
    url = f"https://catalog.api.2gis.com/3.0/items?q={encoded}&page_size=15&fields=items.point,items.full_name,items.address,items.contact_groups,items.rubrics,items.url,items.org&key=rurbbn2590"
    r = http_get(url, timeout=10)
    if r['ok'] and r['data']:
        items = r['data'].get('result', {}).get('items', [])
        for item in items[:12]:
            if not isinstance(item, dict):
                continue
            name = item.get('full_name') or item.get('name') or ''
            if not name:
                continue
            contacts = item.get('contact_groups', [{}])
            email = ''
            phone = ''
            website = ''
            for cg in contacts:
                for c in cg.get('contacts', []):
                    if c.get('type') == 'email' and not email:
                        email = c.get('value', '')
                    if c.get('type') == 'phone' and not phone:
                        phone = c.get('value', '')
                    if c.get('type') == 'website' and not website:
                        website = c.get('value', '')
            rubrics = item.get('rubrics', [])
            industry = rubrics[0].get('name', '') if rubrics else ''
            results.append({
                'company_name': name,
                'inn': '',
                'ogrn': '',
                'region': item.get('address', {}).get('city', '') if isinstance(item.get('address'), dict) else '',
                'source': '2ГИС',
                'source_url': f"https://2gis.ru/search/{encoded}",
                'industry': industry,
                'description': '',
                'website': website,
                'email': email,
                'phone': phone,
                'address': item.get('address_name', '') or '',
                'revenue_range': '',
                'employee_count': '',
                'founded_year': None,
            })
    return results


def search_msp(query: str) -> list:
    """Поиск ИП и малых компаний через DaData (тип INDIVIDUAL + LEGAL)"""
    encoded = urllib.parse.quote(query)
    try:
        suggestions = _dadata_suggest(query, count=20, extra={"type": ["INDIVIDUAL"]})
        results = [
            _dadata_item_to_prospect(s, 'Реестр МСП', f"https://rmsp.nalog.ru/search.html?mode=full&query={encoded}")
            for s in suggestions if s.get('value')
        ]
        return results
    except Exception as e:
        print(f"[search_msp] {e}")
    return []


def search_hh(query: str, region: str = '') -> list:
    """Поиск компаний на HH.ru — нанимают IT, значит потенциальный клиент для аутсорса"""
    results = []
    encoded = urllib.parse.quote(query)
    region_param = ''
    if region:
        region_map = {
            'москва': '1', 'московская': '1', 'spb': '2', 'питер': '2',
            'санкт-петербург': '2', 'екатеринбург': '3', 'новосибирск': '4',
        }
        reg_key = region.lower().strip()
        area = next((v for k, v in region_map.items() if k in reg_key), '113')
        region_param = f"&area={area}"
    else:
        region_param = '&area=113'

    url = f"https://api.hh.ru/vacancies?text={encoded}&per_page=50&page=0{region_param}&only_with_salary=false"
    r = http_get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0 (compatible; prospector/1.0)'})
    if not r['ok'] or not r['data']:
        return results

    seen = set()
    for item in (r['data'].get('items') or []):
        employer = item.get('employer') or {}
        name = employer.get('name', '')
        emp_id = str(employer.get('id', ''))
        if not name or emp_id in seen:
            continue
        seen.add(emp_id)
        area = item.get('area') or {}
        vacancy_name = item.get('name', '')
        results.append({
            'company_name': name,
            'inn': '',
            'ogrn': '',
            'region': area.get('name', ''),
            'source': 'HH.ru',
            'source_url': employer.get('alternate_url') or f"https://hh.ru/employer/{emp_id}",
            'industry': vacancy_name,
            'description': 'Нанимает IT-специалистов',
            'website': employer.get('site_url') or '',
            'email': '',
            'phone': '',
            'address': '',
            'revenue_range': '',
            'employee_count': '',
            'founded_year': None,
        })
    return results


def analyze_hh_vacancies(company_name: str, company_url: str = '') -> dict:
    """Анализирует вакансии компании на HH.ru: находит IT-боли и формирует блок для КП"""
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        return {'error': 'Нет ключа ИИ'}

    # Ищем вакансии компании на HH
    encoded = urllib.parse.quote(company_name)
    url = f"https://api.hh.ru/vacancies?text={encoded}&employer_name={encoded}&per_page=20&page=0&area=113&only_with_salary=false"
    r = http_get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0 (compatible; prospector/1.0)'})

    vacancies = []
    employer_info = {}
    if r['ok'] and r['data']:
        items = r['data'].get('items') or []
        for item in items[:20]:
            emp = item.get('employer') or {}
            if company_name.lower() in (emp.get('name') or '').lower():
                vacancies.append({
                    'title': item.get('name', ''),
                    'area': (item.get('area') or {}).get('name', ''),
                    'salary': item.get('salary'),
                    'snippet': (item.get('snippet') or {}).get('requirement', '') or '',
                    'url': item.get('alternate_url', ''),
                })
                if not employer_info:
                    employer_info = {
                        'name': emp.get('name', ''),
                        'site_url': emp.get('site_url', ''),
                        'hh_url': emp.get('alternate_url', ''),
                        'industries': [],
                    }

    if not vacancies:
        # Попробуем более широкий поиск
        url2 = f"https://api.hh.ru/vacancies?text={encoded}&per_page=10&page=0&area=113"
        r2 = http_get(url2, timeout=10, headers={'User-Agent': 'Mozilla/5.0 (compatible; prospector/1.0)'})
        if r2['ok'] and r2['data']:
            for item in (r2['data'].get('items') or [])[:10]:
                emp = item.get('employer') or {}
                if company_name.lower()[:6] in (emp.get('name') or '').lower():
                    vacancies.append({
                        'title': item.get('name', ''),
                        'area': (item.get('area') or {}).get('name', ''),
                        'salary': item.get('salary'),
                        'snippet': (item.get('snippet') or {}).get('requirement', '') or '',
                        'url': item.get('alternate_url', ''),
                    })
                    if not employer_info:
                        employer_info = {'name': emp.get('name', ''), 'site_url': emp.get('site_url', ''), 'hh_url': emp.get('alternate_url', '')}

    vacancy_text = '\n'.join([
        f"- {v['title']}" + (f" ({v['area']})" if v['area'] else '') + (f": {v['snippet'][:120]}" if v['snippet'] else '')
        for v in vacancies[:15]
    ]) or "Вакансии не найдены в открытом доступе"

    prompt = f"""Ты — эксперт по B2B продажам IT-услуг. Анализируешь вакансии компании и определяешь, какие IT-проблемы они пытаются решить наймом сотрудников.

Компания: {company_name}
Сайт: {company_url or employer_info.get('site_url', 'не указан')}
HH.ru: {employer_info.get('hh_url', f'https://hh.ru/search/vacancy?text={encoded}')}

Вакансии на HH.ru:
{vacancy_text}

Задача: определи IT-боли и потребности компании по вакансиям. Если ищут разработчиков — значит нужна разработка. Если аналитиков данных — нужна BI/аналитика. Если DevOps — нужна инфраструктура. Формируй конкретные предложения от МАТ-Лабс.

Верни ТОЛЬКО JSON без markdown:
{{
  "company_name": "{company_name}",
  "vacancies_found": {len(vacancies)},
  "hh_url": "{employer_info.get('hh_url', '')}",
  "it_problems": [
    {{"problem": "<проблема компании>", "evidence": "<какие вакансии указывают на это>", "solution": "<что может предложить МАТ-Лабс>", "benefit": "<бизнес-выгода для клиента>"}}
  ],
  "kp_block": "<готовый абзац для КП: 3-4 предложения, персонализированные под проблемы компании>",
  "recommended_services": ["<услуга МАТ-Лабс 1>", "<услуга 2>", "<услуга 3>"],
  "urgency": "<high|medium|low — насколько срочно им нужна помощь>",
  "summary": "<2 предложения: главный вывод об IT-потребностях компании>"
}}"""

    try:
        body_data = json.dumps({
            'model': 'gpt-4o',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.3,
            'max_tokens': 1200,
        }).encode()
        req = urllib.request.Request(
            AI_URL, data=body_data,
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read().decode())
        text = data['choices'][0]['message']['content'].strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        result = json.loads(text)
        result['raw_vacancies'] = vacancies[:10]
        return result
    except Exception as e:
        return {'error': str(e)[:200], 'raw_vacancies': vacancies[:5]}


def search_all_sources(query: str, region: str = '', sources: list = None) -> dict:
    """Агрегирует результаты по всем источникам"""
    all_results = []
    errors = []
    meta = []

    src_map = {
        'egrul': ('ЕГРЮЛ / ФНС', search_egrul),
        'eis': ('ЕИС (Гос. закупки)', lambda q: search_zakupki_orgs(q)),
        'kontur': ('Контур.Фокус', search_kontur),
        '2gis': ('2ГИС', lambda q: search_2gis(q, region)),
        'msp': ('Реестр МСП', search_msp),
        'hh': ('HH.ru', lambda q: search_hh(q, region)),
    }
    if sources is None:
        sources = list(src_map.keys())

    print(f"[search] query={query!r} sources={sources}")
    for key in sources:
        if key not in src_map:
            continue
        label, fn = src_map[key]
        try:
            res = fn(query)
            print(f"[search] {label}: {len(res)} results")
            all_results.extend(res)
            meta.append({'source': label, 'count': len(res)})
        except Exception as e:
            print(f"[search] {label} ERROR: {e}")
            errors.append(f"{label}: {str(e)[:60]}")
            meta.append({'source': label, 'count': 0, 'error': str(e)[:60]})

    # Дедупликация по ИНН
    seen_inn = set()
    unique = []
    for r in all_results:
        inn = r.get('inn', '').strip()
        name_key = r['company_name'].lower().strip()
        dedup_key = inn if inn else name_key
        if dedup_key and dedup_key not in seen_inn:
            seen_inn.add(dedup_key)
            unique.append(r)

    return {'results': unique, 'meta': meta, 'errors': errors, 'total': len(unique)}


# ── ИИ-анализ клиента ────────────────────────────────────────────────────────

def ai_analyze_prospect(company: dict, project_description: str = '') -> dict:
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        return {'error': 'Нет ключа ИИ'}

    prompt = f"""Ты — маркетолог и бизнес-аналитик IT-компании МАТ-Лабс.

Профиль компании МАТ-Лабс:
{COMPANY_PROFILE.strip()}

{"Контекст проекта: " + project_description if project_description else ""}

Оцени потенциального клиента и верни JSON:

Компания: {company.get('company_name', '')}
ИНН: {company.get('inn', '')}
Отрасль: {company.get('industry', '')}
Описание: {company.get('description', '')}
Регион: {company.get('region', '')}
Сайт: {company.get('website', '')}
Численность сотрудников: {company.get('employee_count', '')}
Выручка: {company.get('revenue_range', '')}
Адрес: {company.get('address', '')}

Верни ТОЛЬКО JSON (без markdown):
{{
  "score": <0-100, насколько перспективен клиент для МАТ-Лабс>,
  "priority": "<low|medium|high>",
  "summary": "<2-3 предложения: кто такие, почему интересны>",
  "reasons": ["<причина 1>", "<причина 2>", "<причина 3>"],
  "pain_points": ["<боль 1>", "<боль 2>"],
  "offer": "<конкретное предложение от МАТ-Лабс для этой компании>",
  "approach": "<рекомендуемый способ выхода на контакт>",
  "next_action": "<первый конкретный шаг>",
  "risks": ["<риск 1>"]
}}"""

    try:
        body = json.dumps({
            'model': 'gpt-4o-mini',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.3,
            'max_tokens': 800,
        }).encode()
        req = urllib.request.Request(
            AI_URL, data=body,
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        text = data['choices'][0]['message']['content'].strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        result = json.loads(text)
        return result
    except Exception as e:
        return {'error': str(e)[:120]}


def upload_kp_file(file_b64: str, filename: str) -> dict:
    """Загружает PDF-файл КП в S3 и возвращает CDN-ссылку"""
    try:
        # Убираем data URL prefix если есть
        if ',' in file_b64:
            file_b64 = file_b64.split(',', 1)[1]
        file_bytes = base64.b64decode(file_b64)

        # Санитизация имени файла
        safe_name = re.sub(r'[^\w\-.]', '_', filename)[:80]
        if not safe_name.lower().endswith('.pdf'):
            safe_name += '.pdf'
        key = f"kp/{uuid.uuid4().hex}_{safe_name}"

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )
        s3.put_object(
            Bucket='files',
            Key=key,
            Body=file_bytes,
            ContentType='application/pdf',
            ContentDisposition=f'inline; filename="{safe_name}"',
        )
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        print(f"[upload_kp] uploaded {len(file_bytes)} bytes → {cdn_url}")
        return {'ok': True, 'url': cdn_url, 'filename': safe_name, 'size': len(file_bytes)}
    except Exception as e:
        print(f"[upload_kp] error: {e}")
        return {'ok': False, 'error': str(e)[:200]}


def find_company_email(company_name: str, website: str = '') -> dict:
    """Поиск email компании: Яндекс XML → парсинг сайта → GPT-извлечение"""
    found_emails = set()
    sources_checked = []

    # ── 1. Regex для извлечения email из произвольного текста ──────────────
    EMAIL_RE = re.compile(r'[\w.+\-]+@[\w\-]+\.[\w.\-]{2,}')

    def extract_emails(text: str) -> list:
        hits = EMAIL_RE.findall(text)
        return [e.lower() for e in hits if not e.endswith(('.png', '.jpg', '.gif', '.svg'))]

    # ── 2. Яндекс XML API (новый формат — только apikey) ─────────────────
    yx_user = os.environ.get('YANDEX_XML_USER', '')
    yx_key  = os.environ.get('YANDEX_XML_KEY', '')

    search_queries = [
        f'{company_name} email контакты',
        f'{company_name} почта официальный сайт',
    ]
    if website:
        search_queries.insert(0, f'site:{website} email контакты')

    if yx_key:
        for q in search_queries[:2]:
            enc = urllib.parse.quote(q)
            # Новый Яндекс XML 2.0 — только apikey, без user
            if yx_user:
                url = f"https://xmlsearch.yandex.ru/xmlsearch?user={yx_user}&key={yx_key}&query={enc}&lr=213&groupby=attr%3D%22%22.mode%3Dflat.groups-on-page%3D10"
            else:
                url = f"https://xmlsearch.yandex.ru/xmlsearch?key={yx_key}&query={enc}&lr=213&groupby=attr%3D%22%22.mode%3Dflat.groups-on-page%3D10"
            r = http_get(url, timeout=10, headers={'Accept': 'application/xml, text/xml'})
            if r['ok'] and r['text']:
                sources_checked.append(f"Яндекс XML: {q[:40]}")
                emails = extract_emails(r['text'])
                found_emails.update(emails)
                print(f"[find_email] yandex xml q={q!r} → {emails}")
                if found_emails:
                    break
            else:
                print(f"[find_email] yandex xml failed: {r.get('error','')}")
    else:
        print("[find_email] YANDEX_XML_KEY не задан, пропускаем Яндекс XML")

    # ── 3. Парсинг сайта компании (если известен) ─────────────────────────
    if website and not found_emails:
        site = website if website.startswith('http') else f'https://{website}'
        for path_suffix in ['', '/contacts', '/kontakty', '/about', '/o-kompanii']:
            r = http_get(site + path_suffix, timeout=8, headers={'Accept': 'text/html'})
            if r['ok'] and r['text']:
                sources_checked.append(f"Сайт: {site}{path_suffix}")
                emails = extract_emails(r['text'])
                found_emails.update(emails)
                print(f"[find_email] site {path_suffix!r} → {emails}")
            if found_emails:
                break

    # ── 4. GPT-помощник: если ничего не нашли regex → просим GPT предположить
    if not found_emails:
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if api_key:
            site_hint = f"\nСайт компании: {website}" if website else ""
            prompt = f"""Ты — эксперт по поиску контактов B2B-компаний в России.

Компания: {company_name}{site_hint}

Задача: найти или предположить возможный email этой компании.
Используй паттерны: info@домен, mail@домен, contact@домен, отдел@домен.

Если сайт указан — предложи наиболее вероятный email на основе домена.
Если сайта нет — напиши "не найден".

Верни ТОЛЬКО JSON без markdown:
{{"email": "<email или пустая строка>", "confidence": "<high|medium|low>", "note": "<пояснение>"}}"""
            try:
                body_data = json.dumps({
                    'model': 'gpt-4o-mini',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.2, 'max_tokens': 150,
                }).encode()
                req = urllib.request.Request(
                    AI_URL, data=body_data,
                    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())
                text = data['choices'][0]['message']['content'].strip()
                text = re.sub(r'^```(?:json)?\s*', '', text)
                text = re.sub(r'\s*```$', '', text)
                ai_result = json.loads(text)
                if ai_result.get('email'):
                    return {
                        'emails': [ai_result['email']],
                        'primary': ai_result['email'],
                        'confidence': ai_result.get('confidence', 'low'),
                        'note': ai_result.get('note', ''),
                        'sources': ['ИИ-предположение'],
                        'method': 'ai_guess',
                    }
            except Exception as e:
                print(f"[find_email] GPT error: {e}")

    # ── 5. Фильтрация мусора и возврат ────────────────────────────────────
    # Убираем технические и noreply адреса
    SKIP = {'noreply', 'no-reply', 'support@yandex', 'postmaster', 'mailer-daemon',
            'robot', 'bounce', 'notifications', 'newsletter'}
    clean = [e for e in found_emails if not any(s in e for s in SKIP)]

    # Предпочитаем info@, mail@, contact@
    def email_priority(e):
        local = e.split('@')[0]
        if local in ('info', 'mail', 'contact', 'email', 'hello', 'office'):
            return 0
        if local in ('sales', 'marketing', 'pr', 'media'):
            return 1
        return 2

    clean.sort(key=email_priority)
    primary = clean[0] if clean else ''

    return {
        'emails': clean[:5],
        'primary': primary,
        'confidence': 'high' if primary else 'none',
        'note': f"Найдено через: {', '.join(sources_checked)}" if sources_checked else 'Источники недоступны',
        'sources': sources_checked,
        'method': 'regex_search' if clean else 'not_found',
    }


def ai_tech_radar(region: str, industry: str = '') -> dict:
    """ИИ-анализ: выявление компаний, внедряющих технологии, через новости и открытые данные"""
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        return {'error': 'Нет ключа ИИ'}

    region_text = region.strip() if region.strip() else 'Россия'
    industry_text = f", отрасль: {industry.strip()}" if industry.strip() else ''

    prompt = f"""Ты — аналитик B2B-рынка. Твоя задача — выявить компании в регионе "{region_text}"{industry_text}, которые активно внедряют новые технологии: ИИ, ERP, автоматизацию, роботизацию, цифровизацию, IoT, облака.

Используй свои знания о российском бизнесе, региональных новостях, пресс-релизах, программах цифровизации (НТИ, нацпроекты), а также общеизвестные факты о технологической активности компаний.

Верни список из 10-15 реальных или типичных компаний региона (или крупных игроков с присутствием в регионе) с признаками технологической активности.

Верни ТОЛЬКО JSON без markdown:
{{
  "region": "{region_text}",
  "industry_filter": "{industry.strip() or 'все отрасли'}",
  "summary": "<2-3 предложения: общая картина технологической активности в регионе>",
  "tech_signals": [
    {{
      "company_name": "<название компании>",
      "inn": "<ИНН если известен, иначе пустая строка>",
      "region": "<город/регион>",
      "industry": "<отрасль>",
      "tech_tags": ["<ИИ|ERP|Автоматизация|Роботизация|Цифровизация|IoT|Облака|RPA|ML|Промышленный IoT>"],
      "signal": "<конкретный факт: что именно внедряют, откуда информация>",
      "potential": "<high|medium|low — потенциал как клиента для IT-интегратора>",
      "website": "<сайт если известен>",
      "source": "<источник: название СМИ, пресс-релиз, нацпроект и т.д.>"
    }}
  ],
  "hot_industries": ["<отрасль 1>", "<отрасль 2>", "<отрасль 3>"],
  "regional_trends": ["<тренд 1>", "<тренд 2>", "<тренд 3>"]
}}"""

    try:
        body_data = json.dumps({
            'model': 'gpt-4o',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.4,
            'max_tokens': 2500,
        }).encode()
        req = urllib.request.Request(
            AI_URL, data=body_data,
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode())
        text = data['choices'][0]['message']['content'].strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {'error': str(e)[:200]}


def ai_generate_message(company: dict, message_type: str = 'email') -> str:
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        return 'Нет ключа ИИ'

    type_labels = {
        'email': 'холодное письмо',
        'linkedin': 'сообщение в LinkedIn/соцсетях',
        'call': 'скрипт холодного звонка',
    }
    label = type_labels.get(message_type, 'письмо')

    prompt = f"""Ты — опытный B2B-продавец IT-компании МАТ-Лабс.

Профиль МАТ-Лабс:
{COMPANY_PROFILE.strip()}

Напиши {label} для компании:
Название: {company.get('company_name', '')}
Отрасль: {company.get('industry', '')}
Описание: {company.get('description', '')}
Регион: {company.get('region', '')}
Анализ ИИ: {company.get('ai_summary', '')}

Требования:
- Персонализированное, не шаблонное
- Конкретная ценность для их бизнеса
- Призыв к действию (встреча / созвон 15 мин)
- Длина: 150-200 слов
- Стиль: профессиональный, но живой

Верни ТОЛЬКО текст сообщения, без пояснений."""

    try:
        body = json.dumps({
            'model': 'gpt-4o-mini',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.6,
            'max_tokens': 500,
        }).encode()
        req = urllib.request.Request(
            AI_URL, data=body,
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        return data['choices'][0]['message']['content'].strip()
    except Exception as e:
        return f'Ошибка: {str(e)[:100]}'


# ── CRUD: Проекты ─────────────────────────────────────────────────────────────

def handle_projects(event, method, body):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        cur.execute(f"""
            SELECT p.*, COUNT(pr.id) as prospect_count
            FROM {S}.prospect_projects p
            LEFT JOIN {S}.prospects pr ON pr.project_id = p.id
            GROUP BY p.id ORDER BY p.created_at DESC
        """)
        projects = [dict(r) for r in cur.fetchall()]
        conn.close()
        return json_resp({'projects': projects})

    if method == 'POST':
        name = (body.get('name') or '').strip()
        if not name:
            conn.close()
            return err('Название обязательно')
        cur.execute(
            f"INSERT INTO {S}.prospect_projects (name, description, color) VALUES (%s, %s, %s) RETURNING *",
            (name, body.get('description', ''), body.get('color', '#7c3aed'))
        )
        proj = dict(cur.fetchone())
        conn.commit()
        conn.close()
        return json_resp({'project': proj})

    if method == 'PUT':
        pid = body.get('id')
        cur.execute(
            f"UPDATE {S}.prospect_projects SET name=%s, description=%s, color=%s WHERE id=%s RETURNING *",
            (body.get('name'), body.get('description', ''), body.get('color', '#7c3aed'), pid)
        )
        proj = cur.fetchone()
        conn.commit()
        conn.close()
        return json_resp({'project': dict(proj) if proj else None})

    conn.close()
    return err('Метод не поддерживается')


# ── CRUD: Проспекты ───────────────────────────────────────────────────────────

def handle_prospects_list(event, method, body, params):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        filters = []
        args = []
        if params.get('project_id'):
            filters.append("p.project_id = %s")
            args.append(int(params['project_id']))
        if params.get('status'):
            filters.append("p.status = %s")
            args.append(params['status'])
        if params.get('priority'):
            filters.append("p.priority = %s")
            args.append(params['priority'])
        if params.get('search'):
            filters.append("(p.company_name ILIKE %s OR p.industry ILIKE %s OR p.region ILIKE %s)")
            q = f"%{params['search']}%"
            args += [q, q, q]

        where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
        cur.execute(f"""
            SELECT p.*, pr.name as project_name, pr.color as project_color
            FROM {S}.prospects p
            LEFT JOIN {S}.prospect_projects pr ON pr.id = p.project_id
            {where}
            ORDER BY p.updated_at DESC
            LIMIT 200
        """, args)
        prospects = [dict(r) for r in cur.fetchall()]

        # Аналитика
        cur.execute(f"SELECT status, COUNT(*) as cnt FROM {S}.prospects GROUP BY status")
        status_stats = {r['status']: r['cnt'] for r in cur.fetchall()}

        cur.execute(f"SELECT priority, COUNT(*) as cnt FROM {S}.prospects GROUP BY priority")
        priority_stats = {r['priority']: r['cnt'] for r in cur.fetchall()}

        cur.execute(f"SELECT COUNT(*) as total FROM {S}.prospects")
        total = cur.fetchone()['total']

        conn.close()
        return json_resp({
            'prospects': prospects,
            'total': total,
            'status_stats': status_stats,
            'priority_stats': priority_stats,
        })

    if method == 'POST':
        d = body
        cur.execute(f"""
            INSERT INTO {S}.prospects (
                project_id, company_name, inn, ogrn, industry, description,
                website, email, phone, address, region,
                source, source_url, revenue_range, employee_count, founded_year,
                status, priority, note, next_action, next_action_date,
                ai_score, ai_summary, ai_reasons
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            ) RETURNING *
        """, (
            d.get('project_id'), d.get('company_name', ''), d.get('inn', ''), d.get('ogrn', ''),
            d.get('industry', ''), d.get('description', ''), d.get('website', ''),
            d.get('email', ''), d.get('phone', ''), d.get('address', ''), d.get('region', ''),
            d.get('source', 'manual'), d.get('source_url', ''), d.get('revenue_range', ''),
            d.get('employee_count', ''), d.get('founded_year'),
            d.get('status', 'new'), d.get('priority', 'medium'),
            d.get('note', ''), d.get('next_action', ''), d.get('next_action_date'),
            d.get('ai_score'), d.get('ai_summary', ''), d.get('ai_reasons', []),
        ))
        prospect = dict(cur.fetchone())

        # Лог активности
        cur.execute(
            f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, %s, %s)",
            (prospect['id'], 'note', f"Компания добавлена из источника: {d.get('source', 'manual')}")
        )
        conn.commit()
        conn.close()
        return json_resp({'prospect': prospect})

    conn.close()
    return err('Метод не поддерживается')


def handle_prospect_detail(event, method, body, prospect_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        cur.execute(f"""
            SELECT p.*, pr.name as project_name, pr.color as project_color
            FROM {S}.prospects p
            LEFT JOIN {S}.prospect_projects pr ON pr.id = p.project_id
            WHERE p.id = %s
        """, (prospect_id,))
        p = cur.fetchone()
        if not p:
            conn.close()
            return err('Не найден', 404)
        prospect = dict(p)

        cur.execute(f"SELECT * FROM {S}.prospect_activities WHERE prospect_id=%s ORDER BY created_at DESC", (prospect_id,))
        activities = [dict(r) for r in cur.fetchall()]
        conn.close()
        return json_resp({'prospect': prospect, 'activities': activities})

    if method == 'PUT':
        d = body
        old_status = None
        cur.execute(f"SELECT status FROM {S}.prospects WHERE id=%s", (prospect_id,))
        row = cur.fetchone()
        if row:
            old_status = row['status']

        cur.execute(f"""
            UPDATE {S}.prospects SET
                project_id=%s, company_name=%s, inn=%s, ogrn=%s, industry=%s,
                description=%s, website=%s, email=%s, phone=%s, address=%s, region=%s,
                revenue_range=%s, employee_count=%s, founded_year=%s,
                status=%s, priority=%s, note=%s, next_action=%s, next_action_date=%s,
                ai_score=%s, ai_summary=%s, ai_reasons=%s,
                updated_at=NOW()
            WHERE id=%s RETURNING *
        """, (
            d.get('project_id'), d.get('company_name'), d.get('inn', ''), d.get('ogrn', ''),
            d.get('industry', ''), d.get('description', ''), d.get('website', ''),
            d.get('email', ''), d.get('phone', ''), d.get('address', ''), d.get('region', ''),
            d.get('revenue_range', ''), d.get('employee_count', ''), d.get('founded_year'),
            d.get('status', 'new'), d.get('priority', 'medium'),
            d.get('note', ''), d.get('next_action', ''), d.get('next_action_date'),
            d.get('ai_score'), d.get('ai_summary', ''), d.get('ai_reasons', []),
            prospect_id,
        ))
        updated = cur.fetchone()

        # Лог изменения статуса
        new_status = d.get('status')
        if old_status and new_status and old_status != new_status:
            cur.execute(
                f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, %s, %s)",
                (prospect_id, 'status_change',
                 f"Статус изменён: {STATUS_LABELS.get(old_status, old_status)} → {STATUS_LABELS.get(new_status, new_status)}")
            )

        conn.commit()
        conn.close()
        return json_resp({'prospect': dict(updated) if updated else None})

    if method == 'DELETE':
        cur.execute(f"UPDATE {S}.prospects SET status='lost' WHERE id=%s", (prospect_id,))
        cur.execute(
            f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, %s, %s)",
            (prospect_id, 'note', 'Статус изменён на «Отказ»')
        )
        conn.commit()
        conn.close()
        return json_resp({'ok': True})

    conn.close()
    return err('Метод не поддерживается')


def handle_add_activity(prospect_id, body):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, %s, %s) RETURNING *",
        (prospect_id, body.get('activity_type', 'note'), body.get('content', ''))
    )
    act = dict(cur.fetchone())
    conn.commit()
    conn.close()
    return json_resp({'activity': act})


# ── Главный обработчик ────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Модуль поиска потенциальных клиентов: поиск, CRM, ИИ-анализ"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if not auth_check(event):
        return err('Не авторизован', 401)

    path = event.get('path', '/').rstrip('/')
    params = event.get('queryStringParameters') or {}
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            pass

    # Читаем action из тела или query, маппим в путь
    action = body.get('action') or params.get('action') or ''
    print(f"[handler] method={method} path={path!r} action={action!r} body_keys={list(body.keys())}")
    action_to_path = {
        'search': '/search',
        'analyze': '/analyze',
        'message': '/message',
        'radar': '/radar',
        'find_email': '/find_email',
        'upload_kp': '/upload_kp',
        'analyze_hh': '/analyze_hh',
        'projects': '/projects',
        'projects_create': '/projects',
        'list': '/',
        'create': '/',
        'update': f'/{body.get("id", "")}' if body.get('id') else '/',
        'detail': f'/{params.get("id", "")}' if params.get('id') else '/',
        'activity': f'/{body.get("prospect_id", "")}/activity' if body.get('prospect_id') else '/activity',
    }
    if action and path in ('/', ''):
        path = action_to_path.get(action, '/' + action)

    # /prospects/search — поиск по источникам
    if path.endswith('/search'):
        if method != 'POST':
            return err('Только POST')
        query = (body.get('query') or '').strip()
        if not query:
            return err('Пустой запрос')
        region = body.get('region', '')
        sources = body.get('sources', None)
        result = search_all_sources(query, region, sources)
        return json_resp(result)

    # /prospects/analyze_hh — анализ вакансий HH.ru компании
    if path.endswith('/analyze_hh'):
        if method != 'POST':
            return err('Только POST')
        company_name = (body.get('company_name') or '').strip()
        company_url = (body.get('website') or '').strip()
        if not company_name:
            return err('Не указано название компании')
        result = analyze_hh_vacancies(company_name, company_url)
        return json_resp(result)

    # /prospects/upload_kp — загрузка PDF КП в S3
    if path.endswith('/upload_kp'):
        if method != 'POST':
            return err('Только POST')
        file_b64 = body.get('file') or ''
        filename = body.get('filename') or 'КП_МАТ-Лабс.pdf'
        if not file_b64:
            return err('Файл не передан')
        result = upload_kp_file(file_b64, filename)
        return json_resp(result)

    # /prospects/find_email — поиск email компании через Яндекс
    if path.endswith('/find_email'):
        if method != 'POST':
            return err('Только POST')
        company_name = (body.get('company_name') or '').strip()
        website = (body.get('website') or '').strip()
        if not company_name:
            return err('Не указано название компании')
        result = find_company_email(company_name, website)
        return json_resp(result)

    # /prospects/radar — технологический радар регионов
    if path.endswith('/radar'):
        if method != 'POST':
            return err('Только POST')
        region = (body.get('region') or '').strip()
        industry = (body.get('industry') or '').strip()
        result = ai_tech_radar(region, industry)
        return json_resp(result)

    # /prospects/analyze — ИИ-анализ компании
    if path.endswith('/analyze'):
        if method != 'POST':
            return err('Только POST')
        company = body.get('company', {})
        project_desc = body.get('project_description', '')
        result = ai_analyze_prospect(company, project_desc)
        return json_resp({'analysis': result})

    # /prospects/message — генерация письма/скрипта
    if path.endswith('/message'):
        if method != 'POST':
            return err('Только POST')
        company = body.get('company', {})
        msg_type = body.get('type', 'email')
        text = ai_generate_message(company, msg_type)
        return json_resp({'message': text})

    # /prospects/projects — управление проектами
    if path.endswith('/projects'):
        return handle_projects(event, method, body)

    # /prospects/{id}/activity — добавление активности
    parts = path.split('/')
    if len(parts) >= 2 and parts[-1] == 'activity':
        pid = None
        try:
            pid = int(parts[-2])
        except Exception:
            pass
        if pid and method == 'POST':
            return handle_add_activity(pid, body)

    # /prospects/{id} — детальная карточка
    if len(parts) >= 1:
        last = parts[-1]
        try:
            prospect_id = int(last)
            return handle_prospect_detail(event, method, body, prospect_id)
        except ValueError:
            pass

    # /prospects/ — список и создание
    return handle_prospects_list(event, method, body, params)