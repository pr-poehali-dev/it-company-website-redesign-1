"""
Управление заявками с сайта v2 — список и пометка как прочитанное. Только для администратора.
"""
import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


S = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={S}")


def resp(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(body, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Возвращает список заявок с сайта и позволяет отмечать их прочитанными."""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token', '')

    print(f"[DEBUG] S={S!r}")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT current_schema(), current_user")
    print(f"[DEBUG] schema_user={cur.fetchone()}")

    cur.execute("SELECT 1 FROM admin_sessions WHERE token = %s AND expires_at > NOW()", (token,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return resp(401, {'error': 'Не авторизован'})

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    if method == 'GET':
        cur.execute(
            "SELECT id, name, email, phone, company, message, created_at, is_read FROM contact_requests ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        requests_list = [
            {
                'id': r[0],
                'name': r[1],
                'email': r[2],
                'phone': r[3],
                'company': r[4],
                'message': r[5],
                'created_at': r[6].isoformat(),
                'is_read': r[7],
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return resp(200, {'requests': requests_list})

    if method == 'PUT':
        parts = [p for p in path.split('/') if p]
        req_id = parts[-1] if parts else None
        if not req_id or not req_id.isdigit():
            cur.close()
            conn.close()
            return resp(400, {'error': 'Укажите ID заявки'})
        cur.execute("UPDATE contact_requests SET is_read = TRUE WHERE id = %s", (int(req_id),))
        conn.commit()
        cur.close()
        conn.close()
        return resp(200, {'success': True})

    cur.close()
    conn.close()
    return resp(405, {'error': 'Метод не поддерживается'})