"""
Форма заявки — принимает данные с сайта, сохраняет в БД и отправляет уведомление на почту через Unisender Go.
"""

import json
import os
import re
from html import escape
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

    def clean(key, limit):
        return str(body.get(key) or "").strip()[:limit]

    if clean("website", 200):
        return response(200, {"success": True, "notified": False})

    source = clean("source", 50) or "contacts"

    if source == "turnkey":
        return handle_turnkey(body, clean)

    name = clean("name", 255)
    email = clean("email", 255)
    phone = clean("phone", 100)
    company = clean("company", 255)
    message = clean("message", 5000)

    if not name or not email or not phone or not message:
        return response(400, {"error": "Заполните обязательные поля: Имя, Email, Телефон, Сообщение"})

    if "@" not in email:
        return response(400, {"error": "Некорректный email"})

    save_request(name, email, phone, company, message, source, None)

    name, email, phone, company, message = map(escape, (name, email, phone, company, message))

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


def save_request(name, email, phone, company, message, source, details):
    """Сохраняет заявку в БД."""
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO contact_requests (name, email, phone, company, message, source, details) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (name, email, phone, company or None, message, source, details),
        )
        req_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return req_id
    finally:
        conn.close()


def notify(subject, html):
    """Отправляет письмо менеджеру: Unisender, при сбое — SMTP. Возвращает канал или None."""
    api_key = os.environ.get("UNISENDER_API_KEY", "")
    sender_email = os.environ.get("UNISENDER_SENDER_EMAIL", "info@mat-labs.ru")
    sender_name = os.environ.get("UNISENDER_SENDER_NAME", "МАТ-Лабс")
    errors = []
    if api_key:
        try:
            send_via_unisender(subject, html, api_key, sender_email, sender_name)
            return "unisender"
        except Exception as e:
            errors.append(f"unisender: {e}")
    try:
        send_via_smtp(subject, html)
        return "smtp"
    except Exception as e:
        errors.append(f"smtp: {e}")
    print(f"[contact-form] ВНИМАНИЕ: заявка сохранена, письмо не ушло. {'; '.join(errors)}")
    return None


PHONE_RE = re.compile(r"\d")


def handle_turnkey(body, clean):
    """Заявка «Готовый бизнес под ключ»: телефон обязателен, email по желанию."""
    name = clean("name", 255)
    phone = clean("phone", 100)
    email = clean("email", 255)
    city = clean("city", 120)
    product = clean("product", 120)
    plan = clean("plan", 120)
    budget = clean("budget", 120)
    contact_way = clean("contact_way", 60)
    comment = clean("message", 3000)

    if not name:
        return response(400, {"error": "Укажите имя", "field": "name"})
    if len(PHONE_RE.findall(phone)) < 10:
        return response(400, {"error": "Укажите телефон полностью", "field": "phone"})
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return response(400, {"error": "Проверьте email", "field": "email"})
    if not product:
        return response(400, {"error": "Выберите проект", "field": "product"})

    rows = [
        ("Проект", product),
        ("Тариф", plan),
        ("Город", city),
        ("Бюджет", budget),
        ("Как связаться", contact_way),
        ("Комментарий", comment),
    ]
    message = "\n".join(f"{k}: {v}" for k, v in rows if v) or "Заявка на готовый бизнес"
    details = json.dumps(dict(rows), ensure_ascii=False)

    req_id = save_request(name, email or "—", phone, city, message, "turnkey", details)

    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    tr = "".join(
        f"<tr><td style='padding:10px 0;border-bottom:1px solid #eee;color:#666;width:35%;vertical-align:top'>{escape(k)}</td>"
        f"<td style='padding:10px 0;border-bottom:1px solid #eee;font-weight:bold;white-space:pre-line'>{escape(v)}</td></tr>"
        for k, v in [("Имя", name), ("Телефон", phone), ("Email", email)] + rows if v
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:30px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#059669,#0891b2);padding:20px 30px;border-radius:8px;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">Готовый бизнес под ключ — заявка №{req_id}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">{now}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">{tr}</table>
      <p style="margin-top:20px;"><a href="tel:{escape(phone)}" style="background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Позвонить клиенту</a></p>
    </div>
    """
    subject = f"Бизнес под ключ: {product} — {name} | {phone}"
    sent_via = notify(subject, html)
    return response(200, {"success": True, "id": req_id, "notified": bool(sent_via)})