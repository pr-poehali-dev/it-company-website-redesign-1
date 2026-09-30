"""
Форма заявки — принимает данные с сайта, сохраняет в БД и отправляет уведомление на почту через Unisender Go.
"""

import json
import os
import smtplib
import requests
import psycopg2
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

UNISENDER_GO_API_URL = "https://go2.unisender.ru/ru/transactional/api/v1"
NOTIFY_EMAIL = "maksT77@yandex.ru"
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }


def response(status, body):
    return {"statusCode": status, "headers": cors_headers(), "body": json.dumps(body, ensure_ascii=False)}


def send_via_unisender(subject, html, api_key, sender_email, sender_name):
    """Отправка через Unisender Go. Возвращает True при успехе."""
    r = requests.post(
        f"{UNISENDER_GO_API_URL}/email/send.json",
        headers={"Content-Type": "application/json", "X-API-KEY": api_key},
        json={"message": {
            "recipients": [{"email": NOTIFY_EMAIL}],
            "from_email": sender_email,
            "from_name": sender_name,
            "subject": subject,
            "body": {"html": html},
            "track_links": 0,
            "track_read": 0,
        }},
        timeout=15,
    ).json()
    if r.get("status") == "error":
        raise RuntimeError(r.get("message", "Unisender error"))
    return True


def send_via_smtp(subject, html):
    """Резервная отправка через Яндекс SMTP. Возвращает True при успехе."""
    password = os.environ.get("SMTP_PASSWORD_MAKST", "")
    if not password:
        raise RuntimeError("SMTP_PASSWORD_MAKST не задан")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("МАТ-Лабс", NOTIFY_EMAIL))
    msg["To"] = NOTIFY_EMAIL
    msg.attach(MIMEText(html, "html", "utf-8"))
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.login(NOTIFY_EMAIL, password)
        server.sendmail(NOTIFY_EMAIL, NOTIFY_EMAIL, msg.as_bytes())
    return True


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта, сохраняет в БД и отправляет уведомление на почту менеджера."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    body = json.loads(event.get("body") or "{}")

    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    phone = body.get("phone", "").strip()
    company = body.get("company", "").strip()
    message = body.get("message", "").strip()

    if not name or not email or not phone or not message:
        return response(400, {"error": "Заполните обязательные поля: Имя, Email, Телефон, Сообщение"})

    if "@" not in email:
        return response(400, {"error": "Некорректный email"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO contact_requests (name, email, phone, company, message) VALUES (%s, %s, %s, %s, %s)",
        (name, email, phone, company or None, message)
    )
    conn.commit()
    cur.close()
    conn.close()

    api_key = os.environ.get("UNISENDER_API_KEY", "")
    sender_email = os.environ.get("UNISENDER_SENDER_EMAIL", "info@mat-labs.ru")
    sender_name = os.environ.get("UNISENDER_SENDER_NAME", "МАТ-Лабс")

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
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Телефон</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">{phone}</td></tr>
        {"<tr><td style='padding: 10px 0; border-bottom: 1px solid #eee; color: #666;'>Компания</td><td style='padding: 10px 0; border-bottom: 1px solid #eee;'>" + company + "</td></tr>" if company else ""}
        <tr><td style="padding: 10px 0; color: #666; vertical-align: top;">Сообщение</td><td style="padding: 10px 0; white-space: pre-line;">{message}</td></tr>
      </table>
    </div>
    """

    subject = f"Новая заявка от {name} | {phone}"
    errors = []
    sent_via = None

    if api_key:
        try:
            send_via_unisender(subject, html, api_key, sender_email, sender_name)
            sent_via = "unisender"
        except Exception as e:
            errors.append(f"unisender: {e}")
            print(f"[contact-form] Unisender не сработал, пробую SMTP: {e}")

    if not sent_via:
        try:
            send_via_smtp(subject, html)
            sent_via = "smtp"
        except Exception as e:
            errors.append(f"smtp: {e}")
            print(f"[contact-form] SMTP не сработал: {e}")

    if not sent_via:
        print(f"[contact-form] ВНИМАНИЕ: заявка сохранена в БД, но письмо не отправлено. {'; '.join(errors)}")

    return response(200, {"success": True, "notified": bool(sent_via)})