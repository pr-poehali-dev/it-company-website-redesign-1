"""
Авторизация администратора.
- POST /         — вход (логин + пароль), rate-limit 5 попыток / 15 мин с IP
- GET  /check    — проверка токена (+ истечение по expires_at)
- POST /logout   — выход, удаляет сессию из БД
- POST /set-password — смена пароля (защищён ADMIN_SECRET_TOKEN)
"""
import json
import os
import hashlib
import hmac
import secrets
import time
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

MAX_ATTEMPTS = 5
WINDOW_MINUTES = 15
SESSION_TTL_HOURS = 72


def get_conn():
    return psycopg2.connect(
        os.environ['DATABASE_URL'],
        options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}"
    )


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def json_resp(data, status=200):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(data, ensure_ascii=False)}


def get_ip(event: dict) -> str:
    return (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or \
           (event.get('headers') or {}).get('x-forwarded-for', '').split(',')[0].strip() or 'unknown'


def check_rate_limit(conn, username: str, ip: str) -> bool:
    """Возвращает True если лимит превышен (нельзя входить)."""
    cur = conn.cursor()
    cur.execute(
        """SELECT COUNT(*) FROM login_attempts
           WHERE (username = %s OR ip = %s)
             AND success = false
             AND created_at > now() - interval '%s minutes'""",
        (username, ip, WINDOW_MINUTES)
    )
    count = cur.fetchone()[0]
    return count >= MAX_ATTEMPTS


def log_attempt(conn, username: str, ip: str, success: bool):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO login_attempts (username, ip, success) VALUES (%s, %s, %s)",
        (username, ip, success)
    )
    conn.commit()


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # POST / — вход
    if method == 'POST' and (path.endswith('/login') or path == '/'):
        body = json.loads(event.get('body') or '{}')
        username = body.get('username', '').strip()
        password = body.get('password', '')
        ip = get_ip(event)

        print(f"[auth] login attempt: username={username} ip={ip}")

        if not username or not password:
            return json_resp({'error': 'Заполните все поля'}, 400)

        conn = get_conn()
        try:
            if check_rate_limit(conn, username, ip):
                print(f"[auth] rate limit hit: username={username} ip={ip}")
                return json_resp({'error': f'Слишком много попыток. Подождите {WINDOW_MINUTES} минут.'}, 429)

            cur = conn.cursor()
            cur.execute("SELECT id, password_hash FROM admin_users WHERE username = %s", (username,))
            row = cur.fetchone()

            if not row:
                time.sleep(1)
                log_attempt(conn, username, ip, False)
                return json_resp({'error': 'Неверный логин или пароль'}, 401)

            user_id, stored_hash = row
            if hash_password(password) != stored_hash:
                time.sleep(1)
                log_attempt(conn, username, ip, False)
                print(f"[auth] wrong password: username={username}")
                return json_resp({'error': 'Неверный логин или пароль'}, 401)

            raw_token = secrets.token_hex(32)
            cur.execute(
                """INSERT INTO admin_sessions (token, user_id, username, expires_at)
                   VALUES (%s, %s, %s, now() + interval '%s hours')""",
                (raw_token, user_id, username, SESSION_TTL_HOURS)
            )
            log_attempt(conn, username, ip, True)
            conn.commit()

            secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
            if secret:
                sig = hmac.new(secret.encode(), raw_token.encode(), hashlib.sha256).hexdigest()[:16]
                signed_token = f"{raw_token}.{sig}"
            else:
                signed_token = raw_token

            print(f"[auth] session created for {username}, expires in {SESSION_TTL_HOURS}h")
            return json_resp({'token': signed_token, 'username': username, 'ttl_hours': SESSION_TTL_HOURS})
        finally:
            conn.close()

    # GET /check — проверка токена
    if method == 'GET' and path.endswith('/check'):
        token = (event.get('headers') or {}).get('X-Session-Token', '') or \
                (event.get('headers') or {}).get('x-session-token', '')
        raw_token = token.rsplit('.', 1)[0] if '.' in token else token
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT username FROM admin_sessions WHERE token = %s AND expires_at > now()",
                (raw_token,)
            )
            row = cur.fetchone()
        finally:
            conn.close()
        if row:
            return json_resp({'ok': True, 'username': row[0]})
        return json_resp({'ok': False}, 401)

    # POST /logout
    if method == 'POST' and path.endswith('/logout'):
        token = (event.get('headers') or {}).get('X-Session-Token', '') or \
                (event.get('headers') or {}).get('x-session-token', '')
        raw_token = token.rsplit('.', 1)[0] if '.' in token else token
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM admin_sessions WHERE token = %s", (raw_token,))
            conn.commit()
            print(f"[auth] logout: token prefix {raw_token[:8]}")
        finally:
            conn.close()
        return json_resp({'ok': True})

    # POST /set-password
    if method == 'POST' and path.endswith('/set-password'):
        body = json.loads(event.get('body') or '{}')
        setup_token = body.get('setup_token', '')
        if setup_token != os.environ.get('ADMIN_SECRET_TOKEN', ''):
            return json_resp({'error': 'Нет доступа'}, 403)
        username = body.get('username', '').strip()
        password = body.get('password', '')
        if not username or not password:
            return json_resp({'error': 'Заполните все поля'}, 400)
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE admin_users SET username = %s, password_hash = %s WHERE id = 1",
                (username, hash_password(password))
            )
            conn.commit()
        finally:
            conn.close()
        return json_resp({'ok': True})

    return json_resp({'error': 'Not found'}, 404)
