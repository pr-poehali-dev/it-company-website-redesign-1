"""Аккаунты аналитики: тарифы, лимиты, открытые отчёты, слежение за контрагентами. Вход — общий с Конвейером данных."""
import hashlib
import hmac
import json
import os
import smtplib
import time
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.utils import formataddr

import psycopg2.extras

PLANS = {
    'free': {'title': 'Бесплатный', 'price': 0, 'company': 3, 'market': 1, 'market_period': 'total', 'watch': 3, 'rating': False},
    'pro': {'title': 'Аналитика Про', 'price': 2990, 'company': None, 'market': 3, 'market_period': 'month', 'watch': 30, 'rating': True},
    'corp': {'title': 'Отдел продаж', 'price': 9900, 'company': None, 'market': 10, 'market_period': 'month', 'watch': 100, 'rating': True},
}
SENDER = 'atyurin2@yandex.ru'


def _key():
    return hashlib.sha256(('pipes:' + os.environ['ADMIN_TOKEN_SECRET']).encode()).digest()


def user_id(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    parts = (h.get('x-user-token') or '').split('.')
    if len(parts) != 3 or not os.environ.get('ADMIN_TOKEN_SECRET'):
        return None
    raw = f'{parts[0]}.{parts[1]}'
    if not hmac.compare_digest(parts[2], hmac.new(_key(), raw.encode(), hashlib.sha256).hexdigest()[:32]):
        return None
    try:
        if int(parts[1]) < time.time():
            return None
        return int(parts[0])
    except ValueError:
        return None


def get_user(cur, uid):
    cur.execute(f"SELECT id, email, name, company, biz_plan, biz_plan_until FROM {S()}.pipe_users WHERE id=%s", (uid,))
    u = cur.fetchone()
    if not u:
        return None
    u = dict(u)
    if u['biz_plan'] != 'free' and u['biz_plan_until'] and u['biz_plan_until'] < datetime.now(timezone.utc):
        u['biz_plan'] = 'free'
    return u


def S():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def usage(cur, u):
    plan = PLANS[u['biz_plan']]
    month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cur.execute(f"""SELECT kind, COUNT(*) FILTER (WHERE created_at >= %s) AS m, COUNT(*) AS t FROM {S()}.biz_unlocks
                    WHERE user_id=%s GROUP BY kind""", (month, u['id']))
    used = {r['kind']: r for r in cur.fetchall()}
    cur.execute(f"SELECT COUNT(*) AS n FROM {S()}.biz_watch WHERE user_id=%s AND active", (u['id'],))
    watch = cur.fetchone()['n']
    c = used.get('company') or {'m': 0, 't': 0}
    m = used.get('market') or {'m': 0, 't': 0}
    return {
        'company': {'used': c['t'] if u['biz_plan'] == 'free' else c['m'], 'limit': plan['company'], 'period': 'total' if u['biz_plan'] == 'free' else 'month'},
        'market': {'used': m['t'] if plan['market_period'] == 'total' else m['m'], 'limit': plan['market'], 'period': plan['market_period']},
        'watch': {'used': watch, 'limit': plan['watch']},
    }


def is_unlocked(cur, uid, kind, key):
    cur.execute(f"SELECT 1 FROM {S()}.biz_unlocks WHERE user_id=%s AND kind=%s AND key=%s", (uid, kind, key))
    return cur.fetchone() is not None


def access(conn, event, kind, key):
    """Возвращает (full: bool, user: dict|None). Подписчики Про/Отдел продаж видят отчёты о компаниях без лимита."""
    uid = user_id(event)
    if not uid:
        return False, None
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    u = get_user(cur, uid)
    if not u:
        return False, None
    if kind == 'company' and PLANS[u['biz_plan']]['company'] is None:
        return True, u
    if kind == 'rating':
        return PLANS[u['biz_plan']]['rating'], u
    return is_unlocked(cur, uid, kind, key), u


def unlock(conn, uid, kind, key, title):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    u = get_user(cur, uid)
    if not u:
        return {'error': 'Войдите заново'}, 401
    if is_unlocked(cur, uid, kind, key) or (kind == 'company' and PLANS[u['biz_plan']]['company'] is None):
        return {'ok': True, 'already': True}, 200
    use = usage(cur, u)[kind]
    if use['limit'] is not None and use['used'] >= use['limit']:
        what = 'отчётов о компаниях' if kind == 'company' else 'отчётов о рынках'
        per = 'в этом месяце' if use['period'] == 'month' else 'на бесплатном тарифе'
        return {'error': f'Лимит {what} {per} исчерпан ({use["used"]} из {use["limit"]})', 'upgrade': True}, 403
    cur.execute(f"""INSERT INTO {S()}.biz_unlocks (user_id, kind, key, title) VALUES (%s,%s,%s,%s)
                    ON CONFLICT DO NOTHING""", (uid, kind, key, (title or '')[:300]))
    conn.commit()
    return {'ok': True}, 200


def me(conn, uid):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    u = get_user(cur, uid)
    if not u:
        return {'error': 'Войдите заново'}, 401
    cur.execute(f"SELECT kind, key, title, created_at FROM {S()}.biz_unlocks WHERE user_id=%s ORDER BY id DESC LIMIT 100", (uid,))
    unlocks = [dict(r) for r in cur.fetchall()]
    cur.execute(f"""SELECT inn, name, snapshot, changes, last_checked_at, last_change_at, created_at FROM {S()}.biz_watch
                    WHERE user_id=%s AND active ORDER BY last_change_at DESC NULLS LAST, id DESC""", (uid,))
    watch = [dict(r) for r in cur.fetchall()]
    return {'user': u, 'plan': PLANS[u['biz_plan']], 'plans': PLANS, 'usage': usage(cur, u), 'unlocks': unlocks, 'watch': watch}, 200


# ---------- слежение ----------

def snapshot(c, egrul, risk):
    d = (egrul or {}).get('data') or {}
    return {
        'status': (d.get('state') or {}).get('status') or '',
        'head': ((d.get('management') or {}).get('name')) or '',
        'address': ((d.get('address') or {}).get('value')) or '',
        'address_invalid': bool(((d.get('address') or {}).get('invalidity'))),
        'tax_debt': c.get('tax_debt') or 0,
        'revenue': c.get('revenue'),
        'risk': risk['score'],
        'risk_level': risk['level'],
    }


STATUS_RU = {'ACTIVE': 'действующая', 'LIQUIDATING': 'ликвидируется', 'LIQUIDATED': 'ликвидирована',
             'BANKRUPT': 'банкрот', 'REORGANIZING': 'реорганизация'}


def diff(old, new, money):
    out = []
    if not old:
        return out
    if new['status'] and old.get('status') != new['status']:
        out.append({'level': 'high' if new['status'] != 'ACTIVE' else 'good',
                    'text': f"Статус: {STATUS_RU.get(old.get('status'), old.get('status') or '—')} → {STATUS_RU.get(new['status'], new['status'])}"})
    if new['head'] and old.get('head') and old['head'] != new['head']:
        out.append({'level': 'mid', 'text': f"Сменился руководитель: {old['head']} → {new['head']}"})
    if new['address'] and old.get('address') and old['address'] != new['address']:
        out.append({'level': 'mid', 'text': 'Сменился юридический адрес'})
    if new['address_invalid'] and not old.get('address_invalid'):
        out.append({'level': 'high', 'text': 'Адрес признан недостоверным в ЕГРЮЛ'})
    if (new['tax_debt'] or 0) > (old.get('tax_debt') or 0):
        out.append({'level': 'high', 'text': f"Появилась или выросла налоговая недоимка: {money(new['tax_debt'])}"})
    if old.get('risk') is not None and new['risk'] - old['risk'] >= 15:
        out.append({'level': 'high', 'text': f"Индекс риска вырос: {old['risk']} → {new['risk']}"})
    return out


def send_mail(to, subject, html):
    pw = os.environ.get('SMTP_PASSWORD')
    if not pw:
        return False
    msg = MIMEText(html, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('МАТ-Лабс Аналитика', SENDER))
    msg['To'] = to
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=5) as srv:
            srv.login(SENDER, pw)
            srv.sendmail(SENDER, [to], msg.as_bytes())
        return True
    except Exception as e:
        print(f'[biz] watch mail failed: {e}')
        return False


def watch_add(conn, uid, inn, build):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    u = get_user(cur, uid)
    if not u:
        return {'error': 'Войдите заново'}, 401
    cur.execute(f"SELECT id, active FROM {S()}.biz_watch WHERE user_id=%s AND inn=%s", (uid, inn))
    ex = cur.fetchone()
    if ex and ex['active']:
        return {'ok': True, 'already': True}, 200
    use = usage(cur, u)['watch']
    if use['used'] >= use['limit']:
        return {'error': f'На тарифе «{PLANS[u["biz_plan"]]["title"]}» можно следить за {use["limit"]} компаниями', 'upgrade': True}, 403
    snap, name = build(inn)
    if snap is None:
        return {'error': 'Компания не найдена'}, 404
    cur.execute(f"""INSERT INTO {S()}.biz_watch (user_id, inn, name, snapshot, last_checked_at, active) VALUES (%s,%s,%s,%s,NOW(),TRUE)
                    ON CONFLICT (user_id, inn) DO UPDATE SET active=TRUE, snapshot=EXCLUDED.snapshot, name=EXCLUDED.name, last_checked_at=NOW()""",
                (uid, inn, name[:500], json.dumps(snap, ensure_ascii=False)))
    conn.commit()
    return {'ok': True}, 200


def watch_remove(conn, uid, inn):
    cur = conn.cursor()
    cur.execute(f"UPDATE {S()}.biz_watch SET active=FALSE WHERE user_id=%s AND inn=%s", (uid, inn))
    conn.commit()
    return {'ok': True}, 200


def watch_run(conn, build, money, deadline):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT w.id, w.user_id, w.inn, w.name, w.snapshot, w.changes, u.email FROM {S()}.biz_watch w
                    JOIN {S()}.pipe_users u ON u.id = w.user_id
                    WHERE w.active AND (w.last_checked_at IS NULL OR w.last_checked_at < NOW() - INTERVAL '20 hours')
                    ORDER BY w.last_checked_at NULLS FIRST LIMIT 40""")
    items = cur.fetchall()
    done, alerts = 0, {}
    for w in items:
        if time.time() > deadline:
            break
        if done and time.time() + 2.8 > deadline:
            break
        snap, name = build(w['inn'])
        if snap is None:
            cur.execute(f"UPDATE {S()}.biz_watch SET last_checked_at=NOW() WHERE id=%s", (w['id'],))
            conn.commit()
            continue
        ch = diff(w['snapshot'], snap, money)
        if ch:
            stamp = datetime.now(timezone.utc).isoformat()
            hist = ([{**c, 'at': stamp} for c in ch] + list(w['changes'] or []))[:30]
            cur.execute(f"""UPDATE {S()}.biz_watch SET snapshot=%s, changes=%s, last_checked_at=NOW(), last_change_at=NOW() WHERE id=%s""",
                        (json.dumps(snap, ensure_ascii=False), json.dumps(hist, ensure_ascii=False), w['id']))
            alerts.setdefault(w['email'], []).append((w['name'] or w['inn'], w['inn'], ch))
        else:
            cur.execute(f"UPDATE {S()}.biz_watch SET snapshot=%s, last_checked_at=NOW() WHERE id=%s", (json.dumps(snap, ensure_ascii=False), w['id']))
        conn.commit()
        done += 1
    for email, lst in alerts.items():
        body = ''.join(
            f'<div style="margin:14px 0;padding:12px;border:1px solid #eee;border-radius:10px"><b>{n}</b> <span style="color:#888">ИНН {i}</span>'
            + ''.join(f'<div style="margin-top:6px;color:{"#be123c" if c["level"] == "high" else "#b45309" if c["level"] == "mid" else "#047857"}">• {c["text"]}</div>' for c in ch)
            + f'<div style="margin-top:8px"><a href="https://mat-labs.ru/analytics/company/{i}">Открыть отчёт</a></div></div>'
            for n, i, ch in lst)
        send_mail(email, f'Изменения у контрагентов: {len(lst)}', (
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;color:#111">'
            '<div style="font-size:13px;color:#7c3aed;font-weight:bold;letter-spacing:1px">МАТ-ЛАБС · СЛЕЖЕНИЕ</div>'
            f'<h2 style="margin:10px 0">Изменились данные у {len(lst)} компаний</h2>{body}'
            '<p style="color:#888;font-size:12px"><a href="https://mat-labs.ru/analytics/account">Список слежения</a></p></div>'))
    return {'ok': True, 'checked': done, 'left': max(0, len(items) - done), 'alerts': sum(len(v) for v in alerts.values())}


# ---------- админ ----------

def admin_accounts(conn):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT u.id, u.email, u.name, u.company, u.biz_plan, u.biz_plan_until, u.plan AS pipes_plan, u.created_at, u.last_login_at,
                    (SELECT COUNT(*) FROM {S()}.biz_unlocks b WHERE b.user_id=u.id) AS unlocks,
                    (SELECT COUNT(*) FROM {S()}.biz_watch w WHERE w.user_id=u.id AND w.active) AS watch,
                    (SELECT COUNT(*) FROM {S()}.pipe_sources s WHERE s.user_id=u.id AND NOT s.archived) AS sources
                    FROM {S()}.pipe_users u WHERE u.email NOT LIKE '%@test.mat-labs.local' ORDER BY u.id DESC LIMIT 300""")
    return {'items': [dict(r) for r in cur.fetchall()], 'plans': PLANS}, 200


def admin_set_plan(conn, body):
    email = (body.get('email') or '').strip().lower()
    plan = body.get('plan')
    if plan not in PLANS:
        return {'error': 'Неизвестный тариф'}, 400
    months = max(0, min(int(body.get('months') or 1), 36))
    until = datetime.now(timezone.utc) + timedelta(days=31 * months) if plan != 'free' else None
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""INSERT INTO {S()}.pipe_users (email, biz_plan, biz_plan_until, source) VALUES (%s,%s,%s,'admin')
                    ON CONFLICT (email) DO UPDATE SET biz_plan=EXCLUDED.biz_plan, biz_plan_until=EXCLUDED.biz_plan_until RETURNING id""",
                (email, plan, until))
    uid = cur.fetchone()['id']
    if plan == 'corp':
        cur.execute(f"UPDATE {S()}.pipe_users SET plan='pro', plan_until=%s WHERE id=%s", (until, uid))
    conn.commit()
    return {'ok': True, 'until': until}, 200
