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
# Логин — аккаунт с настроенным паролем приложения (уже работает в consultant)
SMTP_LOGIN = 'atyurin2@yandex.ru'
# Отображаемое имя отправителя — Максим Тюрин
FROM_NAME = 'Тюрин Максим | MAT Labs'
# Reply-To — чтобы ответы клиентов приходили на рабочий адрес
REPLY_TO = 'maksT77@yandex.ru'


def send_smtp(to_email: str, to_name: str, subject: str, body_html: str) -> dict:
    """Отправляет письмо через SMTP Яндекса."""
    smtp_password = os.environ.get('SMTP_PASSWORD', '')
    if not smtp_password:
        raise ValueError('Секрет SMTP_PASSWORD не задан')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    # From = логин аккаунта, но с именем Тюрина — Яндекс требует совпадения From и логина
    msg['From'] = f'{FROM_NAME} <{SMTP_LOGIN}>'
    msg['To'] = f'{to_name} <{to_email}>' if to_name else to_email
    # Reply-To: клиент ответит на maksT77@yandex.ru
    msg['Reply-To'] = f'{FROM_NAME} <{REPLY_TO}>'

    msg.attach(MIMEText(body_html, 'html', 'utf-8'))

    print(f"[crm-mailer] smtp login={SMTP_LOGIN} reply-to={REPLY_TO} to={to_email}")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_LOGIN, smtp_password)
        server.sendmail(SMTP_LOGIN, to_email, msg.as_bytes())

    return {'success': True, 'from': SMTP_LOGIN, 'reply_to': REPLY_TO, 'to': to_email}


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