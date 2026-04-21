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
import urllib.request
import urllib.parse
import urllib.error
import psycopg2
import psycopg2.extras
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
        suggestions = _dadata_suggest(query, count=15, extra={"type": ["LEGAL"]})
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
        suggestions = _dadata_suggest(query, count=15)
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
        suggestions = _dadata_suggest(query, count=10, extra={"type": ["INDIVIDUAL"]})
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

    url = f"https://api.hh.ru/vacancies?text={encoded}&per_page=20&page=0{region_param}&only_with_salary=false"
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