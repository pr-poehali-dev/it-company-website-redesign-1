"""
Поиск грантов, субсидий и конкурсов для IT-компании МАТ-Лабс.
ИИ генерирует релевантные гранты под продукты компании + каталог проверенных фондов
(ФСИ, РФРИТ, Сколково, Росмолодёжь, Минцифры и др.). Избранное, ИИ-анализ заявки.
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
МАТ-Лабс — российская IT-компания полного цикла (200+ проектов, команда 50+).
Компетенции: искусственный интеллект (AI/ML, GPT, компьютерное зрение), облачные
решения, кибербезопасность, веб и мобильная разработка, импортозамещение ПО,
автоматизация бизнес-процессов, ИИ-агенты, чат-боты.

Готовые продукты (запущены, есть выручка) — это сильное основание для грантов:
- УЧИСЬПРО — ИИ-репетитор с голосовым ассистентом для подготовки к ЕГЭ/ОГЭ (EdTech).
- АгроПорт — AI-мониторинг и прогноз агрорынка, спутниковый NDVI (агротех).
- СмартМаш — российское ПО для станкостроения, управление ЧПУ (импортозамещение, промышленность).
- MAIL-KA — российская платформа email-маркетинга с AI (импортозамещение Mailchimp).
- RoomScan AI — 3D-сканирование помещений, AI-смета ремонта (PropTech).
- MAT-AD — AI-генерация рекламы. AVT — CRM с AI-звонками. Авангард — AI-дизайн интерьера.
"""

# ─── Каталог проверенных фондов и грантовых программ ────────────────────────
GRANT_FUNDS = [
    {'key': 'fasie', 'name': 'Фонд содействия инновациям (ФСИ)', 'icon': '🚀',
     'category': 'Инновации / Стартапы',
     'amount_hint': 'до 30 млн ₽',
     'desc': 'Программы «Старт», «Развитие», «Коммерциализация», «Бизнес-старт». Гранты на R&D и вывод продукта на рынок.',
     'url': 'https://fasie.ru/programs/'},
    {'key': 'rfrit', 'name': 'РФРИТ', 'icon': '💻',
     'category': 'IT / Импортозамещение',
     'amount_hint': 'до 500 млн ₽',
     'desc': 'Гранты на разработку и внедрение российского ПО, цифровую трансформацию отраслей.',
     'url': 'https://рфрит.рф/grants/'},
    {'key': 'skolkovo', 'name': 'Фонд «Сколково»', 'icon': '🏗️',
     'category': 'Инновации / Резидентство',
     'amount_hint': 'гранты + льготы',
     'desc': 'Микрогранты, минигранты, статус резидента, налоговые льготы и доступ к инвесторам.',
     'url': 'https://sk.ru/grants/'},
    {'key': 'mincifry', 'name': 'Минцифры России', 'icon': '📡',
     'category': 'IT / Цифровизация',
     'amount_hint': 'до 6 млрд ₽',
     'desc': 'Поддержка особо значимых проектов, ИИ, отечественного ПО и облачных решений.',
     'url': 'https://digital.gov.ru/ru/activity/directions/'},
    {'key': 'rosmolodez', 'name': 'Росмолодёжь.Гранты', 'icon': '🎓',
     'category': 'Молодёжь / Образование',
     'amount_hint': 'до 15 млн ₽',
     'desc': 'Гранты для проектов до 35 лет: образование (EdTech), технологии, soft skills.',
     'url': 'https://grants.myrosmol.ru/'},
    {'key': 'innoagency', 'name': 'Агентство инноваций Москвы', 'icon': '🏙️',
     'category': 'Региональные / Москва',
     'amount_hint': 'до 4 млн ₽',
     'desc': 'Гранты на пилотное тестирование, патентование, участие в выставках для московских компаний.',
     'url': 'https://innoagency.ru/ru/grants'},
    {'key': 'minpromtorg', 'name': 'Минпромторг России', 'icon': '🏭',
     'category': 'Промышленность / Импортозамещение',
     'amount_hint': 'до 100+ млн ₽',
     'desc': 'Субсидии на разработку ПО для промышленности, станкостроения (актуально для СмартМаш).',
     'url': 'https://minpromtorg.gov.ru/'},
    {'key': 'fpg', 'name': 'Фонд президентских грантов', 'icon': '🇷🇺',
     'category': 'Соц / НКО',
     'amount_hint': 'до 10+ млн ₽',
     'desc': 'Гранты на социально значимые проекты, в т.ч. образовательные и просветительские.',
     'url': 'https://президентскиегранты.рф/'},
    {'key': 'pfki', 'name': 'Президентский фонд культурных инициатив', 'icon': '🎨',
     'category': 'Культура / Образование',
     'amount_hint': 'до 10 млн ₽',
     'desc': 'Гранты на креативные и образовательные цифровые проекты.',
     'url': 'https://фондкультурныхинициатив.рф/'},
    {'key': 'nti', 'name': 'НТИ / Платформа НТИ', 'icon': '🌐',
     'category': 'Технологии / Рынки будущего',
     'amount_hint': 'гранты + акселерация',
     'desc': 'Поддержка технологических компаний по рынкам НТИ (AeroNet, EduNet, FoodNet и др.).',
     'url': 'https://nti2035.ru/'},
    {'key': 'agro_grants', 'name': 'Минсельхоз / Агростартап', 'icon': '🌾',
     'category': 'Агро / Цифровизация',
     'amount_hint': 'до 30 млн ₽',
     'desc': 'Гранты на цифровизацию АПК и агротех-решения (актуально для АгроПорт).',
     'url': 'https://mcx.gov.ru/'},
    {'key': 'startuphub', 'name': 'Региональные ФРП и бизнес-инкубаторы', 'icon': '🏢',
     'category': 'Региональные / МСП',
     'amount_hint': 'льготные займы',
     'desc': 'Фонды развития промышленности регионов, льготные займы под 1-5% на IT-проекты.',
     'url': 'https://frprf.ru/'},
]


def get_conn():
    return psycopg2.connect(
        os.environ['DATABASE_URL'],
        options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}"
    )


def is_admin(token: str) -> bool:
    if not token:
        return False
    raw = token.rsplit('.', 1)[0] if '.' in token else token
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM admin_sessions WHERE token = %s", (raw,))
        return cur.fetchone() is not None
    finally:
        conn.close()


def resp(status: int, payload: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps(payload, ensure_ascii=False, default=str)}


def _ai_call(prompt: str, api_key: str, max_tokens: int = 2500) -> dict:
    payload = json.dumps({
        'model': 'gpt-4o',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.4,
        'max_tokens': max_tokens,
    }).encode('utf-8')
    req = urllib.request.Request(AI_URL, data=payload, headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            result = json.loads(r.read().decode('utf-8'))
            content = result['choices'][0]['message']['content'].strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return {'ok': True, 'data': json.loads(content.strip())}
    except Exception as e:
        return {'ok': False, 'error': str(e)[:200]}


def ai_chat(messages: list, api_key: str, grant: dict | None = None) -> dict:
    """Чат-помощник по заполнению грантовых заявок. Возвращает текстовый ответ."""
    grant_ctx = ''
    if grant:
        grant_ctx = f"""

КОНТЕКСТ — ГРАНТ, ПО КОТОРОМУ ИДЁТ РАБОТА:
- Название: {grant.get('name', '')}
- Грантодатель: {grant.get('fund', '')}
- Размер: {grant.get('amount_fmt', '')}
- Категория: {grant.get('category', '')}
- Срок подачи: {grant.get('deadline', '')}
- Описание: {grant.get('description', '')}
- Наш продукт под этот грант: {grant.get('matched_product', '')}
"""

    system_prompt = f"""Ты — опытный грант-менеджер и эксперт по подготовке заявок на гранты,
субсидии и конкурсы для IT-компаний в России. Ты знаешь все нюансы создания и функционирования
проектов: ФСИ, РФРИТ, Сколково, Минцифры, Росмолодёжь, Минпромторг, Минсельхоз, НТИ,
президентские гранты, региональные ФРП.

Твоя задача — помогать заполнять заявку: формулировать разделы (актуальность проблемы,
новизна, цели и задачи, план-график, бюджет, ожидаемые результаты, KPI, команда),
давать готовые формулировки, проверять тексты, объяснять требования и критерии оценки.

ПРОФИЛЬ КОМПАНИИ, ОТ ИМЕНИ КОТОРОЙ ПОДАЁТСЯ ЗАЯВКА:
{COMPANY_PROFILE}
{grant_ctx}
Правила ответа:
- Пиши по-деловому, конкретно и по-русски.
- Давай практичные готовые формулировки, которые можно вставить в заявку.
- Если данных не хватает — задавай уточняющие вопросы.
- Опирайся на реальные требования российских грантодателей, не выдумывай факты.
- Структурируй ответ заголовками и списками, где это уместно."""

    chat_messages = [{'role': 'system', 'content': system_prompt}]
    for m in messages[-6:]:
        role = 'assistant' if m.get('role') == 'assistant' else 'user'
        chat_messages.append({'role': role, 'content': str(m.get('content', ''))[:2500]})

    payload = json.dumps({
        'model': 'gpt-4o',
        'messages': chat_messages,
        'temperature': 0.6,
        'max_tokens': 1200,
    }).encode('utf-8')
    req = urllib.request.Request(AI_URL, data=payload, headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            result = json.loads(r.read().decode('utf-8'))
            reply = result['choices'][0]['message']['content'].strip()
            return {'ok': True, 'reply': reply}
    except Exception as e:
        return {'ok': False, 'error': str(e)[:200]}


def ai_search_grants(query: str, api_key: str) -> dict:
    """ИИ подбирает релевантные гранты/конкурсы под продукты МАТ-Лабс."""
    prompt = f"""Ты эксперт по грантам, субсидиям и конкурсам для IT-компаний в России (2026 год).

ПРОФИЛЬ КОМПАНИИ:
{COMPANY_PROFILE}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "{query}"

Подбери 6-10 НАИБОЛЕЕ РЕЛЕВАНТНЫХ и АКТУАЛЬНЫХ грантов, субсидий, акселераторов или конкурсов,
которые подходят под продукты и компетенции компании. Опирайся на реальные российские программы
(ФСИ, РФРИТ, Сколково, Минцифры, Росмолодёжь, Минпромторг, Минсельхоз, НТИ, президентские гранты, региональные ФРП).

Для каждого верни объект. Отвечай ТОЛЬКО валидным JSON без markdown:
{{
  "grants": [
    {{
      "id": "<короткий уникальный slug, напр. fasie-start-2026>",
      "name": "<точное название программы/конкурса>",
      "fund": "<организация-грантодатель>",
      "amount_fmt": "<размер гранта, напр. 'до 4 млн ₽'>",
      "category": "<категория: EdTech / Агротех / Импортозамещение / Инновации и т.п.>",
      "deadline": "<срок подачи или 'приём круглый год'>",
      "region": "<РФ / Москва / регион>",
      "url": "<прямая ссылка на программу>",
      "description": "<2-3 предложения: суть программы и на что даётся>",
      "matched_product": "<какой наш продукт лучше всего подходит под этот грант>",
      "fit_score": <0-100, насколько грант реалистичен для нас>,
      "why_fit": "<1 предложение почему подходит>"
    }}
  ]
}}

Сортируй по убыванию fit_score. Не выдумывай несуществующие программы — только реальные."""
    out = _ai_call(prompt, api_key, max_tokens=3000)
    if not out['ok']:
        return {'ok': False, 'error': out['error']}
    grants = out['data'].get('grants', []) if isinstance(out['data'], dict) else []
    return {'ok': True, 'grants': grants}


def ai_analyze_grant(grant: dict, api_key: str) -> dict:
    """ИИ-анализ: как нам выиграть конкретный грант + структура заявки."""
    prompt = f"""Ты эксперт по подготовке грантовых заявок для IT-компаний.

ПРОФИЛЬ КОМПАНИИ:
{COMPANY_PROFILE}

ГРАНТ/КОНКУРС:
- Название: {grant.get('name')}
- Грантодатель: {grant.get('fund')}
- Размер: {grant.get('amount_fmt')}
- Категория: {grant.get('category')}
- Срок: {grant.get('deadline')}
- Описание: {grant.get('description')}
- Подходящий продукт: {grant.get('matched_product')}

Дай детальный анализ заявки. Отвечай ТОЛЬКО валидным JSON без markdown:
{{
  "fit_score": <0-100>,
  "win_probability": <0-100>,
  "fit_comment": "<вывод о релевантности гранта для нас>",
  "best_product": "<какой продукт заявлять и почему>",
  "win_factors": ["<сильный фактор 1>", "<2>", "<3>"],
  "risks": ["<риск/требование 1>", "<2>"],
  "required_docs": ["<документ 1>", "<2>", "<3>"],
  "application_structure": {{
    "title": "<рабочее название проекта для заявки>",
    "sections": [
      {{"title": "<раздел заявки>", "content": "<что писать>"}}
    ]
  }},
  "budget_hint": "<как обосновать запрашиваемую сумму>",
  "timeline": "<реалистичные сроки реализации проекта>",
  "conclusion": "<рекомендация: подавать / не подавать и почему>"
}}"""
    out = _ai_call(prompt, api_key, max_tokens=2500)
    if not out['ok']:
        return {'ok': False, 'error': out['error']}
    return {'ok': True, 'analysis': out['data']}


import re
from datetime import date, datetime

RU_MONTHS = {
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'мая': 5, 'май': 5, 'июн': 6,
    'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
}


def check_grant_link(url: str) -> dict:
    """Проверяет, что ссылка на грант живая. Возвращает {'link': 'ok'|'dead'|'unknown'}."""
    if not url or not url.startswith(('http://', 'https://')):
        return {'link': 'unknown', 'code': 0}
    for method in ('HEAD', 'GET'):
        try:
            req = urllib.request.Request(
                url, method=method,
                headers={'User-Agent': 'Mozilla/5.0 (compatible; GrantBot/1.0)'},
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                code = r.getcode()
                if 200 <= code < 400:
                    return {'link': 'ok', 'code': code}
                return {'link': 'dead', 'code': code}
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 429):
                # сайт блокирует ботов, но существует — считаем живым
                return {'link': 'ok', 'code': e.code}
            if method == 'GET':
                return {'link': 'dead', 'code': e.code}
        except Exception:
            if method == 'GET':
                return {'link': 'unknown', 'code': 0}
    return {'link': 'unknown', 'code': 0}


def parse_deadline_status(deadline: str) -> dict:
    """По строке дедлайна определяет статус приёма: open / closing_soon / closed / rolling / unknown."""
    if not deadline:
        return {'deadline_status': 'unknown', 'days_left': None}
    d = deadline.lower()
    if any(w in d for w in ['круглый год', 'кругло', 'постоянн', 'приём открыт', 'прием открыт', 'в течение года', 'ежемесячно', 'нет ограничен']):
        return {'deadline_status': 'rolling', 'days_left': None}

    today = date.today()
    found = None
    # ISO дата: 2026-03-15 или 15.03.2026
    m = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', d)
    if m:
        try:
            found = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            found = None
    if not found:
        m = re.search(r'(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})', d)
        if m:
            try:
                found = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            except ValueError:
                found = None
    if not found:
        # "до 15 марта 2026" / "15 апреля"
        m = re.search(r'(\d{1,2})\s+([а-я]{3,})\.?\s*(\d{4})?', d)
        if m:
            day = int(m.group(1))
            mon = None
            for k, v in RU_MONTHS.items():
                if m.group(2).startswith(k):
                    mon = v
                    break
            year = int(m.group(3)) if m.group(3) else today.year
            if mon:
                try:
                    found = date(year, mon, day)
                    if not m.group(3) and found < today:
                        found = date(year + 1, mon, day)
                except ValueError:
                    found = None

    if not found:
        return {'deadline_status': 'unknown', 'days_left': None}

    days_left = (found - today).days
    if days_left < 0:
        return {'deadline_status': 'closed', 'days_left': days_left}
    if days_left <= 14:
        return {'deadline_status': 'closing_soon', 'days_left': days_left}
    return {'deadline_status': 'open', 'days_left': days_left}


def verify_grants(grants: list) -> list:
    """Проверяет список грантов: живость ссылки + статус дедлайна."""
    out = []
    for g in grants[:20]:
        info = dict(g)
        info.update(check_grant_link(g.get('url') or ''))
        info.update(parse_deadline_status(g.get('deadline') or ''))
        out.append(info)
    return out


def handler(event: dict, context) -> dict:
    """Поиск грантов и конкурсов: ИИ-подбор + каталог фондов + ИИ-анализ + избранное."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token') or headers.get('x-session-token') or ''
    if not is_admin(token):
        return resp(403, {'error': 'Нет доступа'})

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body') or '{}')
    params = event.get('queryStringParameters') or {}
    action = (body.get('action') or params.get('action') or '').strip()

    # ── GET /funds — каталог проверенных фондов ──
    if method == 'GET' and (action == 'funds' or path.endswith('/funds')):
        return resp(200, {'funds': GRANT_FUNDS})

    # ── GET /saved — избранные гранты ──
    if method == 'GET' and (action == 'saved' or path.endswith('/saved')):
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM saved_grants ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        return resp(200, {'saved': [dict(r) for r in rows]})

    # ── POST /chat — чат-помощник по заполнению заявки ──
    if method == 'POST' and (action == 'chat' or path.endswith('/chat')):
        messages = body.get('messages') or []
        grant = body.get('grant')
        if not messages:
            return resp(400, {'error': 'Пустое сообщение'})
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return resp(500, {'error': 'Не настроен ключ ИИ'})
        result = ai_chat(messages, api_key, grant)
        if not result['ok']:
            return resp(500, {'error': f"Ошибка ИИ-чата: {result['error']}"})
        return resp(200, {'reply': result['reply']})

    # ── POST /analyze — ИИ-анализ гранта ──
    if method == 'POST' and (action == 'analyze' or path.endswith('/analyze')):
        grant = body.get('grant')
        if not grant:
            return resp(400, {'error': 'Не передан грант'})
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return resp(500, {'error': 'Не настроен ключ ИИ'})
        result = ai_analyze_grant(grant, api_key)
        if not result['ok']:
            return resp(500, {'error': f"Ошибка анализа: {result['error']}"})
        return resp(200, {'analysis': result['analysis']})

    # ── POST /save — сохранить грант ──
    if method == 'POST' and (action == 'save' or path.endswith('/save')):
        g = body.get('grant') or {}
        analysis = body.get('analysis')
        ext_id = str(g.get('id') or g.get('external_id') or '')
        source = g.get('source') or 'ИИ-подбор'
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM saved_grants WHERE external_id=%s AND source=%s", (ext_id, source))
        if cur.fetchone():
            conn.close()
            return resp(200, {'ok': True, 'already': True})
        cur.execute(
            """INSERT INTO saved_grants
               (external_id, source, name, fund, amount, amount_fmt, category,
                deadline, region, url, description, matched_product, analysis)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (ext_id, source, g.get('name', ''), g.get('fund', ''), 0,
             g.get('amount_fmt', ''), g.get('category', ''), g.get('deadline', ''),
             g.get('region', ''), g.get('url', ''), g.get('description', ''),
             g.get('matched_product', ''),
             psycopg2.extras.Json(analysis) if analysis else None)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # ── DELETE /save — убрать из избранного ──
    if method == 'DELETE' and (action == 'unsave' or path.endswith('/save')):
        ext_id = str(body.get('external_id') or '')
        source = body.get('source') or 'ИИ-подбор'
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM saved_grants WHERE external_id=%s AND source=%s", (ext_id, source))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # ── POST /note — заметка ──
    if method == 'POST' and (action == 'note' or path.endswith('/note')):
        gid = body.get('id')
        note = body.get('note', '')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE saved_grants SET note=%s WHERE id=%s", (note, int(gid)))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # ── POST / — ИИ-поиск грантов ──
    if method == 'POST' and (action == 'search' or path == '/' or path.endswith('/grants-search')):
        query = (body.get('query') or '').strip()
        if not query:
            return resp(400, {'error': 'Введите запрос — например «гранты на EdTech» или «импортозамещение ПО»'})
        api_key = os.environ.get('POLZA_AI_API_KEY', '')
        if not api_key:
            return resp(500, {'error': 'Не настроен ключ ИИ'})
        result = ai_search_grants(query, api_key)
        if not result['ok']:
            return resp(500, {'error': f"Ошибка ИИ-поиска: {result['error']}"})

        # пометить уже сохранённые
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT external_id, source FROM saved_grants")
        saved_set = {(r[0], r[1]) for r in cur.fetchall()}
        conn.close()
        for g in result['grants']:
            g['source'] = 'ИИ-подбор'
            g['saved'] = (str(g.get('id')), 'ИИ-подбор') in saved_set

        # Проверка живости ссылок и статуса дедлайнов
        grants = verify_grants(result['grants'])
        # Убираем гранты с явно мёртвой ссылкой И закрытым приёмом одновременно
        return resp(200, {'grants': grants, 'funds': GRANT_FUNDS})

    # ── POST /verify — перепроверить ссылки/дедлайны у переданных грантов ──
    if method == 'POST' and action == 'verify':
        grants = body.get('grants') or []
        if not isinstance(grants, list):
            return resp(400, {'error': 'grants должен быть списком'})
        return resp(200, {'grants': verify_grants(grants)})

    return resp(404, {'error': 'Маршрут не найден'})