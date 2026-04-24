"""
Cron Runner — ночной оркестратор автоматизации.
Вызывается внешним планировщиком (cron-job.org) раз в сутки в 03:00.
Последовательно запускает: радар → авто-рассылка → follow-up планирование → follow-up отправка.
Защищён секретным токеном CRON_SECRET.
"""
import json
import os
import urllib.request
from datetime import datetime, timezone

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Cron-Secret',
}

RADAR_URL    = 'https://functions.poehali.dev/2725883d-2720-4230-8bac-e2703f726abc'
EMAILER_URL  = 'https://functions.poehali.dev/977f553d-a834-4fba-9f2f-349939384e9e'
FOLLOWUP_URL = 'https://functions.poehali.dev/b11d9fef-38cd-4721-9bb3-4d7e7d97927f'


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


def handler(event: dict, context) -> dict:
    """Ночной оркестратор: радар → рассылка → follow-up. Защищён CRON_SECRET."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    secret = os.environ.get('CRON_SECRET', '')
    if secret:
        incoming = (event.get('headers') or {}).get('x-cron-secret') or \
                   (event.get('headers') or {}).get('X-Cron-Secret') or \
                   (json.loads(event['body']) if event.get('body') else {}).get('secret', '')
        if incoming != secret:
            return {
                'statusCode': 401,
                'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Unauthorized'}),
            }

    started_at = datetime.now(timezone.utc).isoformat()
    log = []

    print(f"[cron-runner] started at {started_at}")

    # 1. Радар — ищем новых лидов
    print("[cron-runner] step 1: radar run_scheduled")
    r1 = call(RADAR_URL, {'action': 'run_scheduled'}, timeout=115)
    log.append({'step': 'radar_scheduled', 'result': r1})
    print(f"[cron-runner] radar: {r1}")

    # 2. Парсинг hh.ru — сигналы из вакансий
    print("[cron-runner] step 2: hh signals")
    r2 = call(RADAR_URL, {'action': 'run_hh_signals'}, timeout=60)
    log.append({'step': 'hh_signals', 'result': r2})
    print(f"[cron-runner] hh: {r2}")

    # 3. Пакетная авто-рассылка новым лидам с email
    print("[cron-runner] step 3: batch email")
    r3 = call(EMAILER_URL, {'action': 'batch_send'}, timeout=115)
    log.append({'step': 'batch_email', 'result': r3})
    print(f"[cron-runner] email: {r3}")

    # 4. Запланировать follow-up для лидов без ответа
    print("[cron-runner] step 4: schedule followups")
    r4 = call(FOLLOWUP_URL, {'action': 'schedule_followups'}, timeout=30)
    log.append({'step': 'schedule_followups', 'result': r4})
    print(f"[cron-runner] schedule: {r4}")

    # 5. Выполнить follow-up рассылку
    print("[cron-runner] step 5: run followups")
    r5 = call(FOLLOWUP_URL, {'action': 'run_followups'}, timeout=115)
    log.append({'step': 'run_followups', 'result': r5})
    print(f"[cron-runner] followups: {r5}")

    finished_at = datetime.now(timezone.utc).isoformat()
    summary = {
        'ok': True,
        'started_at': started_at,
        'finished_at': finished_at,
        'radar_inserted': r1.get('inserted', 0),
        'hh_leads_added': r2.get('leads_added', 0),
        'emails_sent': r3.get('sent', 0),
        'followups_scheduled': r4.get('scheduled', 0),
        'followups_sent': r5.get('sent', 0),
        'log': log,
    }
    print(f"[cron-runner] done: {summary}")

    return {
        'statusCode': 200,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(summary, ensure_ascii=False, default=str),
    }
