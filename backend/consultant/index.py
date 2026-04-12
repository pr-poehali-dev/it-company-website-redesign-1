"""
Консультант МАТ-Лабс — AI-ассистент для выявления потребностей клиентов
и формирования технического задания. Отправляет ТЗ администратору на почту.

Actions:
- chat: Общение с консультантом
- send_brief: Отправить сформированное ТЗ на почту администратора
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import requests

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
- Когда уверен, что собрал достаточно данных для ТЗ, заверши сообщение фразой: [ГОТОВ К ОТПРАВКЕ ТЗ]

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

    if action == "chat":
        if not messages:
            return cors_response(400, {"error": "messages обязателен"})
        try:
            reply = chat_with_gpt(messages)
            ready_to_send = "[ГОТОВ К ОТПРАВКЕ ТЗ]" in reply
            clean_reply = reply.replace("[ГОТОВ К ОТПРАВКЕ ТЗ]", "").strip()
            return cors_response(200, {
                "success": True,
                "content": clean_reply,
                "ready_to_send": ready_to_send,
            })
        except Exception as e:
            return cors_response(500, {"error": str(e)})

    elif action == "send_brief":
        if not messages:
            return cors_response(400, {"error": "messages обязателен"})
        try:
            brief = generate_brief(messages)
            client_name = body.get("client_name", "Неизвестный клиент")
            send_email(brief, client_name)
            return cors_response(200, {
                "success": True,
                "message": "ТЗ успешно отправлено администратору",
                "brief": brief,
            })
        except Exception as e:
            return cors_response(500, {"error": str(e)})

    else:
        return cors_response(400, {"error": f"Неизвестный action: {action}"})
