"""
Funnel Stats — дашборд воронки с метриками и ROI агента.
Поддерживает GET / и POST с action.

Actions:
- get_stats         — полная статистика воронки (GET или POST)
- get_weekly_report — AI генерирует текстовый недельный отчёт
"""
import json
import os
import urllib.request
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

# ── Константы ────────────────────────────────────────────────────────────────

S = os.environ.get('MAIN_DB_SCHEMA', 'public')

AI_URL = 'https://api.polza.ai/v1/chat/completions'
AI_MODEL = 'gpt-4o-mini'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Authorization',
}

COMPANY_PROFILE = """
MAT Labs — российская IT-компания, специализация: AI-автоматизация бизнеса, интеграции, сайты под конверсию.
Внедрение за 7–14 дней.
Генеральный директор: Тюрин Максим Александрович
Телефон: +7 927 748 6868
"""

WEEKLY_REPORT_PROMPT = """Ты — аналитик продаж IT-компании MAT Labs. Напиши короткий (150-200 слов) недельный отчёт по воронке.

Данные воронки:
{stats_text}

Структура отчёта:
1. Ключевые цифры недели (лидов добавлено, писем отправлено, конверсия)
2. Лучший сегмент (отрасль или источник с лучшей конверсией)
3. Рекомендация: куда переключить фокус на следующей неделе и почему
4. 1 конкретное действие на завтра

Пиши деловым языком, без воды, от первого лица как аналитик команды."""


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


def pct(numerator, denominator) -> str:
    """Вычисляет процент и возвращает строку вида 'X.X%'."""
    if not denominator:
        return '0%'
    return f"{round(100 * numerator / denominator, 1)}%"


def call_ai(prompt: str) -> str:
    """Отправляет промпт в Polza AI и возвращает текст ответа."""
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        raise ValueError('POLZA_AI_API_KEY не задан')

    payload = {
        'model': AI_MODEL,
        'messages': [
            {'role': 'system', 'content': f'Ты — аналитик IT-компании MAT Labs.\n{COMPANY_PROFILE}'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.5,
        'max_tokens': 600,
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
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
    return result['choices'][0]['message']['content'].strip()


# ── Сбор статистики ──────────────────────────────────────────────────────────

def collect_stats(conn) -> dict:
    """Собирает полную статистику воронки из БД и возвращает dict."""
    with conn.cursor() as cur:

        # ── 1. Funnel: статусы из prospects ─────────────────────────────────
        cur.execute(
            f"""
            SELECT
                COUNT(*)                                                     AS total,
                COUNT(*) FILTER (WHERE status = 'new')                       AS new,
                COUNT(*) FILTER (WHERE status = 'contacted')                 AS contacted,
                COUNT(*) FILTER (WHERE status = 'interested')                AS interested,
                COUNT(*) FILTER (WHERE status = 'negotiation')               AS negotiation,
                COUNT(*) FILTER (WHERE status = 'won')                       AS won,
                COUNT(*) FILTER (WHERE status = 'lost')                      AS lost,
                COUNT(*) FILTER (WHERE status = 'postponed')                 AS postponed
            FROM {S}.prospects
            """
        )
        row = cur.fetchone()
        cols = [d[0] for d in cur.description]
        status_counts = dict(zip(cols, row))

        # ── 2. Кол-во отправленных писем из funnel_events ───────────────────
        cur.execute(
            f"""
            SELECT COUNT(*) FROM {S}.funnel_events WHERE event_type = 'email_sent'
            """
        )
        emails_sent = cur.fetchone()[0] or 0

        # ── 3. Кол-во добавленных лидов из funnel_events ────────────────────
        cur.execute(
            f"""
            SELECT COUNT(*) FROM {S}.funnel_events WHERE event_type = 'lead_added'
            """
        )
        leads_added_events = cur.fetchone()[0] or 0

        # Итоговое кол-во лидов — берём большее из двух источников
        lead_added_count = max(status_counts.get('total', 0), leads_added_events)

        interested = status_counts.get('interested', 0)
        negotiation = status_counts.get('negotiation', 0)
        won = status_counts.get('won', 0)
        lost = status_counts.get('lost', 0)

        funnel = {
            'lead_added': lead_added_count,
            'email_sent': emails_sent,
            'interested': interested,
            'negotiation': negotiation,
            'won': won,
            'lost': lost,
        }

        conversion = {
            'lead_to_contact': pct(emails_sent, lead_added_count),
            'contact_to_interest': pct(interested, emails_sent),
            'interest_to_won': pct(won, interested),
        }

        # ── 4. By source ─────────────────────────────────────────────────────
        cur.execute(
            f"""
            SELECT
                COALESCE(source, 'unknown')          AS source,
                COUNT(*)                              AS leads,
                COUNT(*) FILTER (WHERE status='won') AS won
            FROM {S}.prospects
            GROUP BY source
            ORDER BY leads DESC
            LIMIT 20
            """
        )
        cols = [d[0] for d in cur.description]
        by_source = []
        for r in cur.fetchall():
            d = dict(zip(cols, r))
            d['conversion'] = pct(d['won'], d['leads'])
            by_source.append(d)

        # ── 5. By industry ───────────────────────────────────────────────────
        cur.execute(
            f"""
            SELECT
                COALESCE(NULLIF(TRIM(industry), ''), 'не указана') AS industry,
                COUNT(*)                                            AS leads,
                ROUND(AVG(ai_score) FILTER (WHERE ai_score IS NOT NULL), 1) AS avg_score,
                COUNT(*) FILTER (WHERE status='won')                AS won
            FROM {S}.prospects
            GROUP BY 1
            ORDER BY leads DESC
            LIMIT 20
            """
        )
        cols = [d[0] for d in cur.description]
        by_industry = [dict(zip(cols, r)) for r in cur.fetchall()]

        # ── 6. By region ─────────────────────────────────────────────────────
        cur.execute(
            f"""
            SELECT
                COALESCE(NULLIF(TRIM(region), ''), 'не указан') AS region,
                COUNT(*)                                          AS leads,
                COUNT(*) FILTER (WHERE status='won')             AS won
            FROM {S}.prospects
            GROUP BY 1
            ORDER BY leads DESC
            LIMIT 20
            """
        )
        cols = [d[0] for d in cur.description]
        by_region = [dict(zip(cols, r)) for r in cur.fetchall()]

        # ── 7. Radar stats ───────────────────────────────────────────────────
        try:
            cur.execute(
                f"""
                SELECT
                    COUNT(*)           AS total_runs,
                    COALESCE(SUM(found), 0)    AS total_found,
                    COALESCE(SUM(inserted), 0) AS total_inserted,
                    MAX(started_at)    AS last_run
                FROM {S}.radar_runs
                """
            )
            cols = [d[0] for d in cur.description]
            radar_row = dict(zip(cols, cur.fetchone()))
            radar_stats = {
                'total_runs': radar_row.get('total_runs', 0),
                'total_found': radar_row.get('total_found', 0),
                'total_inserted': radar_row.get('total_inserted', 0),
                'last_run': str(radar_row.get('last_run') or ''),
            }
        except Exception as e:
            print(f"[funnel-stats] radar_runs query error (table may not exist): {e}")
            radar_stats = {'total_runs': 0, 'total_found': 0, 'total_inserted': 0, 'last_run': ''}

        # ── 8. Followup stats ────────────────────────────────────────────────
        try:
            cur.execute(
                f"""
                SELECT
                    COUNT(*) FILTER (WHERE status = 'sent')    AS total_sent,
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending
                FROM {S}.followup_tasks
                """
            )
            cols = [d[0] for d in cur.description]
            fu_row = dict(zip(cols, cur.fetchone()))
            followup_stats = {
                'total_sent': fu_row.get('total_sent', 0),
                'pending': fu_row.get('pending', 0),
            }
        except Exception as e:
            print(f"[funnel-stats] followup_tasks query error (table may not exist): {e}")
            followup_stats = {'total_sent': 0, 'pending': 0}

        # ── 9. Top prospects ─────────────────────────────────────────────────
        cur.execute(
            f"""
            SELECT company_name, status, ai_score, COALESCE(NULLIF(TRIM(industry),''), 'не указана') AS industry
            FROM {S}.prospects
            WHERE status NOT IN ('won', 'lost') AND ai_score IS NOT NULL
            ORDER BY ai_score DESC
            LIMIT 5
            """
        )
        cols = [d[0] for d in cur.description]
        top_prospects = [dict(zip(cols, r)) for r in cur.fetchall()]

        # ── 10. Weekly trend ────────────────────────────────────────────────
        cur.execute(
            f"""
            SELECT
                DATE(created_at)                                   AS date,
                COUNT(*) FILTER (WHERE event_type = 'lead_added') AS added,
                COUNT(*) FILTER (WHERE event_type = 'email_sent') AS emails_sent
            FROM {S}.funnel_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY 1
            ORDER BY 1
            """
        )
        cols = [d[0] for d in cur.description]
        weekly_trend = [dict(zip(cols, r)) for r in cur.fetchall()]

    return {
        'funnel': funnel,
        'conversion': conversion,
        'by_source': by_source,
        'by_industry': by_industry,
        'by_region': by_region,
        'radar_stats': radar_stats,
        'followup_stats': followup_stats,
        'top_prospects': top_prospects,
        'weekly_trend': weekly_trend,
    }


def stats_to_text(stats: dict) -> str:
    """Преобразует статистику в читаемый текст для промпта AI."""
    f = stats.get('funnel', {})
    c = stats.get('conversion', {})
    radar = stats.get('radar_stats', {})
    fu = stats.get('followup_stats', {})

    lines = [
        '=== ВОРОНКА ===',
        f"Лидов всего: {f.get('lead_added', 0)}",
        f"Писем отправлено: {f.get('email_sent', 0)}",
        f"Проявили интерес: {f.get('interested', 0)}",
        f"На переговорах: {f.get('negotiation', 0)}",
        f"Клиентов (won): {f.get('won', 0)}",
        f"Отказов: {f.get('lost', 0)}",
        '',
        '=== КОНВЕРСИЯ ===',
        f"Лид → контакт: {c.get('lead_to_contact', '0%')}",
        f"Контакт → интерес: {c.get('contact_to_interest', '0%')}",
        f"Интерес → клиент: {c.get('interest_to_won', '0%')}",
        '',
        '=== РАДАР ===',
        f"Запусков радара: {radar.get('total_runs', 0)}",
        f"Найдено компаний: {radar.get('total_found', 0)}",
        f"Добавлено в CRM: {radar.get('total_inserted', 0)}",
        f"Последний запуск: {radar.get('last_run', 'нет данных')}",
        '',
        '=== FOLLOW-UP ===',
        f"Отправлено follow-up: {fu.get('total_sent', 0)}",
        f"Ожидают отправки: {fu.get('pending', 0)}",
        '',
        '=== ТОП ОТРАСЛЕЙ ===',
    ]
    for ind in (stats.get('by_industry') or [])[:5]:
        lines.append(
            f"  {ind.get('industry')}: {ind.get('leads')} лидов, "
            f"avg_score={ind.get('avg_score')}, won={ind.get('won')}"
        )

    lines.append('')
    lines.append('=== НЕДЕЛЬНЫЙ ТРЕНД ===')
    for day in (stats.get('weekly_trend') or []):
        lines.append(f"  {day.get('date')}: +{day.get('added')} лидов, {day.get('emails_sent')} писем")

    return '\n'.join(lines)


# ── Action-обработчики ────────────────────────────────────────────────────────

def action_get_stats() -> dict:
    """Возвращает полную статистику воронки."""
    conn = None
    try:
        conn = get_db()
        stats = collect_stats(conn)
        return json_resp(stats)
    except Exception as e:
        print(f"[funnel-stats] get_stats error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_get_weekly_report() -> dict:
    """AI генерирует текстовый недельный отчёт по данным воронки."""
    conn = None
    try:
        conn = get_db()
        stats = collect_stats(conn)
        conn.close()
        conn = None
    except Exception as e:
        if conn:
            conn.close()
        print(f"[funnel-stats] weekly_report stats error: {e}")
        return err(str(e), 500)

    stats_text = stats_to_text(stats)
    prompt = WEEKLY_REPORT_PROMPT.format(stats_text=stats_text)

    try:
        report_text = call_ai(prompt)
    except Exception as e:
        print(f"[funnel-stats] weekly_report AI error: {e}")
        return err(f'AI error: {e}', 500)

    return json_resp({'ok': True, 'report_text': report_text})


# ── Главный обработчик ────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    # GET / — возвращаем полную статистику без body
    if method == 'GET':
        return action_get_stats()

    if method != 'POST':
        return err('Method not allowed', 405)

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return err('Невалидный JSON в теле запроса', 400)

    action = (body.get('action') or 'get_stats').strip()

    if action == 'get_stats':
        return action_get_stats()
    elif action == 'get_weekly_report':
        return action_get_weekly_report()
    else:
        return err(
            f'Неизвестный action: {action!r}. Доступны: get_stats, get_weekly_report',
            400,
        )