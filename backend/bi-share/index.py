"""
Облачный BI: публикация дашборда по ссылке. Данные дашборда (JSON, сжатый gzip) хранятся в S3,
метаданные и контакты владельца — в БД. Владелец получает секретный ключ для обновления и удаления.
Каждая публикация — лид в заявках и письмо менеджеру.
"""
import gzip
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

import boto3
import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
MAX_RAW = 25 * 1024 * 1024
NOTIFY_EMAIL = 'atyurin2@yandex.ru'
ID_RX = re.compile(r'^[A-Za-z0-9_-]{8,16}$')


def resp(d, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(d, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return resp({'error': msg}, status)


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def s3():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])


def is_admin(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def notify(subject, text):
    password = os.environ.get('SMTP_PASSWORD', '')
    if not password:
        return
    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('Облачный BI МАТ-Лабс', NOTIFY_EMAIL))
    msg['To'] = NOTIFY_EMAIL
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=4) as srv:
            srv.login(NOTIFY_EMAIL, password)
            srv.sendmail(NOTIFY_EMAIL, [NOTIFY_EMAIL], msg.as_bytes())
    except Exception as e:
        print(f'[bi-share] notify failed: {e}')


def validate_dash(d):
    if not isinstance(d, dict):
        return 'Нет данных дашборда'
    ds = d.get('dataset') or {}
    if not isinstance(ds.get('rows'), list) or not isinstance(ds.get('columns'), list) or not ds['columns']:
        return 'Неверный формат дашборда'
    if not isinstance(d.get('widgets'), list):
        return 'Нет графиков'
    return None


def put_data(share_id, dash):
    raw = json.dumps(dash, ensure_ascii=False, separators=(',', ':')).encode()
    body = gzip.compress(raw, compresslevel=6)
    key = f'bi-shares/{share_id}.json.gz'
    s3().put_object(Bucket='files', Key=key, Body=body, ContentType='application/octet-stream', CacheControl='no-cache')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}", len(body)


def action_publish(body):
    if (body.get('website') or '').strip():
        return resp({'ok': True})
    raw_len = len(json.dumps(body.get('dashboard') or {}))
    if raw_len > MAX_RAW:
        return err('Дашборд больше 25 МБ — отфильтруйте данные или удалите лишние колонки')
    dash = body.get('dashboard')
    e = validate_dash(dash)
    if e:
        return err(e)
    name = (body.get('name') or '').strip()[:200]
    email = (body.get('email') or '').strip()[:200]
    phone = (body.get('phone') or '').strip()[:60]
    company = (body.get('company') or '').strip()[:300]
    if not name or not email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return err('Укажите имя и рабочую почту')
    share_id = secrets.token_urlsafe(8)[:11]
    edit_key = secrets.token_urlsafe(18)
    url, size = put_data(share_id, dash)
    ds = dash['dataset']
    title = (ds.get('name') or 'Дашборд')[:200]
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""INSERT INTO {S}.bi_shares (id, edit_key, title, data_url, rows_count, cols_count, size_bytes,
                    owner_name, owner_email, owner_phone, owner_company)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (share_id, hashlib.sha256(edit_key.encode()).hexdigest(), title, url, len(ds['rows']), len(ds['columns']),
                 size, name, email, phone, company))
    cols = ', '.join(c.get('name', '') for c in ds['columns'][:12])
    msg = (f'Опубликован дашборд в облачном BI: «{title}»\nСтрок: {len(ds["rows"])}, колонок: {len(ds["columns"])}, '
           f'графиков: {len(dash["widgets"])}\nКолонки: {cols}\nСсылка: https://mat-labs.ru/analytics/bi/s/{share_id}\n'
           f'Повод для контакта: предложить BI под ключ с автообновлением из 1С / CRM.')
    cur.execute(f"""INSERT INTO {S}.contact_requests (name, email, phone, company, message, source)
                    VALUES (%s,%s,%s,%s,%s,'bi')""", (name, email, phone or '—', company or None, msg))
    conn.commit()
    conn.close()
    notify(f'Облачный BI: {name} опубликовал дашборд «{title}»',
           f'Имя: {name}\nEmail: {email}\nТелефон: {phone or "—"}\nКомпания: {company or "—"}\n\n{msg}')
    return resp({'ok': True, 'id': share_id, 'edit_key': edit_key})


def get_share(cur, share_id):
    cur.execute(f"SELECT * FROM {S}.bi_shares WHERE id = %s", (share_id,))
    r = cur.fetchone()
    return dict(r) if r else None


def check_key(row, key):
    return bool(key) and hmac.compare_digest(row['edit_key'], hashlib.sha256(key.encode()).hexdigest())


def action_get(p):
    share_id = p.get('id') or ''
    if not ID_RX.match(share_id):
        return err('Неверная ссылка', 404)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    row = get_share(cur, share_id)
    if not row or row['status'] != 'active':
        conn.close()
        return err('Дашборд удалён или ссылка неверна', 404)
    cur.execute(f"""SELECT expires_at < NOW() AS expired FROM {S}.bi_shares WHERE id = %s""", (share_id,))
    if cur.fetchone()['expired']:
        conn.close()
        return err('Срок хранения дашборда истёк', 410)
    cur.execute(f"UPDATE {S}.bi_shares SET views = views + 1, last_view_at = NOW() WHERE id = %s", (share_id,))
    conn.commit()
    conn.close()
    return resp({'id': share_id, 'title': row['title'], 'data_url': row['data_url'], 'updated_at': row['updated_at'],
                 'expires_at': row['expires_at'], 'views': row['views'] + 1, 'author': row['owner_company'] or row['owner_name']})


def action_exists(p):
    """Проверка существования ссылки без учёта просмотра (для серверной отрисовки)."""
    share_id = p.get('id') or ''
    if not ID_RX.match(share_id):
        return err('Неверная ссылка', 404)
    conn = db()
    cur = conn.cursor()
    cur.execute(f"SELECT status = 'active' AND expires_at > NOW() FROM {S}.bi_shares WHERE id = %s", (share_id,))
    r = cur.fetchone()
    conn.close()
    if not r or not r[0]:
        return err('Дашборд удалён или ссылка неверна', 404)
    return resp({'ok': True})


def action_update(body):
    share_id = body.get('id') or ''
    if not ID_RX.match(share_id):
        return err('Неверная ссылка', 404)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    row = get_share(cur, share_id)
    if not row or row['status'] != 'active' or not check_key(row, body.get('edit_key') or ''):
        conn.close()
        return err('Нет прав на изменение этого дашборда', 403)
    if body.get('remove'):
        cur.execute(f"UPDATE {S}.bi_shares SET status = 'removed', updated_at = NOW() WHERE id = %s", (share_id,))
        conn.commit()
        conn.close()
        s3().put_object(Bucket='files', Key=f'bi-shares/{share_id}.json.gz', Body=gzip.compress(b'{}'),
                        ContentType='application/octet-stream')
        return resp({'ok': True, 'removed': True})
    dash = body.get('dashboard')
    e = validate_dash(dash)
    if e:
        conn.close()
        return err(e)
    if len(json.dumps(dash)) > MAX_RAW:
        conn.close()
        return err('Дашборд больше 25 МБ')
    url, size = put_data(share_id, dash)
    ds = dash['dataset']
    cur.execute(f"""UPDATE {S}.bi_shares SET title=%s, data_url=%s, rows_count=%s, cols_count=%s, size_bytes=%s,
                    updated_at=NOW(), expires_at=NOW() + INTERVAL '90 days' WHERE id=%s""",
                ((ds.get('name') or 'Дашборд')[:200], url, len(ds['rows']), len(ds['columns']), size, share_id))
    conn.commit()
    conn.close()
    return resp({'ok': True})


def action_list(admin):
    if not admin:
        return err('Не авторизован', 401)
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT id, title, rows_count, cols_count, size_bytes, owner_name, owner_email, owner_phone, owner_company,
                    views, last_view_at, status, created_at, updated_at, expires_at
                    FROM {S}.bi_shares ORDER BY created_at DESC LIMIT 300""")
    items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': items})


def handler(event: dict, context) -> dict:
    """Публикация, просмотр, обновление и снятие с публикации дашбордов облачного BI."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    p = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = body.get('action') or p.get('action') or 'get'
    if action == 'get':
        return action_get(p)
    if action == 'exists':
        return action_exists(p)
    if action == 'publish' and method == 'POST':
        return action_publish(body)
    if action == 'update' and method == 'POST':
        return action_update(body)
    if action == 'list':
        return action_list(is_admin(event))
    return err('Неизвестное действие')