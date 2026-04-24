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
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

AI_URL = 'https://api.polza.ai/v1/chat/completions'
S = os.environ.get('MAIN_DB_SCHEMA', 'public')

COMPANY_PROFILE = """
MAT Labs — российская IT-компания.
Специализация: AI-автоматизация бизнеса, обработка заявок, интеграции с CRM, создание сайтов.
Внедрение за 7–14 дней. Фокус на результате, а не «разработке ради разработки».
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
    """Генерирует полный отчёт: стратегия + рекомендации по каждому лиду."""
    crm_summary = build_crm_summary(data)
    prospects = data['prospects']

    # 1. Общая стратегия
    strategy_prompt = f"""Ты — опытный директор по продажам IT-компании MAT Labs.

Профиль компании:
{COMPANY_PROFILE.strip()}

Данные CRM:
{crm_summary}

Задача: проанализируй базу лидов и составь стратегический отчёт.

Верни ТОЛЬКО JSON (без markdown):
{{
  "executive_summary": "<3-4 предложения: ключевые выводы о состоянии воронки продаж>",
  "pipeline_health": {{
    "score": <0-100, общее здоровье воронки>,
    "verdict": "<отлично|хорошо|требует внимания|критично>",
    "comment": "<1-2 предложения>"
  }},
  "top_opportunities": [
    {{
      "company": "<название>",
      "reason": "<почему приоритетный>",
      "action": "<что сделать прямо сейчас>"
    }}
  ],
  "risks": [
    {{
      "company": "<название>",
      "risk": "<в чём риск>",
      "mitigation": "<как снизить риск>"
    }}
  ],
  "strategy": {{
    "focus": "<на каком сегменте сосредоточиться>",
    "channels": ["<канал 1>", "<канал 2>", "<канал 3>"],
    "messaging": "<ключевое сообщение для текущей базы>",
    "timeline": "<рекомендуемые шаги на ближайшие 2 недели>"
  }},
  "quick_wins": [
    "<конкретное действие 1, которое можно сделать сегодня>",
    "<конкретное действие 2>",
    "<конкретное действие 3>"
  ],
  "segments": [
    {{
      "name": "<сегмент>",
      "count": <кол-во лидов>,
      "approach": "<стратегия работы с сегментом>"
    }}
  ]
}}"""

    strategy_raw = call_ai(strategy_prompt, model='gpt-4o', max_tokens=3000)
    import re
    strategy_raw = re.sub(r'^```(?:json)?\s*', '', strategy_raw)
    strategy_raw = re.sub(r'\s*```$', '', strategy_raw)
    try:
        strategy = json.loads(strategy_raw)
    except Exception:
        strategy = {'executive_summary': strategy_raw, 'error': 'parse_error'}

    # 2. Рекомендации по каждому лиду (топ-15 приоритетных)
    priority_prospects = [
        p for p in prospects
        if p.get('status') not in ('won', 'lost') and p.get('ai_score', 0)
    ][:15]

    leads_text = "\n".join([
        f"- {p['company_name']} | {STATUS_LABELS.get(p['status'], p['status'])} | "
        f"скор {p.get('ai_score','?')} | {p.get('industry','?')} | {p.get('region','?')} | "
        f"сайт: {p.get('website','нет')} | контакт: {p.get('email','') or p.get('phone','нет')}"
        + (f" | ИИ-анализ: {p['ai_summary'][:100]}" if p.get('ai_summary') else '')
        for p in priority_prospects
    ])

    leads_prompt = f"""Ты — B2B менеджер по продажам IT-компании MAT Labs.

Профиль компании:
{COMPANY_PROFILE.strip()}

Список приоритетных лидов для проработки:
{leads_text}

Для каждого лида дай конкретные рекомендации. Верни ТОЛЬКО JSON (без markdown):
{{
  "leads": [
    {{
      "company": "<название>",
      "status": "<текущий статус>",
      "next_step": "<конкретное следующее действие>",
      "email_subject": "<тема письма>",
      "email_body": "<текст холодного/тёплого письма 100-150 слов>",
      "call_script": "<скрипт звонка 5-7 реплик>",
      "offer": "<конкретное предложение от MAT Labs под этот бизнес>",
      "timing": "<когда связаться: сегодня/эта неделя/следующая неделя>"
    }}
  ]
}}"""

    leads_raw = call_ai(leads_prompt, model='gpt-4o', max_tokens=4000)
    leads_raw = re.sub(r'^```(?:json)?\s*', '', leads_raw)
    leads_raw = re.sub(r'\s*```$', '', leads_raw)
    try:
        leads_report = json.loads(leads_raw)
    except Exception:
        leads_report = {'leads': [], 'error': 'parse_error'}

    return {
        'generated_at': datetime.now().isoformat(),
        'total_prospects': len(prospects),
        'strategy': strategy,
        'leads_recommendations': leads_report.get('leads', []),
    }


def handler(event: dict, context) -> dict:
    """AI-агент: анализирует всю CRM и генерирует отчёт со стратегией и рекомендациями по каждому лиду."""
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

    return err('Неизвестный action')
