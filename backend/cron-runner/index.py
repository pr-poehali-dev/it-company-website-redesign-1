"""
Cron Runner — ночной оркестратор автоматизации.
Поддерживает два режима:
  GET /status — проверить когда последний запуск и нужен ли новый (без auth)
  POST /       — запустить цикл (защищён CRON_SECRET или внутренним флагом)
Фронтенд вызывает GET каждый час; если прошло 24ч — запускает POST автоматически.
"""
import json
import os
import urllib.request
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone, timedelta

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Cron-Secret',
}

RADAR_URL    = 'https://functions.poehali.dev/2725883d-2720-4230-8bac-e2703f726abc'
EMAILER_URL  = 'https://functions.poehali.dev/977f553d-a834-4fba-9f2f-349939384e9e'
FOLLOWUP_URL = 'https://functions.poehali.dev/b11d9fef-38cd-4721-9bb3-4d7e7d97927f'
S = os.environ.get('MAIN_DB_SCHEMA', 'public')
INTERVAL_HOURS = 24


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def call(url: str, body: dict, timeout: int = 120) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def json_resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def get_state(conn):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT last_run, last_result FROM {S}.cron_state WHERE key='nightly_run'")
    row = cur.fetchone()
    return dict(row) if row else {'last_run': None, 'last_result': None}


def set_state(conn, last_run, last_result):
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {S}.cron_state (key, last_run, last_result, updated_at)
            VALUES ('nightly_run', %s, %s, now())
            ON CONFLICT (key) DO UPDATE
            SET last_run=%s, last_result=%s, updated_at=now()""",
        (last_run, json.dumps(last_result, default=str),
         last_run, json.dumps(last_result, default=str))
    )
    conn.commit()


def is_due(last_run) -> bool:
    if last_run is None:
        return True
    if isinstance(last_run, str):
        last_run = datetime.fromisoformat(last_run)
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - last_run >= timedelta(hours=INTERVAL_HOURS)


def handler(event: dict, context) -> dict:
    """Оркестратор автоматизации. GET — статус, POST — запуск."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    conn = get_db()
    state = get_state(conn)

    if method == 'GET':
        due = is_due(state['last_run'])
        return json_resp({
            'ok': True,
            'last_run': state['last_run'],
            'is_due': due,
            'interval_hours': INTERVAL_HOURS,
            'last_result': state['last_result'],
        })

    secret = os.environ.get('CRON_SECRET', '')
    if secret:
        body_raw = event.get('body') or '{}'
        try:
            body_parsed = json.loads(body_raw)
        except Exception:
            body_parsed = {}
        incoming = (event.get('headers') or {}).get('x-cron-secret') or \
                   (event.get('headers') or {}).get('X-Cron-Secret') or \
                   body_parsed.get('secret', '')
        if incoming != secret:
            conn.close()
            return json_resp({'error': 'Unauthorized'}, 401)

    started_at = datetime.now(timezone.utc)
    log = []

    print(f"[cron-runner] started at {started_at.isoformat()}")

    r1 = call(RADAR_URL, {'action': 'run_scheduled'}, timeout=115)
    log.append({'step': 'radar_scheduled', 'ok': r1.get('ok', False), 'inserted': r1.get('inserted', 0)})
    print(f"[cron-runner] radar: inserted={r1.get('inserted', 0)}")

    r2 = call(RADAR_URL, {'action': 'run_hh_signals'}, timeout=60)
    log.append({'step': 'hh_signals', 'ok': r2.get('ok', False), 'leads_added': r2.get('leads_added', 0)})
    print(f"[cron-runner] hh: leads_added={r2.get('leads_added', 0)}")

    r3 = call(EMAILER_URL, {'action': 'batch_send'}, timeout=115)
    log.append({'step': 'batch_email', 'ok': r3.get('ok', False), 'sent': r3.get('sent', 0)})
    print(f"[cron-runner] email: sent={r3.get('sent', 0)}")

    r4 = call(FOLLOWUP_URL, {'action': 'schedule_followups'}, timeout=30)
    log.append({'step': 'schedule_followups', 'ok': r4.get('ok', False), 'scheduled': r4.get('scheduled', 0)})
    print(f"[cron-runner] schedule: scheduled={r4.get('scheduled', 0)}")

    r5 = call(FOLLOWUP_URL, {'action': 'run_followups'}, timeout=115)
    log.append({'step': 'run_followups', 'ok': r5.get('ok', False), 'sent': r5.get('sent', 0)})
    print(f"[cron-runner] followups: sent={r5.get('sent', 0)}")

    finished_at = datetime.now(timezone.utc)
    summary = {
        'ok': True,
        'started_at': started_at.isoformat(),
        'finished_at': finished_at.isoformat(),
        'radar_inserted': r1.get('inserted', 0),
        'hh_leads_added': r2.get('leads_added', 0),
        'emails_sent': r3.get('sent', 0),
        'followups_scheduled': r4.get('scheduled', 0),
        'followups_sent': r5.get('sent', 0),
        'log': log,
    }

    set_state(conn, started_at, summary)
    conn.close()
    print(f"[cron-runner] done")
    return json_resp(summary)
