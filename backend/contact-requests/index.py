"""
Список заявок с сайта — возвращает все заявки из базы для админки.
"""
import json
import os
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def auth_check(event):
    token = (event.get('headers') or {}).get('x-session-token') or \
            (event.get('headers') or {}).get('X-Session-Token') or ''
    if not token:
        return False
    conn = get_db()
    cur = conn.cursor()
    raw = token.rsplit('.', 1)[0] if '.' in token else token
    cur.execute("SELECT id FROM admin_sessions WHERE token=%s AND expires_at > NOW()", (raw,))
    row = cur.fetchone()
    conn.close()
    return row is not None


def json_resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def handler(event: dict, context) -> dict:
    """Возвращает список заявок с сайта для администратора."""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if not auth_check(event):
        return json_resp({'error': 'Не авторизован'}, 401)

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, name, email, phone, company, message, created_at FROM contact_requests ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()

    return json_resp({'requests': [dict(r) for r in rows]})