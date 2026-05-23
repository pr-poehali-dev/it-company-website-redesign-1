"""
Консультант МАТ-Лабс — AI-ассистент для выявления потребностей клиентов
и формирования технического задания. Отправляет ТЗ администратору на почту.

Actions:
- chat: Общение с консультантом
- send_brief: Отправить сформированное ТЗ на почту администратора
"""

import json
import os
import re
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import requests
import psycopg2
from psycopg2.extras import Json

PROVIDER_BASE_URL = "https://api.polza.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o"
ADMIN_EMAIL = "atyurin2@yandex.ru"
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465

SYSTEM_PROMPT = """Ты — Алекс, профессиональный IT-консультант компании МАТ-Лабс (ООО МАТ-Лабс). Твоя задача — вежливо и профессионально общаться с потенциальными клиентами, выявлять их потребности и в итоге сформировать чёткое техническое задание.

## О компании МАТ-Лабс
МАТ-Лабс — IT-компания полного цикла. Мы разрабатываем цифровые продукты мирового уровня для стартапов, малого и крупного бизнеса.

**Наши услуги:**
1. Разработка ПО — веб и мобильные приложения от идеи до запуска
2. Облачные решения — миграция в облако, DevOps, Kubernetes, CI/CD
3. ИИ и Machine Learning — нейросети, компьютерное зрение, NLP, предиктивная аналитика
4. Кибербезопасность — аудит, пентесты, защита данных, соответствие 152-ФЗ
5. Аналитика данных — BI-системы, дашборды, ETL, Data Warehouse
6. Мобильные приложения — iOS, Android, React Native, Flutter

**Примеры наших проектов:**
- AVANGARD — AI-эксперт по дизайну и ремонту (avangard-ai.ru)
- AVT — платформа автоматизации клиентов с AI-звонками и CRM (avt-63.ru)
- RoomScan AI — AI-сканирование помещений для планировки (roomscan-ai.ru)
- SoloFly — платформа для пилотов-любителей (solofly.ru)
- БухКонтроль — бухгалтерский аутсорсинг для агробизнеса (bk-63.ru)
- УЧИСЬПРО — ИИ-репетитор с голосовым ассистентом для подготовки к экзаменам на 90+ баллов (учисьпро.рф)

**Команда:** 50+ специалистов, 200+ реализованных проектов, 98% довольных клиентов.
**Контакты:** +7 (927) 748-68-68, Москва, Башня Федерация

## Твоя стратегия разговора
1. Представься и поприветствуй клиента
2. Узнай, чем занимается бизнес клиента
3. Выясни, какую задачу нужно решить / какой продукт создать
4. Уточни целевую аудиторию и ключевые функции
5. Спроси про сроки и примерный бюджет
6. Узнай контактные данные: имя, компания, телефон/email
7. Когда соберёшь достаточно информации — предложи сформировать ТЗ

## Правила общения
- Говори на русском языке, дружелюбно и профессионально
- Задавай по 1-2 вопроса за раз, не перегружай клиента
- Не выдумывай цены — скажи, что менеджер уточнит стоимость после изучения ТЗ
- Если клиент не знает что-то — помоги сформулировать
- ⚠️ КРИТИЧНО: ОБЯЗАТЕЛЬНО получи от клиента email ИЛИ телефон до отправки ТЗ. Без контактов менеджер не сможет связаться. Если клиент пытается отправить ТЗ без контактов — вежливо попроси email или телефон.
- Когда уверен, что собрал достаточно данных для ТЗ И есть контакты (email или телефон), заверши сообщение фразой: [ГОТОВ К ОТПРАВКЕ ТЗ]

## Формат ТЗ (когда будешь его составлять)
Структурируй ТЗ чётко по разделам:
- Контактные данные клиента
- Описание бизнеса
- Цель проекта
- Целевая аудитория
- Основной функционал
- Дополнительные пожелания
- Сроки
- Бюджет
- Примечания
"""

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def cors_response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def chat_with_gpt(messages: list) -> str:
    api_key = os.environ.get("POLZA_AI_API_KEY", "")
    if not api_key:
        raise ValueError("POLZA_AI_API_KEY не настроен")

    all_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    response = requests.post(
        f"{PROVIDER_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": DEFAULT_MODEL, "messages": all_messages, "temperature": 0.7, "max_tokens": 1500},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def generate_brief(messages: list) -> str:
    api_key = os.environ.get("POLZA_AI_API_KEY", "")
    if not api_key:
        raise ValueError("POLZA_AI_API_KEY не настроен")

    brief_prompt = """На основе диалога с клиентом сформируй подробное техническое задание в следующем формате:

# ТЕХНИЧЕСКОЕ ЗАДАНИЕ
**Дата:** [сегодняшняя дата]

## 1. Контактные данные клиента
- Имя: 
- Компания: 
- Телефон/Email: 

## 2. Описание бизнеса клиента
[кратко]

## 3. Цель проекта
[что нужно создать и зачем]

## 4. Целевая аудитория
[кто будет пользоваться продуктом]

## 5. Основной функционал
[список ключевых возможностей]

## 6. Дополнительные пожелания
[интеграции, дизайн, особые требования]

## 7. Сроки
[желаемые сроки]

## 8. Бюджет
[обозначенный бюджет или "не указан"]

## 9. Примечания
[любая другая важная информация из диалога]

Заполни все разделы на основе диалога. Если информация не была упомянута — напиши "Не уточнено"."""

    all_messages = [{"role": "system", "content": brief_prompt}] + messages + [
        {"role": "user", "content": "Сформируй техническое задание на основе нашего диалога."}
    ]

    response = requests.post(
        f"{PROVIDER_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": DEFAULT_MODEL, "messages": all_messages, "temperature": 0.3, "max_tokens": 2000},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def send_email(brief_text: str, client_name: str) -> None:
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    if not smtp_password:
        raise ValueError("SMTP_PASSWORD не настроен")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Новое ТЗ от клиента: {client_name}"
    msg["From"] = ADMIN_EMAIL
    msg["To"] = ADMIN_EMAIL

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1a237e, #0d47a1); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">МАТ-Лабс — Новое техническое задание</h1>
    </div>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; white-space: pre-wrap; line-height: 1.6;">
{brief_text}
    </div>
    <p style="color: #999; font-size: 12px; margin-top: 10px;">Сообщение сформировано AI-консультантом МАТ-Лабс</p>
    </body></html>
    """

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(ADMIN_EMAIL, smtp_password)
        server.sendmail(ADMIN_EMAIL, ADMIN_EMAIL, msg.as_bytes())


EMAIL_RE = re.compile(r"[\w\.\-+]+@[\w\.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+7|7|8)[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d[\s\-\(\)]*\d")


def extract_contacts(messages: list) -> dict:
    """Достаёт email/телефон из всех сообщений пользователя в диалоге."""
    text = "\n".join(m.get("content", "") for m in messages if m.get("role") == "user")
    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)
    return {
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
    }


def db_connect():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def upsert_chat(session_id: str, messages: list, contacts: dict,
                client_name: str, client_company: str,
                brief: str, is_sent: bool, ip: str, user_agent: str) -> None:
    """Сохраняет или обновляет диалог в БД (даже неполный — чтобы не терять контакты)."""
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM consultant_chats WHERE session_id = %s", (session_id,))
    row = cur.fetchone()
    if row:
        cur.execute(
            """UPDATE consultant_chats
               SET messages = %s, client_name = COALESCE(NULLIF(%s,''), client_name),
                   client_email = COALESCE(%s, client_email),
                   client_phone = COALESCE(%s, client_phone),
                   client_company = COALESCE(NULLIF(%s,''), client_company),
                   brief = COALESCE(%s, brief),
                   is_sent = is_sent OR %s,
                   updated_at = CURRENT_TIMESTAMP
               WHERE session_id = %s""",
            (Json(messages), client_name or "", contacts.get("email"),
             contacts.get("phone"), client_company or "", brief, is_sent, session_id)
        )
    else:
        cur.execute(
            """INSERT INTO consultant_chats
               (session_id, client_name, client_email, client_phone, client_company,
                messages, brief, is_sent, ip, user_agent)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (session_id, client_name or None, contacts.get("email"),
             contacts.get("phone"), client_company or None,
             Json(messages), brief, is_sent, ip, user_agent)
        )
    conn.commit()
    cur.close()
    conn.close()


def handler(event: dict, context) -> dict:
    """Консультант МАТ-Лабс — AI-чат для выявления потребностей и формирования ТЗ."""
    method = event.get("httpMethod", "POST")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    params = event.get("queryStringParameters") or {}
    action = params.get("action", "chat")

    raw_body = event.get("body", "{}")
    try:
        body = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        return cors_response(400, {"error": "Неверный JSON"})

    messages = body.get("messages", [])
    session_id = body.get("session_id") or secrets.token_hex(16)
    client_name = (body.get("client_name") or "").strip()
    client_company = (body.get("client_company") or "").strip()
    contacts = extract_contacts(messages)

    headers = event.get("headers") or {}
    ip = ((event.get("requestContext") or {}).get("identity") or {}).get("sourceIp", "")
    user_agent = headers.get("User-Agent") or headers.get("user-agent") or ""

    if action == "chat":
        if not messages:
            return cors_response(400, {"error": "messages обязателен"})
        try:
            reply = chat_with_gpt(messages)
            ready_to_send = "[ГОТОВ К ОТПРАВКЕ ТЗ]" in reply
            clean_reply = reply.replace("[ГОТОВ К ОТПРАВКЕ ТЗ]", "").strip()

            full_messages = messages + [{"role": "assistant", "content": clean_reply}]
            try:
                upsert_chat(session_id, full_messages, contacts, client_name,
                            client_company, None, False, ip, user_agent)
            except Exception:
                pass

            return cors_response(200, {
                "success": True,
                "content": clean_reply,
                "ready_to_send": ready_to_send,
                "session_id": session_id,
                "has_contacts": bool(contacts.get("email") or contacts.get("phone")),
            })
        except Exception as e:
            return cors_response(500, {"error": str(e)})

    elif action == "send_brief":
        if not messages:
            return cors_response(400, {"error": "messages обязателен"})

        if not contacts.get("email") and not contacts.get("phone"):
            return cors_response(400, {
                "error": "Для отправки ТЗ нужно оставить email или телефон. Напишите их в чате — и я отправлю заявку.",
                "need_contacts": True,
            })

        try:
            brief = generate_brief(messages)
            display_name = client_name or "Неизвестный клиент"
            send_email(brief, display_name)

            try:
                upsert_chat(session_id, messages, contacts, client_name,
                            client_company, brief, True, ip, user_agent)
            except Exception:
                pass

            return cors_response(200, {
                "success": True,
                "message": "ТЗ успешно отправлено администратору",
                "brief": brief,
                "session_id": session_id,
            })
        except Exception as e:
            return cors_response(500, {"error": str(e)})

    else:
        return cors_response(400, {"error": f"Неизвестный action: {action}"})