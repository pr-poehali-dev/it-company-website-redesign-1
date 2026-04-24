"""
Auto Emailer — автоматическая отправка вводного письма новому лиду и анализ его сайта.

Actions (POST body):
- send_intro   — сгенерировать и отправить персонализированное письмо одному лиду
- analyze_site — только парсинг + AI-анализ сайта, без отправки письма
- batch_send   — пакетная отправка для всех новых лидов без письма (до 20 штук)
"""
import json
import os
import re
import urllib.request
import urllib.error
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

LETTER_PROMPT_TEMPLATE = """Ты — Максим Тюрин, директор MAT Labs. Пишешь холодное письмо компании {company_name} ({industry}, {region}).
Информация о компании: {site_summary}
Признаки проблем: {pain_points}
Напиши письмо 100-150 слов:
- Открой конкретной болью их отрасли (не "мы занимаемся", а "в вашей нише теряется X")
- Предложи бесплатный разбор за 15 минут — покажешь где у них утекают заявки
- CTA: ответить на письмо или написать в Telegram
- Подпись: Максим Тюрин, MAT Labs, +7 927 748 6868
Верни JSON: {{"subject": "тема письма (цепляющая, про боль)", "body_html": "<html письма>"}}"""

ANALYZE_PROMPT_TEMPLATE = """Проанализируй сайт компании по следующему тексту со страницы:

{site_text}

Ответь в формате JSON:
{{
  "site_analysis": "краткое описание: что продают, кому, как позиционируют себя (2-4 предложения)",
  "site_pain_points": "признаки хаоса и проблем: нет CRM, ручная обработка заявок, устаревший стек, слабый лендинг, нет аналитики — перечисли через запятую"
}}
Отвечай только JSON, без markdown-обёртки."""


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


def strip_html(html: str) -> str:
    """Убирает HTML-теги и лишние пробелы, возвращает чистый текст."""
    text = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-zA-Z]+;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_site_text(url: str, max_chars: int = 3000) -> str:
    """Загружает страницу и возвращает первые max_chars символов чистого текста."""
    if not url:
        return ''
    if not url.startswith('http'):
        url = 'https://' + url
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; mat-labs-bot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_html = resp.read().decode('utf-8', errors='replace')
        text = strip_html(raw_html)
        return text[:max_chars]
    except Exception as e:
        print(f"[auto-emailer] fetch_site_text error for {url}: {e}")
        return ''


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
        'temperature': 0.7,
        'max_tokens': 1024,
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


def parse_json_from_ai(text: str) -> dict:
    """Извлекает JSON из ответа AI (может быть обёрнут в ```json ... ```)."""
    text = text.strip()
    # Убираем markdown-блок, если есть
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()
    return json.loads(text)


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
            print(f"[auto-emailer] Unisender success via {base_url}: {result}")
            break
        except Exception as e:
            print(f"[auto-emailer] Unisender failed {base_url}: {e}")
            last_err = e

    if result is None:
        raise last_err

    return result


def load_prospect(cur, prospect_id) -> dict | None:
    """Загружает лида из БД по id."""
    cur.execute(
        f"""
        SELECT id, company_name, email, website, industry, region,
               ai_score, ai_summary, auto_email_sent, site_analysis,
               site_pain_points, status, source
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


def do_analyze_site(prospect: dict) -> tuple[str, str]:
    """
    Парсит сайт лида и запрашивает AI-анализ.
    Возвращает (site_analysis, site_pain_points).
    """
    website = (prospect.get('website') or '').strip()
    site_text = fetch_site_text(website) if website else ''

    if not site_text:
        site_text = f"Сайт недоступен или не указан. Компания: {prospect.get('company_name', '')}, отрасль: {prospect.get('industry', '')}"

    prompt = ANALYZE_PROMPT_TEMPLATE.format(site_text=site_text)
    ai_raw = call_ai(prompt)

    try:
        parsed = parse_json_from_ai(ai_raw)
        site_analysis = parsed.get('site_analysis', '').strip()
        site_pain_points = parsed.get('site_pain_points', '').strip()
    except Exception as e:
        print(f"[auto-emailer] analyze parse error: {e}, raw={ai_raw[:200]}")
        site_analysis = ai_raw[:500]
        site_pain_points = ''

    return site_analysis, site_pain_points


def do_generate_letter(prospect: dict, site_analysis: str, site_pain_points: str) -> tuple[str, str]:
    """
    Генерирует subject и body_html письма через AI.
    Возвращает (subject, body_html).
    """
    site_summary = site_analysis or prospect.get('ai_summary') or 'Информация о компании недоступна'
    pain_points = site_pain_points or 'Нет данных об анализе сайта'

    prompt = LETTER_PROMPT_TEMPLATE.format(
        company_name=prospect.get('company_name', ''),
        industry=prospect.get('industry', '') or 'не указана',
        region=prospect.get('region', '') or 'не указан',
        site_summary=site_summary,
        pain_points=pain_points,
    )
    ai_raw = call_ai(prompt)

    try:
        parsed = parse_json_from_ai(ai_raw)
        subject = parsed.get('subject', '').strip()
        body_html = parsed.get('body_html', '').strip()
    except Exception as e:
        print(f"[auto-emailer] letter parse error: {e}, raw={ai_raw[:200]}")
        subject = f"Для {prospect.get('company_name', 'вашей компании')} — покажу где теряются заявки"
        body_html = f"<p>{ai_raw}</p>"

    if not subject:
        subject = f"Для {prospect.get('company_name', 'вашей компании')} — покажу где теряются заявки"
    if not body_html:
        body_html = f"<p>{ai_raw}</p>"

    return subject, body_html


# ── Action-обработчики ────────────────────────────────────────────────────────

def action_send_intro(body: dict) -> dict:
    """Генерирует и отправляет персонализированное письмо одному лиду."""
    prospect_id = body.get('prospect_id')
    if not prospect_id:
        return err('prospect_id обязателен')

    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            prospect = load_prospect(cur, prospect_id)
            if prospect is None:
                return err(f'Лид с id={prospect_id} не найден', 404)

            to_email = (prospect.get('email') or '').strip()
            if not to_email:
                return err('У лида нет email — отправка невозможна')

            # 1. Анализ сайта
            site_analysis, site_pain_points = do_analyze_site(prospect)

            # 2. Генерация письма
            subject, body_html = do_generate_letter(prospect, site_analysis, site_pain_points)

            # 3. Отправка письма
            send_unisender(to_email, prospect.get('company_name', ''), subject, body_html)

            now_utc = datetime.now(timezone.utc)

            # 4. Сохранение анализа и флага отправки в prospects
            cur.execute(
                f"""
                UPDATE {S}.prospects
                SET site_analysis = %s,
                    site_pain_points = %s,
                    auto_email_sent = TRUE,
                    auto_email_sent_at = %s
                WHERE id = %s
                """,
                (site_analysis, site_pain_points, now_utc, prospect_id),
            )

            # 5. Запись активности
            cur.execute(
                f"""
                INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (prospect_id, 'email_sent', subject, now_utc),
            )

            # 6. Запись в воронку
            meta = json.dumps({'subject': subject, 'sent_to': to_email})
            cur.execute(
                f"""
                INSERT INTO {S}.funnel_events (event_type, prospect_id, source, meta, created_at)
                VALUES (%s, %s, %s, %s::jsonb, %s)
                """,
                ('email_sent', prospect_id, prospect.get('source') or '', meta, now_utc),
            )

            conn.commit()

        print(f"[auto-emailer] send_intro ok: prospect_id={prospect_id} email={to_email} subject={subject[:60]}")
        return json_resp({'ok': True, 'subject': subject, 'sent_to': to_email})

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print(f"[auto-emailer] send_intro error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_analyze_site(body: dict) -> dict:
    """Только парсинг и AI-анализ сайта — без отправки письма."""
    prospect_id = body.get('prospect_id')
    if not prospect_id:
        return err('prospect_id обязателен')

    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            prospect = load_prospect(cur, prospect_id)
            if prospect is None:
                return err(f'Лид с id={prospect_id} не найден', 404)

            site_analysis, site_pain_points = do_analyze_site(prospect)

            cur.execute(
                f"""
                UPDATE {S}.prospects
                SET site_analysis = %s,
                    site_pain_points = %s
                WHERE id = %s
                """,
                (site_analysis, site_pain_points, prospect_id),
            )
            conn.commit()

        print(f"[auto-emailer] analyze_site ok: prospect_id={prospect_id}")
        return json_resp({'ok': True, 'site_analysis': site_analysis, 'site_pain_points': site_pain_points})

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print(f"[auto-emailer] analyze_site error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_batch_send(body: dict) -> dict:
    """Пакетная отправка писем всем новым лидам без письма (до 20 штук)."""
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id FROM {S}.prospects
                WHERE status = 'new'
                  AND (auto_email_sent IS NULL OR auto_email_sent = FALSE)
                  AND email IS NOT NULL
                  AND email <> ''
                ORDER BY id
                LIMIT 20
                """,
            )
            rows = cur.fetchall()
        conn.close()
        conn = None
    except Exception as e:
        if conn:
            conn.close()
        print(f"[auto-emailer] batch_send fetch error: {e}")
        return err(str(e), 500)

    ids = [r[0] for r in rows]
    sent = 0
    errors = []

    for pid in ids:
        result = action_send_intro({'prospect_id': pid})
        body_data = {}
        try:
            body_data = json.loads(result.get('body', '{}'))
        except Exception:
            pass
        if result.get('statusCode', 500) == 200 and body_data.get('ok'):
            sent += 1
        else:
            errors.append({'prospect_id': pid, 'error': body_data.get('error', 'unknown error')})

    print(f"[auto-emailer] batch_send done: sent={sent} errors={len(errors)} total={len(ids)}")
    return json_resp({'ok': True, 'sent': sent, 'errors': errors})


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

    if action == 'send_intro':
        return action_send_intro(body)
    elif action == 'analyze_site':
        return action_analyze_site(body)
    elif action == 'batch_send':
        return action_batch_send(body)
    else:
        return err(f'Неизвестный action: {action!r}. Доступны: send_intro, analyze_site, batch_send', 400)
