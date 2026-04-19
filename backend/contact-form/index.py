"""
Форма заявки — принимает данные с сайта и отправляет уведомление на почту через Unisender Go.
"""

import json
import os
import requests
from datetime import datetime

UNISENDER_GO_API_URL = "https://go2.unisender.ru/ru/transactional/api/v1"
NOTIFY_EMAIL = "maksT77@yandex.ru"


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }


def response(status, body):
    return {"statusCode": status, "headers": cors_headers(), "body": json.dumps(body, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта и отправляет уведомление на почту менеджера."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    body = json.loads(event.get("body") or "{}")

    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    phone = body.get("phone", "").strip()
    company = body.get("company", "").strip()
    message = body.get("message", "").strip()

    if not name or not email or not message:
        return response(400, {"error": "Заполните обязательные поля: Имя, Email, Сообщение"})

    if "@" not in email:
        return response(400, {"error": "Некорректный email"})

    api_key = os.environ.get("UNISENDER_API_KEY", "")
    sender_email = os.environ.get("UNISENDER_SENDER_EMAIL", "info@mat-labs.ru")
    sender_name = os.environ.get("UNISENDER_SENDER_NAME", "МАТ-Лабс")

    if not api_key:
        return response(500, {"error": "Email-сервис не настроен. Добавьте UNISENDER_API_KEY."})

    now = datetime.now().strftime("%d.%m.%Y %H:%M")

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 20px 30px; border-radius: 8px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Новая заявка с сайта МАТ-Лабс</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">{now}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 35%;">Имя</td><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">{name}</td></tr>
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:{email}" style="color: #7c3aed;">{email}</a></td></tr>
        {"<tr><td style='padding: 10px 0; border-bottom: 1px solid #eee; color: #666;'>Телефон</td><td style='padding: 10px 0; border-bottom: 1px solid #eee;'>" + phone + "</td></tr>" if phone else ""}
        {"<tr><td style='padding: 10px 0; border-bottom: 1px solid #eee; color: #666;'>Компания</td><td style='padding: 10px 0; border-bottom: 1px solid #eee;'>" + company + "</td></tr>" if company else ""}
        <tr><td style="padding: 10px 0; color: #666; vertical-align: top;">Сообщение</td><td style="padding: 10px 0; white-space: pre-line;">{message}</td></tr>
      </table>
    </div>
    """

    result = requests.post(
        f"{UNISENDER_GO_API_URL}/email/send.json",
        headers={"Content-Type": "application/json", "X-API-KEY": api_key},
        json={"message": {
            "recipients": [{"email": NOTIFY_EMAIL}],
            "from_email": sender_email,
            "from_name": sender_name,
            "subject": f"Новая заявка от {name}",
            "body": {"html": html},
            "track_links": 0,
            "track_read": 0,
        }},
        timeout=15,
    ).json()

    if result.get("status") == "error":
        return response(500, {"error": result.get("message", "Ошибка отправки")})

    return response(200, {"success": True})
