"""Поиск контактов компании: ЕГРЮЛ (DaData) → официальный сайт → email и телефоны со страниц сайта."""
import base64
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
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


