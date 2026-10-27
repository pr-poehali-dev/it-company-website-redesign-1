"""
Конвейер данных МАТ-Лабс: подключение источников (Google Таблицы, файлы по ссылке, PostgreSQL, MySQL, amoCRM,
Битрикс24, 1С OData, Яндекс Метрика, МойСклад, JSON API), регулярная загрузка по расписанию, очистка
(дубли, пустые строки, числа, даты, часовые пояса), история запусков с ошибками и выдача данных в BI.
"""
import base64
import gzip
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import time
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.utils import formataddr

import boto3
import psycopg2
import psycopg2.extras
import requests
from cryptography.fernet import Fernet

from connectors import KINDS, SECRET_FIELDS, SourceError, fetch
from clean import clean

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Secret',
    'Access-Control-Max-Age': '86400',
}
SENDER = 'atyurin2@yandex.ru'
NOTIFY = 'maksT77@yandex.ru'

PLANS = {
    'free': {'sources': 2, 'rows': 10000, 'schedules': ['manual', 'daily', 'weekly'], 'title': 'Старт'},
    'pro': {'sources': 15, 'rows': 200000, 'schedules': ['manual', 'hourly', 'every6h', 'daily', 'weekly'], 'title': 'Бизнес'},
    'corp': {'sources': 100, 'rows': 500000, 'schedules': ['manual', 'hourly', 'every6h', 'daily', 'weekly'], 'title': 'Корпоративный'},
}
STEP = {'hourly': timedelta(hours=1), 'every6h': timedelta(hours=6), 'daily': timedelta(days=1), 'weekly': timedelta(days=7)}


def resp(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=psycopg2.extras.RealDictCursor)


def secret_key():
    return hashlib.sha256(('pipes:' + os.environ['ADMIN_TOKEN_SECRET']).encode()).digest()


def fernet():
    return Fernet(base64.urlsafe_b64encode(secret_key()))


def enc(d):
    return fernet().encrypt(json.dumps(d, ensure_ascii=False).encode()).decode()


def dec(s):
    return json.loads(fernet().decrypt(s.encode()).decode())


def make_token(uid):
    raw = f'{uid}.{int(time.time()) + 30 * 86400}'
    return raw + '.' + hmac.new(secret_key(), raw.encode(), hashlib.sha256).hexdigest()[:32]


def user_id(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    t = h.get('x-session-token') or ''
    parts = t.split('.')
    if len(parts) != 3:
        return None
    raw = f'{parts[0]}.{parts[1]}'
    if not hmac.compare_digest(parts[2], hmac.new(secret_key(), raw.encode(), hashlib.sha256).hexdigest()[:32]):
        return None
    if int(parts[1]) < time.time():
        return None
    return int(parts[0])


def s3():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])


def cdn(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def send_mail(to, subject, html):
    key = os.environ.get('UNISENDER_API_KEY')
    if key:
        try:
            r = requests.post('https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
                              headers={'X-API-KEY': key}, timeout=6, json={'message': {
                                  'recipients': [{'email': to}], 'subject': subject, 'body': {'html': html},
                                  'from_email': os.environ.get('UNISENDER_SENDER_EMAIL', SENDER),
                                  'from_name': 'МАТ-Лабс', 'track_links': 0, 'track_read': 0}}).json()
            if r.get('status') != 'error':
                return True
            print(f'[pipes] unisender: {r}')
        except Exception as e:
            print(f'[pipes] unisender failed: {e}')
    pw = os.environ.get('SMTP_PASSWORD')
    if not pw:
        return False
    msg = MIMEText(html, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('МАТ-Лабс', SENDER))
    msg['To'] = to
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=6) as srv:
            srv.login(SENDER, pw)
            srv.sendmail(SENDER, [to], msg.as_bytes())
        return True
    except Exception as e:
        print(f'[pipes] smtp failed: {e}')
        return False


def mail_html(title, body):
    return (f'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">'
            f'<div style="font-size:13px;color:#7c3aed;font-weight:bold;letter-spacing:1px">МАТ-ЛАБС</div>'
            f'<h2 style="margin:12px 0">{title}</h2>{body}'
            f'<p style="color:#888;font-size:12px;margin-top:28px">mat-labs.ru/analytics</p></div>')


# ---------- вход по коду ----------

def action_send_code(conn, b):
    email = (b.get('email') or '').strip().lower()
    if not re.match(r'^[^@\s]+@[^@\s]+\.[a-z]{2,}$', email):
        return resp({'error': 'Введите корректный email'}, 400)
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) n FROM {S}.pipe_codes WHERE email=%s AND created_at > NOW() - INTERVAL '1 hour'", (email,))
    if cur.fetchone()['n'] >= 5:
        return resp({'error': 'Слишком много попыток — попробуйте через час'}, 429)
    code = f'{secrets.randbelow(900000) + 100000}'
    cur.execute(f"INSERT INTO {S}.pipe_codes (email, code_hash, expires_at) VALUES (%s, %s, NOW() + INTERVAL '15 minutes')",
                (email, hashlib.sha256((code + email).encode()).hexdigest()))
    conn.commit()
    ok = send_mail(email, f'Код входа: {code}', mail_html('Ваш код входа', f'<div style="font-size:36px;font-weight:bold;letter-spacing:6px;margin:20px 0">{code}</div><p>Код действует 15 минут. Если вы не запрашивали вход — просто проигнорируйте письмо.</p>'))
    if not ok:
        return resp({'error': 'Не удалось отправить письмо — попробуйте позже'}, 502)
    return resp({'ok': True})


def action_verify(conn, b):
    email = (b.get('email') or '').strip().lower()
    code = re.sub(r'\D', '', str(b.get('code') or ''))
    cur = conn.cursor()
    cur.execute(f"SELECT id, code_hash, attempts FROM {S}.pipe_codes WHERE email=%s AND expires_at > NOW() ORDER BY id DESC LIMIT 1", (email,))
    row = cur.fetchone()
    if not row or row['attempts'] >= 5:
        return resp({'error': 'Код устарел — запросите новый'}, 400)
    if not hmac.compare_digest(row['code_hash'], hashlib.sha256((code + email).encode()).hexdigest()):
        cur.execute(f"UPDATE {S}.pipe_codes SET attempts = attempts + 1 WHERE id=%s", (row['id'],))
        conn.commit()
        return resp({'error': 'Неверный код'}, 400)
    cur.execute(f"UPDATE {S}.pipe_codes SET expires_at = NOW() WHERE id=%s", (row['id'],))
    src = re.sub(r'[^a-z_]', '', str(b.get('source') or 'pipes'))[:30]
    cur.execute(f"""INSERT INTO {S}.pipe_users (email, last_login_at, source) VALUES (%s, NOW(), %s)
                    ON CONFLICT (email) DO UPDATE SET last_login_at = NOW() RETURNING id, (xmax = 0) AS created""", (email, src))
    u = cur.fetchone()
    conn.commit()
    if u['created']:
        what = 'аналитики' if src == 'analytics' else 'конвейера данных'
        send_mail(NOTIFY, f'Новый пользователь {what}: {email}', mail_html('Новая регистрация', f'<p>{email}</p><p>Откуда: {what}</p>'))
    return resp({'ok': True, 'token': make_token(u['id'])})


def get_user(conn, uid):
    cur = conn.cursor()
    cur.execute(f"SELECT id, email, name, company, plan, plan_until, created_at FROM {S}.pipe_users WHERE id=%s", (uid,))
    u = cur.fetchone()
    if u and u['plan'] != 'free' and u['plan_until'] and u['plan_until'] < datetime.now(timezone.utc):
        u['plan'] = 'free'
    return u


# ---------- источники ----------

def public_cfg(kind, cfg):
    hidden = SECRET_FIELDS.get(kind, [])
    return {k: ('••••' + str(v)[-4:] if len(str(v)) > 8 else '••••') if k in hidden and v else v for k, v in cfg.items()}


def source_out(r):
    r = dict(r)
    r.pop('config_enc', None)
    key = r.pop('data_key')
    r['json_url'] = cdn(f'pipes/{key}.json.gz')
    r['csv_url'] = cdn(f'pipes/{key}.csv')
    return r


def own_source(conn, uid, sid):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.pipe_sources WHERE id=%s AND user_id=%s AND archived=FALSE", (int(sid or 0), uid))
    return cur.fetchone()


def next_run(schedule, base=None):
    if schedule not in STEP:
        return None
    return (base or datetime.now(timezone.utc)) + STEP[schedule]


def action_list(conn, uid):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.pipe_sources WHERE user_id=%s AND archived=FALSE ORDER BY id DESC", (uid,))
    srcs = [source_out(r) for r in cur.fetchall()]
    u = get_user(conn, uid)
    return resp({'user': u, 'limits': PLANS[u['plan']], 'sources': srcs})


def validate_save(conn, uid, b, existing=None):
    u = get_user(conn, uid)
    plan = PLANS[u['plan']]
    kind = b.get('kind') or (existing and existing['kind'])
    if kind not in KINDS:
        return None, resp({'error': 'Неизвестный тип источника'}, 400)
    schedule = b.get('schedule') or (existing and existing['schedule']) or 'daily'
    if schedule not in plan['schedules']:
        return None, resp({'error': f'Расписание «{schedule}» доступно на тарифе «Бизнес»', 'upgrade': True}, 403)
    if not existing:
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) n FROM {S}.pipe_sources WHERE user_id=%s AND archived=FALSE", (uid,))
        if cur.fetchone()['n'] >= plan['sources']:
            return None, resp({'error': f'На тарифе «{plan["title"]}» можно подключить до {plan["sources"]} источников', 'upgrade': True}, 403)
    cfg = {k: str(v).strip() for k, v in (b.get('config') or {}).items() if v not in (None, '')}
    if existing:
        old = dec(existing['config_enc'])
        for k in SECRET_FIELDS.get(kind, []):
            if k not in cfg or cfg[k].startswith('••••'):
                if k in old:
                    cfg[k] = old[k]
    return {'kind': kind, 'schedule': schedule, 'cfg': cfg, 'plan': plan}, None


def action_test(conn, uid, b, budget):
    sid = b.get('id')
    existing = own_source(conn, uid, sid) if sid else None
    v, err = validate_save(conn, uid, {**b, 'kind': b.get('kind') or (existing and existing['kind'])}, existing)
    if err and not (err['statusCode'] == 403 and 'источников' in err['body']):
        return err
    if not v:
        v = {'kind': b.get('kind'), 'cfg': {k: str(x).strip() for k, x in (b.get('config') or {}).items() if x not in (None, '')}}
    t = time.time()
    try:
        rows, note = fetch(v['kind'], v['cfg'], budget, 200)
    except SourceError as e:
        return resp({'ok': False, 'error': str(e)})
    except Exception as e:
        print(f'[pipes] test crash: {e!r}')
        return resp({'ok': False, 'error': f'Не удалось прочитать данные: {str(e)[:200]}'})
    out, columns, stats = clean(rows, b.get('clean') or {})
    return resp({'ok': True, 'note': note, 'columns': columns, 'preview': out[:20], 'stats': stats, 'ms': int((time.time() - t) * 1000)})


def action_save(conn, uid, b):
    sid = b.get('id')
    existing = own_source(conn, uid, sid) if sid else None
    if sid and not existing:
        return resp({'error': 'Источник не найден'}, 404)
    v, err = validate_save(conn, uid, b, existing)
    if err:
        return err
    name = (b.get('name') or '').strip()[:200] or 'Источник'
    cln = b.get('clean') if isinstance(b.get('clean'), dict) else (existing['clean'] if existing else {})
    notify = bool(b.get('notify_email', True))
    cur = conn.cursor()
    pub = json.dumps(public_cfg(v['kind'], v['cfg']), ensure_ascii=False)
    if existing:
        cur.execute(f"""UPDATE {S}.pipe_sources SET name=%s, config_enc=%s, config_public=%s, clean=%s, schedule=%s,
                        notify_email=%s, next_run_at=%s, updated_at=NOW() WHERE id=%s RETURNING *""",
                    (name, enc(v['cfg']), pub, json.dumps(cln), v['schedule'], notify, next_run(v['schedule']), existing['id']))
    else:
        cur.execute(f"""INSERT INTO {S}.pipe_sources (user_id, name, kind, config_enc, config_public, clean, schedule, notify_email, data_key, next_run_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) RETURNING *""",
                    (uid, name, v['kind'], enc(v['cfg']), pub, json.dumps(cln), v['schedule'], notify, secrets.token_hex(16)))
    row = cur.fetchone()
    conn.commit()
    return resp({'ok': True, 'source': source_out(row)})


def action_delete(conn, uid, b):
    src = own_source(conn, uid, b.get('id'))
    if not src:
        return resp({'error': 'Источник не найден'}, 404)
    cur = conn.cursor()
    cur.execute(f"UPDATE {S}.pipe_sources SET archived=TRUE, next_run_at=NULL WHERE id=%s", (src['id'],))
    conn.commit()
    for key in (f"pipes/{src['data_key']}.json.gz", f"pipes/{src['data_key']}.csv"):
        try:
            s3().delete_object(Bucket='files', Key=key)
        except Exception as e:
            print(f'[pipes] s3 delete {key}: {e}')
    return resp({'ok': True})


def action_runs(conn, uid, p):
    src = own_source(conn, uid, p.get('id'))
    if not src:
        return resp({'error': 'Источник не найден'}, 404)
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {S}.pipe_runs WHERE source_id=%s ORDER BY id DESC LIMIT 50", (src['id'],))
    return resp({'runs': cur.fetchall()})


# ---------- запуск ----------

def write_outputs(src, rows, columns):
    import csv
    import io
    payload = {'name': src['name'], 'updated_at': datetime.now(timezone.utc).isoformat(), 'columns': columns, 'rows': rows}
    body = gzip.compress(json.dumps(payload, ensure_ascii=False, separators=(',', ':'), default=str).encode(), 6)
    s3().put_object(Bucket='files', Key=f"pipes/{src['data_key']}.json.gz", Body=body, ContentType='application/octet-stream', CacheControl='no-cache')
    buf = io.StringIO()
    names = [c['name'] for c in columns]
    w = csv.writer(buf, delimiter=';')
    w.writerow(names)
    for r in rows:
        w.writerow(['' if r.get(n) is None else r.get(n) for n in names])
    s3().put_object(Bucket='files', Key=f"pipes/{src['data_key']}.csv", Body=('\ufeff' + buf.getvalue()).encode('utf-8'),
                    ContentType='text/csv; charset=utf-8', CacheControl='no-cache')


def run_source(conn, src, trigger, budget):
    cur = conn.cursor()
    cur.execute(f"INSERT INTO {S}.pipe_runs (source_id, trigger) VALUES (%s, %s) RETURNING id", (src['id'], trigger))
    run_id = cur.fetchone()['id']
    cur.execute(f"UPDATE {S}.pipe_sources SET status='running' WHERE id=%s", (src['id'],))
    conn.commit()
    t = time.time()
    u = get_user(conn, src['user_id'])
    limit = PLANS[u['plan']]['rows']
    try:
        rows, note = fetch(src['kind'], dec(src['config_enc']), budget - 0.8, limit)
        out, columns, st = clean(rows, src['clean'] or {})
        if not out:
            raise SourceError('Источник вернул 0 строк — проверьте фильтр, запрос или доступ')
        write_outputs(src, out, columns)
        msg = note + (f'. Обрезано до {limit:,} строк по тарифу'.replace(',', ' ') if len(rows) >= limit else '')
        cur.execute(f"""UPDATE {S}.pipe_runs SET status='ok', rows_in=%s, rows_out=%s, dupes=%s, empty_rows=%s, fixed_values=%s,
                        ms=%s, message=%s, finished_at=NOW() WHERE id=%s""",
                    (st['rows_in'], st['rows_out'], st['dupes'], st['empty_rows'], st['fixed_values'], int((time.time() - t) * 1000), msg, run_id))
        cur.execute(f"""UPDATE {S}.pipe_sources SET status='ok', last_rows=%s, last_error=NULL, last_run_at=NOW(), fail_count=0,
                        columns=%s, next_run_at=%s WHERE id=%s""",
                    (st['rows_out'], json.dumps(columns, ensure_ascii=False), next_run(src['schedule']), src['id']))
        conn.commit()
        return {'ok': True, 'stats': st, 'message': msg}
    except Exception as e:
        msg = str(e) if isinstance(e, SourceError) else f'Внутренняя ошибка: {str(e)[:200]}'
        if not isinstance(e, SourceError):
            print(f'[pipes] run crash {src["id"]}: {e!r}')
        fails = src['fail_count'] + 1
        retry = datetime.now(timezone.utc) + min(STEP.get(src['schedule'], timedelta(days=1)), timedelta(minutes=30 * fails))
        cur.execute(f"UPDATE {S}.pipe_runs SET status='error', ms=%s, message=%s, finished_at=NOW() WHERE id=%s",
                    (int((time.time() - t) * 1000), msg, run_id))
        cur.execute(f"""UPDATE {S}.pipe_sources SET status='error', last_error=%s, last_run_at=NOW(), fail_count=%s, next_run_at=%s WHERE id=%s""",
                    (msg, fails, retry if src['schedule'] in STEP else None, src['id']))
        conn.commit()
        if trigger != 'manual' and src['notify_email'] and fails in (1, 3):
            send_mail(u['email'], f'Ошибка загрузки: {src["name"]}', mail_html(
                f'Не удалось обновить «{src["name"]}»', f'<p style="background:#fff1f2;padding:12px;border-radius:8px">{msg}</p>'
                f'<p>Мы повторим попытку автоматически. Данные в отчётах остаются от последней успешной загрузки.</p>'
                f'<p><a href="https://mat-labs.ru/analytics/pipes/app">Открыть кабинет</a></p>'))
        return {'ok': False, 'error': msg}


def action_run(conn, uid, b, budget):
    src = own_source(conn, uid, b.get('id'))
    if not src:
        return resp({'error': 'Источник не найден'}, 404)
    if src['status'] == 'running' and src['last_run_at'] and src['last_run_at'] > datetime.now(timezone.utc) - timedelta(minutes=2):
        return resp({'error': 'Загрузка уже идёт'}, 409)
    return resp(run_source(conn, src, 'manual', budget))


def action_run_due(conn, event, budget):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    if not os.environ.get('CRON_SECRET') or not hmac.compare_digest(h.get('x-cron-secret', ''), os.environ['CRON_SECRET']):
        return resp({'error': 'Unauthorized'}, 401)
    cur = conn.cursor()
    cur.execute(f"""SELECT * FROM {S}.pipe_sources WHERE archived=FALSE AND next_run_at <= NOW() AND schedule <> 'manual'
                    AND (status <> 'running' OR last_run_at < NOW() - INTERVAL '10 minutes') ORDER BY next_run_at LIMIT 20""")
    done = []
    for src in cur.fetchall():
        if budget - time.time() < 8:
            break
        r = run_source(conn, src, 'schedule', min(budget, time.time() + 25))
        done.append({'id': src['id'], 'ok': r['ok']})
    return resp({'ok': True, 'processed': done})


def action_lead(conn, b):
    name, contact = (b.get('name') or '').strip()[:200], (b.get('contact') or '').strip()[:200]
    if not contact:
        return resp({'error': 'Укажите телефон или email'}, 400)
    text = ''.join(f'<p><b>{k}:</b> {str(b.get(k) or "—")[:1000]}</p>' for k in ('plan', 'company', 'sources', 'comment'))
    send_mail(NOTIFY, f'Конвейер данных: заявка «{b.get("plan") or "внедрение"}» от {name or contact}',
              mail_html('Заявка на конвейер данных', f'<p><b>Имя:</b> {name}</p><p><b>Контакт:</b> {contact}</p>{text}'))
    return resp({'ok': True})


def handler(event: dict, context) -> dict:
    """Конвейер данных: вход по коду, источники, проверка подключения, загрузка, история, запуск по расписанию."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    left = context.get_remaining_time_in_millis() / 1000 if hasattr(context, 'get_remaining_time_in_millis') else 28
    budget = time.time() + max(2.5, left - 0.7)
    p = event.get('queryStringParameters') or {}
    b = {}
    if method == 'POST':
        try:
            b = json.loads(event.get('body') or '{}')
        except ValueError:
            return resp({'error': 'Неверный JSON'}, 400)
    action = b.get('action') or p.get('action') or ''
    if method == 'GET' and action in ('', 'ping'):
        return resp({'ok': True, 'kinds': sorted(KINDS), 'plans': PLANS})
    conn = db()
    try:
        if action == 'send_code':
            return action_send_code(conn, b)
        if action == 'verify':
            return action_verify(conn, b)
        if action == 'run_due':
            return action_run_due(conn, event, budget)
        if action == 'lead':
            return action_lead(conn, b)
        uid = user_id(event)
        if not uid:
            return resp({'error': 'Войдите в кабинет'}, 401)
        if action == 'list':
            return action_list(conn, uid)
        if action == 'runs':
            return action_runs(conn, uid, p)
        if action == 'test':
            return action_test(conn, uid, b, budget)
        if action == 'save':
            return action_save(conn, uid, b)
        if action == 'delete':
            return action_delete(conn, uid, b)
        if action == 'run':
            return action_run(conn, uid, b, budget)
        if action == 'profile':
            cur = conn.cursor()
            cur.execute(f"UPDATE {S}.pipe_users SET name=%s, company=%s WHERE id=%s", ((b.get('name') or '')[:255], (b.get('company') or '')[:255], uid))
            conn.commit()
            return resp({'ok': True})
        return resp({'error': 'Неизвестное действие'}, 400)
    finally:
        conn.close()