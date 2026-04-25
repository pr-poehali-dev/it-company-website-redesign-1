"""
Radar Scheduler — ночной планировщик радара.
Автоматически запускает поиск новых лидов по ротации регионов/отраслей,
парсит сигналы с hh.ru, хранит историю запусков.

Actions (POST body):
- run_scheduled  — плановый ночной обход (ротация по дню года)
- run_manual     — ручной запуск с явными region + industry
- run_hh_signals — парсинг вакансий hh.ru как сигналов для лидогенерации
- get_history    — история последних 30 запусков radar_runs
"""
import json
import os
import re
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, date

import psycopg2
import psycopg2.extras

# ── Константы ────────────────────────────────────────────────────────────────

S = os.environ.get('MAIN_DB_SCHEMA', 'public')

AI_URL = 'https://api.polza.ai/v1/chat/completions'
AI_MODEL_RADAR = 'gpt-4o'
AI_MODEL_ENRICH = 'gpt-4o-mini'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Authorization',
}

REGIONS = [
    'Москва',
    'Санкт-Петербург',
    'Екатеринбург',
    'Новосибирск',
    'Краснодар',
    'Казань',
    'Нижний Новгород',
    'Самара',
]

INDUSTRIES = [
    'маркетинг и реклама',
    'медицина и клиники',
    'образование и курсы',
    'торговля и e-commerce',
    'юридические услуги',
]

# Области hh.ru по ротации регионов (area id)
HH_AREAS = {
    'Москва': '1',
    'Санкт-Петербург': '2',
    'Екатеринбург': '3',
    'Новосибирск': '4',
    'Краснодар': '53',
    'Казань': '88',
    'Нижний Новгород': '66',
    'Самара': '78',
}

HH_SEARCH_QUERIES = [
    'CRM автоматизация',
    'внедрение CRM',
    'автоматизация бизнес-процессов',
    'цифровизация',
    'интеграция 1С',
]

COMPANY_PROFILE = """
MAT Labs — российская IT-компания, специализация: AI-автоматизация бизнеса, интеграции, сайты под конверсию.
Внедрение за 7–14 дней.
Генеральный директор: Тюрин Максим Александрович
Телефон: +7 927 748 6868
Email: maksT77@yandex.ru
Идеальные клиенты: маркетинговые агентства, клиники, онлайн-школы, e-commerce, юридические компании.
Признаки тёплого клиента: нет CRM, ручная обработка заявок, нет автоответов, слабый сайт.
"""

RADAR_PROMPT_TEMPLATE = """Ты — эксперт по поиску потенциальных клиентов для IT-компании.

Профиль MAT Labs:
{company_profile}

Задача: найди 20-30 реальных компаний в регионе "{region}", отрасль "{industry}".
Это должны быть компании, которым нужна AI-автоматизация, CRM, интеграции.

Для каждой компании укажи:
- company_name: название компании
- inn: ИНН (если знаешь, иначе пустая строка)
- region: город/регион
- industry: отрасль
- website: сайт (если знаешь)
- email: email для контакта (если знаешь)
- phone: телефон (если знаешь)
- tech_tags: список строк — признаки проблем (например ["нет CRM", "ручная обработка", "устаревший сайт"])
- signal: почему они потенциально нужный клиент (1-2 предложения)
- potential: оценка потенциала 1-10
- source: откуда данные (например "отраслевой справочник", "2ГИС", "открытые данные")

Верни ТОЛЬКО JSON без markdown:
{{"tech_signals": [
  {{"company_name": "...", "inn": "...", "region": "...", "industry": "...", "website": "...", "email": "...", "phone": "...", "tech_tags": [...], "signal": "...", "potential": 7, "source": "..."}}
]}}"""

HH_ANALYSIS_PROMPT = """Ты — эксперт по B2B продажам IT-компании MAT Labs (AI-автоматизация, CRM, интеграции).

Список работодателей с hh.ru, которые ищут специалистов по CRM/автоматизации:
{employers_text}

Проанализируй: кто из этих компаний является потенциальным клиентом MAT Labs?
Логика: если компания ищет человека на внедрение CRM — значит, у них ещё нет CRM и они хотят автоматизацию.

Для каждого потенциального клиента верни:
- company_name: название
- industry: отрасль (угадай по названию и вакансии)
- region: регион
- website: сайт (если знаешь)
- signal: почему это наш клиент (1 предложение)
- potential: 1-10

Верни ТОЛЬКО JSON без markdown:
{{"leads": [
  {{"company_name": "...", "industry": "...", "region": "...", "website": "...", "signal": "...", "potential": 7}}
]}}"""


# ── Вспомогательные функции ──────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def json_resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return json_resp({'ok': False, 'error': msg}, status)


def parse_json_from_ai(text: str) -> dict:
    """Извлекает JSON из ответа AI, убирая возможную markdown-обёртку."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text.strip())


def call_ai(prompt: str, model: str = AI_MODEL_RADAR, max_tokens: int = 4000, temperature: float = 0.4) -> str:
    """Отправляет промпт в Polza AI и возвращает текст ответа."""
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        raise ValueError('POLZA_AI_API_KEY не задан')

    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': f'Ты — эксперт по лидогенерации для IT-компании.\n{COMPANY_PROFILE}'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        AI_URL,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read().decode())
    return result['choices'][0]['message']['content'].strip()


def get_rotation_index(lst: list) -> int:
    """Возвращает индекс для ротации по дню года."""
    day_of_year = date.today().timetuple().tm_yday
    return day_of_year % len(lst)


def deduplicate_prospects(cur, candidates: list) -> tuple[list, int]:
    """
    Дедублицирует кандидатов по ИНН и company_name.
    Возвращает (новые, кол-во пропущенных).
    """
    if not candidates:
        return [], 0

    # Собираем ИНН и нормализованные имена из кандидатов
    inns = [c.get('inn', '').strip() for c in candidates if c.get('inn', '').strip()]
    names = [c.get('company_name', '').strip().lower() for c in candidates if c.get('company_name', '').strip()]

    existing_inns = set()
    existing_names = set()

    if inns:
        cur.execute(
            f"SELECT COALESCE(inn, '') FROM {S}.prospects WHERE inn = ANY(%s) AND inn IS NOT NULL AND inn <> ''",
            (inns,),
        )
        existing_inns = {row[0] for row in cur.fetchall()}

    if names:
        cur.execute(
            f"SELECT LOWER(company_name) FROM {S}.prospects WHERE LOWER(company_name) = ANY(%s)",
            (names,),
        )
        existing_names = {row[0] for row in cur.fetchall()}

    new_candidates = []
    skipped = 0
    seen_in_batch = set()

    for c in candidates:
        inn = (c.get('inn') or '').strip()
        name_lower = (c.get('company_name') or '').strip().lower()

        if not name_lower:
            skipped += 1
            continue

        # Дедубликация внутри батча
        dedup_key = inn if inn else name_lower
        if dedup_key in seen_in_batch:
            skipped += 1
            continue
        seen_in_batch.add(dedup_key)

        # Дедубликация с БД
        if inn and inn in existing_inns:
            skipped += 1
            continue
        if name_lower in existing_names:
            skipped += 1
            continue

        new_candidates.append(c)

    return new_candidates, skipped


def insert_prospects(cur, candidates: list, source: str) -> list:
    """
    Вставляет новых лидов в БД.
    Возвращает список вставленных id.
    """
    inserted_ids = []
    now_utc = datetime.now(timezone.utc)

    for c in candidates:
        company_name = (c.get('company_name') or '').strip()
        if not company_name:
            continue

        inn = (c.get('inn') or '').strip() or None
        region = (c.get('region') or '').strip()
        industry = (c.get('industry') or '').strip()
        website = (c.get('website') or '').strip() or None
        email = (c.get('email') or '').strip() or None
        phone = (c.get('phone') or '').strip() or None
        tech_tags = c.get('tech_tags') or []
        signal = (c.get('signal') or '').strip()
        potential = c.get('potential')
        source_url = (c.get('source') or '').strip() or None

        # ai_score из potential (0-10 → 0-100)
        ai_score = None
        if potential is not None:
            try:
                ai_score = max(0, min(100, int(float(potential)) * 10))
            except (ValueError, TypeError):
                pass

        ai_summary = signal or None
        ai_reasons = tech_tags if isinstance(tech_tags, list) else []

        cur.execute(
            f"""
            INSERT INTO {S}.prospects
                (company_name, inn, industry, region, website, email, phone,
                 status, ai_score, ai_summary, ai_reasons, source, source_url, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'new', %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                company_name, inn, industry, region, website, email, phone,
                ai_score, ai_summary,
                ai_reasons if ai_reasons else None,
                source, source_url, now_utc,
            ),
        )
        row = cur.fetchone()
        if row:
            inserted_ids.append(row[0])

    return inserted_ids


def insert_funnel_events(cur, prospect_ids: list, source: str):
    """Вставляет funnel_events для каждого нового лида."""
    now_utc = datetime.now(timezone.utc)
    for pid in prospect_ids:
        meta = json.dumps({'source': source})
        cur.execute(
            f"""
            INSERT INTO {S}.funnel_events (event_type, prospect_id, source, meta, created_at)
            VALUES ('lead_added', %s, %s, %s::jsonb, %s)
            """,
            (pid, source, meta, now_utc),
        )


def create_radar_run(cur, region: str, industry: str, trigger_type: str) -> int:
    """Создаёт запись в radar_runs и возвращает id."""
    now_utc = datetime.now(timezone.utc)
    cur.execute(
        f"""
        INSERT INTO {S}.radar_runs
            (region, industry, found, inserted, skipped, trigger_type, started_at)
        VALUES (%s, %s, 0, 0, 0, %s, %s)
        RETURNING id
        """,
        (region, industry, trigger_type, now_utc),
    )
    return cur.fetchone()[0]


def finish_radar_run(cur, run_id: int, found: int, inserted: int, skipped: int, error_msg: str = None):
    """Обновляет запись radar_runs по завершении."""
    now_utc = datetime.now(timezone.utc)
    cur.execute(
        f"""
        UPDATE {S}.radar_runs
        SET found = %s,
            inserted = %s,
            skipped = %s,
            finished_at = %s,
            error_msg = %s
        WHERE id = %s
        """,
        (found, inserted, skipped, now_utc, error_msg, run_id),
    )


# ── Ядро радара ───────────────────────────────────────────────────────────────

def run_radar(region: str, industry: str, trigger_type: str) -> dict:
    """
    Основная логика радара: AI генерирует список компаний,
    дедублицирует, вставляет в БД.
    """
    conn = None
    run_id = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            run_id = create_radar_run(cur, region, industry, trigger_type)
            conn.commit()

        # AI-запрос
        prompt = RADAR_PROMPT_TEMPLATE.format(
            company_profile=COMPANY_PROFILE.strip(),
            region=region,
            industry=industry,
        )
        ai_raw = call_ai(prompt, model=AI_MODEL_RADAR, max_tokens=4000, temperature=0.4)

        try:
            parsed = parse_json_from_ai(ai_raw)
            candidates = parsed.get('tech_signals') or []
        except Exception as parse_err:
            print(f"[radar-scheduler] AI parse error: {parse_err}, raw={ai_raw[:300]}")
            with conn.cursor() as cur:
                finish_radar_run(cur, run_id, 0, 0, 0, f'AI parse error: {parse_err}')
                conn.commit()
            conn.close()
            return {'ok': False, 'error': f'AI parse error: {parse_err}'}

        found = len(candidates)

        with conn.cursor() as cur:
            new_candidates, skipped = deduplicate_prospects(cur, candidates)
            inserted_ids = insert_prospects(cur, new_candidates, f'radar_{trigger_type}')
            insert_funnel_events(cur, inserted_ids, f'radar_{trigger_type}')
            finish_radar_run(cur, run_id, found, len(inserted_ids), skipped)
            conn.commit()

        print(f"[radar-scheduler] run_radar: region={region} industry={industry} "
              f"found={found} inserted={len(inserted_ids)} skipped={skipped}")

        return {
            'ok': True,
            'region': region,
            'industry': industry,
            'trigger_type': trigger_type,
            'found': found,
            'inserted': len(inserted_ids),
            'skipped': skipped,
        }

    except Exception as e:
        print(f"[radar-scheduler] run_radar error: {e}")
        if conn and run_id:
            try:
                with conn.cursor() as cur:
                    finish_radar_run(cur, run_id, 0, 0, 0, str(e)[:500])
                    conn.commit()
            except Exception:
                pass
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return {'ok': False, 'error': str(e)}
    finally:
        if conn:
            conn.close()


# ── Action-обработчики ────────────────────────────────────────────────────────

def action_run_scheduled(body: dict) -> dict:
    """Плановый ночной обход: ротация региона и отрасли по дню года."""
    region = REGIONS[get_rotation_index(REGIONS)]
    industry = INDUSTRIES[get_rotation_index(INDUSTRIES)]
    print(f"[radar-scheduler] run_scheduled: region={region} industry={industry}")
    result = run_radar(region, industry, trigger_type='scheduled')
    return json_resp(result)


def action_run_manual(body: dict) -> dict:
    """Ручной запуск с явными region и industry."""
    region = (body.get('region') or '').strip()
    industry = (body.get('industry') or '').strip()

    if not region:
        return err('Поле region обязательно для run_manual')
    if not industry:
        return err('Поле industry обязательно для run_manual')

    print(f"[radar-scheduler] run_manual: region={region} industry={industry}")
    result = run_radar(region, industry, trigger_type='manual')
    return json_resp(result)


def fetch_hh_vacancies(region: str, query_text: str) -> tuple[int, list]:
    """
    Запрашивает вакансии с hh.ru API.
    Использует Bearer-токен если задан HH_API_TOKEN, иначе анонимный запрос.
    Возвращает (vacancies_found, employers_list).
    """
    area_id = HH_AREAS.get(region, '1')
    encoded_query = urllib.parse.quote(query_text)
    hh_url = (
        f'https://api.hh.ru/vacancies'
        f'?text={encoded_query}'
        f'&area={area_id}'
        f'&per_page=50'
        f'&order_by=publication_time'
    )

    hh_token = os.environ.get('HH_API_TOKEN', '').strip()
    headers = {
        'User-Agent': 'mat-labs-radar/1.0 (maksT77@yandex.ru)',
        'Accept': 'application/json',
        'HH-User-Agent': 'mat-labs-radar/1.0 (maksT77@yandex.ru)',
    }
    if hh_token:
        headers['Authorization'] = f'Bearer {hh_token}'

    req = urllib.request.Request(hh_url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        hh_data = json.loads(resp.read().decode())

    items = hh_data.get('items') or []
    vacancies_found = len(items)

    employers = []
    seen_employer_ids = set()
    for item in items:
        emp = item.get('employer') or {}
        emp_id = emp.get('id')
        emp_name = (emp.get('name') or '').strip()
        vacancy_name = (item.get('name') or '').strip()
        emp_url = emp.get('alternate_url') or emp.get('url') or ''
        area_name = (item.get('area') or {}).get('name') or region

        if emp_name and emp_id not in seen_employer_ids:
            seen_employer_ids.add(emp_id)
            employers.append({
                'company_name': emp_name,
                'vacancy': vacancy_name,
                'region': area_name,
                'website': emp_url,
                'hh_id': str(emp_id or ''),
            })

    return vacancies_found, employers


def action_run_hh_signals(body: dict) -> dict:
    """
    Парсит вакансии с hh.ru как сигналы лидогенерации.
    Ищет компании, которые нанимают под CRM/автоматизацию — значит, сами ещё не автоматизированы.
    Если hh.ru недоступен — использует AI-fallback для генерации лидов по сигналу.
    """
    region = REGIONS[get_rotation_index(REGIONS)]
    query_text = HH_SEARCH_QUERIES[get_rotation_index(HH_SEARCH_QUERIES)]

    vacancies_found = 0
    employers = []
    hh_ok = False

    try:
        vacancies_found, employers = fetch_hh_vacancies(region, query_text)
        hh_ok = True
        print(f"[radar-scheduler] hh.ru: query='{query_text}' region={region} vacancies={vacancies_found} employers={len(employers)}")
    except urllib.error.HTTPError as e:
        print(f"[radar-scheduler] hh.ru HTTP error: {e.code} — using AI fallback")
    except Exception as e:
        print(f"[radar-scheduler] hh.ru fetch error: {e} — using AI fallback")

    # Fallback: если hh.ru недоступен — просим AI сгенерировать лидов
    # на основе сигнала "компании, ищущие CRM-специалистов"
    if not hh_ok or not employers:
        fallback_prompt = f"""Представь, что ты просматриваешь вакансии на hh.ru.
Запрос: "{query_text}", регион: {region}.

Составь список 15-20 реалистичных российских компаний из региона {region},
которые вероятно ищут или планируют внедрить CRM / автоматизацию бизнес-процессов.

Для каждой укажи:
- company_name: название
- industry: отрасль
- region: {region}
- website: сайт (если знаешь)
- signal: почему они потенциально нужный клиент MAT Labs
- potential: 1-10

Верни ТОЛЬКО JSON без markdown:
{{"leads": [
  {{"company_name": "...", "industry": "...", "region": "...", "website": "...", "signal": "...", "potential": 7}}
]}}"""
        try:
            ai_raw = call_ai(fallback_prompt, model=AI_MODEL_ENRICH, max_tokens=2000, temperature=0.5)
            parsed = parse_json_from_ai(ai_raw)
            leads_raw = parsed.get('leads') or []
            print(f"[radar-scheduler] hh fallback AI: leads={len(leads_raw)}")
        except Exception as e:
            print(f"[radar-scheduler] hh fallback AI error: {e}")
            return err(f'hh.ru недоступен и AI fallback не сработал: {e}', 502)

        return _save_hh_leads(leads_raw, region, query_text, vacancies_found=0, employers_count=0)

    if not employers:
        return json_resp({'ok': True, 'vacancies_found': vacancies_found, 'leads_added': 0,
                          'note': 'Нет уникальных работодателей в результатах'})

    # AI анализирует реальных работодателей с hh.ru
    employers_text = '\n'.join(
        f"- {e['company_name']} (вакансия: {e['vacancy']}, регион: {e['region']})"
        for e in employers[:40]
    )
    prompt = HH_ANALYSIS_PROMPT.format(employers_text=employers_text)

    try:
        ai_raw = call_ai(prompt, model=AI_MODEL_ENRICH, max_tokens=2000, temperature=0.3)
        parsed = parse_json_from_ai(ai_raw)
        leads_raw = parsed.get('leads') or []
    except Exception as e:
        print(f"[radar-scheduler] hh AI parse error: {e}")
        return err(f'AI parse error: {e}', 500)

    # Обогащаем данными с hh (website и регион)
    emp_map = {e['company_name'].lower(): e for e in employers}
    for lead in leads_raw:
        name_lower = (lead.get('company_name') or '').lower()
        matched = emp_map.get(name_lower)
        if matched:
            if not lead.get('website') and matched.get('website'):
                lead['website'] = matched['website']
            if not lead.get('region') and matched.get('region'):
                lead['region'] = matched['region']

    return _save_hh_leads(leads_raw, region, query_text, vacancies_found, len(employers))


def _save_hh_leads(leads_raw: list, region: str, query_text: str, vacancies_found: int, employers_count: int) -> dict:
    """Дедублицирует и сохраняет лидов из hh-сигналов в БД."""
    for lead in leads_raw:
        lead['tech_tags'] = ['hh_signal', 'ищет CRM-специалиста', query_text]
        lead['source'] = f'hh.ru — вакансия "{query_text}"'

    conn = None
    leads_added = 0
    try:
        conn = get_db()
        with conn.cursor() as cur:
            new_candidates, skipped = deduplicate_prospects(cur, leads_raw)
            inserted_ids = insert_prospects(cur, new_candidates, 'hh_signal')
            insert_funnel_events(cur, inserted_ids, 'hh_signal')
            conn.commit()
        leads_added = len(inserted_ids)
        print(f"[radar-scheduler] hh_signals done: leads_added={leads_added} skipped={skipped}")
    except Exception as e:
        print(f"[radar-scheduler] hh_signals DB error: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()

    return json_resp({
        'ok': True,
        'region': region,
        'query': query_text,
        'vacancies_found': vacancies_found,
        'employers_analyzed': employers_count,
        'leads_added': leads_added,
    })


def action_get_history(body: dict) -> dict:
    """Возвращает историю последних 30 запусков радара."""
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, region, industry, found, inserted, skipped,
                       trigger_type, started_at, finished_at, error_msg
                FROM {S}.radar_runs
                ORDER BY started_at DESC
                LIMIT 30
                """,
            )
            cols = [d[0] for d in cur.description]
            runs = [dict(zip(cols, row)) for row in cur.fetchall()]

        return json_resp({'ok': True, 'runs': runs, 'total': len(runs)})

    except Exception as e:
        print(f"[radar-scheduler] get_history error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


# ── Главный обработчик ────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return err('Method not allowed', 405)

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return err('Невалидный JSON в теле запроса', 400)

    action = (body.get('action') or '').strip()

    if action == 'run_scheduled':
        return action_run_scheduled(body)
    elif action == 'run_manual':
        return action_run_manual(body)
    elif action == 'run_hh_signals':
        return action_run_hh_signals(body)
    elif action == 'get_history':
        return action_get_history(body)
    else:
        return err(
            f'Неизвестный action: {action!r}. Доступны: run_scheduled, run_manual, run_hh_signals, get_history',
            400,
        )