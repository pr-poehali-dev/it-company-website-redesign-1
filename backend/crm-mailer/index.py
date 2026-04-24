"""
CRM Mailer — отправка писем и КП из CRM через SMTP Яндекс.Почты.
Использует maksT77@yandex.ru как отправителя.
"""
import json
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Authorization',
}

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465
# Яндекс требует совпадения логина и адреса отправителя (регистронезависимо)
# Адрес должен точно совпадать с тем, под которым создавался пароль приложения
FROM_EMAIL = 'makst77@yandex.ru'   # строчными — Яндекс сравнивает именно так
FROM_EMAIL_DISPLAY = 'maksT77@yandex.ru'
FROM_NAME = 'Тюрин Максим | MAT Labs'


def send_smtp(to_email: str, to_name: str, subject: str, body_html: str) -> dict:
    """Отправляет письмо через SMTP Яндекса."""
    smtp_password = os.environ.get('SMTP_PASSWORD_MAKST', '')
    if not smtp_password:
        raise ValueError('Секрет SMTP_PASSWORD_MAKST не задан — добавьте его в настройках проекта')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    # From и логин должны совпадать — используем строчный адрес для login() и sendmail()
    msg['From'] = f'{FROM_NAME} <{FROM_EMAIL}>'
    msg['To'] = f'{to_name} <{to_email}>' if to_name else to_email
    msg['Reply-To'] = FROM_EMAIL

    msg.attach(MIMEText(body_html, 'html', 'utf-8'))

    print(f"[crm-mailer] connecting smtp login={FROM_EMAIL}")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(FROM_EMAIL, smtp_password)
        server.sendmail(FROM_EMAIL, to_email, msg.as_bytes())

    return {'success': True, 'from': FROM_EMAIL_DISPLAY, 'to': to_email}


def handler(event: dict, context) -> dict:
    """Отправка писем и КП из CRM через SMTP Яндекс (maksT77@yandex.ru)."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if method != 'POST':
        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            pass

    to_email = (body.get('to_email') or '').strip()
    to_name = (body.get('to_name') or '').strip()
    subject = (body.get('subject') or 'Коммерческое предложение от MAT Labs').strip()
    body_html = body.get('body_html') or ''

    h = {**CORS_HEADERS, 'Content-Type': 'application/json'}

    if not to_email:
        return {'statusCode': 400, 'headers': h, 'body': json.dumps({'success': False, 'error': 'Укажите email получателя'}, ensure_ascii=False)}

    if not body_html:
        return {'statusCode': 400, 'headers': h, 'body': json.dumps({'success': False, 'error': 'Пустое тело письма'}, ensure_ascii=False)}

    try:
        result = send_smtp(to_email, to_name, subject, body_html)
        print(f"[crm-mailer] sent to={to_email} subject={subject[:50]}")
        return {'statusCode': 200, 'headers': h, 'body': json.dumps(result, ensure_ascii=False)}
    except Exception as e:
        print(f"[crm-mailer] error: {e}")
        return {'statusCode': 500, 'headers': h, 'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}