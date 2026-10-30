"""Цитата дня журнала «Масштаб»: выбор на текущий день по Москве, архив, управление из админки."""
from datetime import date, datetime, timedelta, timezone

MSK = timezone(timedelta(hours=3))
COLS = 'q.id, q.text, q.author, q.author_role, q.source, q.comment'


def today():
    return datetime.now(MSK).date()


def pick(conn, S, day: date):
    cur = conn.cursor()
    cur.execute(f"SELECT {COLS}, d.day FROM {S}.mag_quote_days d JOIN {S}.mag_quotes q ON q.id = d.quote_id WHERE d.day = %s", (day,))
    row = cur.fetchone()
    if row:
        return dict(row)
    cur.execute(f"SELECT {COLS} FROM {S}.mag_quotes q WHERE q.active AND q.show_date = %s LIMIT 1", (day,))
    row = cur.fetchone()
    if not row:
        cur.execute(f"""SELECT {COLS} FROM {S}.mag_quotes q
                        LEFT JOIN (SELECT quote_id, MAX(day) AS last_day, COUNT(*) AS n FROM {S}.mag_quote_days GROUP BY quote_id) u ON u.quote_id = q.id
                        WHERE q.active AND (q.show_date IS NULL OR q.show_date < %s)
                        ORDER BY COALESCE(u.n, 0), u.last_day NULLS FIRST, md5(q.id::text || %s) LIMIT 1""", (day, day.isoformat()))
        row = cur.fetchone()
    if not row:
        return None
    cur.execute(f"INSERT INTO {S}.mag_quote_days (day, quote_id) VALUES (%s, %s) ON CONFLICT (day) DO NOTHING", (day, row['id']))
    conn.commit()
    cur.execute(f"SELECT {COLS}, d.day FROM {S}.mag_quote_days d JOIN {S}.mag_quotes q ON q.id = d.quote_id WHERE d.day = %s", (day,))
    r = cur.fetchone()
    return dict(r) if r else None


def action_quote(conn, S, p):
    d = today()
    q = pick(conn, S, d)
    archive = []
    if p.get('archive'):
        cur = conn.cursor()
        cur.execute(f"""SELECT {COLS}, d.day FROM {S}.mag_quote_days d JOIN {S}.mag_quotes q ON q.id = d.quote_id
                        WHERE d.day < %s ORDER BY d.day DESC LIMIT 30""", (d,))
        archive = [dict(r) for r in cur.fetchall()]
    return {'quote': q, 'archive': archive, 'today': d.isoformat()}


def action_quotes_admin(conn, S):
    cur = conn.cursor()
    cur.execute(f"""SELECT q.*, (SELECT MAX(day) FROM {S}.mag_quote_days d WHERE d.quote_id = q.id) AS last_shown,
                           (SELECT COUNT(*) FROM {S}.mag_quote_days d WHERE d.quote_id = q.id) AS shown
                    FROM {S}.mag_quotes q ORDER BY q.show_date DESC NULLS LAST, q.id DESC""")
    return {'quotes': [dict(r) for r in cur.fetchall()], 'today': today().isoformat()}


def action_save_quote(conn, S, b):
    text = (b.get('text') or '').strip()
    author = (b.get('author') or '').strip()
    if len(text) < 5 or not author:
        return {'error': 'Нужны текст цитаты и автор'}, 400
    f = {
        'text': text[:1000], 'author': author[:200], 'author_role': (b.get('author_role') or '').strip()[:300],
        'source': (b.get('source') or '').strip()[:300], 'comment': (b.get('comment') or '').strip()[:1500],
        'active': bool(b.get('active', True)),
    }
    sd = (b.get('show_date') or '').strip() or None
    if sd:
        try:
            sd = date.fromisoformat(sd)
        except ValueError:
            return {'error': 'Неверная дата показа'}, 400
    cur = conn.cursor()
    if sd:
        cur.execute(f"SELECT id FROM {S}.mag_quotes WHERE show_date = %s AND id <> %s", (sd, int(b.get('id') or 0)))
        if cur.fetchone():
            return {'error': 'На эту дату уже запланирована другая цитата'}, 400
    if b.get('id'):
        qid = int(b['id'])
        cur.execute(f"""UPDATE {S}.mag_quotes SET text=%s, author=%s, author_role=%s, source=%s, comment=%s, active=%s, show_date=%s
                        WHERE id=%s""", (f['text'], f['author'], f['author_role'], f['source'], f['comment'], f['active'], sd, qid))
    else:
        cur.execute(f"""INSERT INTO {S}.mag_quotes (text, author, author_role, source, comment, active, show_date)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (f['text'], f['author'], f['author_role'], f['source'], f['comment'], f['active'], sd))
        qid = cur.fetchone()['id']
    if sd and sd >= today():
        cur.execute(f"UPDATE {S}.mag_quote_days SET quote_id=%s WHERE day=%s", (qid, sd))
    conn.commit()
    return {'ok': True, 'id': qid}, 200


def action_delete_quote(conn, S, b):
    qid = int(b.get('id') or 0)
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM {S}.mag_quote_days WHERE quote_id=%s LIMIT 1", (qid,))
    if cur.fetchone():
        cur.execute(f"UPDATE {S}.mag_quotes SET active=FALSE, show_date=NULL WHERE id=%s", (qid,))
        cur.execute(f"DELETE FROM {S}.mag_quote_days WHERE quote_id=%s AND day >= %s", (qid, today()))
    else:
        cur.execute(f"DELETE FROM {S}.mag_quotes WHERE id=%s", (qid,))
    conn.commit()
    return {'ok': True}
