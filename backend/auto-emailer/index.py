"""
Auto Emailer — автоматическая отправка вводного письма новому лиду и анализ его сайта.

Actions (POST body):
- send_intro   — сгенерировать и отправить персонализированное письмо одному лиду
- analyze_site — только парсинг + AI-анализ сайта, без отправки письма
- batch_send   — пакетная отправка для всех новых лидов без письма (до 20 штук)
"""
import hashlib
import hmac
import json
import os
import re
import smtplib
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

import psycopg2
import psycopg2.extras

from segments import SEGMENTS, SEGMENT_ORDER, match_segment, build_segment_html

# ── Константы ────────────────────────────────────────────────────────────────

S = os.environ.get('MAIN_DB_SCHEMA', 'public')

AI_URL = 'https://api.polza.ai/v1/chat/completions'
AI_MODEL = 'gpt-4o-mini'

UNISENDER_URL = 'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json'
UNISENDER_URL_FALLBACK = 'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json'

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465
SENDER_EMAIL_MAKST = 'maksT77@yandex.ru'
SENDER_NAME_MAKST = 'Максим Тюрин | MAT Labs'

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

UCHISPRO_SUBJECT = 'Автоматизация онлайн-школы: платформа Учисьпро.рф — 2 недели бесплатно'

# Отрасли/ниши, по которым считаем компанию онлайн-школой или репетитором
EDU_KEYWORDS = [
    'образован', 'обучен', 'школ', 'репетит', 'курс', 'учеб', 'учебн',
    'преподав', 'академ', 'edtech', 'колледж', 'лицей', 'тренинг',
    'подготовк', 'дополнительн', 'языков', 'egэ', 'егэ', 'огэ',
    'детск', 'развит', 'знани', 'педагог',
]


def build_uchispro_html(company_name: str) -> str:
    """Фиксированное письмо про Учисьпро.рф. Меняется только обращение."""
    greeting = f'Здравствуйте, {company_name}!' if company_name else 'Здравствуйте!'
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <tr><td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:28px 32px;">
    <div style="color:#fff;font-size:22px;font-weight:bold;">Учисьпро.рф</div>
    <div style="color:#e9d5ff;font-size:14px;margin-top:4px;">Платформа автоматизации обучения</div>
  </td></tr>
  <tr><td style="padding:32px;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 14px;">{greeting}</p>
    <p style="margin:0 0 14px;">Меня зовут Максим, я представитель компании <b>МАТ-Лабс</b>. И у меня есть отличное предложение о сотрудничестве.</p>
    <p style="margin:0 0 14px;">У нас есть продукт <b>«Учисьпро.рф»</b>, который автоматизирует рутину, чтобы вы фокусировались на качестве обучения.</p>
    <p style="margin:0 0 14px;">Если вы ведёте индивидуальные или групповые занятия и чувствуете, что «тонете» в однотипных вопросах, проверке работ и отчётах для родителей — посмотрите на «Учисьпро.рф». Это не просто библиотека курсов, а технологичный инструмент, который закрывает самые трудозатратные задачи репетитора и онлайн-школы.</p>
    <p style="margin:18px 0 10px;font-weight:bold;">Вот что реально экономит часы вашей работы:</p>
    <p style="margin:0 0 12px;">✅ <b>Голосовой ИИ-помощник 24/7.</b> Ученик голосом задаёт вопрос — ИИ разбирает типовую ошибку, показывает правило и даёт 2–3 похожих примера. Закрывает 70–80% повторяющихся вопросов без вашего участия.</p>
    <p style="margin:0 0 12px;">✅ <b>Адаптивные учебные маршруты.</b> Система сама определяет пробелы по истории ответов и строит индивидуальный путь: пропускает освоенные темы и точечно отрабатывает слабые места.</p>
    <p style="margin:0 0 12px;">✅ <b>Разбор ошибок с классификацией.</b> Не просто «неверно», а тип ошибки + мини-разбор + подборка заданий на отработку.</p>
    <p style="margin:0 0 12px;">✅ <b>Дашборд прогресса.</b> Вы и родители видите динамику. Отчёт формируется автоматически — не нужно собирать цифры вручную.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f5f3ff;border-radius:10px;">
      <tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;">
        💡 <b>Для репетиторов:</b> бесплатный пилот на 2 недели для группы до 30 учеников, персональная настройка под предмет (ЕГЭ/ОГЭ, углублённая подготовка, школьные темы).<br><br>
        💡 <b>Для онлайн-школ:</b> API и выгрузки, чтобы встроить платформу в ваши процессы, и персональный план внедрения.
      </td></tr>
    </table>
    <p style="margin:0 0 14px;">Мы не продаём подписку «вслепую»: цель пилота — показать измеримые эффекты именно в ваших группах — сколько типовых вопросов закрыл ИИ, как изменилось время куратора на проверку, выросла ли доходимость и скорость закрытия пробелов.</p>
    <p style="margin:0 0 20px;">👉 Если интересно — ответьте на это письмо словом <b>«пилот»</b>. Пришлю доступ, короткий план запуска и примеры отчётов.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#6d28d9;border-radius:8px;">
      <a href="https://учисьпро.рф" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">Открыть Учисьпро.рф</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">С уважением,<br><b style="color:#1f2937;">Максим Тюрин</b>, МАТ-Лабс<br>Тел.: +7 927 748 6868<br>Email: maksT77@yandex.ru</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


def is_education(prospect: dict) -> bool:
    """Похожа ли компания на онлайн-школу/репетитора по названию и отрасли."""
    text = ' '.join([
        str(prospect.get('company_name') or ''),
        str(prospect.get('industry') or ''),
        str(prospect.get('description') or ''),
    ]).lower()
    return any(kw in text for kw in EDU_KEYWORDS)


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


def auth_check(event) -> bool:
    """Пропускает запрос при валидном токене админки (HMAC на ADMIN_TOKEN_SECRET)
    или при верном X-Cron-Secret (вызов из ночного cron-runner)."""
    headers = event.get('headers') or {}

    # 1. Внутренний вызов из cron-runner
    cron_secret = os.environ.get('CRON_SECRET', '')
    cron_hdr = headers.get('x-cron-secret') or headers.get('X-Cron-Secret') or ''
    if cron_secret and cron_hdr and hmac.compare_digest(cron_hdr, cron_secret):
        return True

    # 2. Сессионный токен админки
    token = headers.get('x-session-token') or headers.get('X-Session-Token') or ''
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw_token, sig = token.rsplit('.', 1)
    expected_sig = hmac.new(secret.encode(), raw_token.encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected_sig)


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


EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')


def clean_email(raw: str) -> str:
    """Возвращает валидный email или '' если адрес битый.
    Если в строке несколько адресов через пробел/запятую — берёт первый корректный."""
    if not raw:
        return ''
    for chunk in re.split(r'[\s,;]+', raw.strip()):
        c = chunk.strip().strip('<>').lower()
        if EMAIL_RE.match(c):
            return c
    return ''


def send_via_yandex(to_email: str, to_name: str, subject: str, body_html: str, server=None) -> dict:
    """Отправляет письмо клиенту с maksT77@yandex.ru через SMTP Яндекса.
    Если передан открытый server — переиспользует соединение (для пакетной рассылки)."""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = formataddr((SENDER_NAME_MAKST, SENDER_EMAIL_MAKST))
    msg['To'] = formataddr((to_name, to_email)) if to_name else to_email
    msg['Reply-To'] = SENDER_EMAIL_MAKST
    msg.attach(MIMEText(body_html, 'html', 'utf-8'))

    if server is not None:
        server.sendmail(SENDER_EMAIL_MAKST, [to_email], msg.as_bytes())
    else:
        smtp_password = os.environ.get('SMTP_PASSWORD_MAKST', '')
        if not smtp_password:
            raise ValueError('Секрет SMTP_PASSWORD_MAKST не задан')
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=25) as s:
            s.login(SENDER_EMAIL_MAKST, smtp_password)
            s.sendmail(SENDER_EMAIL_MAKST, [to_email], msg.as_bytes())

    print(f"[auto-emailer] Yandex SMTP sent from={SENDER_EMAIL_MAKST} to={to_email}")
    return {'success': True, 'from': SENDER_EMAIL_MAKST, 'to': to_email}


def open_smtp():
    """Открывает авторизованное SMTP-соединение с Яндексом для пакетной отправки."""
    smtp_password = os.environ.get('SMTP_PASSWORD_MAKST', '')
    if not smtp_password:
        raise ValueError('Секрет SMTP_PASSWORD_MAKST не задан')
    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=25)
    server.login(SENDER_EMAIL_MAKST, smtp_password)
    return server


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


def send_email(to_email: str, to_name: str, subject: str, body_html: str, server=None) -> dict:
    """Унифицированная отправка: сначала Unisender Go (лучше доходит),
    при недоступности/отказе — откат на Yandex SMTP.
    Возвращает {'provider': 'unisender'|'yandex', 'status': 'sent'|'failed'}."""
    # 1) Пробуем Unisender Go, если задан ключ
    if os.environ.get('UNISENDER_API_KEY'):
        try:
            res = send_unisender(to_email, to_name, subject, body_html)
            failed = (res or {}).get('failed_emails') or {}
            if to_email in failed:
                raise ValueError(f"Unisender отклонил адрес: {failed[to_email]}")
            print(f"[auto-emailer] send_email OK via unisender to={to_email}")
            return {'provider': 'unisender', 'status': 'sent'}
        except Exception as e:
            print(f"[auto-emailer] Unisender failed, fallback to Yandex: {e}")

    # 2) Откат на Yandex SMTP
    send_via_yandex(to_email, to_name, subject, body_html, server=server)
    return {'provider': 'yandex', 'status': 'sent'}


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

            # 3. Отправка письма клиенту с maksT77@yandex.ru
            send_via_yandex(to_email, prospect.get('company_name', ''), subject, body_html)

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
    details = []

    for idx, pid in enumerate(ids):
        if idx > 0:
            time.sleep(1)  # пауза между письмами, чтобы Яндекс не блокировал за частоту
        result = action_send_intro({'prospect_id': pid})
        body_data = {}
        try:
            body_data = json.loads(result.get('body', '{}'))
        except Exception:
            pass
        if result.get('statusCode', 500) == 200 and body_data.get('ok'):
            sent += 1
            details.append({
                'prospect_id': pid, 'ok': True,
                'sent_to': body_data.get('sent_to', ''),
                'subject': body_data.get('subject', ''),
            })
        else:
            err_msg = body_data.get('error', 'unknown error')
            errors.append({'prospect_id': pid, 'error': err_msg})
            details.append({'prospect_id': pid, 'ok': False, 'error': err_msg})

    print(f"[auto-emailer] batch_send done: sent={sent} errors={len(errors)} total={len(ids)}")
    return json_resp({'ok': True, 'sent': sent, 'total': len(ids), 'errors': errors, 'details': details})


def _log_email_sent(cur, prospect_id, subject, to_email, source='', provider='', status='sent'):
    """Пишет отправку письма в активности и воронку, фиксирует провайдера и статус доставки."""
    now_utc = datetime.now(timezone.utc)
    cur.execute(
        f"""UPDATE {S}.prospects
            SET auto_email_sent = TRUE, auto_email_sent_at = %s,
                email_delivery_status = %s, email_delivery_provider = %s
            WHERE id = %s""",
        (now_utc, status, provider, prospect_id),
    )
    cur.execute(
        f"INSERT INTO {S}.prospect_activities (prospect_id, activity_type, content, created_at) VALUES (%s, %s, %s, %s)",
        (prospect_id, 'email_sent', subject, now_utc),
    )
    meta = json.dumps({'subject': subject, 'sent_to': to_email})
    cur.execute(
        f"INSERT INTO {S}.funnel_events (event_type, prospect_id, source, meta, created_at) VALUES (%s, %s, %s, %s::jsonb, %s)",
        ('email_sent', prospect_id, source or '', meta, now_utc),
    )


def action_send_uchispro(body: dict) -> dict:
    """Отправляет фиксированное письмо про Учисьпро.рф одному лиду по ID."""
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
            to_email = clean_email(prospect.get('email') or '')
            if not to_email:
                return err('У лида нет корректного email')

            subject = UCHISPRO_SUBJECT
            html = build_uchispro_html(prospect.get('company_name') or '')
            r = send_email(to_email, prospect.get('company_name') or '', subject, html)

            _log_email_sent(cur, prospect_id, subject, to_email, prospect.get('source'), r['provider'], r['status'])
            conn.commit()
        return json_resp({'ok': True, 'subject': subject, 'sent_to': to_email, 'provider': r['provider']})
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print(f"[auto-emailer] send_uchispro error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_batch_uchispro(body: dict) -> dict:
    """Рассылает письмо про Учисьпро.рф онлайн-школам/репетиторам (по нише), до 30 за раз.
    Одно SMTP-соединение на весь пакет — быстро и без таймаутов."""
    limit = int(body.get('limit') or 30)
    limit = max(1, min(limit, 50))
    conn = None
    server = None
    sent = 0
    skipped = 0
    details = []
    try:
        conn = get_db()
        # Берём кандидатов: есть email, ещё не отправляли
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, company_name, email, industry, description, source
                FROM {S}.prospects
                WHERE (auto_email_sent IS NULL OR auto_email_sent = FALSE)
                  AND email IS NOT NULL AND email <> ''
                ORDER BY id
                LIMIT 300
                """,
            )
            cols = [d[0] for d in cur.description]
            candidates = [dict(zip(cols, r)) for r in cur.fetchall()]

        # Фильтруем только образование + валидный email
        targets = []
        for p in candidates:
            if not is_education(p):
                continue
            em = clean_email(p.get('email') or '')
            if not em:
                continue
            targets.append((p, em))
            if len(targets) >= limit:
                break

        if not targets:
            return json_resp({'ok': True, 'sent': 0, 'skipped': 0, 'details': [],
                              'message': 'Онлайн-школ с корректным email и без письма не найдено'})

        use_smtp = not os.environ.get('UNISENDER_API_KEY')
        server = open_smtp() if use_smtp else None
        for idx, (p, em) in enumerate(targets):
            if idx > 0:
                time.sleep(0.4)
            pid = p['id']
            subject = UCHISPRO_SUBJECT
            try:
                html = build_uchispro_html(p.get('company_name') or '')
                r = send_email(em, p.get('company_name') or '', subject, html, server=server)
                with conn.cursor() as cur:
                    _log_email_sent(cur, pid, subject, em, p.get('source'), r['provider'], r['status'])
                conn.commit()
                sent += 1
                details.append({'prospect_id': pid, 'ok': True, 'sent_to': em, 'provider': r['provider'],
                                'company': p.get('company_name') or ''})
            except Exception as e:
                conn.rollback()
                skipped += 1
                details.append({'prospect_id': pid, 'ok': False, 'error': str(e)[:120],
                                'company': p.get('company_name') or ''})
                print(f"[auto-emailer] uchispro fail id={pid}: {e}")

        print(f"[auto-emailer] batch_uchispro done: sent={sent} skipped={skipped}")
        return json_resp({'ok': True, 'sent': sent, 'skipped': skipped,
                          'total': len(targets), 'details': details})
    except Exception as e:
        print(f"[auto-emailer] batch_uchispro error: {e}")
        return err(str(e), 500)
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
        if conn:
            conn.close()


def action_segments_stats(body: dict) -> dict:
    """Возвращает группы клиентов с числом компаний и предложением боль→решение."""
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT company_name, industry, description, email,
                       COALESCE(auto_email_sent, FALSE) AS sent
                FROM {S}.prospects
                WHERE email IS NOT NULL AND email <> ''
                """,
            )
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        counts = {k: {'total': 0, 'not_sent': 0} for k in SEGMENT_ORDER}
        for p in rows:
            key = match_segment(p)
            if not key:
                continue
            counts[key]['total'] += 1
            if not p['sent']:
                counts[key]['not_sent'] += 1

        segments = []
        for key in SEGMENT_ORDER:
            seg = SEGMENTS[key]
            segments.append({
                'key': key,
                'title': seg['title'],
                'product': seg['product'],
                'subject': seg['subject'],
                'total': counts[key]['total'],
                'not_sent': counts[key]['not_sent'],
                'pains': [{'pain': p, 'solution': s} for p, s in seg['pains']],
            })
        return json_resp({'ok': True, 'segments': segments})
    except Exception as e:
        print(f"[auto-emailer] segments_stats error: {e}")
        return err(str(e), 500)
    finally:
        if conn:
            conn.close()


def action_batch_segment(body: dict) -> dict:
    """Рассылает письмо «боль→решение» компаниям выбранного сегмента (до 30 за раз)."""
    segment_key = body.get('segment')
    if segment_key not in SEGMENTS:
        return err(f'Неизвестный сегмент: {segment_key!r}')
    limit = int(body.get('limit') or 30)
    limit = max(1, min(limit, 50))

    conn = None
    server = None
    sent = 0
    skipped = 0
    details = []
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, company_name, email, industry, description, source
                FROM {S}.prospects
                WHERE (auto_email_sent IS NULL OR auto_email_sent = FALSE)
                  AND email IS NOT NULL AND email <> ''
                ORDER BY id
                LIMIT 500
                """,
            )
            cols = [d[0] for d in cur.description]
            candidates = [dict(zip(cols, r)) for r in cur.fetchall()]

        targets = []
        for p in candidates:
            if match_segment(p) != segment_key:
                continue
            em = clean_email(p.get('email') or '')
            if not em:
                continue
            targets.append((p, em))
            if len(targets) >= limit:
                break

        if not targets:
            return json_resp({'ok': True, 'sent': 0, 'skipped': 0, 'details': [],
                              'message': 'Компаний этого сегмента с корректным email и без письма не найдено'})

        subject = SEGMENTS[segment_key]['subject']
        use_smtp = not os.environ.get('UNISENDER_API_KEY')
        server = open_smtp() if use_smtp else None
        for idx, (p, em) in enumerate(targets):
            if idx > 0:
                time.sleep(0.4)
            pid = p['id']
            try:
                html = build_segment_html(segment_key, p.get('company_name') or '')
                r = send_email(em, p.get('company_name') or '', subject, html, server=server)
                with conn.cursor() as cur:
                    _log_email_sent(cur, pid, subject, em, p.get('source'), r['provider'], r['status'])
                conn.commit()
                sent += 1
                details.append({'prospect_id': pid, 'ok': True, 'sent_to': em,
                                'company': p.get('company_name') or ''})
            except Exception as e:
                conn.rollback()
                skipped += 1
                details.append({'prospect_id': pid, 'ok': False, 'error': str(e)[:120],
                                'company': p.get('company_name') or ''})
                print(f"[auto-emailer] segment {segment_key} fail id={pid}: {e}")

        print(f"[auto-emailer] batch_segment {segment_key} done: sent={sent} skipped={skipped}")
        return json_resp({'ok': True, 'sent': sent, 'skipped': skipped,
                          'total': len(targets), 'details': details})
    except Exception as e:
        print(f"[auto-emailer] batch_segment error: {e}")
        return err(str(e), 500)
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
        if conn:
            conn.close()


def action_test_email(body: dict) -> dict:
    """Отправляет тестовое письмо на указанный адрес и возвращает провайдера."""
    to_email = clean_email(body.get('email') or '')
    if not to_email:
        return err('Укажите корректный email для теста')
    subject = 'Тест доставки — МАТ-Лабс CRM'
    html = """<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#1f2937;">
<h2 style="color:#6d28d9;">Тестовое письмо доставлено ✅</h2>
<p>Это проверочное письмо из CRM МАТ-Лабс. Если вы его видите — отправка работает.</p>
<p style="color:#6b7280;font-size:13px;">Отправлено автоматически системой рассылки.</p>
</body></html>"""
    try:
        r = send_email(to_email, '', subject, html)
        return json_resp({'ok': True, 'sent_to': to_email,
                          'provider': r['provider'], 'status': r['status']})
    except Exception as e:
        print(f"[auto-emailer] test_email error: {e}")
        return err(f'Не удалось отправить: {e}', 500)


def action_sent_log(body: dict) -> dict:
    """Возвращает журнал отправленных писем: кому, тема, когда."""
    limit = int(body.get('limit') or 50)
    limit = max(1, min(limit, 200))
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT a.id, a.content AS subject, a.created_at,
                       p.id AS prospect_id, p.company_name, p.email
                FROM {S}.prospect_activities a
                JOIN {S}.prospects p ON p.id = a.prospect_id
                WHERE a.activity_type = 'email_sent'
                ORDER BY a.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            items = [dict(zip(cols, r)) for r in rows]

            cur.execute(
                f"SELECT COUNT(*) FROM {S}.prospect_activities WHERE activity_type = 'email_sent'"
            )
            total = cur.fetchone()[0]
        return json_resp({'ok': True, 'total': total, 'items': items})
    except Exception as e:
        print(f"[auto-emailer] sent_log error: {e}")
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

    if not auth_check(event):
        return err('Не авторизован', 401)

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
    elif action == 'send_uchispro':
        return action_send_uchispro(body)
    elif action == 'batch_uchispro':
        return action_batch_uchispro(body)
    elif action == 'segments_stats':
        return action_segments_stats(body)
    elif action == 'batch_segment':
        return action_batch_segment(body)
    elif action == 'test_email':
        return action_test_email(body)
    elif action == 'sent_log':
        return action_sent_log(body)
    else:
        return err(f'Неизвестный action: {action!r}', 400)