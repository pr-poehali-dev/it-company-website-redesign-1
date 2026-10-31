"""Материалы учисьпро.рф для персонального выпуска: каталог по тематикам (кэш в БД) и полный текст статьи."""
import json
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests

FEED = 'https://functions.poehali.dev/b9f58dbe-702c-46d3-a9b1-02d5076735ef'
SITE = 'https://xn--h1amcedk2a6b.xn--p1ai'
TTL = 6 * 3600
UA = {'User-Agent': 'Masshtab-Custom/1.0 (+https://mat-labs.ru/masshtab)'}

TOPICS = [
    ('ai', 'Нейросети и ИИ для работы'),
    ('business', 'Бизнес, управление и деньги'),
    ('career', 'Профессии и карьера'),
    ('study', 'Как учиться эффективно'),
    ('school', 'Школа, ОГЭ и ЕГЭ'),
    ('kids', 'Родителям: дети и подростки'),
    ('science', 'Наука, технологии и роботы'),
    ('grants', 'Гранты, конкурсы, олимпиады'),
    ('culture', 'Культура и литература'),
]
TOPIC_NAMES = dict(TOPICS)

R_CAREER = re.compile(r'професси|карьер|зарплат|прибавк|навык|трудоустр|резюме|собеседован|удал[её]нк|кем быть|DevOps|кибербез|бухгалтер|прораб|'
                      r'тендер|ВЭД|менеджер по продаж|маркетолог|AutoCAD|НЛП|личный бренд|эксперт', re.I)
R_SCHOOL = re.compile(r'ЕГЭ|ОГЭ|МЦКО|класс[аеы]?\b|школ|задач[иа]? (?:по|на)|физик|математик|английск|сочинени|литератур|урок|домашк|репетитор|олимпиад', re.I)
R_KIDS = re.compile(r'реб[её]н|дет[еяисй]|подрост|малыш|родител|карманн|читать', re.I)
R_STUDY = re.compile(r'учиться|учёб|учеб|запомин|скорочтен|онлайн-курс|выбрать (?:онлайн-)?курс|бросают|проверьте себя|логик|подход', re.I)
R_PROMO = re.compile(r'акци[яи]|скидк|дешевле|промокод|за 1 рубль|приведи друга|ЗНАЙКИ|сертификат|видео-ведущие|расширенные версии|Новинка:|Новое направление', re.I)


def topic(it):
    t, cat = it.get('title') or '', it.get('category')
    if cat in ('culture', 'literature'):
        return 'culture'
    if cat in ('science', 'robots', 'tech'):
        return 'science'
    if cat == 'grants':
        return 'grants' if not R_SCHOOL.search(t) or 'олимпиад' in t.lower() else 'school'
    if cat == 'ai':
        return 'ai'
    if cat == 'business':
        return 'career' if R_CAREER.search(t) and not re.search(r'бизнес|компан|рынок|отч[её]т', t, re.I) else 'business'
    if R_CAREER.search(t):
        return 'career'
    if R_KIDS.search(t):
        return 'kids'
    if R_SCHOOL.search(t):
        return 'school'
    if re.search(r'нейросет|ИИ|ChatGPT', t):
        return 'ai'
    if re.search(r'онлайн-школ|продаж|бизнес', t, re.I):
        return 'business'
    return 'study'


def fetch_list():
    def page(n):
        try:
            r = requests.get(FEED, params={'action': 'list', 'page': n}, headers=UA, timeout=6)
            return r.json() if r.ok else {}
        except Exception as e:
            print(f'[custom] uch list {n}: {e}')
            return {}
    first = page(1)
    total, per = int(first.get('total') or 0), int(first.get('per_page') or 12) or 12
    pages = min(40, (total + per - 1) // per)
    items = list(first.get('items') or [])
    with ThreadPoolExecutor(8) as ex:
        for d in ex.map(page, range(2, pages + 1)):
            items += d.get('items') or []
    out, seen = [], set()
    for it in items:
        slug, title = it.get('slug'), (it.get('title') or '').strip()
        if not slug or slug in seen or not title or it.get('status', 'published') != 'published':
            continue
        if (it.get('reading_time_min') or 0) < 2 or R_PROMO.search(title):
            continue
        seen.add(slug)
        out.append({'slug': slug, 'title': title, 'lead': (it.get('summary') or '')[:300], 'topic': topic(it),
                    'read_min': it.get('reading_time_min'), 'published_at': it.get('published_at')})
    return out


def catalog(conn, S):
    cur = conn.cursor()
    cur.execute(f"SELECT data, updated_at FROM {S}.mag_cache WHERE key='uch_catalog'")
    row = cur.fetchone()
    age = (datetime.now(timezone.utc) - row['updated_at']).total_seconds() if row else 1e9
    if row and age < TTL and row['data'].get('items'):
        return row['data']['items']
    items = fetch_list()
    if len(items) < 20 and row:
        return row['data'].get('items') or []
    cur.execute(f"""INSERT INTO {S}.mag_cache (key, data, updated_at) VALUES ('uch_catalog', %s, NOW())
                    ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()""", (json.dumps({'items': items}, ensure_ascii=False),))
    conn.commit()
    return items


def clean(text):
    text = re.sub(r'^:::spoiler\s*(.*)$', r'**\1**', text or '', flags=re.M)
    text = re.sub(r'^:::\w*\s*$', '', text, flags=re.M)
    text = re.sub(r'\]\((/[^)\s]*)\)', lambda m: f']({SITE}{m.group(1)})', text)
    text = re.sub(r'!\[([^\]]*)\]\((?!https?://)[^)]*\)', '', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def full(slug):
    r = requests.get(FEED, params={'action': 'item', 'slug': slug}, headers=UA, timeout=8)
    r.raise_for_status()
    it = r.json().get('item') or {}
    if not it.get('content'):
        raise ValueError(f'материал учисьпро.рф «{slug}» недоступен')
    return {'slug': slug, 'rubric': 'Обучение · УЧИСЬПРО', 'title': it.get('title'), 'lead': it.get('summary'),
            'author': it.get('author_display_name') or 'Редакция УЧИСЬПРО', 'read_min': it.get('reading_time_min'),
            'data_date': (it.get('published_at') or '')[:10] or None, 'cover_url': it.get('cover_url'),
            'content': clean(it['content']), 'takeaways': '', 'sources': '', 'question': '',
            'online': f'учисьпро.рф/feed/{urllib.parse.unquote(slug)}'}


def fetch_many(slugs):
    with ThreadPoolExecutor(6) as ex:
        return dict(zip(slugs, ex.map(full, slugs)))
