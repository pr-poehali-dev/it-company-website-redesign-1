"""
Уведомление поисковиков об обновлении страниц сайта (протокол IndexNow — Яндекс, Bing).
Берёт адреса из карты сайта, отправляет пачками до 10 000 и пишет итог в журнал.
Доступно только администратору.
"""
import hashlib
import hmac
import json
import os
import re
import urllib.request

SITE = 'https://mat-labs.ru'
HOST = 'mat-labs.ru'
INDEXNOW_KEY = '66653b16b5840ca5a6152a2a58ba4b87'
ENDPOINTS = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow']
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}
UA = {'User-Agent': 'MAT-Labs-SEO/1.0'}


def resp(d, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(d, ensure_ascii=False)}


def is_admin(event):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if not token or not secret or '.' not in token:
        return False
    raw, sig = token.rsplit('.', 1)
    return hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16])


def fetch(url, timeout=8):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'ignore')


def collect(sections):
    index = fetch(f'{SITE}/sitemap.xml')
    maps = re.findall(r'<loc>([^<]+)</loc>', index)
    if '<sitemapindex' not in index:
        maps = [f'{SITE}/sitemap.xml']
    out, stats = [], {}
    for m in maps:
        name = m.rsplit('/', 1)[-1]
        sec = 'radar' if 'radar' in name else 'blog' if 'blog' in name else 'masshtab' if 'masshtab' in name else 'pages'
        if sections and sec not in sections:
            continue
        try:
            urls = re.findall(r'<loc>([^<]+)</loc>', fetch(m))
        except Exception as e:
            stats[name] = f'ошибка: {e}'
            continue
        stats[name] = len(urls)
        out.extend(u for u in urls if u.startswith(SITE))
    return list(dict.fromkeys(out)), stats


def ping(urls):
    results = {}
    for ep in ENDPOINTS:
        codes = []
        for i in range(0, len(urls), 10000):
            body = json.dumps({'host': HOST, 'key': INDEXNOW_KEY, 'keyLocation': f'{SITE}/{INDEXNOW_KEY}.txt',
                               'urlList': urls[i:i + 10000]}).encode()
            req = urllib.request.Request(ep, data=body, method='POST',
                                         headers={**UA, 'Content-Type': 'application/json; charset=utf-8'})
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    codes.append(r.status)
            except urllib.error.HTTPError as e:
                codes.append(e.code)
            except Exception:
                codes.append(0)
        results[ep.split('/')[2]] = codes
    return results


def handler(event: dict, context) -> dict:
    """Отправка адресов сайта в Яндекс и Bing через IndexNow (только для админа)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if not is_admin(event):
        return resp({'error': 'Не авторизован'}, 401)
    body = json.loads(event.get('body') or '{}') if event.get('httpMethod') == 'POST' else {}
    p = event.get('queryStringParameters') or {}
    sections = [s for s in (body.get('sections') or p.get('sections', '').split(',')) if s]
    key_ok = False
    try:
        key_ok = fetch(f'{SITE}/{INDEXNOW_KEY}.txt').strip() == INDEXNOW_KEY
    except Exception:
        key_ok = False
    urls, stats = collect(sections)
    if event.get('httpMethod') != 'POST':
        return resp({'key_ok': key_ok, 'total': len(urls), 'maps': stats})
    if not key_ok:
        return resp({'error': 'Ключ IndexNow не найден на опубликованном сайте — сначала опубликуйте сайт', 'maps': stats}, 409)
    if not urls:
        return resp({'error': 'В карте сайта нет адресов', 'maps': stats}, 400)
    return resp({'ok': True, 'sent': len(urls), 'maps': stats, 'results': ping(urls)})
