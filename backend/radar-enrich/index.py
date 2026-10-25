"""
Обогащение каталога «Радар заказчиков» контактами.
Конвейер по каждой компании: ЕГРЮЛ (DaData) → поиск официального сайта (Яндекс) →
проверка сайта по ИНН → сбор email и телефонов со страниц сайта.
Работает пачками в пределах времени функции, можно запускать параллельно (очередь с блокировкой).
Actions (POST): batch, stats, recent, runs, diag, reset_errors.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg2
import psycopg2.extras

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Secret',
}
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
EMAIL_RE = re.compile(r'(?<![\w.+-])[a-zA-Z0-9][\w.+-]{0,63}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,12}(?![\w-])')
PHONE_RE = re.compile(r'(?<!\d)(?:\+7|8)[\s\-\u00a0]?\(?\d{3,5}\)?[\s\-\u00a0]?\d{1,3}[\s\-\u00a0]?\d{2}[\s\-\u00a0]?\d{2}(?!\d)')
TEL_RE = re.compile(r'href=["\']tel:([+\d\s()\-]{10,20})', re.I)
MAILTO_RE = re.compile(r'href=["\']mailto:([^"\'?]+)', re.I)

AGGREGATORS = (
    'checko.ru', 'rusprofile.ru', 'list-org.com', 'zachestnyibiznes.ru', 'sbis.ru', 'kontur.ru', 'audit-it.ru',
    'spark-interfax.ru', 'nalog.ru', 'nalog.gov.ru', 'egrul.', 'rbc.ru', 'companies.rbc.ru', 'vbankcenter.ru',
    'yandex.ru', 'ya.ru', 'google.ru', 'google.com', 'vk.com', 'ok.ru', 't.me', 'youtube.com', 'dzen.ru', 'wikipedia.org',
    'hh.ru', 'superjob.ru', 'avito.ru', '2gis.ru', 'zoon.ru', 'yell.ru', 'orgpage.ru', 'spravker.ru', 'rusfirms.ru',
    'cataloxy.ru', 'bizly.ru', 'ogrn.ru', 'inn-ogrn', 'synapsenet.ru', 'focus.kontur', 'saby.ru', 'gosuslugi.ru',
    'zakupki.gov.ru', 'rostender', 'tenderguru', 'b2b-center', 'tbank.ru', 'tinkoff.ru', 'sberbank', 'alfabank',
    'prodoctorov', 'flamp.ru', 'mapcard', 'spr.ru', 'kartoteka.ru', 'e-ecolog', 'bo.nalog', 'clearspending',
    'ruprofile', 'excheck', 'datanewton', 'companium', 'rusprofile',
    'msp.gov.ru', 'fasie.ru', 'mail.ru', 'pulscen.ru', 'tiu.ru', 'satu.kz', 'ozon.ru',
    'wildberries.ru', 'market.yandex', 'instagram.com', 'facebook.com', 'telegram', 'whatsapp', 'drive2.ru',
    'star-pro.ru', 'prima-inform', 'sensus.kz', 'movizor', 'tochka.com', 'rbc.ru', 'interfax', 'fedresurs',
    'kad.arbitr', 'sudact', 'egrinf', 'rekvizitov', 'baza-firm', 'vsefirmy', 'ofdata', 'nalogia', 'k-agent',
    'checkcompany', 'ogrnik', 'rusbase', 'b2bpoisk', 'agroserver.ru', 'prom.ua', 'tenchat', 'zakupki.', 'torgi.gov',
    'sravni.ru', 'b2b.house', 'otc.ru', 'xfirm.ru', 'klerk.ru', 'skrin.ru', 'birweb', '1prime.ru', 'reputation.ru',
    'injust.pro', 'vk.ru', 'clients.site', 'flypobeda', 'gov.ru', 'zaksobr', 'duma.',
    'rosstat', 'minpromtorg', 'economy.gov', 'msp.ru', 'mybusiness.ru', 'mos.ru', 'gov.spb.ru',
    'ria.ru', 'tass.ru', 'kommersant.ru', 'vedomosti.ru', 'regnum.ru', 'lenta.ru', 'gazeta.ru', 'rbc.ru',
    'pravda', 'aif.ru', 'kp.ru', 'mk.ru', 'rg.ru', 'fontanka', 'ngs', 'e1.ru', '74.ru', 'dairy-news', 'agroinvestor',
    'agbz.ru', 'milknews.ru', 'specagro.ru', 'pulscen', 'blizko.ru', 'deal.by',
    'all-companies', 'org-info', 'orginfo', 'rekvizit', 'kontragent',
    'proverka', 'bfo.', 'buhgalteria.ru', 'glavbukh.ru', 'consultant.ru', 'garant.ru', 'sudrf.ru', 'arbitr.ru',
    'wikipedia', 'wiktionary', 'steampowered', 'apple.com', 'microsoft', 'github', 'reddit', 'pinterest', 'linkedin', 'twitter', 'x.com',
    'rutube', 'livejournal', 'pikabu', 'otzovik', 'irecommend', 'kartaslov', 'gramota', 'russkiiyazyk', 'translate',
    'orgs.biz', 'biz.ru', 'firmika', 'spravka', 'list-org', 'jsprav', 'yp.ru', 'misto', 'ruscatalog', 'catalog',
    'profkurort', 'residence',
)
JUNK_EMAIL = ('example.', 'domain.', 'sentry', 'wixpress', 'yourmail', 'email.com', 'mysite', 'site.ru', 'test@',
              'noreply', 'no-reply', 'webmaster@', 'postmaster', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
              'tilda', 'nginx', 'bitrix', 'ucoz', 'wordpress', 'jquery', 'core@', 'name@', 'user@', 'ivanov@',
              'mail@mail.ru', 'info@info', 'abuse@', 'privacy@', 'gdpr@')
CONTACT_PATHS = ('', '/contacts', '/kontakty', '/contact', '/contacts/', '/kontakty/', '/rekvizity', '/about')


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str)}


def authorized(event, body):
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    cron = os.environ.get('CRON_SECRET', '')
    if cron and (h.get('x-cron-secret') == cron or body.get('secret') == cron):
        return 'cron'
    token = h.get('x-session-token', '')
    secret = os.environ.get('ADMIN_TOKEN_SECRET', '')
    if token and secret and '.' in token:
        raw, sig = token.rsplit('.', 1)
        if hmac.compare_digest(sig, hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]):
            return 'admin'
    return None


_DEADLINE = {'t': 0.0}


def http(url, timeout=6, data=None, headers=None, limit=600_000):
    if _DEADLINE['t']:
        left = _DEADLINE['t'] - time.time() - 0.2
        if left < 0.6:
            return {'ok': False, 'status': 0, 'error': 'нет времени'}
        timeout = min(timeout, left)
    h = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
         'Accept-Language': 'ru-RU,ru;q=0.9'}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h, method='POST' if data else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(limit)
            ctype = r.headers.get('Content-Type', '')
            enc = 'utf-8'
            m = re.search(r'charset=([\w-]+)', ctype)
            if m:
                enc = m.group(1)
            elif b'windows-1251' in raw[:3000].lower():
                enc = 'cp1251'
            return {'ok': True, 'status': r.status, 'url': r.geturl(), 'text': raw.decode(enc, errors='ignore')}
    except urllib.error.HTTPError as e:
        return {'ok': False, 'status': e.code, 'error': f'HTTP {e.code}'}
    except Exception as e:
        return {'ok': False, 'status': 0, 'error': str(e)[:120]}


# ── Источник 1: ЕГРЮЛ через DaData ──────────────────────────────────────────

def dadata_party(inn):
    key = os.environ.get('DADATA_API_KEY', '')
    if not key:
        return None, 'нет ключа DaData'
    r = http('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
             data=json.dumps({'query': inn, 'count': 1}).encode(), timeout=2.5,
             headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': f'Token {key}'})
    if not r['ok']:
        return None, f"DaData: {r.get('error')}"
    sug = (json.loads(r['text']).get('suggestions') or [])
    if not sug:
        return None, 'нет в ЕГРЮЛ'
    return sug[0].get('data') or {}, ''


# ── Источник 2: поиск официального сайта ────────────────────────────────────

def yandex_search(query):
    """Яндекс Поиск API v2 (Yandex Cloud): ответ — XML в base64."""
    key = os.environ.get('YANDEX_XML_KEY', '')
    if not key:
        return None, 'нет ключа Яндекса'
    payload = {'query': {'searchType': 'SEARCH_TYPE_RU', 'queryText': query, 'familyMode': 'FAMILY_MODE_NONE'},
               'groupSpec': {'groupMode': 'GROUP_MODE_FLAT', 'groupsOnPage': '10', 'docsInGroup': '1'},
               'maxPassages': '1', 'l10n': 'LOCALIZATION_RU', 'responseFormat': 'FORMAT_XML'}
    folder = os.environ.get('YANDEX_FOLDER_ID', '')
    if folder:
        payload['folderId'] = folder
    r = http('https://searchapi.api.cloud.yandex.net/v2/web/search', timeout=7, data=json.dumps(payload).encode(),
             headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': f'Api-Key {key}'})
    if not r['ok']:
        return None, f"Яндекс: {r.get('error')}"
    try:
        xml = base64.b64decode(json.loads(r['text']).get('rawData') or '').decode('utf-8', 'ignore')
    except Exception:
        return None, 'Яндекс: не разобрать ответ'
    if '<error' in xml:
        m = re.search(r'<error[^>]*>(.*?)</error>', xml, re.S)
        return None, f"Яндекс: {(m.group(1) if m else 'ошибка')[:80]}"
    return re.findall(r'<url>(.*?)</url>', xml), ''


def bing_search(query):
    r = http('https://www.bing.com/search?setlang=ru&cc=RU&q=' + urllib.parse.quote(query), timeout=7)
    if not r['ok']:
        return None, f"Bing: {r.get('error')}"
    out = []
    for u in re.findall(r'<li class="b_algo".*?<a[^>]+href="(https?://[^"]+)"', r['text'], re.S):
        u = u.replace('&amp;', '&')
        m = re.search(r'[?&]u=a1([^&]+)', u)
        if m:
            try:
                b = m.group(1)
                u = base64.urlsafe_b64decode(b + '=' * (-len(b) % 4)).decode('utf-8', 'ignore')
            except Exception:
                continue
        out.append(u)
    return out, ''


def search_urls(query):
    notes = []
    for fn in (yandex_search, bing_search):
        urls, note = fn(query)
        if urls:
            return urls, fn.__name__.split('_')[0]
        if note:
            notes.append(note)
    return [], '; '.join(notes) or 'ничего не найдено'


def domain_of(url):
    try:
        net = urllib.parse.urlparse(url if '://' in url else 'http://' + url).netloc.lower()
    except Exception:
        return ''
    net = net.split('@')[-1].split(':')[0]
    return net[4:] if net.startswith('www.') else net


AGG_WORDS = ('egrul', 'rusprofile', 'kontragent', 'rekvizit', 'proverka', 'spravoch', 'katalog-firm', 'orginfo',
             'inn-', '-inn', 'ogrn', 'listorg', 'firmy-', 'vsefirm', 'bazafirm', 'company-info', 'companyinfo')


def is_aggregator(dom):
    return not dom or any(a in dom for a in AGGREGATORS) or any(w in dom for w in AGG_WORDS)


def norm_phone(p):
    d = re.sub(r'\D', '', p)
    if len(d) == 11 and d[0] in '78':
        d = '7' + d[1:]
    elif len(d) == 10:
        d = '7' + d
    else:
        return ''
    if d[1] in '0':
        return ''
    if d[1] == '9':
        return f'+7 {d[1:4]} {d[4:7]}-{d[7:9]}-{d[9:11]}'
    return f'+7 {d[1:4]} {d[4:7]}-{d[7:9]}-{d[9:11]}'


def clean_text(html):
    html = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', html, flags=re.S | re.I)
    txt = re.sub(r'<[^>]+>', ' ', html)
    txt = re.sub(r'&nbsp;|&#160;', ' ', txt)
    return re.sub(r'\s+', ' ', txt)


def extract_contacts(html, site_dom):
    emails, phones = [], []
    for e in MAILTO_RE.findall(html) + EMAIL_RE.findall(clean_text(html)):
        e = urllib.parse.unquote(e).strip().strip('.').lower()
        e = re.split(r'["\'\s\\<>]', e)[0]
        if not EMAIL_RE.fullmatch(e):
            continue
        if len(e) > 80 or any(j in e for j in JUNK_EMAIL) or e in emails:
            continue
        emails.append(e)
    for p in TEL_RE.findall(html) + PHONE_RE.findall(clean_text(html)):
        n = norm_phone(p)
        dg = re.sub(r'\D', '', n)
        if n and (dg[-7:] in ('1234567', '0000000', '1111111', '9999999') or len(set(dg[4:])) <= 2):
            continue
        if n and n not in phones:
            phones.append(n)

    def rank(e):
        local, dom = e.split('@', 1)
        same = 0 if site_dom and (dom == site_dom or dom.endswith('.' + site_dom)) else 1
        role = 0 if local in ('info', 'office', 'mail', 'contact', 'sales', 'zakaz', 'secretary', 'priem', 'company') else 1
        return (same, role)
    emails.sort(key=rank)
    return emails[:5], phones[:5]


TR = dict(zip('абвгдеёзийклмнопрстуфхцы', ['a','b','v','g','d','e','e','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','c','y']))
TR.update({'ж': 'zh', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ю': 'yu', 'я': 'ya', 'ъ': '', 'ь': '', 'э': 'e'})


def translit(t):
    return ''.join(TR.get(ch, ch) for ch in t)


def name_variants(short_name):
    n = (short_name or '').lower().replace('ё', 'е')
    for _ in range(2):
        n = re.sub(r'^(ооо|ао|пао|зао|оао|ип|кфх|спк|пск|сппк|нпф|нпо|гк|тд|ап|апк|апх|фгуп|муп|ано|пз|двх|сх|сельхозартель|колхоз|племзавод|агрофирма)[\s\-]+', '', n)
    n = n.strip('«»"\' ').strip()
    out = {n} if len(n) >= 4 else set()
    if '-' in n:
        out.add(n.replace('-', ' '))
    return [x for x in out if len(x) >= 4]


GENERIC = {'возрождение', 'монолит', 'богатырь', 'молоко', 'норман', 'ремера', 'альфа плюс', 'золотая осень', 'солнечная поляна',
           'аврора', 'радуга', 'родник', 'славянка', 'альтернатива', 'сириус', 'альфа', 'омега', 'дельта', 'гамма',
           'янтарь', 'березка', 'ромашка', 'колосок', 'солнышко', 'светлана', 'елена', 'мечта', 'уют', 'комфорт', 'родина', 'прогресс', 'победа', 'рассвет', 'заря', 'кирова', 'ленина', 'восход', 'россия', 'нива', 'урожай',
           'колос', 'дружба', 'мир', 'звезда', 'сибирь', 'урал', 'север', 'юг', 'восток', 'запад', 'альянс', 'партнер',
           'стандарт', 'гарант', 'лидер', 'вектор', 'импульс', 'старт', 'успех', 'фортуна', 'надежда', 'вега', 'гермес',
           'атлант', 'феникс', 'орион', 'сфера', 'спектр', 'ресурс', 'инвест', 'капитал', 'строй', 'сервис', 'техно',
           'регион', 'развитие', 'будущее', 'новый путь', 'красный октябрь', 'искра', 'маяк', 'луч', 'агро', 'авангард'}


def geo_terms(region, address):
    terms = set()
    for src in (region or '', address or ''):
        for w in re.findall(r'[А-ЯЁ][а-яёА-ЯЁ\-]{3,}', src):
            wl = w.lower()
            if wl in ('область', 'республика', 'край', 'район', 'улица', 'город', 'поселок', 'село', 'деревня', 'округ', 'муниципальный'):
                continue
            terms.add(wl[:6])
    return list(terms)[:8]


def domain_matches(dom, variants):
    base = dom.split('.')[0] if not dom.startswith('xn--') else dom
    try:
        uni = dom.encode().decode('idna') if 'xn--' in dom else dom
    except Exception:
        uni = dom
    uni_base = re.sub(r'[^a-zа-я0-9]', '', uni.split('.')[0].lower().replace('ё', 'е'))
    lat_base = re.sub(r'[^a-z0-9]', '', base.lower())
    for v in variants:
        words = [w for w in re.split(r'[\s\-]+', v) if len(w) >= 4 and w not in GENERIC]
        for w in words or [v]:
            ru = re.sub(r'[^а-я0-9]', '', w)
            lat = re.sub(r'[^a-z0-9]', '', translit(w))
            if ru and len(ru) >= 4 and ru[:5] in uni_base:
                return True
            if lat and len(lat) >= 4 and (lat[:5] in lat_base or lat[:4].replace('y', 'i') in lat_base.replace('y', 'i')):
                return True
    return False


def verify_site(dom, inn, short_name, deadline, geo=None):
    """Открывает сайт, ищет ИНН (высокая уверенность) или название (средняя). Собирает контакты."""
    pages, found_inn, found_name, final_dom = [], False, False, dom
    variants = name_variants(short_name)
    r = http(f'https://{dom}', timeout=2.5)
    if not r['ok'] and r.get('status') == 0 and 'timed out' not in (r.get('error') or '') and time.time() < deadline - 2:
        r = http(f'http://{dom}', timeout=2)
    if not r['ok'] or len(r.get('text') or '') < 300:
        return None
    final_dom = domain_of(r['url']) or dom
    if is_aggregator(final_dom):
        return None
    home = r['text']
    links = re.findall(r'href=["\']([^"\'#]+)["\']', home)
    picks = []
    for l in links:
        ll = l.lower()
        if any(k in ll for k in ('contact', 'kontakt', 'rekvizit', 'requisit', 'about', 'o-kompanii', 'o_kompanii', 'company', 'svyaz')):
            u = urllib.parse.urljoin(r['url'], l)
            if domain_of(u) == final_dom and u not in picks:
                picks.append(u)
    for p in ('/contacts', '/kontakty', '/contacts/', '/rekvizity'):
        u = f'https://{final_dom}{p}'
        if u not in picks:
            picks.append(u)
    pages.append(home)

    found_geo = not geo
    found_legal = False
    geo = geo or []
    legal_re = re.compile(r'(?:ооо|оао|зао|пао|ао|спк|схпк|кфх|ип|нпф|нпо|пк|сппк|ано|тд|гк|общество с ограниченной ответственностью|'
                          r'акционерное общество|сельскохозяйственный производственный кооператив)\s*[«"\'“„]?\s*(?:'
                          + '|'.join(re.escape(v) for v in variants) + r')') if variants else None

    def check(html):
        nonlocal found_inn, found_name, found_geo, found_legal
        txt = clean_text(html)
        low = txt.lower().replace('ё', 'е')
        if inn in txt or inn in re.sub(r'\s', '', txt):
            found_inn = True
        if any(v in low for v in variants):
            found_name = True
        if geo and any(g in low for g in geo):
            found_geo = True
        if legal_re and legal_re.search(low):
            found_legal = True
    check(home)
    for u in picks[:2]:
        if found_inn and len(pages) >= 2:
            break
        if time.time() > deadline - 0.8:
            break
        x = http(u, timeout=2)
        if x['ok'] and len(x.get('text') or '') > 300 and domain_of(x['url']) == final_dom:
            pages.append(x['text'])
            check(x['text'])
    generic = any(v in GENERIC or len(v) < 6 for v in variants) or not variants
    if not found_inn:
        if not found_name or generic:
            return None
        dm = domain_matches(final_dom, variants)
        main = max(variants, key=len)
        multi = len(main.split()) >= 2 or (len(main) >= 9 and not re.search(r'(ское|ский|ская|ское|ое|ий)$', main))
        if not ((found_legal and (dm or found_geo)) or (dm and multi and found_geo)):
            return None
    emails, phones = [], []
    for p in pages:
        e, ph = extract_contacts(p, final_dom)
        emails += [x for x in e if x not in emails]
        phones += [x for x in ph if x not in phones]
    return {'domain': final_dom, 'confidence': 'high' if found_inn else 'medium',
            'emails': emails[:5], 'phones': phones[:5]}


def find_site(inn, short_name, full_name, region, deadline):
    queries = [f'{short_name} ИНН {inn}', f'"{short_name}" {region} официальный сайт']
    tried, note = set(), ''
    for q in queries:
        if time.time() > deadline - 1.0:
            return None, 'нет времени'
        urls, src = search_urls(q)
        if not urls:
            note = src
            continue
        cands = []
        for u in urls:
            d = domain_of(u)
            if d and d not in tried and not is_aggregator(d) and d not in cands:
                cands.append(d)
        for d in cands[:3]:
            if time.time() > deadline - 0.6:
                return None, 'нет времени'
            tried.add(d)
            v = verify_site(d, inn, short_name, deadline)
            if v:
                v['search'] = src
                return v, ''
        note = f'кандидаты не подтвердились ({len(cands)})' if cands else 'в выдаче только агрегаторы'
    return None, note


# ── Конвейер по одной компании ──────────────────────────────────────────────

def enrich_one(c, deadline):
    out = {'inn': c['inn'], 'found': [], 'note': []}
    if c.get('egrul_status'):
        data, note = None, ''
        out['egrul_status'] = c['egrul_status']
        if c.get('head'):
            out['found'].append('head')
    else:
        data, note = dadata_party(c['inn'])
    short = c.get('short_name') or ''
    if data:
        mgmt = data.get('management') or {}
        out['head'] = (mgmt.get('name') or '').strip().title() if mgmt.get('name') else ''
        out['head_post'] = (mgmt.get('post') or '').strip().capitalize()
        if not out['head'] and data.get('fio'):
            f = data['fio']
            out['head'] = ' '.join(x for x in (f.get('surname'), f.get('name'), f.get('patronymic')) if x).title()
            out['head_post'] = 'Индивидуальный предприниматель'
        out['address'] = ((data.get('address') or {}).get('value') or '')[:300]
        out['okved'] = data.get('okved') or ''
        st = data.get('state') or {}
        out['egrul_status'] = st.get('status') or ''
        reg = st.get('registration_date')
        out['registered_at'] = time.strftime('%Y-%m-%d', time.gmtime(reg / 1000)) if reg else None
        out['dd_phones'] = [norm_phone(p.get('value', '')) for p in (data.get('phones') or []) if p.get('value')]
        out['dd_emails'] = [e.get('value', '').lower() for e in (data.get('emails') or []) if e.get('value')]
        short = ((data.get('name') or {}).get('short') or '').strip() or short
        out['short_name'] = short
        if out['head']:
            out['found'].append('head')
    elif note:
        out['note'].append(note)
    if not short:
        m = re.search(r'"(.+?)"', c['name'] or '')
        short = (m.group(1) if m else c['name'] or '').strip()

    if out.get('egrul_status') in ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT'):
        out['note'].append('компания ликвидирована или ликвидируется')
        return out

    if time.time() > deadline - 1.2:
        out['timed_out'] = True
        out['note'].append('нет времени')
        return out
    site = None
    if c.get('website'):
        site = verify_site(domain_of(c['website']), c['inn'], short, deadline)
    if not site and time.time() < deadline:
        site, n = find_site(c['inn'], short, c['name'], c.get('region') or '', deadline)
        if n:
            out['note'].append(n)
    if site:
        out['website'] = site['domain']
        out['website_confidence'] = site['confidence']
        out['emails'] = site['emails']
        out['phones'] = site['phones']
        out['found'].append('site')
        out['search'] = site.get('search', '')
    emails = list(dict.fromkeys((out.get('emails') or []) + (out.get('dd_emails') or [])))
    phones = list(dict.fromkeys((out.get('phones') or []) + [p for p in out.get('dd_phones') or [] if p]))
    out['emails'], out['phones'] = emails[:5], phones[:5]
    if emails:
        out['found'].append('email')
    if phones:
        out['found'].append('phone')
    return out


def save(conn, c, r):
    found = r['found']
    timed_out = any('нет времени' in n for n in r.get('note') or []) or r.get('timed_out')
    if r.get('egrul_status') in ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT'):
        status = 'closed'
    elif timed_out and 'site' not in found:
        status = 'new'
    elif 'email' in found or 'phone' in found:
        status = 'done'
    elif found:
        status = 'partial'
    else:
        status = 'empty'
    src = ', '.join(x for x in ('ЕГРЮЛ' if 'head' in found else '', f"сайт ({r.get('search', '')})" if 'site' in found else '') if x)
    cur = conn.cursor()
    cur.execute(f"""UPDATE {S}.radar_companies SET
        head = CASE WHEN %(head)s <> '' THEN %(head)s ELSE head END,
        head_post = CASE WHEN %(head_post)s <> '' THEN %(head_post)s ELSE head_post END,
        address = CASE WHEN %(address)s <> '' THEN %(address)s ELSE address END,
        okved = CASE WHEN %(okved)s <> '' THEN %(okved)s ELSE okved END,
        egrul_status = CASE WHEN %(egrul_status)s <> '' THEN %(egrul_status)s ELSE egrul_status END,
        registered_at = COALESCE(%(registered_at)s, registered_at),
        short_name = CASE WHEN %(short)s <> '' THEN %(short)s ELSE short_name END,
        website = CASE WHEN %(website)s <> '' THEN %(website)s ELSE website END,
        website_confidence = CASE WHEN %(website)s <> '' THEN %(conf)s ELSE website_confidence END,
        emails = CASE WHEN %(emails)s <> '' THEN %(emails)s ELSE emails END,
        phones = CASE WHEN %(phones)s <> '' THEN %(phones)s ELSE phones END,
        contacts_source = CASE WHEN %(src)s <> '' THEN %(src)s ELSE contacts_source END,
        enrich_status = %(status)s, enrich_attempts = enrich_attempts + CASE WHEN %(status)s = 'new' THEN 0 ELSE 1 END,
        enriched_at = CASE WHEN %(status)s = 'new' THEN enriched_at ELSE NOW() END,
        enrich_note = %(note)s, updated_at = NOW()
        WHERE inn = %(inn)s""", {
        'inn': c['inn'], 'head': r.get('head') or '', 'head_post': r.get('head_post') or '',
        'address': r.get('address') or '', 'okved': r.get('okved') or '', 'egrul_status': r.get('egrul_status') or '',
        'registered_at': r.get('registered_at'), 'website': r.get('website') or '', 'short': r.get('short_name') or '',
        'conf': r.get('website_confidence') or '', 'emails': ', '.join(r.get('emails') or []),
        'phones': ', '.join(r.get('phones') or []), 'src': src, 'status': status,
        'note': '; '.join(r.get('note') or [])[:300]})
    return status


def claim(conn, n, only_fresh, phase='site'):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status = 'new'
                    WHERE enrich_status = 'processing' AND updated_at < NOW() - INTERVAL '3 minutes'""")
    extra = "AND last_date >= DATE '2026-01-01'" if only_fresh else ''
    extra += " AND egrul_status <> ''" if phase == 'site' else " AND egrul_status = ''"
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status = 'processing', updated_at = NOW()
        WHERE inn IN (SELECT inn FROM {S}.radar_companies
                      WHERE (enrich_status = 'new' OR (enrich_status = 'error' AND enrich_attempts < 3)) {extra}
                      ORDER BY last_date DESC NULLS LAST, total_amount DESC
                      LIMIT %s FOR UPDATE SKIP LOCKED)
        RETURNING inn, name, region, website, egrul_status, head, short_name""", (n,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.commit()
    return rows


def remaining_ms(context, started, default_budget):
    fn = getattr(context, 'get_remaining_time_in_millis', None)
    if callable(fn):
        try:
            return int(fn())
        except Exception:
            pass
    return default_budget - int((time.time() - started) * 1000)


def action_batch(body, context, trigger):
    started = time.time()
    budget = int(body.get('budget_ms') or 110000)
    left = remaining_ms(context, started, budget)
    reserve = 900 if left < 10000 else 3000
    usable = max(1500, min(left, budget) - reserve)
    deadline = started + usable / 1000
    _DEADLINE['t'] = deadline
    workers = max(1, min(int(body.get('workers') or 10), 16))
    auto = max(2, int(usable / 1000 / 2.5 * workers))
    size = max(1, min(int(body.get('size') or auto), auto, 120))
    conn = db()
    rows = claim(conn, size, bool(body.get('only_fresh')))
    stats = {'processed': 0, 'site': 0, 'email': 0, 'phone': 0, 'head': 0, 'errors': 0, 'statuses': {}}
    results = []
    if rows:
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(enrich_one, c, deadline): c for c in rows}
            for f in as_completed(futs):
                c = futs[f]
                try:
                    r = f.result()
                    st = save(conn, c, r)
                    conn.commit()
                    stats['processed'] += int(st != 'new')
                    stats['requeued'] = stats.get('requeued', 0) + int(st == 'new')
                    for k in ('site', 'email', 'phone', 'head'):
                        stats[k] += int(k in r['found'])
                    stats['statuses'][st] = stats['statuses'].get(st, 0) + 1
                    results.append({'inn': c['inn'], 'name': c['name'], 'status': st, 'website': r.get('website', ''),
                                    'emails': r.get('emails', [])[:2], 'phones': r.get('phones', [])[:2],
                                    'head': r.get('head', ''), 'note': '; '.join(r.get('note') or [])[:120]})
                except Exception as e:
                    stats['errors'] += 1
                    cur = conn.cursor()
                    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status='error', enrich_attempts=enrich_attempts+1,
                                    enrich_note=%s, updated_at=NOW() WHERE inn=%s""", (str(e)[:200], c['inn']))
                    conn.commit()
    _DEADLINE['t'] = 0.0
    dur = int((time.time() - started) * 1000)
    cur = conn.cursor()
    cur.execute(f"""INSERT INTO {S}.radar_enrich_runs (trigger, processed, found_site, found_email, found_phone, found_head, errors, duration_ms)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (trigger, stats['processed'], stats['site'], stats['email'], stats['phone'], stats['head'], stats['errors'], dur))
    cur.execute(f"SELECT COUNT(*) FROM {S}.radar_companies WHERE enrich_status IN ('new','processing') OR (enrich_status='error' AND enrich_attempts<3)")
    queue = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return resp({'ok': True, **stats, 'duration_ms': dur, 'budget_ms': left, 'claimed': len(rows), 'queue': queue, 'results': results})


def action_egrul(body, context):
    started = time.time()
    left = remaining_ms(context, started, 5000)
    deadline = started + max(1.5, (left - 1500) / 1000)
    _DEADLINE['t'] = deadline
    n = max(1, min(int(body.get('size') or 14), 150))
    conn = db()
    rows = claim(conn, n, bool(body.get('only_fresh')), phase='egrul')
    print(f'[egrul] claim {time.time() - started:.2f}s')
    done = closed = heads = 0

    def one(c):
        if time.time() > deadline - 0.9:
            return c, None, 'нет времени'
        data, note = dadata_party(c['inn'])
        return c, data, note
    results = []
    with ThreadPoolExecutor(max_workers=max(1, min(int(body.get('workers') or 3), 8))) as ex:
        for res in ex.map(one, rows):
            results.append(res)
    t_api = time.time()
    upd, miss = [], []
    for c, data, note in results:
        if not data:
            st = 'new' if any(x in note for x in ('нет времени', 'HTTP 429', 'HTTP 403')) else ('error' if note.startswith('DaData') else 'empty')
            miss.append((c['inn'], st, note[:200]))
            continue
        mgmt = data.get('management') or {}
        head = (mgmt.get('name') or '').strip().title()
        post = (mgmt.get('post') or '').strip().capitalize()
        if not head and data.get('fio'):
            f = data['fio']
            head = ' '.join(x for x in (f.get('surname'), f.get('name'), f.get('patronymic')) if x).title()
            post = 'Индивидуальный предприниматель'
        if head.lower().startswith(('общество', 'акционерное', 'публичное')):
            post = post or 'Управляющая организация'
        stt = data.get('state') or {}
        status = stt.get('status') or 'ACTIVE'
        reg = stt.get('registration_date')
        is_closed = status in ('LIQUIDATED', 'LIQUIDATING', 'BANKRUPT')
        upd.append((c['inn'], head, post, ((data.get('address') or {}).get('value') or '')[:300], data.get('okved') or '',
                    status, time.strftime('%Y-%m-%d', time.gmtime(reg / 1000)) if reg else None,
                    ((data.get('name') or {}).get('short') or '')[:200], 'closed' if is_closed else 'new'))
        done += 1
        closed += int(is_closed)
        heads += int(bool(head))
    cur = conn.cursor()
    if upd:
        psycopg2.extras.execute_values(cur, f"""UPDATE {S}.radar_companies AS t SET
            head = CASE WHEN v.head <> '' THEN v.head ELSE t.head END, head_post = v.post, address = v.addr,
            okved = v.okved, egrul_status = v.st, registered_at = v.reg::date, short_name = v.short,
            enrich_status = v.es, updated_at = NOW(),
            contacts_source = CASE WHEN t.contacts_source = '' THEN 'ЕГРЮЛ' ELSE t.contacts_source END
            FROM (VALUES %s) AS v(inn, head, post, addr, okved, st, reg, short, es) WHERE t.inn = v.inn""", upd)
    if miss:
        psycopg2.extras.execute_values(cur, f"""UPDATE {S}.radar_companies AS t SET enrich_status = v.es, enrich_note = v.note,
            egrul_status = CASE WHEN v.es = 'empty' THEN 'NOT_FOUND' ELSE t.egrul_status END,
            enrich_attempts = t.enrich_attempts + CASE WHEN v.es = 'new' THEN 0 ELSE 1 END, updated_at = NOW()
            FROM (VALUES %s) AS v(inn, es, note) WHERE t.inn = v.inn""", miss)
    print(f'[egrul] claimed={len(rows)} api={t_api - started:.2f}s save={time.time() - t_api:.2f}s miss={len(miss)}')
    conn.commit()
    _DEADLINE['t'] = 0.0
    cur.execute(f"SELECT COUNT(*) FROM {S}.radar_companies WHERE egrul_status = ''")
    left_cnt = cur.fetchone()[0]
    cur.execute(f"""INSERT INTO {S}.radar_enrich_runs (trigger, processed, found_head, duration_ms, note)
                    VALUES (%s,%s,%s,%s,'egrul')""", (body.get('trigger') or 'manual', done, heads, int((time.time()-started)*1000)))
    conn.commit()
    conn.close()
    limit_hit = any('HTTP 403' in (n or '') for _, d, n in results if not d)
    return resp({'ok': True, 'claimed': len(rows), 'done': done, 'heads': heads, 'closed': closed, 'limit_hit': limit_hit,
                 'egrul_left': left_cnt, 'duration_ms': int((time.time() - started) * 1000)})


def action_stats():
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) AS processed,
        COUNT(*) FILTER (WHERE enrich_status IN ('new','processing','searching','verify','verifying')) AS queue,
        COUNT(*) FILTER (WHERE enrich_status IN ('verify','verifying')) AS verify_queue,
        COUNT(*) FILTER (WHERE head <> '') AS with_head,
        COUNT(*) FILTER (WHERE egrul_status <> '') AS egrul_done,
        COUNT(*) FILTER (WHERE website <> '') AS with_site,
        COUNT(*) FILTER (WHERE website_confidence = 'high') AS site_high,
        COUNT(*) FILTER (WHERE emails <> '') AS with_email,
        COUNT(*) FILTER (WHERE phones <> '') AS with_phone,
        COUNT(*) FILTER (WHERE emails <> '' OR phones <> '') AS with_contact,
        COUNT(*) FILTER (WHERE enrich_status = 'closed') AS closed,
        COUNT(*) FILTER (WHERE enrich_status = 'error') AS errors,
        COUNT(*) FILTER (WHERE last_date >= DATE '2026-01-01') AS fresh_total,
        COUNT(*) FILTER (WHERE last_date >= DATE '2026-01-01' AND (emails <> '' OR phones <> '')) AS fresh_contact
        FROM {S}.radar_companies""")
    st = dict(cur.fetchone())
    cur.execute(f"""SELECT COALESCE(SUM(processed),0) AS p, COALESCE(SUM(duration_ms),0) AS d
                    FROM {S}.radar_enrich_runs WHERE started_at > NOW() - INTERVAL '1 day'""")
    day = cur.fetchone()
    st['processed_24h'] = day['p']
    conn.close()
    return resp(st)


def action_recent(body):
    f = body.get('filter') or 'contact'
    where = {"contact": "(emails <> '' OR phones <> '')", "site": "website <> ''", "empty": "enrich_status IN ('empty','partial')",
             "closed": "enrich_status = 'closed'", "error": "enrich_status = 'error'"}.get(f, "enriched_at IS NOT NULL")
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT inn, name, region, industry, total_amount, last_date, head, head_post, website, website_confidence,
                    emails, phones, enrich_status, enrich_note, contacts_source, enriched_at
                    FROM {S}.radar_companies WHERE {where} AND enriched_at IS NOT NULL
                    ORDER BY enriched_at DESC LIMIT 100""")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': rows})


def action_export(body):
    """Выгрузка компаний с контактами в CSV (Excel открывает напрямую)."""
    where, args = ["(emails <> '' OR phones <> '')"], []
    if body.get('all'):
        where = ['TRUE']
    for k in ('region', 'industry', 'source'):
        if body.get(k):
            where.append(f'{k} = %s')
            args.append(body[k])
    if body.get('year'):
        where.append('EXTRACT(YEAR FROM last_date) = %s')
        args.append(int(body['year']))
    if body.get('min_amount'):
        where.append('total_amount >= %s')
        args.append(int(float(body['min_amount']) * 1_000_000))
    limit = max(1, min(int(body.get('limit') or 5000), 20000))
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""SELECT name, inn, ogrn, region, industry, activity, size, employees, total_amount, last_amount, last_date,
                     source, source_full, head, head_post, phones, emails, website,
                     CASE website_confidence WHEN 'high' THEN 'ИНН на сайте' WHEN 'medium' THEN 'название и регион' ELSE '' END,
                     address, egrul_status, offer
                     FROM {S}.radar_companies WHERE {' AND '.join(where)}
                     ORDER BY last_date DESC NULLS LAST, total_amount DESC LIMIT %s""", args + [limit])
    rows = cur.fetchall()
    conn.close()
    head = ['Компания', 'ИНН', 'ОГРН', 'Регион', 'Отрасль', 'Вид деятельности', 'Размер', 'Сотрудников',
            'Поддержка 2024–2026, ₽', 'Последняя выплата, ₽', 'Дата последней', 'Источник', 'Кто выдал', 'Руководитель',
            'Должность', 'Телефоны', 'Email', 'Сайт', 'Как подтверждён сайт', 'Адрес', 'Статус ЕГРЮЛ', 'Что предложить']

    def cell(v):
        v = '' if v is None else str(v)
        return '"' + v.replace('"', '""') + '"'
    csv = '\ufeff' + '\n'.join(';'.join(cell(x) for x in r) for r in [head] + [list(r) for r in rows])
    return resp({'ok': True, 'count': len(rows), 'csv_b64': base64.b64encode(csv.encode('utf-8')).decode()})


def action_runs():
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""SELECT date_trunc('hour', started_at) AS hour, trigger, SUM(processed) AS processed, SUM(found_site) AS site,
                    SUM(found_email) AS email, SUM(found_phone) AS phone, SUM(found_head) AS head, SUM(errors) AS errors, COUNT(*) AS batches
                    FROM {S}.radar_enrich_runs GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 48""")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return resp({'items': rows})


def action_diag(body):
    inn = re.sub(r'\D', '', body.get('inn') or '7325160088')
    part = body.get('part') or 'dadata'
    t = time.time()
    if part == 'dadata':
        data, note = dadata_party(inn)
        d = data or {}
        return resp({'ok': bool(data), 'note': note, 'ms': int((time.time() - t) * 1000),
                     'short': (d.get('name') or {}).get('short'), 'head': (d.get('management') or {}).get('name'),
                     'phones': d.get('phones'), 'emails': d.get('emails'), 'status': (d.get('state') or {}).get('status')})
    if part in ('yandex', 'bing'):
        fn = yandex_search if part == 'yandex' else bing_search
        urls, note = fn(body.get('q') or f'ПРОМВИАР ИНН {inn}')
        return resp({'ok': bool(urls), 'note': note, 'ms': int((time.time() - t) * 1000), 'sample': (urls or [])[:8]})
    if part == 'ctx':
        fn = getattr(_CTX.get('c'), 'get_remaining_time_in_millis', None)
        return resp({'remaining_ms': fn() if callable(fn) else None, 'attrs': [a for a in dir(_CTX.get('c')) if not a.startswith('_')][:30]})
    if part == 'yvariants':
        key = os.environ.get('YANDEX_XML_KEY', '')
        user = os.environ.get('YANDEX_XML_USER', '')
        folder = os.environ.get('YANDEX_FOLDER_ID', '')
        q = urllib.parse.quote('ПРОМВИАР ИНН 7325160088')
        out = {'key_len': len(key), 'key_prefix': key[:4], 'has_user': bool(user), 'has_folder': bool(folder)}
        variants = {
            'xmlsearch_key': f'https://xmlsearch.yandex.ru/xmlsearch?key={key}&query={q}',
            'yandex_xml_apikey': f'https://yandex.ru/search/xml?apikey={key}&query={q}' + (f'&folderid={folder}' if folder else ''),
            'yandex_xml_user_key': f'https://yandex.ru/search/xml?user={user}&key={key}&query={q}',
        }
        for name, url in variants.items():
            r = http(url, timeout=6, headers={'Accept': 'application/xml'})
            txt = r.get('text') or ''
            m = re.search(r'<error[^>]*>(.*?)</error>', txt, re.S)
            out[name] = {'status': r.get('status'), 'error': (m.group(1)[:120] if m else r.get('error')),
                         'urls': len(re.findall(r'<url>', txt))}
        return resp(out)
    if part == 'site':
        v = verify_site(body.get('domain') or 'promvrplatform.ru', inn, body.get('short') or 'ПРОМВИАР', time.time() + 3.5)
        return resp({'ms': int((time.time() - t) * 1000), 'result': v})
    return resp({'error': 'part?'}, 400)


_CTX = {}


def action_search(body, context):
    """Шаг 2: поиск кандидатов в сайты через Яндекс. Сохраняет домены, без проверки."""
    started = time.time()
    left = remaining_ms(context, started, 5000)
    deadline = started + max(1.5, (left - 1300) / 1000)
    _DEADLINE['t'] = deadline
    n = max(1, min(int(body.get('size') or 10), 40))
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status='new'
                    WHERE enrich_status='searching' AND updated_at < NOW() - INTERVAL '3 minutes'""")
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status='searching', updated_at=NOW()
        WHERE inn IN (SELECT inn FROM {S}.radar_companies
            WHERE enrich_status='new' AND egrul_status NOT IN ('', 'NOT_FOUND') {"AND last_date >= DATE '2026-01-01'" if body.get('only_fresh') else ''}
            ORDER BY last_date DESC NULLS LAST, total_amount DESC LIMIT %s FOR UPDATE SKIP LOCKED)
        RETURNING inn, name, region, short_name, website""", (n,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.commit()

    def one(c):
        short = c['short_name'] or (re.search(r'"(.+?)"', c['name'] or '') or [None, c['name']])[1] or ''
        short = re.sub(r'^(ООО|АО|ПАО|ЗАО|ОАО|ИП|КФХ|СПК|ПСК|НПФ)\s+', '', short.strip(), flags=re.I).strip('"« »')
        cands, notes = [], []
        if c.get('website'):
            cands.append(domain_of(c['website']))
        slug = re.sub(r'[^a-z0-9]', '', translit(short.lower()))
        for q in (f'{short} ИНН {c["inn"]}', f'"{short}" {c["region"]} официальный сайт'):
            if time.time() > deadline - 0.9:
                return c, None, 'нет времени'
            urls, src = search_urls(q)
            if urls is None or (not urls and 'нет времени' in src):
                return c, None, 'нет времени'
            for u in urls or []:
                d = domain_of(u)
                if d and not is_aggregator(d) and d not in cands:
                    cands.append(d)
            if len(cands) >= 3:
                break

        def score(d):
            base = re.sub(r'[^a-z0-9]', '', d.split('.')[0])
            sc = 0
            if slug and len(slug) >= 4 and (slug[:5] in base or base[:5] in slug):
                sc -= 3
            if d.endswith(('.ru', '.рф', '.su', '.com')):
                sc -= 1
            if d.count('.') > 1:
                sc += 1
            return sc
        cands.sort(key=score)
        return c, cands[:3], ''
    res = []
    ex = ThreadPoolExecutor(max_workers=max(1, min(int(body.get('workers') or 6), 12)))
    futs = {ex.submit(one, c): c for c in rows}
    res = []
    try:
        for f in as_completed(futs, timeout=max(0.5, deadline - time.time() + 0.3)):
            try:
                res.append(f.result())
            except Exception:
                res.append((futs[f], None, ''))
    except Exception:
        pass
    got = {r[0]['inn'] for r in res}
    for f, c in futs.items():
        if c['inn'] not in got:
            res.append((c, None, ''))
    ex.shutdown(wait=False, cancel_futures=True)
    upd = []
    stats = {'claimed': len(rows), 'with_candidates': 0, 'no_candidates': 0, 'requeued': 0}
    for c, cands, note in res:
        if cands is None:
            upd.append((c['inn'], 'new', '', ''))
            stats['requeued'] += 1
        elif cands:
            upd.append((c['inn'], 'verify', ','.join(cands), ''))
            stats['with_candidates'] += 1
        else:
            upd.append((c['inn'], 'empty', '', 'в выдаче только агрегаторы'))
            stats['no_candidates'] += 1
    cur = conn.cursor()
    if upd:
        psycopg2.extras.execute_values(cur, f"""UPDATE {S}.radar_companies AS t SET enrich_status=v.st,
            site_candidates=v.cands, enrich_note=CASE WHEN v.note<>'' THEN v.note ELSE t.enrich_note END,
            enriched_at=CASE WHEN v.st='empty' THEN NOW() ELSE t.enriched_at END,
            enrich_attempts=t.enrich_attempts+CASE WHEN v.st='new' THEN 0 ELSE 1 END, updated_at=NOW()
            FROM (VALUES %s) AS v(inn, st, cands, note) WHERE t.inn=v.inn""", upd)
    cur.execute(f"""INSERT INTO {S}.radar_enrich_runs (trigger, processed, duration_ms, note)
                    VALUES (%s,%s,%s,'search')""", (body.get('trigger') or 'manual', len(rows) - stats['requeued'], int((time.time()-started)*1000)))
    conn.commit()
    conn.close()
    _DEADLINE['t'] = 0.0
    return resp({'ok': True, **stats, 'duration_ms': int((time.time() - started) * 1000)})


def action_verify(body, context):
    """Шаг 3: открывает сайты-кандидаты, подтверждает по ИНН или названию, собирает email и телефоны."""
    started = time.time()
    left = remaining_ms(context, started, 5000)
    deadline = started + max(1.5, (left - 1300) / 1000)
    _DEADLINE['t'] = deadline
    n = max(1, min(int(body.get('size') or 10), 40))
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status='verify'
                    WHERE enrich_status='verifying' AND updated_at < NOW() - INTERVAL '3 minutes'""")
    cur.execute(f"""UPDATE {S}.radar_companies SET enrich_status='verifying', updated_at=NOW()
        WHERE inn IN (SELECT inn FROM {S}.radar_companies WHERE enrich_status='verify'
            ORDER BY last_date DESC NULLS LAST, total_amount DESC LIMIT %s FOR UPDATE SKIP LOCKED)
        RETURNING inn, name, short_name, site_candidates, region, address""", (n,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.commit()

    def one(c):
        cands = [x for x in (c['site_candidates'] or '').split(',') if x]
        if not cands:
            return c, False, ''
        d, rest = cands[0], ','.join(cands[1:])
        v = verify_site(d, c['inn'], c['short_name'] or c['name'], deadline, geo_terms(c.get('region'), c.get('address')))
        if v:
            return c, v, ''
        return (c, None, rest) if rest else (c, False, '')
    ex = ThreadPoolExecutor(max_workers=max(1, min(int(body.get('workers') or 10), 16)))
    futs = {ex.submit(one, c): c for c in rows}
    res = []
    try:
        for f in as_completed(futs, timeout=max(0.5, deadline - time.time() + 0.3)):
            try:
                res.append(f.result())
            except Exception:
                c = futs[f]
                res.append((c, False, ''))
    except Exception:
        pass
    got = {r[0]['inn'] for r in res}
    for f, c in futs.items():
        if c['inn'] not in got:
            rest = ','.join((c['site_candidates'] or '').split(',')[1:])
            res.append((c, None, rest) if rest else (c, False, ''))
    ex.shutdown(wait=False, cancel_futures=True)
    stats = {'claimed': len(rows), 'site': 0, 'email': 0, 'phone': 0, 'not_confirmed': 0, 'requeued': 0}
    found_rows, other = [], []
    for c, v, rest in res:
        if v is None:
            other.append((c['inn'], 'verify', rest, ''))
            stats['requeued'] += 1
            stats['checked'] = stats.get('checked', 0) + 1
        elif v is False:
            other.append((c['inn'], 'empty', '', 'сайт не подтвердился'))
            stats['not_confirmed'] += 1
        else:
            st = 'done' if (v['emails'] or v['phones']) else 'partial'
            found_rows.append((c['inn'], v['domain'], v['confidence'], ', '.join(v['emails']), ', '.join(v['phones']), st))
            stats['site'] += 1
            stats['email'] += int(bool(v['emails']))
            stats['phone'] += int(bool(v['phones']))
    cur = conn.cursor()
    if found_rows:
        psycopg2.extras.execute_values(cur, f"""UPDATE {S}.radar_companies AS t SET website=v.dom, website_confidence=v.conf,
            emails=CASE WHEN v.em<>'' THEN v.em ELSE t.emails END, phones=CASE WHEN v.ph<>'' THEN v.ph ELSE t.phones END,
            contacts_source='ЕГРЮЛ, сайт компании', enrich_status=v.st, enriched_at=NOW(), enrich_note='', site_candidates='',
            updated_at=NOW() FROM (VALUES %s) AS v(inn, dom, conf, em, ph, st) WHERE t.inn=v.inn""", found_rows)
    if other:
        psycopg2.extras.execute_values(cur, f"""UPDATE {S}.radar_companies AS t SET enrich_status=v.st, site_candidates=v.rest,
            enrich_note=CASE WHEN v.note<>'' THEN v.note ELSE t.enrich_note END,
            enriched_at=CASE WHEN v.st='empty' THEN NOW() ELSE t.enriched_at END, updated_at=NOW()
            FROM (VALUES %s) AS v(inn, st, rest, note) WHERE t.inn=v.inn""", other)
    cur.execute(f"""INSERT INTO {S}.radar_enrich_runs (trigger, processed, found_site, found_email, found_phone, duration_ms, note)
                    VALUES (%s,%s,%s,%s,%s,%s,'verify')""", (body.get('trigger') or 'manual', len(rows) - stats['requeued'],
                    stats['site'], stats['email'], stats['phone'], int((time.time()-started)*1000)))
    conn.commit()
    conn.close()
    _DEADLINE['t'] = 0.0
    return resp({'ok': True, **stats, 'duration_ms': int((time.time() - started) * 1000)})


def action_cycle(body, context):
    """Один шаг конвейера: выбирает этап, где есть работа (ЕГРЮЛ → проверка → поиск)."""
    conn = db()
    cur = conn.cursor()
    cur.execute(f"""SELECT
        COUNT(*) FILTER (WHERE egrul_status='' AND enrich_status='new'),
        COUNT(*) FILTER (WHERE enrich_status='verify'),
        COUNT(*) FILTER (WHERE enrich_status='new' AND egrul_status NOT IN ('', 'NOT_FOUND'))
        FROM {S}.radar_companies""")
    eg, ver, srch = cur.fetchone()
    conn.close()
    stage = body.get('stage') or ('verify' if ver >= 10 else 'egrul' if eg and not body.get('skip_egrul') else 'search' if srch else 'verify' if ver else 'idle')
    if stage == 'egrul':
        r = action_egrul({**body, 'size': body.get('size') or 14, 'workers': 3}, context)
    elif stage == 'verify':
        r = action_verify(body, context)
    elif stage == 'search':
        r = action_search(body, context)
    else:
        return resp({'ok': True, 'stage': 'idle', 'queues': {'egrul': eg, 'verify': ver, 'search': srch}})
    data = json.loads(r['body'])
    data['stage'] = stage
    data['queues'] = {'egrul': eg, 'verify': ver, 'search': srch}
    r['body'] = json.dumps(data, ensure_ascii=False, default=str)
    return r


def handler(event: dict, context) -> dict:
    """Обогащение каталога Радара контактами: ЕГРЮЛ, поиск и проверка сайта, email и телефоны."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    _CTX['c'] = context
    body = json.loads(event.get('body') or '{}') if event.get('httpMethod') == 'POST' else {}
    who = authorized(event, body)
    if not who:
        return resp({'error': 'Не авторизован'}, 401)
    action = body.get('action') or 'stats'
    if action == 'batch':
        return action_batch(body, context, body.get('trigger') or who)
    if action == 'egrul':
        return action_egrul(body, context)
    if action == 'search':
        return action_search(body, context)
    if action == 'verify':
        return action_verify(body, context)
    if action == 'cycle':
        return action_cycle(body, context)
    if action == 'stats':
        return action_stats()
    if action == 'recent':
        return action_recent(body)
    if action == 'runs':
        return action_runs()
    if action == 'export':
        return action_export(body)
    if action == 'diag':
        return action_diag(body)
    if action == 'reset_errors':
        conn = db()
        cur = conn.cursor()
        cur.execute(f"UPDATE {S}.radar_companies SET enrich_status='new', enrich_attempts=0 WHERE enrich_status IN ('error','empty')")
        n = cur.rowcount
        conn.commit()
        conn.close()
        return resp({'ok': True, 'reset': n})
    return resp({'error': 'Неизвестное действие'}, 400)
