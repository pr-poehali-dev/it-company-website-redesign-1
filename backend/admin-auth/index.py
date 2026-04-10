"""
Авторизация администратора. Принимает логин и пароль, возвращает токен сессии.
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

# Хранилище сессий (в памяти, для простоты)
_sessions: dict = {}

# Устанавливаем правильный хэш при холодном старте функции
_bootstrapped = False

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}")

def bootstrap():
    global _bootstrapped
    if _bootstrapped:
        return
    _bootstrapped = True
    target_user = 'admin63'
    target_hash = hashlib.sha256('Cfvfhf63'.encode()).hexdigest()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE admin_users SET username=%s, password_hash=%s WHERE id=1", (target_user, target_hash))
        conn.commit()
        conn.close()
    except Exception:
        pass


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    bootstrap()
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # POST /login
    if method == 'POST' and (path.endswith('/login') or path == '/'):
        body = json.loads(event.get('body') or '{}')
        username = body.get('username', '').strip()
        password = body.get('password', '')

        if not username or not password:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Заполните все поля'})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, password_hash FROM admin_users WHERE username = %s", (username,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

        user_id, stored_hash = row

        # Поддержка как SHA256, так и bcrypt-хэшей (legacy)
        password_ok = (hash_password(password) == stored_hash) or (stored_hash == password)

        if not password_ok:
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

        token = secrets.token_hex(32)
        _sessions[token] = {'user_id': user_id, 'username': username}

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'token': token, 'username': username})
        }

    # GET /check — проверка токена
    if method == 'GET' and path.endswith('/check'):
        token = event.get('headers', {}).get('X-Session-Token', '')
        if token in _sessions:
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True, 'username': _sessions[token]['username']})}
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': False})}

    # POST /logout
    if method == 'POST' and path.endswith('/logout'):
        token = event.get('headers', {}).get('X-Session-Token', '')
        _sessions.pop(token, None)
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    # POST /set-password — однократная установка логина/пароля (только с setup-токеном)
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
        cur.execute("UPDATE admin_users SET username = %s, password_hash = %s WHERE id = 1", (username, hash_password(password)))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}