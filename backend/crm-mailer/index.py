"""
CRM Mailer — отправка писем и КП из CRM через Unisender Go API.
"""
import json
import os
import re
import urllib.request

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Authorization',
}

EMAIL_RE = re.compile(r'[\w.+\-]+@[\w\-]+\.[\w.\-]{2,}')


def send_unisender(to_email: str, to_name: str, subject: str, body_html: str) -> dict:
    """Отправляет письмо через Unisender Go API."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', 'info@mat-labs.ru')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Тюрин Максим | MAT Labs')

    if not api_key:
        raise ValueError('Секрет UNISENDER_API_KEY не задан')

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
    for base_url in [
        'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json',
        'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
    ]:
        try:
            req = urllib.request.Request(
                base_url, data=data,
                headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'X-API-KEY': api_key},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode())
            print(f"[crm-mailer] success via {base_url}: {result}")
            break
        except Exception as e:
            print(f"[crm-mailer] failed {base_url}: {e}")
            last_err = e

    if result is None:
        raise last_err

    return {'success': True, 'from': sender_email, 'to': to_email, 'result': result}


def handler(event: dict, context) -> dict:
    """Отправка писем и КП из CRM через Unisender Go."""
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

    to_email_raw = (body.get('to_email') or '').strip()
    to_name = (body.get('to_name') or '').strip()
    subject = (body.get('subject') or 'Коммерческое предложение от MAT Labs').strip()
    body_html = body.get('body_html') or ''

    h = {**CORS_HEADERS, 'Content-Type': 'application/json'}

    if not to_email_raw:
        return {'statusCode': 400, 'headers': h, 'body': json.dumps({'success': False, 'error': 'Укажите email получателя'}, ensure_ascii=False)}

    emails_found = EMAIL_RE.findall(to_email_raw)
    if not emails_found:
        return {'statusCode': 400, 'headers': h, 'body': json.dumps({'success': False, 'error': f'Некорректный email: {to_email_raw}'}, ensure_ascii=False)}
    to_email = emails_found[0].lower()
    if to_email != to_email_raw:
        print(f"[crm-mailer] email sanitized: {to_email_raw!r} → {to_email!r}")

    if not body_html:
        return {'statusCode': 400, 'headers': h, 'body': json.dumps({'success': False, 'error': 'Пустое тело письма'}, ensure_ascii=False)}

    try:
        result = send_unisender(to_email, to_name, subject, body_html)
        print(f"[crm-mailer] sent to={to_email} subject={subject[:50]}")
        return {'statusCode': 200, 'headers': h, 'body': json.dumps(result, ensure_ascii=False)}
    except Exception as e:
        print(f"[crm-mailer] error: {e}")
        return {'statusCode': 500, 'headers': h, 'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}