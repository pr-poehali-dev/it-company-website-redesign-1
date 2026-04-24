"""
AI-агент для анализа CRM и генерации стратегии продвижения.
Читает всю базу лидов, строит отчёт с рекомендациями по каждому клиенту и общей стратегии.
"""
import json
import os
import hmac
import hashlib
import urllib.request
import psycopg2
import psycopg2.extras
import threading
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

AI_URL = 'https://api.polza.ai/v1/chat/completions'
S = os.environ.get('MAIN_DB_SCHEMA', 'public')

COMPANY_PROFILE = """
MAT Labs — российская IT-компания, специализация: AI-автоматизация бизнеса, интеграции, сайты под конверсию.
Внедрение за 7–14 дней. Фокус на результате, а не разработке ради разработки.

КОНТАКТЫ ДЛЯ ПОДПИСИ ПИСЕМ И КП:
Генеральный директор: Тюрин Максим Александрович
Телефон: +7 927 748 6868
Email: maksT77@yandex.ru
Всегда заканчивай письма и КП подписью от имени Максима Тюрина с этими контактами.

ИДЕАЛЬНЫЕ КЛИЕНТЫ (приоритет по убыванию):
1. Услуги — маркетинговые агентства, ремонт/строительство, юристы/бухгалтерия, клиники/косметология.
   Почему: много заявок, хаос в обработке, быстро понимают ценность.
2. Онлайн-школы / инфобизнес — поток лидов, нужна автоматизация, быстро принимают решения.
3. E-commerce — интернет-магазины среднего размера, автоматизация заказов и поддержки.
4. B2B — производство, опт, сервисные компании (сложные процессы, большие чеки).

ПРИЗНАКИ "ТЁПЛОГО" КЛИЕНТА (ищи эти сигналы в CRM):
- долго отвечают клиентам (нет автоответов)
- форма заявки "в никуда" (нет CRM)
- менеджеры обрабатывают заявки вручную
- 10–50 заявок в день, но без системы
- слабый сайт без конверсионных элементов

КАНАЛЫ ПОИСКА КЛИЕНТОВ:
- Сайты компаний (гугл по нише + город) — самый сильный канал
- Telegram-чаты предпринимателей по нишам
- Instagram/VK бизнес-страницы (пишем в директ)
- LinkedIn (founders/owners) — для крупных чеков
- Авито/Kwork/Freelance — для старта и первых кейсов

КЛЮЧЕВОЕ СООБЩЕНИЕ: не "мы делаем автоматизацию", а "у вас теряются заявки — покажу где".
ПЛАН НА ДЕНЬ: найти 20 компаний → написать → 2–3 диалога.
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


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def auth_check(event):
    token = (event.get('headers') or {}).get('x-session-token') or \
            (event.get('headers') or {}).get('X-Session-Token') or ''
    if not token:
        return False
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not secret or '.' not in token:
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


def call_ai(prompt: str, model: str = 'gpt-4o', max_tokens: int = 4000, temperature: float = 0.3) -> str:
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        raise ValueError('Нет ключа POLZA_AI_API_KEY')
    body = json.dumps({
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }).encode()
    req = urllib.request.Request(
        AI_URL, data=body,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=55) as resp:
        data = json.loads(resp.read().decode())
    return data['choices'][0]['message']['content'].strip()


def load_crm_data() -> dict:
    """Загружает все данные CRM из БД."""
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Все лиды
    cur.execute(f"""
        SELECT p.*, pr.name as project_name
        FROM {S}.prospects p
        LEFT JOIN {S}.prospect_projects pr ON pr.id = p.project_id
        ORDER BY p.ai_score DESC NULLS LAST, p.created_at DESC
    """)
    prospects = [dict(r) for r in cur.fetchall()]

    # Активности по каждому лиду (последние 3)
    if prospects:
        ids = tuple(p['id'] for p in prospects)
        if len(ids) == 1:
            ids = f"({ids[0]})"
        else:
            ids = str(ids)
        cur.execute(f"""
            SELECT prospect_id, activity_type, content, created_at
            FROM {S}.prospect_activities
            WHERE prospect_id IN {ids}
            ORDER BY created_at DESC
        """)
        activities_raw = [dict(r) for r in cur.fetchall()]
        acts_by_id: dict = {}
        for a in activities_raw:
            pid = a['prospect_id']
            if pid not in acts_by_id:
                acts_by_id[pid] = []
            if len(acts_by_id[pid]) < 3:
                acts_by_id[pid].append(a)
        for p in prospects:
            p['recent_activities'] = acts_by_id.get(p['id'], [])

    # Статистика
    cur.execute(f"""
        SELECT status, COUNT(*) as cnt FROM {S}.prospects GROUP BY status
    """)
    status_stats = {r['status']: r['cnt'] for r in cur.fetchall()}

    cur.execute(f"""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='won') as won,
            COUNT(*) FILTER (WHERE status='lost') as lost,
            COUNT(*) FILTER (WHERE status='negotiation') as negotiation,
            COUNT(*) FILTER (WHERE status='interested') as interested,
            AVG(ai_score) FILTER (WHERE ai_score IS NOT NULL) as avg_score
        FROM {S}.prospects
    """)
    stats = dict(cur.fetchone())

    conn.close()
    return {'prospects': prospects, 'status_stats': status_stats, 'stats': stats}


def build_crm_summary(data: dict) -> str:
    """Строит текстовое резюме CRM для передачи в промпт."""
    prospects = data['prospects']
    stats = data['stats']
    status_stats = data['status_stats']

    lines = [
        f"ОБЩАЯ СТАТИСТИКА CRM:",
        f"Всего лидов: {stats.get('total', 0)}",
        f"Клиентов (won): {stats.get('won', 0)}",
        f"Переговоры: {stats.get('negotiation', 0)}",
        f"Интерес проявлен: {stats.get('interested', 0)}",
        f"Отказы: {stats.get('lost', 0)}",
        f"Средний AI-скор: {round(float(stats['avg_score']), 1) if stats.get('avg_score') else 'нет'}",
        "",
        f"ЛИДЫ (топ-30 по AI-скору):",
    ]

    for i, p in enumerate(prospects[:30]):
        acts = p.get('recent_activities', [])
        last_act = acts[0]['content'][:80] if acts else 'нет активности'
        lines.append(
            f"{i+1}. {p['company_name']} | "
            f"Статус: {STATUS_LABELS.get(p['status'], p['status'])} | "
            f"Приоритет: {p.get('priority','?')} | "
            f"AI-скор: {p.get('ai_score','?')} | "
            f"Отрасль: {p.get('industry','?')} | "
            f"Регион: {p.get('region','?')} | "
            f"Последнее: {last_act}"
        )
        if p.get('ai_summary'):
            lines.append(f"   → {p['ai_summary'][:120]}")

    return "\n".join(lines)


def generate_full_report(data: dict, focus: str = 'all') -> dict:
    """Генерирует полный отчёт: стратегия + рекомендации по каждому лиду (параллельно)."""
    import re
    crm_summary = build_crm_summary(data)
    prospects = data['prospects']

    # 1. Промпт стратегии
    strategy_prompt = f"""Ты — директор по продажам IT-компании MAT Labs. Ты знаешь, кто идеальный клиент и где его брать.

Профиль компании и стратегия:
{COMPANY_PROFILE.strip()}

Данные CRM:
{crm_summary}

Задача: проанализируй базу лидов через призму стратегии выше.
Определи: какие лиды из базы — идеальные клиенты (услуги, онлайн-школы, e-com, B2B)?
У кого видны признаки "тёплого" клиента (хаос с заявками, нет CRM)?
Какой сегмент сейчас самый перспективный?

Верни ТОЛЬКО JSON (без markdown):
{{
  "executive_summary": "<3-4 предложения: кто в базе, какой потенциал, на чём фокус>",
  "pipeline_health": {{
    "score": <0-100>,
    "verdict": "<отлично|хорошо|требует внимания|критично>",
    "comment": "<1-2 предложения>"
  }},
  "top_opportunities": [
    {{"company": "<название>", "reason": "<почему это идеальный клиент — отрасль/признаки хаоса>", "action": "<конкретное первое действие: написать/позвонить/что сказать>"}}
  ],
  "risks": [
    {{"company": "<название>", "risk": "<в чём риск потери>", "mitigation": "<как снизить>"}}
  ],
  "strategy": {{
    "focus": "<какой сегмент из базы приоритетный и почему>",
    "channels": ["<канал 1 для этой базы>", "<канал 2>", "<канал 3>"],
    "messaging": "<конкретное сообщение: не мы делаем X, а у вас теряется Y — покажем где>",
    "timeline": "<конкретные шаги на 2 недели: день 1 — ..., день 3 — ..., неделя 2 — ...>"
  }},
  "quick_wins": [
    "<конкретное действие на сегодня: компания + что написать>",
    "<второе действие на сегодня>",
    "<третье действие на сегодня>"
  ],
  "segments": [
    {{"name": "<сегмент: Услуги|Онлайн-школы|E-commerce|B2B|Другое>", "count": <число лидов>, "approach": "<как работать с этим сегментом из базы>"}}
  ]
}}"""

    # 2. Топ-10 приоритетных лидов — сначала идеальные сегменты и не закрытые
    IDEAL_INDUSTRIES = ['агентство', 'маркетинг', 'клиника', 'косметолог', 'ремонт',
                        'строительство', 'юрист', 'бухгалтер', 'школа', 'курсы',
                        'магазин', 'e-commerce', 'торговл', 'производство']

    def score_lead(p):
        industry = (p.get('industry') or '').lower()
        is_ideal = any(kw in industry for kw in IDEAL_INDUSTRIES)
        ai_score = p.get('ai_score') or 0
        return (is_ideal * 100) + ai_score

    active_prospects = [p for p in prospects if p.get('status') not in ('won', 'lost')]
    priority_prospects = sorted(active_prospects, key=score_lead, reverse=True)[:10]

    leads_text = "\n".join([
        f"- {p['company_name']} | {STATUS_LABELS.get(p['status'], p['status'])} | "
        f"скор {p.get('ai_score','?')} | {p.get('industry','?')} | {p.get('region','?')}"
        + (f" | {p['ai_summary'][:100]}" if p.get('ai_summary') else '')
        + (f" | email: {p['email']}" if p.get('email') else '')
        + (f" | тел: {p['phone']}" if p.get('phone') else '')
        for p in priority_prospects
    ])

    leads_prompt = f"""Ты — B2B продавец MAT Labs. Знаешь стратегию: не "мы делаем автоматизацию", а "у вас теряются заявки — покажу где".

Профиль и сегменты:
{COMPANY_PROFILE.strip()}

Лиды для проработки (топ по приоритету):
{leads_text}

Для каждого лида напиши конкретные материалы под его отрасль и боли.
Письмо и скрипт — персональные, не шаблонные. Упоминай конкретную проблему отрасли.

Верни ТОЛЬКО JSON (без markdown):
{{
  "leads": [
    {{
      "company": "<название>",
      "status": "<статус>",
      "segment": "<Услуги|Онлайн-школа|E-commerce|B2B>",
      "warm_signals": "<какие признаки хаоса/потерь видны у этой компании>",
      "next_step": "<что сделать прямо сейчас: канал + конкретное действие>",
      "email_subject": "<цепляющая тема: не 'предложение', а про их боль>",
      "email_body": "<письмо 80-120 слов: открываем болью отрасли, предлагаем разбор, CTA>",
      "call_script": "<скрипт 4-5 реплик: открытие → боль → предложение разбора → договорённость>",
      "offer": "<конкретный оффер под их бизнес: что именно автоматизируем и какой результат>",
      "timing": "<сегодня|эта неделя|следующая неделя>"
    }}
  ]
}}"""

    # Запускаем оба запроса параллельно
    results = {}
    errors = {}

    def run_strategy():
        try:
            raw = call_ai(strategy_prompt, model='gpt-4o-mini', max_tokens=2000, temperature=0.3)
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            results['strategy'] = json.loads(raw)
        except Exception as e:
            errors['strategy'] = str(e)
            results['strategy'] = {'executive_summary': f'Ошибка: {e}', 'error': 'parse_error'}

    def run_leads():
        try:
            raw = call_ai(leads_prompt, model='gpt-4o-mini', max_tokens=2500, temperature=0.4)
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            data_leads = json.loads(raw)
            results['leads'] = data_leads.get('leads', [])
        except Exception as e:
            errors['leads'] = str(e)
            results['leads'] = []

    t1 = threading.Thread(target=run_strategy)
    t2 = threading.Thread(target=run_leads)
    t1.start()
    t2.start()
    t1.join(timeout=55)
    t2.join(timeout=55)

    if errors:
        print(f"[ai-agent] errors: {errors}")

    return {
        'generated_at': datetime.now().isoformat(),
        'total_prospects': len(prospects),
        'strategy': results.get('strategy', {}),
        'leads_recommendations': results.get('leads', []),
    }


def run_radar(region: str, industry: str) -> dict:
    """Запускает AI-радар и возвращает список сигналов."""
    import re as _re
    region_text = region.strip() or 'Россия'
    industry_text = f", отрасль: {industry.strip()}" if industry.strip() else ''

    prompt = f"""Ты — аналитик B2B-рынка. Выяви компании в регионе "{region_text}"{industry_text}, которые активно внедряют новые технологии: ИИ, ERP, автоматизацию, роботизацию, цифровизацию, IoT, облака.

Используй знания о российском бизнесе, региональных новостях, пресс-релизах, нацпроектах.

Верни список из 30-40 реальных компаний региона с признаками технологической активности.

Верни ТОЛЬКО JSON без markdown:
{{
  "region": "{region_text}",
  "industry_filter": "{industry.strip() or 'все отрасли'}",
  "summary": "<2-3 предложения об общей картине>",
  "tech_signals": [
    {{
      "company_name": "<название>",
      "inn": "<ИНН или пустая строка>",
      "region": "<город/регион>",
      "industry": "<отрасль>",
      "tech_tags": ["<ИИ|ERP|Автоматизация|Роботизация|Цифровизация|IoT|Облака|RPA|ML>"],
      "signal": "<что именно внедряют, источник>",
      "potential": "<high|medium|low>",
      "website": "<сайт или пустая строка>",
      "source": "<источник>"
    }}
  ],
  "hot_industries": ["<отрасль 1>", "<отрасль 2>"],
  "regional_trends": ["<тренд 1>", "<тренд 2>"]
}}"""

    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    body = json.dumps({
        'model': 'gpt-4o',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.4,
        'max_tokens': 6000,
    }).encode()
    req = urllib.request.Request(
        AI_URL, data=body,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=55) as resp:
        data = json.loads(resp.read().decode())
    text = data['choices'][0]['message']['content'].strip()
    import re as _re2
    text = _re2.sub(r'^```(?:json)?\s*', '', text)
    text = _re2.sub(r'\s*```$', '', text)
    return json.loads(text)


def ai_enrich_signals(signals: list) -> list:
    """AI-обогащение: для каждой компании строит ai_score, ai_summary, ai_reasons, next_action."""
    import re as _re
    if not signals:
        return []

    lines = []
    for i, s in enumerate(signals):
        lines.append(
            f"{i+1}. {s.get('company_name','')} | {s.get('industry','')} | "
            f"тех: {', '.join(s.get('tech_tags',[]))} | потенциал: {s.get('potential','')} | "
            f"сигнал: {s.get('signal','')[:120]}"
        )

    prompt = f"""Ты — директор по продажам MAT Labs (AI-автоматизация, CRM-интеграции, сайты). Внедрение за 7-14 дней.

Оцени каждую компанию как потенциального клиента. Верни ТОЛЬКО JSON без markdown:
{{
  "results": [
    {{
      "idx": <номер 1..N>,
      "ai_score": <0-100, насколько перспективен как клиент>,
      "ai_summary": "<1-2 предложения: почему интересен для MAT Labs>",
      "ai_reasons": ["<причина 1>", "<причина 2>", "<причина 3>"],
      "next_action": "<конкретное первое действие: позвонить/написать + что сказать>"
    }}
  ]
}}

Компании:
{chr(10).join(lines)}"""

    raw = call_ai(prompt, model='gpt-4o-mini', max_tokens=3000, temperature=0.3)
    raw = _re.sub(r'^```(?:json)?\s*', '', raw)
    raw = _re.sub(r'\s*```$', '', raw)
    enriched_map = {}
    try:
        data = json.loads(raw)
        for r in data.get('results', []):
            enriched_map[r['idx'] - 1] = r
    except Exception as e:
        print(f"[ai-agent] enrich parse error: {e}")

    result = []
    for i, s in enumerate(signals):
        e = enriched_map.get(i, {})
        result.append({**s, **{
            'ai_score': e.get('ai_score'),
            'ai_summary': e.get('ai_summary', ''),
            'ai_reasons': e.get('ai_reasons', []),
            'next_action': e.get('next_action', ''),
        }})
    return result


def save_signals_to_crm(signals: list, project_id=None) -> dict:
    """Пакетно сохраняет сигналы в CRM с дедубликацией по ИНН и названию."""
    if not signals:
        return {'inserted': 0, 'skipped': 0, 'errors': 0}

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Загружаем существующие ИНН и имена для дедубликации
    cur.execute(f"SELECT LOWER(company_name) as cn, inn FROM {S}.prospects WHERE inn IS NOT NULL OR company_name IS NOT NULL")
    existing = cur.fetchall()
    existing_inns = {r['inn'] for r in existing if r['inn']}
    existing_names = {r['cn'] for r in existing if r['cn']}

    inserted = skipped = errors = 0
    inserted_ids = []

    for s in signals:
        try:
            inn = (s.get('inn') or '').strip()
            name = s.get('company_name', '').strip()
            name_lower = name.lower()

            # Дедубликация
            if inn and inn in existing_inns:
                skipped += 1
                continue
            if name_lower in existing_names:
                skipped += 1
                continue

            priority = 'high' if s.get('potential') == 'high' else ('medium' if s.get('potential') == 'medium' else 'low')
            tech_note = f"Технологии: {', '.join(s.get('tech_tags', []))}. Источник: {s.get('source', 'Радар')}."
            if s.get('next_action'):
                tech_note += f" Следующий шаг: {s.get('next_action')}"

            cur.execute(f"""
                INSERT INTO {S}.prospects (
                    project_id, company_name, inn, industry, description,
                    website, region, source, source_url,
                    status, priority, note,
                    ai_score, ai_summary, ai_reasons
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                ) RETURNING id
            """, (
                project_id,
                name,
                inn or None,
                s.get('industry', ''),
                s.get('signal', ''),
                s.get('website', ''),
                s.get('region', ''),
                'radar',
                '',
                'new',
                priority,
                tech_note,
                s.get('ai_score'),
                s.get('ai_summary', ''),
                s.get('ai_reasons', []),
            ))
            pid = cur.fetchone()['id']
            inserted_ids.append(pid)

            cur.execute(
                f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content) VALUES (%s, %s, %s)",
                (pid, 'note', f"Добавлен из Технологического радара. {tech_note}")
            )

            # Обновляем множества дедубликации
            if inn:
                existing_inns.add(inn)
            existing_names.add(name_lower)
            inserted += 1

        except Exception as e:
            print(f"[ai-agent] insert error for {s.get('company_name')}: {e}")
            errors += 1
            conn.rollback()

    conn.commit()
    conn.close()
    print(f"[ai-agent] radar_to_crm: inserted={inserted}, skipped={skipped}, errors={errors}")
    return {'inserted': inserted, 'skipped': skipped, 'errors': errors, 'ids': inserted_ids}


def handle_radar_to_crm(body: dict) -> dict:
    """
    Полный пайплайн: радар → AI-обогащение → CRM.
    Этапы:
      1. Запуск радара для региона/отрасли
      2. AI-обогащение каждой компании (score, summary, reasons, next_action)
      3. Пакетный INSERT с дедубликацией
    """
    region = body.get('region', '').strip()
    industry = body.get('industry', '').strip()
    project_id = body.get('project_id')
    enrich = body.get('enrich', True)  # можно отключить обогащение для скорости

    if not region:
        return {'error': 'Укажите регион'}

    print(f"[ai-agent] radar_to_crm: region={region} industry={industry}")

    # 1. Радар
    print(f"[ai-agent] step 1: running radar...")
    radar_result = run_radar(region, industry)
    signals = radar_result.get('tech_signals', [])
    print(f"[ai-agent] radar found {len(signals)} signals")

    if not signals:
        return {'ok': False, 'error': 'Радар не нашёл компаний', 'radar_summary': radar_result.get('summary', '')}

    # 2. AI-обогащение параллельно с подготовкой
    if enrich:
        print(f"[ai-agent] step 2: enriching {len(signals)} signals with AI...")
        signals = ai_enrich_signals(signals)
        print(f"[ai-agent] enrichment done")

    # 3. Сохранение в CRM
    print(f"[ai-agent] step 3: saving to CRM...")
    stats = save_signals_to_crm(signals, project_id=project_id)

    return {
        'ok': True,
        'radar_summary': radar_result.get('summary', ''),
        'hot_industries': radar_result.get('hot_industries', []),
        'regional_trends': radar_result.get('regional_trends', []),
        'total_found': len(signals),
        'inserted': stats['inserted'],
        'skipped': stats['skipped'],
        'errors': stats['errors'],
        'signals': signals,  # возвращаем для показа в UI
    }


def handler(event: dict, context) -> dict:
    """AI-агент: анализирует CRM, генерирует стратегию, запускает связку Радар→CRM."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if not auth_check(event):
        return err('Не авторизован', 401)

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            pass

    action = body.get('action', 'generate_report')
    print(f"[ai-agent] action={action}")

    if action == 'generate_report':
        focus = body.get('focus', 'all')
        print(f"[ai-agent] loading CRM data...")
        data = load_crm_data()
        total = len(data['prospects'])
        print(f"[ai-agent] loaded {total} prospects, generating report...")
        report = generate_full_report(data, focus)
        print(f"[ai-agent] report generated ok")
        return json_resp({'ok': True, 'report': report})

    if action == 'radar_to_crm':
        result = handle_radar_to_crm(body)
        return json_resp(result)

    return err('Неизвестный action')