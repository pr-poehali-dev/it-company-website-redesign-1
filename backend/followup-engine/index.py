"""
Followup Engine — движок автоматических follow-up касаний с лидами.
Запускается по расписанию или вручную через POST.

Actions (POST body):
- schedule_followups — создать задачи follow-up для лидов без активности > 3 дней
- run_followups      — выполнить pending-задачи: сгенерировать письмо и отправить
- get_tasks          — список последних 50 задач с данными лида (для UI)
"""
import json
import os
import re
import urllib.request
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

# ── Константы ────────────────────────────────────────────────────────────────

S = os.environ.get('MAIN_DB_SCHEMA', 'public')

AI_URL = 'https://api.polza.ai/v1/chat/completions'
AI_MODEL = 'gpt-4o-mini'

UNISENDER_URL = 'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json'
UNISENDER_URL_FALLBACK = 'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json'

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
Email: maksT77@yandex.ru
Ключевое сообщение: не "мы делаем автоматизацию", а "у вас теряются заявки — покажу где".
"""

FOLLOWUP_PROMPT_TEMPLATE = """Ты — Максим Тюрин, директор MAT Labs.
Компания: {company_name} ({industry}, {region})
Текущий статус: {status}
Что известно: {ai_summary}
Боли: {site_pain_points}
История общения: {activities_text}

Напиши follow-up письмо (если первый контакт был — это второе касание, если нет активностей — первое):
- 60-80 слов максимум
- Другой угол: новый факт/кейс/вопрос, не повтор первого письма
- Без давления, с заботой: "хотел уточнить, актуально ли"
- CTA: 15 минут разбора
- Подпись: Максим, MAT Labs, +7 927 748 6868
Верни JSON: {{"subject": "тема", "body_html": "<html>"}}"""


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


def call_ai(prompt: str) -> str:
    """Отправляет промпт в Polza AI и возвращает текст ответа."""
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        raise ValueError('POLZA_AI_API_KEY не задан')

    payload = {
        'model': AI_MODEL,
        'messages': [
            {
                'role': 'system',
                'content': f'Ты — ассистент IT-компании MAT Labs. Профиль компании:\n{COMPANY_PROFILE}',
            },
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.75,
        'max_tokens': 768,
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
    return result['choices'][0]['message']['content']


def send_unisender(to_email: str, to_name: str, subject: str, body_html: str) -> dict:
    """Отправляет письмо через Unisender Go API с фолбэком на второй сервер."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', 'info@mat-labs.ru')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Тюрин Максим | MAT Labs')

    if not api_key:
        raise ValueError('UNISENDER_API_KEY не задан')

    payload = {
        'message': {
            'recipients': [{'email': to_email, 'substitutions': {'to_name': to_name or to_email}}],
            'sender_email': sender_email,
            'sender_name': sender_name,
            'subject': subject,
            'body': {'html': body_html},
            'track_links': 0,
            'track_read': 0,
        }
    }
    data = json.dumps(payload).encode()

    last_err = None
    result = None
    for base_url in [UNISENDER_URL, UNISENDER_URL_FALLBACK]:
        try:
            req = urllib.request.Request(
                base_url,
                data=data,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-API-KEY': api_key,
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode())
            print(f"[followup-engine] Unisender success via {base_url}: {result}")
            break
        except Exception as e:
            print(f"[followup-engine] Unisender failed {base_url}: {e}")
            last_err = e

    if result is None:
        raise last_err

    return result


def load_prospect(cur, prospect_id) -> dict | None:
    """Загружает лида из БД по id."""
    cur.execute(
        f"""
        SELECT id, company_name, email, phone, industry, region,
               status, ai_score, ai_summary, site_pain_points,
               created_at, updated_at
        FROM {S}.prospects
        WHERE id = %s
        """,
        (prospect_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))


def load_recent_activities(cur, prospect_id, limit: int = 5) -> list[dict]:
    """Загружает последние N активностей лида."""
    cur.execute(
        f"""
        SELECT activity_type, content, created_at
        FROM {S}.prospect_activities
        WHERE prospect_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (prospect_id, limit),
    )
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def activities_to_text(activities: list[dict]) -> str:
    """Преобразует список активностей в читаемый текст для промпта."""
    if not activities:
        return 'Нет истории общения — это первое касание'
    lines = []
    for a in activities:
        ts = str(a.get('created_at', ''))[:10]
        atype = a.get('activity_type', '')
        content = (a.get('content') or '')[:120]
        lines.append(f"[{ts}] {atype}: {content}")
    return '\n'.join(lines)


# ── Action-обработчики ────────────────────────────────────────────────────────

def action_schedule_followups(body: dict) -> dict:
    """
    Создаёт pending follow-up задачи для лидов:
    - status IN ('new', 'contacted')
    - нет pending-задачи
    - последняя активность была > 3 дней назад (или активностей нет вообще)
    - email IS NOT NULL
    """
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT p.id
                FROM {S}.prospects p
                WHERE p.status IN ('new', 'contacted')
                  AND p.email IS NOT NULL
                  AND p.email <> ''
                  -- нет pending-задачи для этого лида
                  AND NOT EXISTS (
                      SELECT 1 FROM {S}.followup_tasks ft
                      WHERE ft.prospect_id = p.id
                        AND ft.status = 'pending'
                  )
                  -- последняя активность была > 3 дней назад, ИЛИ активностей нет вообще
                  AND (
                      NOT EXISTS (
                          SELECT 1 FROM {S}.prospect_activities pa
                          WHERE pa.prospect_id = p.id
                      )
                      OR (
                          SELECT MAX(pa2.created_at)
                          FROM {S}.prospect_activities pa2
                          WHERE pa2.prospect_id = p.id
                      ) < NOW() - INTERVAL '3 days'
                  )
                """
            )
            prospect_ids = [row[0] for row in cur.fetchall()]

            scheduled = 0
            now_utc = datetime.now(timezone.utc)
            for pid in prospect_ids:
                cur.execute(
                    f"""
                    INSERT INTO {S}.followup_tasks
                        (prospect_id, task_type, scheduled_at, status, created_at)
                    VALUES (%s, 'followup', %s + INTERVAL '1 hour', 'pending', %s)
                    """,
                    (pid, now_utc, now_utc),
                )
                scheduled += 1

            conn.commit()

        print(f"[followup-engine] schedule_followups: scheduled={scheduled}")
        return json_resp({'ok': True, 'scheduled': scheduled})

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print(f"[followup-engine] schedule_followups error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_run_followups(body: dict) -> dict:
    """
    Выполняет все pending follow-up задачи (scheduled_at <= now, лимит 10).
    Для каждой: генерирует письмо через AI, отправляет через Unisender,
    обновляет задачу, пишет активность и funnel_event.
    """
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, prospect_id, task_type
                FROM {S}.followup_tasks
                WHERE status = 'pending'
                  AND scheduled_at <= NOW()
                ORDER BY scheduled_at
                LIMIT 10
                """,
            )
            cols = [d[0] for d in cur.description]
            tasks = [dict(zip(cols, row)) for row in cur.fetchall()]
        conn.close()
        conn = None
    except Exception as e:
        if conn:
            conn.close()
        print(f"[followup-engine] run_followups fetch error: {e}")
        return err(str(e), 500)

    processed = 0
    sent = 0
    errors = []

    for task in tasks:
        task_id = task['id']
        prospect_id = task['prospect_id']
        error_msg = None
        ai_subject = None
        ai_body = None

        try:
            conn = get_db()
            with conn.cursor() as cur:
                # a. Загрузить данные лида
                prospect = load_prospect(cur, prospect_id)
                if prospect is None:
                    raise ValueError(f'Лид prospect_id={prospect_id} не найден')

                to_email = (prospect.get('email') or '').strip()
                if not to_email:
                    raise ValueError('У лида нет email')

                # b. История общения (последние 5 активностей)
                activities = load_recent_activities(cur, prospect_id, limit=5)
                activities_text = activities_to_text(activities)

                # c. Генерация follow-up письма через AI
                prompt = FOLLOWUP_PROMPT_TEMPLATE.format(
                    company_name=prospect.get('company_name', ''),
                    industry=prospect.get('industry', '') or 'не указана',
                    region=prospect.get('region', '') or 'не указан',
                    status=prospect.get('status', ''),
                    ai_summary=prospect.get('ai_summary', '') or 'нет данных',
                    site_pain_points=prospect.get('site_pain_points', '') or 'нет данных',
                    activities_text=activities_text,
                )
                ai_raw = call_ai(prompt)

                try:
                    parsed = parse_json_from_ai(ai_raw)
                    ai_subject = (parsed.get('subject') or '').strip()
                    ai_body = (parsed.get('body_html') or '').strip()
                except Exception as parse_err:
                    print(f"[followup-engine] AI parse error task_id={task_id}: {parse_err}")
                    ai_subject = f"Follow-up: {prospect.get('company_name', '')}"
                    ai_body = f"<p>{ai_raw}</p>"

                if not ai_subject:
                    ai_subject = f"Follow-up: {prospect.get('company_name', '')}"
                if not ai_body:
                    ai_body = f"<p>{ai_raw}</p>"

                # d. Отправка письма через Unisender Go
                send_unisender(to_email, prospect.get('company_name', ''), ai_subject, ai_body)

                now_utc = datetime.now(timezone.utc)

                # e. Обновить задачу: status='sent', filled fields
                cur.execute(
                    f"""
                    UPDATE {S}.followup_tasks
                    SET status = 'sent',
                        executed_at = %s,
                        ai_subject = %s,
                        ai_body = %s,
                        error_msg = NULL
                    WHERE id = %s
                    """,
                    (now_utc, ai_subject, ai_body, task_id),
                )

                # f. Запись активности
                cur.execute(
                    f"""
                    INSERT INTO {S}.prospect_activities
                        (prospect_id, activity_type, content, created_at)
                    VALUES (%s, 'followup_sent', %s, %s)
                    """,
                    (prospect_id, ai_subject, now_utc),
                )

                # g. Запись в воронку
                meta = json.dumps({'subject': ai_subject, 'sent_to': to_email, 'task_id': str(task_id)})
                cur.execute(
                    f"""
                    INSERT INTO {S}.funnel_events
                        (event_type, prospect_id, source, meta, created_at)
                    VALUES ('email_sent', %s, 'followup', %s::jsonb, %s)
                    """,
                    (prospect_id, meta, now_utc),
                )

                conn.commit()

            sent += 1
            print(f"[followup-engine] task_id={task_id} sent to={to_email} subject={ai_subject[:60]}")

        except Exception as e:
            error_msg = str(e)
            print(f"[followup-engine] task_id={task_id} error: {e}")
            errors.append({'task_id': str(task_id), 'prospect_id': str(prospect_id), 'error': error_msg})

            # Обновляем задачу как failed
            try:
                if conn is None:
                    conn = get_db()
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        UPDATE {S}.followup_tasks
                        SET status = 'failed',
                            executed_at = NOW(),
                            error_msg = %s
                        WHERE id = %s
                        """,
                        (error_msg[:500], task_id),
                    )
                    conn.commit()
            except Exception as db_err:
                print(f"[followup-engine] failed to mark task as failed: {db_err}")
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
                conn = None

        processed += 1

    print(f"[followup-engine] run_followups done: processed={processed} sent={sent} errors={len(errors)}")
    return json_resp({'ok': True, 'processed': processed, 'sent': sent, 'errors': errors})


def action_get_tasks(body: dict) -> dict:
    """
    Возвращает последние 50 задач follow-up с данными лида (company_name, email, status).
    """
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    ft.id,
                    ft.prospect_id,
                    ft.task_type,
                    ft.scheduled_at,
                    ft.executed_at,
                    ft.status,
                    ft.ai_subject,
                    ft.error_msg,
                    ft.created_at,
                    p.company_name,
                    p.email,
                    p.status AS prospect_status
                FROM {S}.followup_tasks ft
                LEFT JOIN {S}.prospects p ON p.id = ft.prospect_id
                ORDER BY ft.created_at DESC
                LIMIT 50
                """
            )
            cols = [d[0] for d in cur.description]
            tasks = [dict(zip(cols, row)) for row in cur.fetchall()]

        return json_resp({'ok': True, 'tasks': tasks, 'total': len(tasks)})

    except Exception as e:
        print(f"[followup-engine] get_tasks error: {e}")
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

    if action == 'schedule_followups':
        return action_schedule_followups(body)
    elif action == 'run_followups':
        return action_run_followups(body)
    elif action == 'get_tasks':
        return action_get_tasks(body)
    else:
        return err(
            f'Неизвестный action: {action!r}. Доступны: schedule_followups, run_followups, get_tasks',
            400,
        )
