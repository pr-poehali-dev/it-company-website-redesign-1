"""
Авторизация администратора. Принимает логин и пароль, возвращает токен сессии.
"""
import json
import os
import hashlib
import hmac
import secrets
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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

        print(f"[auth] login attempt: username={username}")

        if not username or not password:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Заполните все поля'})}

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, password_hash FROM admin_users WHERE username = %s", (username,))
            row = cur.fetchone()
            print(f"[auth] user found: {row is not None}")

            if not row:
                return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

            user_id, stored_hash = row
            password_hash = hash_password(password)
            password_ok = (password_hash == stored_hash)
            print(f"[auth] password_ok: {password_ok}, stored_len={len(stored_hash)}, input_len={len(password_hash)}")

            if not password_ok:
                return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

            raw_token = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO admin_sessions (token, user_id, username) VALUES (%s, %s, %s)",
                (raw_token, user_id, username)
            )
            conn.commit()
            # Добавляем HMAC-подпись к токену для проверки в других функциях без БД
            secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
            if secret:
                sig = hmac.new(secret.encode(), raw_token.encode(), hashlib.sha256).hexdigest()[:16]
                signed_token = f"{raw_token}.{sig}"
            else:
                signed_token = raw_token
            print(f"[auth] session created, token prefix: {raw_token[:8]}")

            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({'token': signed_token, 'username': username})
            }
        finally:
            conn.close()

    # GET /check — проверка токена
    if method == 'GET' and path.endswith('/check'):
        token = event.get('headers', {}).get('X-Session-Token', '')
        # Если токен подписанный — берём только raw часть
        raw_token = token.rsplit('.', 1)[0] if '.' in token else token
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT username FROM admin_sessions WHERE token = %s", (raw_token,))
            row = cur.fetchone()
        finally:
            conn.close()
        if row:
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True, 'username': row[0]})}
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': False})}

    # POST /logout
    if method == 'POST' and path.endswith('/logout'):
        token = event.get('headers', {}).get('X-Session-Token', '')
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM admin_sessions WHERE token = %s", (token,))
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    # POST /set-password
    if method == 'POST' and path.endswith('/set-password'):
        body = json.loads(event.get('body') or '{}')
        setup_token = body.get('setup_token', '')
        if setup_token != os.environ.get('ADMIN_SECRET_TOKEN', ''):
            return {'statusCode': 403, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет доступа'})}
        username = body.get('username', '').strip()
        password = body.get('password', '')
        if not username or not password:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Заполните все поля'})}
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute("UPDATE admin_users SET username = %s, password_hash = %s WHERE id = 1", (username, hash_password(password)))
            conn.commit()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}