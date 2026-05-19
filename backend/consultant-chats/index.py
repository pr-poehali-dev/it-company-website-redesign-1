"""
Список диалогов с AI-консультантом — возвращает все диалоги из базы для админки.
Позволяет посмотреть переписку, контакты клиента и пометить как прочитанное.
"""
import json
import os
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    """Возвращает диалоги с AI-консультантом и позволяет пометить их прочитанными."""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if not auth_check(event):
        return json_resp({'error': 'Не авторизован'}, 401)

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            return json_resp({'error': 'Неверный JSON'}, 400)

        chat_id = body.get('id')
        if not chat_id:
            return json_resp({'error': 'id обязателен'}, 400)

        conn = get_db()
        cur = conn.cursor()
        cur.execute("UPDATE consultant_chats SET is_read = TRUE WHERE id = %s", (int(chat_id),))
        conn.commit()
        conn.close()
        return json_resp({'success': True})

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """SELECT id, session_id, client_name, client_email, client_phone,
                  client_company, messages, brief, is_sent, is_read,
                  ip, created_at, updated_at
           FROM consultant_chats
           ORDER BY updated_at DESC
           LIMIT 200"""
    )
    rows = cur.fetchall()
    conn.close()

    return json_resp({'chats': [dict(r) for r in rows]})
