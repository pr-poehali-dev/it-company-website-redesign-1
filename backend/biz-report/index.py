"""
Заказы отчётов бизнес-аналитики (только для администратора): список, смена статусов, удаление тестовых,
генерация полного отчёта в PDF и Excel (рынок, компания, проверка контрагента), загрузка в хранилище и
отправка клиенту на почту.
"""
import hashlib
import hmac
import json
import os
import re
import smtplib
import time
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

import boto3
import psycopg2
import psycopg2.extras

import data
import render

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
STATUSES = ('new', 'invoiced', 'paid', 'sent')
SENDER = 'atyurin2@yandex.ru'


def resp(d, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(d, ensure_ascii=False, default=str)}


def is_admin(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def get_order(cur, oid):
    cur.execute(f'SELECT * FROM {S}.biz_report_orders WHERE id = %s', (oid,))
    r = cur.fetchone()
    return dict(r) if r else None


def s3_put(key, body, ctype):
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=key, Body=body, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def slug(t):
    t = re.sub(r'[^\w\-]+', '-', (t or '').lower(), flags=re.U).strip('-')
    return t[:50] or 'report'


def build(order):
    """Возвращает (pdf_bytes, xlsx_bytes | None, базовое имя файла)."""
    render.ensure_fonts()
    rtype, key = order['report_type'], order['report_key'] or ''
    if rtype == 'market':
        parts = key.split(':')
        if parts and parts[0] == 'rating':
            parts = parts[1:]
        okved = re.sub(r'[^\d.ALL]', '', parts[0] if parts else 'ALL') or 'ALL'
        region = (parts[1] if len(parts) > 1 else 'RU') or 'RU'
        d = data.market(okved, region)
        if not d['metrics']['companies']:
            raise ValueError('По этому рынку нет компаний — проверьте ключ отчёта')
        concl = data.market_conclusions(d)
        return render.market_pdf(d, concl, order), render.market_xlsx(d, concl, order), \
            f'rynok-{okved}-{region}'
    if rtype in ('company', 'check'):
        inn = re.sub(r'\D', '', key or order.get('inn') or '')
        if len(inn) not in (10, 12):
            raise ValueError('В заказе нет ИНН проверяемой компании')
        c = data.company(inn)
        if not c['name'] and not c['egrul']:
            raise ValueError('Компания не найдена')
        if rtype == 'check':
            return render.company_pdf(c, order, check_only=True), None, f'proverka-{inn}'
        return render.company_pdf(c, order), render.company_xlsx(c, order), f'kompaniya-{inn}'
    raise ValueError('Индивидуальное исследование готовится вручную — автоматическая выдача недоступна')


def action_generate(conn, oid):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    order = get_order(cur, oid)
    if not order:
        return resp({'error': 'Заказ не найден'}, 404)
    t = time.time()
    try:
        pdf, xlsx, base = build(order)
    except ValueError as e:
        return resp({'error': str(e)}, 400)
    stamp = time.strftime('%Y%m%d-%H%M%S')
    salt = os.environ.get('ADMIN_TOKEN_SECRET', '')
    tag = hashlib.sha1(f'{oid}{stamp}{salt}'.encode()).hexdigest()[:10]
    prefix = f'reports/{oid}-{stamp}-{tag}'
    pdf_url = s3_put(f'{prefix}/{base}.pdf', pdf, 'application/pdf')
    xlsx_url = s3_put(f'{prefix}/{base}.xlsx', xlsx,
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') if xlsx else ''
    cur.execute(f"""UPDATE {S}.biz_report_orders SET pdf_url=%s, xlsx_url=%s, generated_at=NOW(), updated_at=NOW()
                    WHERE id=%s""", (pdf_url, xlsx_url, oid))
    conn.commit()
    return resp({'ok': True, 'pdf_url': pdf_url, 'xlsx_url': xlsx_url, 'pdf_kb': len(pdf) // 1024,
                 'xlsx_kb': len(xlsx) // 1024 if xlsx else 0, 'ms': int((time.time() - t) * 1000)})


def send_mail(to, subject, html, files):
    password = os.environ.get('SMTP_PASSWORD', '')
    if not password:
        raise RuntimeError('Не задан пароль почты SMTP_PASSWORD')
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = formataddr(('МАТ-Лабс · Бизнес-аналитика', SENDER))
    msg['To'] = to
    msg['Bcc'] = SENDER
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    for name, body in files:
        part = MIMEApplication(body, Name=name)
        part['Content-Disposition'] = f'attachment; filename="{name}"'
        msg.attach(part)
    with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=15) as srv:
        srv.login(SENDER, password)
        srv.sendmail(SENDER, [to, SENDER], msg.as_bytes())


def action_send(conn, oid, body):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    order = get_order(cur, oid)
    if not order:
        return resp({'error': 'Заказ не найден'}, 404)
    to = (body.get('email') or order['email'] or '').strip()
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', to):
        return resp({'error': 'У заказа нет корректного email клиента'}, 400)
    if not order['pdf_url']:
        return resp({'error': 'Сначала сформируйте отчёт'}, 400)
    import urllib.request
    files = []
    for url in (order['pdf_url'], order['xlsx_url']):
        if url:
            with urllib.request.urlopen(url, timeout=8) as r:
                files.append((url.rsplit('/', 1)[-1], r.read()))
    links = ''.join(f'<li><a href="{u}">{u.rsplit("/", 1)[-1]}</a></li>' for u in (order['pdf_url'], order['xlsx_url']) if u)
    html = (f'<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">'
            f'<p>{order["name"]}, здравствуйте!</p><p>Ваш отчёт по заказу №{order["id"]} готов: <b>{order["report_title"]}</b>.</p>'
            f'<p>Файлы во вложении. Если вложения не открываются, скачайте по ссылкам:</p><ul>{links}</ul>'
            f'<p>Вопросы по отчёту — просто ответьте на это письмо.</p>'
            f'<p>— Команда МАТ-Лабс<br><a href="https://mat-labs.ru/analytics">mat-labs.ru/analytics</a></p></div>')
    send_mail(to, f'Отчёт по заказу №{order["id"]}: {order["report_title"]}', html, files)
    cur.execute(f"""UPDATE {S}.biz_report_orders SET status='sent', sent_at=NOW(), updated_at=NOW() WHERE id=%s""", (oid,))
    conn.commit()
    return resp({'ok': True, 'sent_to': to})


def action_list(conn, p):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    where, args = [], []
    if p.get('status') in STATUSES:
        where.append('status = %s')
        args.append(p['status'])
    q = (p.get('q') or '').strip()
    if q:
        where.append('(name ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR company ILIKE %s OR report_title ILIKE %s OR inn LIKE %s)')
        args += [f'%{q}%'] * 5 + [q + '%']
    w = (' WHERE ' + ' AND '.join(where)) if where else ''
    cur.execute(f'SELECT * FROM {S}.biz_report_orders{w} ORDER BY id DESC LIMIT 300', args)
    items = [dict(r) for r in cur.fetchall()]
    cur.execute(f"""SELECT status, COUNT(*) AS n, COALESCE(SUM(price),0) AS s FROM {S}.biz_report_orders GROUP BY 1""")
    by = {r['status']: {'n': r['n'], 's': r['s']} for r in cur.fetchall()}
    cur.execute(f"""SELECT COUNT(*) AS n FROM {S}.biz_report_orders
                    WHERE name ILIKE '%%тест%%' OR report_title ILIKE '%%тест%%' OR email ILIKE 'test@%%'""")
    tests = cur.fetchone()['n']
    return resp({'items': items, 'by_status': by, 'test_count': tests})


def handler(event: dict, context) -> dict:
    """Админ-раздел заказов отчётов: список, статусы, удаление, генерация PDF/Excel, отправка клиенту."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if not is_admin(event):
        return resp({'error': 'Не авторизован'}, 401)
    p = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = body.get('action') or p.get('action') or 'list'
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if action == 'list':
            return action_list(conn, p)
        oid = int(body.get('id') or 0)
        cur = conn.cursor()
        if action == 'status':
            st = body.get('status')
            if st not in STATUSES:
                return resp({'error': 'Неизвестный статус'}, 400)
            stamp = {'invoiced': ', invoiced_at = COALESCE(invoiced_at, NOW())', 'paid': ', paid_at = COALESCE(paid_at, NOW())',
                     'sent': ', sent_at = COALESCE(sent_at, NOW())'}.get(st, '')
            cur.execute(f'UPDATE {S}.biz_report_orders SET status=%s, updated_at=NOW(){stamp} WHERE id=%s', (st, oid))
            conn.commit()
            return resp({'ok': True})
        if action == 'note':
            cur.execute(f'UPDATE {S}.biz_report_orders SET admin_note=%s, updated_at=NOW() WHERE id=%s',
                        ((body.get('note') or '')[:2000], oid))
            conn.commit()
            return resp({'ok': True})
        if action == 'update':
            fields = {k: (body.get(k) or '').strip()[:300] for k in ('email', 'report_key', 'inn') if k in body}
            if fields:
                sets = ', '.join(f'{k}=%s' for k in fields)
                cur.execute(f'UPDATE {S}.biz_report_orders SET {sets}, updated_at=NOW() WHERE id=%s', list(fields.values()) + [oid])
                conn.commit()
            return resp({'ok': True})
        if action == 'delete':
            ids = [int(x) for x in (body.get('ids') or ([oid] if oid else []))][:500]
            if not ids:
                return resp({'error': 'Не выбраны заказы'}, 400)
            cur.execute(f'DELETE FROM {S}.biz_report_orders WHERE id = ANY(%s)', (ids,))
            n = cur.rowcount
            conn.commit()
            return resp({'ok': True, 'deleted': n})
        if action == 'delete_tests':
            cur.execute(f"""DELETE FROM {S}.biz_report_orders
                            WHERE name ILIKE '%%тест%%' OR report_title ILIKE '%%тест%%' OR email ILIKE 'test@%%'""")
            n = cur.rowcount
            cur.execute(f"""DELETE FROM {S}.contact_requests WHERE source IN ('analytics','radar')
                            AND (name ILIKE '%%тест%%' OR email ILIKE 'test@%%')""")
            n2 = cur.rowcount
            conn.commit()
            return resp({'ok': True, 'deleted': n, 'deleted_requests': n2})
        if action == 'generate':
            return action_generate(conn, oid)
        if action == 'send':
            return action_send(conn, oid, body)
        return resp({'error': 'Неизвестное действие'}, 400)
    finally:
        conn.close()