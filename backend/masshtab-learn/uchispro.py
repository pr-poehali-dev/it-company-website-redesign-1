"""Импорт управленческих материалов «Ленты» учисьпро.рф в раздел «Обучение руководителей» журнала «Масштаб»."""
import json
import re
import time
import urllib.parse
import urllib.request

import cases

FEED_URL = 'https://functions.poehali.dev/b9f58dbe-702c-46d3-a9b1-02d5076735ef'
SITE = 'https://учисьпро.рф'
KINDS = ('editorial', 'manual', 'column')
CATS = ('business', 'ai', 'tech', 'grants')
TAGS_OK = {'управление', 'руководителю', 'руководителям', 'руководитель', 'менеджмент', 'команда', 'управление командой', 'делегирование',
           'найм', 'обратная связь', 'лидерство', 'юнит-экономика', 'финансы', 'корпоративное обучение', 'hr', 'HR', 'онбординг',
           'ответственность', 'мини-MBA', 'бизнес-план', 'разбор кейса', 'системный подход', 'процессы', 'масштабирование',
           'адаптация сотрудников', 'инструменты для бизнеса', 'предпринимателю'}
TITLE_OK = re.compile(r'руковод|команд|найм|нанял|сотрудник|делегир|назнач\w* цен|цену|управл|переговор|мотивац|ответствен|увол|подрядчик|'
                      r'фонд оплаты|бизнес-школ|обучени\w* .*(компан|сотрудн)|считают ваш бизнес|до презентации инвестору|17:30|реклам\w* .*кофейн|разговор', re.I)
SKIP = re.compile(r'партн[её]рск\w* программ|скидк|акция|промокод|курс[ыа]? (?:для|по) (?:школ|дет)|ребён|детск|школьник|ЕГЭ|ОГЭ|'
                  r'нов\w* курс|построили|модул|grant-ai|сервисов|онлайн-школ|учисьпро|mat-labs|мат-лабс|заработ|прогноз на|рынок труда|'
                  r'грузоперевоз|покупать перестали|выкинули|маркетплейс для', re.I)


def get(params, timeout=6):
    url = FEED_URL + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'Masshtab-Learn/1.0 (+https://mat-labs.ru/masshtab)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def slugify(s):
    tr = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't',
                                                      'u', 'f', 'h', 'ts', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya']))
    out = ''.join(tr.get(ch, ch) for ch in (s or '').lower())
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', out)).strip('-')[:80] or f'post-{int(time.time())}'


def relevant(it):
    if it.get('source_kind') not in KINDS or it.get('category') not in CATS:
        return False
    title = it.get('title') or ''
    if SKIP.search(title):
        return False
    tags = set(it.get('tags') or [])
    return bool(tags & TAGS_OK) or bool(TITLE_OK.search(title))


def clean(text):
    text = re.sub(r'^:::spoiler\s*(.*)$', r'**\1**', text or '', flags=re.M)
    text = re.sub(r'^:::\s*$', '', text, flags=re.M)
    text = re.sub(r'(?m)^## (Часть [^\n]+)\n\n## ', r'## \1. ', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def shingles(text):
    w = re.findall(r'[а-яёa-z0-9]+', (text or '').lower())
    return {' '.join(w[i:i + 5]) for i in range(max(0, len(w) - 4))}


def duplicate_of(cur, S, content):
    a = shingles(content)
    if not a:
        return None
    cur.execute(f"SELECT id, content FROM {S}.mag_posts ORDER BY id DESC LIMIT 400")
    for r in cur.fetchall():
        b = shingles(r['content'])
        if b and len(a & b) / min(len(a), len(b)) > 0.35:
            return r['id']
    return None


def candidates(deadline):
    found = {}
    for cat in CATS:
        for page in range(1, 8):
            if time.time() > deadline:
                return list(found.values())
            try:
                d = get({'action': 'list', 'page': page, 'category': cat})
            except Exception:
                break
            for it in d.get('items') or []:
                if it.get('slug') and relevant(it):
                    found[it['slug']] = it
            if not d.get('has_more'):
                break
    return list(found.values())


def run(conn, S, rubric, deadline, publish=True):
    items = candidates(min(deadline, time.time() + 8))
    cur = conn.cursor()
    cur.execute(f"""SELECT source_slug FROM {S}.mag_posts WHERE origin LIKE 'uchispro%%' AND source_slug IS NOT NULL
                    UNION SELECT source_slug FROM {S}.mag_learn_seen""")
    have = {r['source_slug'] for r in cur.fetchall()}
    added, skipped, errors = [], 0, []
    for it in items:
        if time.time() > deadline - 1:
            break
        if it['slug'] in have:
            skipped += 1
            continue
        cur.execute(f"SELECT 1 FROM {S}.mag_posts WHERE lower(title)=lower(%s) OR content LIKE %s LIMIT 1",
                    ((it.get('title') or '').strip(), f"%/feed/{it['slug']})%"))
        if cur.fetchone():
            skipped += 1
            continue
        try:
            full = get({'action': 'item', 'slug': it['slug']}).get('item') or {}
        except Exception as e:
            errors.append(f"{it['slug']}: {e}"[:200])
            continue
        content = clean(full.get('content') or '')
        if len(content) < 1200 or not full.get('title'):
            cur.execute(f"INSERT INTO {S}.mag_learn_seen (source_slug, status) VALUES (%s, 'short') ON CONFLICT DO NOTHING", (it['slug'],))
            conn.commit()
            skipped += 1
            continue
        title = full['title'].strip()
        dup = duplicate_of(cur, S, content)
        if dup:
            cur.execute(f"INSERT INTO {S}.mag_learn_seen (source_slug, status, post_id) VALUES (%s, 'duplicate', %s) ON CONFLICT DO NOTHING", (it['slug'], dup))
            conn.commit()
            skipped += 1
            continue
        track = cases.classify(title + ' ' + ' '.join(full.get('tags') or []))
        url = f"{SITE}/feed/{it['slug']}"
        note = f"*Материал впервые опубликован на [учисьпро.рф]({url}) — образовательной платформе экосистемы МАТ-Лабс.*\n\n"
        slug = slugify(title)
        cur.execute(f"SELECT 1 FROM {S}.mag_posts WHERE slug=%s", (slug,))
        if cur.fetchone():
            slug = f'{slug[:70]}-u{full.get("id") or int(time.time()) % 10000}'
        words = len(re.findall(r'\S+', content))
        cur.execute(f"""INSERT INTO {S}.mag_posts (slug, kind, rubric, track, origin, source_slug, title, lead, content, sources, author,
                        read_min, cover_url, published, published_at)
                        VALUES (%s,'article',%s,%s,'uchispro',%s,%s,%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s THEN COALESCE(%s::timestamptz, NOW()) END)
                        ON CONFLICT DO NOTHING RETURNING id""",
                    (slug, rubric, track, it['slug'], title[:300], (full.get('summary') or '').strip()[:1000], note + content,
                     f'УЧИСЬПРО. {title} {url}', (full.get('author_display_name') or 'Методический отдел УЧИСЬПРО')[:200],
                     max(2, round(words / 180)), full.get('cover_url'), publish, publish, full.get('published_at')))
        row = cur.fetchone()
        if row:
            cur.execute(f"INSERT INTO {S}.mag_learn_seen (source_slug, status, post_id) VALUES (%s, 'imported', %s) ON CONFLICT DO NOTHING", (it['slug'], row['id']))
            added.append({'title': title, 'track': track})
        conn.commit()
    return {'found': len(items), 'added': len(added), 'skipped': skipped, 'items': added[:20], 'errors': errors[:5]}
