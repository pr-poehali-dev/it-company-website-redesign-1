#!/usr/bin/env python3
"""
Сборка печатного номера журнала «Масштаб».
Результат: PDF для типографии (210×280 мм + вылеты 3 мм, TrimBox/BleedBox), PDF для чтения
и картинки страниц для листалки на сайте. Запуск: PYTHONPATH=/tmp/pylibs python3 scripts/masshtab-issue/build.py
Нужны пакеты: pyphen, qrcode, pypdfium2 (pip install --target=/tmp/pylibs ...), pypdf, Pillow, chromium.
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

sys.path.insert(0, '/tmp/pylibs')
import pyphen  # noqa: E402
import pypdfium2 as pdfium  # noqa: E402
import qrcode  # noqa: E402
import qrcode.image.svg  # noqa: E402
from pypdf import PdfReader, PdfWriter  # noqa: E402
from pypdf.generic import RectangleObject  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
API = 'https://functions.poehali.dev/3aac7eea-2aca-4db1-93f4-390da980ca8b'
WORK = '/tmp/masshtab-issue'
FONTS = f'{WORK}/fonts'

ISSUE = {
    'id': '2026-11', 'dir': 'n01', 'file': 'masshtab-n01-noyabr-2026', 'number': 1, 'month': 'ноябрь 2026', 'year': 2026,
    'data_date': '29 октября 2026 г.',
    'circulation': None,
    'address': None,
    'printer': None,
    'editor': None,
}
PUBLISHER = 'ООО «МАТ-Лабс»'
COPY = f'© {PUBLISHER}, {ISSUE["year"]}'
SITE = 'mat-labs.ru'
OUT = f'{ROOT}/public/masshtab-print/{ISSUE["dir"]}'
ORDER = [2, 3, 14, 'M500', 13, 11, 9, 8, 12, 7, 5, 6, 4, 10]
COVER_STORY = 13

TRIM_W, TRIM_H, BLEED = 210, 280, 3
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

DIC = pyphen.Pyphen(lang='ru_RU')
NB = '\u00a0'


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode())


def ensure_fonts():
    os.makedirs(FONTS, exist_ok=True)
    css_path = f'{FONTS}/local.css'
    if os.path.exists(css_path):
        return
    fams = ['Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700', 'Golos+Text:wght@400;500;600;700;900',
            'PT+Serif:ital,wght@0,400;0,700;1,400;1,700']
    css = ''
    for f in fams:
        req = urllib.request.Request(f'https://fonts.googleapis.com/css2?family={f}', headers={'User-Agent': 'Mozilla/4.0'})
        css += urllib.request.urlopen(req, timeout=60).read().decode()
    for i, u in enumerate(sorted(set(re.findall(r'url\((https://[^)]+)\)', css)))):
        urllib.request.urlretrieve(u, f'{FONTS}/f{i}.ttf')
        css = css.replace(u, f'file://{FONTS}/f{i}.ttf')
    open(css_path, 'w').write(css)


# ---------- типографика ----------

def typo(s):
    s = re.sub(r' (—|–) ', NB + r'\1 ', s)
    s = re.sub(r'(?<![\w\-])([вксоуаиВКСОУАИ]|на|по|за|из|от|до|не|но|во|со|об|ко|На|По|За|Из|От|До|Не|Но|Во|Со|Об) ', r'\1' + NB, s)
    s = re.sub(r'(\d) (?=\d{3}\b)', r'\1' + NB, s)
    s = re.sub(r'(\d) (₽|%|млн|млрд|трлн|тыс\.|п\.\s?п\.|м²|раз|чел\.)', r'\1' + NB + r'\2', s)
    s = re.sub(r'(№|с\.|т\.|ст\.) (\d)', r'\1' + NB + r'\2', s)
    return s


def hy(s):
    return re.sub(r'[А-Яа-яЁё]{7,}', lambda m: DIC.inserted(m.group(0), hyphen='\u00ad'), s)


def txt(s, hyph=True):
    s = typo(s)
    return html.escape(hy(s) if hyph else s, quote=False)


def inline(s, hyph=True):
    out, last = [], 0
    for m in re.finditer(r'\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?://[^)\s]+)\)', s):
        out.append(txt(s[last:m.start()], hyph))
        if m.group(1):
            out.append(f'<b>{txt(m.group(1), hyph)}</b>')
        elif m.group(2):
            out.append(f'<i>{txt(m.group(2), hyph)}</i>')
        else:
            out.append(txt(m.group(3), hyph))
        last = m.end()
    out.append(txt(s[last:], hyph))
    return ''.join(out)


def qr_svg(url):
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=0, box_size=10)
    svg = img.to_string(encoding='unicode')
    return re.sub(r'<\?xml[^>]*\?>', '', svg).replace('<svg ', '<svg class="qr" ', 1)


def domain(url):
    m = re.match(r'https?://(?:www\.)?([^/]+)', url)
    return m.group(1) if m else url


def img_src(u):
    m = re.match(r'^https?://[^/]+(/img/masshtab/[^?#]+)$', u)
    if m and os.path.exists(f'{ROOT}/public{m.group(1)}'):
        u = m.group(1)
    if u.startswith('/'):
        return f'file://{ROOT}/public{u}'
    return u


# ---------- статьи ----------

def blocks(md):
    out = []
    W = lambda h: out.append(('wide', h))
    N = lambda h: out.append(('text', h))
    for b in [x.strip() for x in re.split(r'\n{2,}', (md or '').replace('\r', '')) if x.strip()]:
        im = re.match(r'^!\[([^\]]*)\]\((\S+?)\)$', b)
        lines = b.split('\n')
        if im:
            W(f'<figure class="wide"><img src="{img_src(im.group(2))}"><figcaption>{txt(im.group(1))}</figcaption></figure>')
        elif b.startswith('|'):
            rows = [[c.strip() for c in re.sub(r'^\||\|$', '', l).split('|')] for l in lines if not re.match(r'^\|[\s:|-]+\|$', l)]
            head, body = rows[0], rows[1:]
            th = ''.join(f'<th class="{"r" if j else ""}">{inline(c, False)}</th>' for j, c in enumerate(head))
            tb = ''.join('<tr>' + ''.join(f'<td class="{"r" if j else ""}">{inline(c, False)}</td>' for j, c in enumerate(r)) + '</tr>' for r in body)
            W(f'<div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>')
        elif b.startswith('### '):
            N(f'<h3>{inline(b[4:], False)}</h3>')
        elif b.startswith('## '):
            out.append(('h2', f'<h2>{inline(b[3:], False)}</h2>'))
        elif b.startswith('> '):
            N(f'<blockquote>{inline(re.sub(r"(?m)^>\s?", "", b), False)}</blockquote>')
        elif all(re.match(r'^- ', l) for l in lines):
            N('<ul>' + ''.join(f'<li>{inline(l[2:])}</li>' for l in lines) + '</ul>')
        elif all(re.match(r'^\d+[.)]\s', l) for l in lines):
            N('<ol>' + ''.join(f'<li>{inline(re.sub(r"^\d+[.)]\s", "", l))}</li>' for l in lines) + '</ol>')
        elif re.match(r'^\*[^*].*\*$', b) and len(lines) == 1:
            N(f'<p class="note">{inline(b)}</p>')
        else:
            N('<p>' + '<br>'.join(inline(l) for l in lines) + '</p>')
    return out


def flow(items, head='', tail=''):
    segs, cur = [], [head] if head else []
    i = 0
    while i < len(items):
        kind, h = items[i]
        nxt = items[i + 1][0] if i + 1 < len(items) else None
        if kind == 'h2' and nxt == 'wide':
            if cur:
                segs.append('<div class="cols">' + ''.join(cur) + '</div>')
                cur = []
            segs.append(f'<div class="grp"><div class="sh">{h}</div>{items[i + 1][1]}</div>')
            i += 2
            continue
        if kind == 'wide':
            if cur:
                segs.append('<div class="cols">' + ''.join(cur) + '</div>')
                cur = []
            segs.append(h)
        else:
            cur.append(h)
        i += 1
    if tail:
        cur.append(tail)
    if cur:
        segs.append('<div class="cols">' + ''.join(cur) + '</div>')
    return '\n'.join(segs)


def lines_of(s):
    return [x.strip() for x in (s or '').split('\n') if x.strip()]


def article(p, marker):
    url = f'https://{SITE}/masshtab/{p["slug"]}'
    tk = [re.sub(r'^[-—•\d.)\s]+', '', x) for x in lines_of(p.get('takeaways'))]
    src = []
    for s in lines_of(p.get('sources')):
        m = re.match(r'^(.*?)\s*(https?://\S+)$', s)
        src.append(f'{txt(m.group(1) or "", False)} ({domain(m.group(2))})' if m else txt(s, False))
    hero = ''
    if p.get('cover_url') and p['cover_url'] not in (p.get('content') or ''):
        hero = f'<figure class="hero"><img src="{img_src(p["cover_url"])}"></figure>'
    key = ''
    if tk:
        key = '<div class="key"><div class="kk">Главное</div><ol>' + ''.join(f'<li>{inline(t)}</li>' for t in tk) + '</ol></div>'
    task = f'<div class="task"><div class="kk">Посчитайте для себя</div><p>{inline(p["question"])}</p></div>' if p.get('question') else ''
    srcs = ('<div class="src"><b>Источники:</b> ' + '; '.join(src) + '.</div>') if src else ''
    return f'''
<section class="art">
  <span class="mk">{marker}</span>
  <div class="ahead">
    <div class="arow"><span class="rub">{html.escape(p["rubric"])}</span><span class="dd">Данные на {ISSUE["data_date"]}</span></div>
    <h1>{inline(p["title"], False)}</h1>
    {f'<p class="lead">{inline(p["lead"])}</p>' if p.get('lead') else ''}
    <div class="ameta">
      <div>{html.escape(p.get("author") or "Редакция «Масштаба»")} · {p.get("read_min") or 5} мин чтения</div>
      <div class="online">{qr_svg(url)}<span>Онлайн-версия<br>с интерактивными<br>графиками</span></div>
    </div>
  </div>
  {hero}
  {flow(blocks(p["content"]), key, f'<span class="end">■</span>{task}{srcs}<div class="cr">{COPY}. Перепечатка и воспроизведение — только с письменного согласия издателя.</div>')}
</section>'''


def company_name(raw):
    s = re.sub(r'\s+', ' ', raw or '').strip()
    for a, b in [(r'^ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ\s*', 'ООО '), (r'^ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*', 'ПАО '),
                 (r'^НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*', 'АО '), (r'^АКЦИОНЕРНОЕ ОБЩЕСТВО\s*', 'АО '),
                 (r'^ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО\s*', 'ЗАО ')]:
        if re.match(a, s, re.I):
            s = re.sub(a, b, s, flags=re.I)
            break
    m = re.match(r'^(\S+) "(.+)"$', s)
    body = (m.group(2) if m else s).replace('"', '')
    title = re.sub(r'(^|[\s\-«(.])(\w)', lambda x: x.group(1) + x.group(2).upper(), body.lower())
    return f'{m.group(1)} «{title}»' if m else title


def money(v):
    v = float(v or 0)
    if v >= 1e9:
        return f'{v / 1e9:.1f}'.replace('.', ',') + NB + 'млрд'
    return f'{round(v / 1e6):,}'.replace(',', NB) + NB + 'млн'


def growth(g):
    return f'×{round(g / 100 + 1):,}'.replace(',', NB) if g >= 1000 else f'+{round(g)}%'


def m500(rating, marker):
    it = rating['items'][:50]
    st = rating['stats']
    rows = ''.join(
        f'<tr><td class="n">{i["rank"]}</td><td>{html.escape(company_name(i["name"]))}</td><td>{html.escape(i.get("region_name") or "")}</td>'
        f'<td>{html.escape(i.get("section") or "")}</td><td class="r">{money(i["rev2022"])}</td><td class="r">{money(i["rev2025"])}</td>'
        f'<td class="r g">{growth(i["growth"])}</td></tr>' for i in it)
    rev = float(st['revenue']) / 1e9
    url = f'https://{SITE}/masshtab/500'
    return f'''
<section class="art m500">
  <span class="mk">{marker}</span>
  <div class="ahead">
    <div class="arow"><span class="rub">Рейтинг</span><span class="dd">Данные на {ISSUE["data_date"]}</span></div>
    <h1>«Масштаб-500»: первые 50 компаний</h1>
    <p class="lead">{txt(f"Самые быстрорастущие компании России по росту выручки за 2022–2025 годы. Проверено {rating['checked']:,} компаний, отбор прошли {rating['eligible']:,}. Медианный рост участников — +{round(st['median']):,}%, их суммарная выручка в 2025 году — {rev:.1f} млрд ₽.".replace(',', ' ').replace('.', ',', 0))}</p>
    <div class="ameta"><div>Выручка — млн или млрд ₽, по бухгалтерской отчётности (ГИР БО ФНС)</div>
      <div class="online">{qr_svg(url)}<span>Полный рейтинг<br>500 компаний<br>с фильтрами</span></div></div>
  </div>
  <div class="tbl rt"><table><thead><tr><th class="n">№</th><th>Компания</th><th>Регион</th><th>Отрасль</th><th class="r">2022</th><th class="r">2025</th><th class="r">Рост</th></tr></thead><tbody>{rows}</tbody></table></div>
  <p class="disc">Методика: компании с выручкой от 30 млн ₽ в 2022 году и от 100 млн ₽ в 2025 году, с отчётностью за все четыре года; без банков, страховых и инвестиционных компаний. Рейтинг составлен по открытым данным ФНС, не является оценкой надёжности компаний и не является инвестиционной рекомендацией. {COPY}.</p>
</section>'''


# ---------- служебные полосы ----------

def cover(posts, pages):
    cs = posts[COVER_STORY]
    pg = lambda k: pages.get(k, '00')
    lines = [(14, '«Масштаб-500»', 'кто вырос в 15 раз за три года и почему темп падает'),
             (2, 'Индикаторы рынка', 'ставка 14% надолго, что это значит для кредитов'),
             (3, 'Налоги 2027–2029', 'что поменяется для малого и среднего бизнеса'),
             (8, 'Гранты', 'поток денег технологическому бизнесу сжался втрое')]
    cl = ''.join(f'<div class="cl"><div class="clr">{html.escape(r)} <b>с.{NB}{pg(k)}</b></div><div class="clt">{txt(t, False)}</div></div>' for k, r, t in lines)
    return f'''
<section class="cover">
  <div class="ctop"><span>Деловой журнал</span><span>№{NB}{ISSUE["number"]} · {ISSUE["month"]}</span><span>16+</span></div>
  <div class="mast">Масштаб<i>.</i></div>
  <div class="tag">Бизнес, деньги и люди — проверено цифрами</div>
  <div class="feature">
    <div class="fk">Индикаторы рынка · с.{NB}{pg(COVER_STORY)}</div>
    <div class="big">47,8<small>%</small></div>
    <div class="fh">{txt("средних компаний в 2025 году заработали меньше, чем годом раньше", False)}</div>
    <div class="fbars">
      <div><span style="height:{28.8 * 1.1}mm"></span><b>28,8%</b><em>2024</em></div>
      <div class="hot"><span style="height:{47.8 * 1.1}mm"></span><b>47,8%</b><em>2025</em></div>
    </div>
    <div class="fs">{txt("Разбор отчётности 37 тысяч компаний с выручкой 0,3–2 млрд ₽: где рост сохранился и где выручка падает чаще всего", False)}</div>
  </div>
  <div class="clines">{cl}</div>
  <div class="cbot"><span>{SITE}/masshtab</span><span>Данные — ФНС, Банк России, Росстат</span><span>{COPY}</span></div>
</section>'''


def contents(posts, pages):
    items = []
    for k in ORDER:
        if k == 'M500':
            items.append(('Рейтинг', '«Масштаб-500»: первые 50 компаний', pages.get('M500', '00')))
        else:
            items.append((posts[k]['rubric'], posts[k]['title'], pages.get(k, '00')))
    rows = ''.join(f'<div class="ti"><div class="tn">{p}</div><div><div class="tr">{html.escape(r)}</div><div class="tt">{txt(t, False)}</div></div></div>' for r, t, p in items)
    return f'''
<section class="front toc">
  <div class="fhead"><span>Масштаб<i>.</i></span><span>№{NB}{ISSUE["number"]} · {ISSUE["month"]}</span></div>
  <h1>Содержание</h1>
  <div class="tlist">{rows}</div>
</section>'''


PRINCIPLES = [
    ('У каждой цифры есть источник', 'Росстат, Банк России, ФНС, отчётность компаний. Источник подписан под графиком и в конце материала.'),
    ('Дата актуальности данных', 'Указана в начале каждого материала. Устаревшие данные обновляем или помечаем.'),
    ('Без «успешного успеха»', 'Пишем «по данным», «в среднем по отрасли», «риск». Не обещаем «невероятный рост».'),
    ('Термин — сразу с расшифровкой', 'Сложное понятие объясняем в тексте, а не отправляем читателя в поиск.'),
    ('Реклама всегда помечена', 'Партнёрские материалы и реклама подписаны. Рекламодатель не влияет на рейтинг и выводы редакции.'),
]


def editorial():
    pr = ''.join(f'<div class="pr"><b>{txt(t, False)}</b><p>{txt(d)}</p></div>' for t, d in PRINCIPLES)
    return f'''
<section class="front ed">
  <div class="fhead"><span>От редакции</span><span>{SITE}/masshtab</span></div>
  <h1>{txt("Деловой журнал без пафоса и по делу", False)}</h1>
  <p class="edl">{txt("«Масштаб» пишет для предпринимателей и руководителей, которым нужно быстро понять, что происходит на рынке и что из этого следует для их бизнеса. В этом номере — индикаторы рынка, регуляторные изменения, разборы по открытым данным ФНС, практические инструменты и первые 50 компаний рейтинга «Масштаб-500».")}</p>
  <p class="edl">{txt("Каждый материал устроен одинаково: дата актуальности данных в начале, короткий ответ «что произошло и почему это важно», цифры и графики с подписанным источником, блок «Главное» и задание «Посчитайте для себя» — чтобы применить выводы к своему бизнесу.")}</p>
  <h2>Редакционные принципы</h2>
  <div class="prs">{pr}</div>
  <div class="edqr">{qr_svg(f"https://{SITE}/masshtab")}<div><b>Онлайн-версия журнала</b><br>{txt("Свежие материалы, интерактивные графики, полный рейтинг «Масштаб-500» и лента новостей экономики.", False)}<br>{SITE}/masshtab</div></div>
</section>'''


def house():
    return f'''
<section class="front house">
  <div class="fhead"><span>Масштаб<i>.</i></span><span>Спецпроекты</span></div>
  <h1>{txt("Расскажите о своей компании читателям «Масштаба»", False)}</h1>
  <div class="hgrid">
    <div><div class="hn">01</div><b>Стать героем интервью</b><p>{txt("Редакция выбирает компании с измеримым ростом и честной историей. Интервью — бесплатно, решение принимает редакция.")}</p></div>
    <div><div class="hn">02</div><b>Партнёрский материал</b><p>{txt("Разбор вашего кейса на открытых данных. Всегда помечается как партнёрский.")}</p></div>
    <div><div class="hn">03</div><b>Рекламная полоса</b><p>{txt("Полоса в печатном номере и рекламные места на сайте. Реклама маркируется по закону.")}</p></div>
  </div>
  <div class="edqr big">{qr_svg(f"https://{SITE}/masshtab/reklama")}<div><b>Условия и заявка</b><br>{SITE}/masshtab/reklama</div></div>
</section>'''


def notes():
    return '<section class="front notes"><div class="fhead"><span>Масштаб<i>.</i></span><span>Для заметок</span></div><h1>Для заметок</h1><div class="lines"></div></section>'


def imprint():
    rows = [('Издание', f'«Масштаб» — деловой журнал'), ('Выпуск', f'№{NB}{ISSUE["number"]}, {ISSUE["month"]} г.'),
            ('Издатель и редакция', PUBLISHER), ('Сайт', f'{SITE}/masshtab')]
    if ISSUE.get('editor'):
        rows.append(('Главный редактор', ISSUE['editor']))
    if ISSUE.get('address'):
        rows.append(('Адрес издателя и редакции', ISSUE['address']))
    rows += [('Данные в материалах', f'актуальны на {ISSUE["data_date"]}'), ('Формат', f'{TRIM_W}×{TRIM_H} мм')]
    if ISSUE.get('circulation'):
        rows.append(('Тираж', ISSUE['circulation']))
    if ISSUE.get('printer'):
        rows.append(('Отпечатано', ISSUE['printer']))
    rows.append(('Возрастная категория', '16+'))
    tb = ''.join(f'<tr><td>{html.escape(a)}</td><td>{html.escape(b)}</td></tr>' for a, b in rows)
    rules = [
        f'{COPY}. Все права на материалы номера — тексты, расчёты, графики, таблицы, рейтинг «Масштаб-500», оформление — принадлежат {PUBLISHER} и охраняются законодательством Российской Федерации об интеллектуальной собственности.',
        f'Воспроизведение, перепечатка, распространение и переработка материалов, полностью или частично, в печатном или электронном виде допускаются только с письменного согласия {PUBLISHER}.',
        'Цитирование допускается в объёме, оправданном целью цитирования (ст. 1274 ГК РФ), с обязательным указанием источника: журнал «Масштаб», а в интернете — с активной ссылкой на mat-labs.ru/masshtab.',
        'Данные государственных органов и организаций (ФНС, Банк России, Росстат и др.) приводятся со ссылкой на источник. Расчёты, графики и выводы на их основе выполнены редакцией.',
        'Материалы носят информационный характер и не являются индивидуальной налоговой, юридической или инвестиционной консультацией. Рейтинг «Масштаб-500» составлен по открытой бухгалтерской отчётности и не является оценкой надёжности компаний.',
        'Партнёрские материалы и реклама помечаются. Ответственность за содержание рекламы несёт рекламодатель.',
    ]
    rl = ''.join(f'<li>{txt(r)}</li>' for r in rules)
    src = [('ФНС, ГИР БО', 'бухгалтерская отчётность компаний — основа «Масштаб-500»'), ('Банк России', 'ключевая ставка, курсы, денежная статистика'),
           ('Росстат, Минэкономразвития', 'инфляция, отрасли, деловая активность'), ('ЕИС «Закупки», реестр МСП ФНС', 'госзакупки, получатели поддержки')]
    sr = ''.join(f'<tr><td>{html.escape(a)}</td><td>{html.escape(b)}</td></tr>' for a, b in src)
    return f'''
<section class="front imprint">
  <div class="fhead"><span>Масштаб<i>.</i></span><span>Выходные данные</span></div>
  <h2>Выходные данные</h2>
  <table class="imp">{tb}</table>
  <h2>Правила использования материалов</h2>
  <ol class="rules">{rl}</ol>
  <h2>Источники данных номера</h2>
  <table class="imp">{sr}</table>
</section>'''


def back():
    return f'''
<section class="backc">
  <div class="bmast">Масштаб<i>.</i></div>
  <div class="btag">Бизнес, деньги и люди —<br>проверено цифрами</div>
  <div class="bbox">
    <div class="bqr">{qr_svg(f"https://{SITE}/masshtab/500")}</div>
    <div><div class="bk">Рейтинг «Масштаб-500»</div><div class="bt">{txt("500 самых быстрорастущих компаний России по данным ФНС. Найдите свою компанию и конкурентов.", False)}</div><div class="bu">{SITE}/masshtab/500</div></div>
  </div>
  <div class="bbot"><span>{COPY}. Все права защищены.<br>Перепечатка — только с письменного согласия издателя.</span><span class="age">16+</span></div>
</section>'''


# ---------- CSS ----------

def css():
    return open(f'{FONTS}/local.css').read() + f'''
@page {{ size: {PAGE_W}mm {PAGE_H}mm; margin: {BLEED + 15}mm {BLEED + 14}mm {BLEED + 17}mm {BLEED + 18}mm;
  @bottom-center {{ content: "{COPY} · Перепечатка только с письменного согласия издателя · 16+"; font: 5.6pt 'Golos Text'; color: #8a8278; }} }}
@page :right {{ margin-left: {BLEED + 18}mm; margin-right: {BLEED + 14}mm;
  @top-right {{ content: "МАСШТАБ · №{ISSUE['number']} · {ISSUE['month'].upper()}"; font: 600 6.3pt 'Golos Text'; letter-spacing: .14em; color: #8a8278; }}
  @bottom-right {{ content: counter(page); font: 700 8pt 'Golos Text'; color: #14110f; }} }}
@page :left {{ margin-left: {BLEED + 14}mm; margin-right: {BLEED + 18}mm;
  @top-left {{ content: "{SITE.upper()}/MASSHTAB"; font: 600 6.3pt 'Golos Text'; letter-spacing: .14em; color: #8a8278; }}
  @bottom-left {{ content: counter(page); font: 700 8pt 'Golos Text'; color: #14110f; }} }}
@page full {{ margin: 0; @top-left {{ content: none }} @top-right {{ content: none }} @bottom-left {{ content: none }} @bottom-right {{ content: none }} @bottom-center {{ content: none }} }}
@page full:left {{ margin: 0; @top-left {{ content: none }} @top-right {{ content: none }} @bottom-left {{ content: none }} @bottom-right {{ content: none }} @bottom-center {{ content: none }} }}
@page full:right {{ margin: 0; @top-left {{ content: none }} @top-right {{ content: none }} @bottom-left {{ content: none }} @bottom-right {{ content: none }} @bottom-center {{ content: none }} }}
@page full:first {{ margin: 0; @top-left {{ content: none }} @top-right {{ content: none }} @bottom-left {{ content: none }} @bottom-right {{ content: none }} @bottom-center {{ content: none }} }}
@page front:left {{ @top-left {{ content: none }} }}
@page front:right {{ @top-right {{ content: none }} }}
@page front {{ @top-left {{ content: none }} @top-right {{ content: none }} }}
* {{ box-sizing: border-box; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ margin: 0; font-family: 'PT Serif', 'Golos Text', serif; font-size: 9.2pt; line-height: 1.42; color: #1f1b18; }}
.mk {{ position: absolute; font-size: 1px; color: transparent; }}
i {{ font-style: italic; }}
.rub, .kk, .dd, .fk, .clr, .tr {{ font-family: 'Golos Text', sans-serif; }}

.cover, .backc {{ page: full; width: 100vw; height: 100vh; overflow: hidden; position: relative; break-after: page; }}
.backc {{ break-after: auto; }}
.cover {{ background: #f6f2ea; padding: {BLEED + 12}mm {BLEED + 14}mm {BLEED + 10}mm; font-family: 'Golos Text', sans-serif; }}
.ctop {{ display: flex; justify-content: space-between; font-size: 8pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; border-bottom: 1.4pt solid #14110f; padding-bottom: 2.5mm; }}
.mast {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 104pt; line-height: .95; letter-spacing: -.02em; margin-top: 6mm; color: #14110f; }}
.mast i, .bmast i, .fhead i {{ font-style: normal; color: #d6402b; }}
.tag {{ font-family: 'Playfair Display', serif; font-style: italic; font-size: 13pt; color: #5b5550; margin-top: 1mm; }}
.feature {{ position: relative; margin-top: 14mm; border-top: 4pt solid #d6402b; padding-top: 5mm; min-height: 100mm; }}
.fk {{ font-size: 8pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #d6402b; }}
.big {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 120pt; line-height: 1; color: #d6402b; margin-top: 2mm; }}
.big small {{ font-size: 60pt; }}
.fh {{ font-family: 'Playfair Display', serif; font-weight: 700; font-size: 25pt; line-height: 1.12; max-width: 118mm; color: #14110f; margin-top: 1mm; }}
.fs {{ font-size: 10pt; color: #3b3631; max-width: 112mm; margin-top: 4mm; line-height: 1.4; }}
.fbars {{ position: absolute; right: 2mm; top: 22mm; display: flex; gap: 6mm; align-items: flex-end; height: 66mm; }}
.fbars div {{ width: 20mm; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; position: relative; }}
.fbars span {{ display: block; width: 100%; background: #d4c8b6; order: 2; }}
.fbars .hot span {{ background: #14110f; }}
.fbars b {{ order: 1; font-size: 11pt; margin-bottom: 1.5mm; }}
.fbars em {{ order: 3; font-style: normal; font-size: 8pt; color: #5b5550; margin-top: 1.5mm; }}
.clines {{ position: absolute; left: {BLEED + 14}mm; right: {BLEED + 14}mm; bottom: {BLEED + 20}mm; display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; border-top: 1.4pt solid #14110f; padding-top: 4mm; }}
.clr {{ font-size: 7pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #d6402b; }}
.clr b {{ color: #14110f; }}
.clt {{ font-family: 'Playfair Display', serif; font-weight: 700; font-size: 11pt; line-height: 1.18; margin-top: 1.5mm; }}
.cbot {{ position: absolute; left: 0; right: 0; bottom: 0; height: {BLEED + 11}mm; background: #14110f; color: #f6f2ea; display: flex; justify-content: space-between; align-items: center; padding: 0 {BLEED + 14}mm {BLEED}mm; font-size: 7.5pt; letter-spacing: .06em; }}

.backc {{ background: #14110f; color: #f6f2ea; padding: {BLEED + 30}mm {BLEED + 18}mm; font-family: 'Golos Text', sans-serif; }}
.bmast {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 78pt; line-height: 1; }}
.btag {{ font-family: 'Playfair Display', serif; font-style: italic; font-size: 20pt; line-height: 1.25; color: #d4c8b6; margin-top: 6mm; }}
.bbox {{ margin-top: 40mm; display: flex; gap: 8mm; align-items: center; border-top: 1pt solid #5b5550; border-bottom: 1pt solid #5b5550; padding: 8mm 0; }}
.bqr {{ background: #f6f2ea; padding: 3mm; color: #14110f; }}
.bqr .qr {{ width: 34mm; height: 34mm; display: block; }}
.bk {{ font-size: 8pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #d6402b; }}
.bt {{ font-family: 'Playfair Display', serif; font-size: 16pt; font-weight: 700; line-height: 1.2; margin-top: 2mm; }}
.bu {{ font-size: 9pt; color: #d4c8b6; margin-top: 3mm; }}
.bbot {{ position: absolute; left: {BLEED + 18}mm; right: {BLEED + 18}mm; bottom: {BLEED + 14}mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 7pt; color: #8a8278; line-height: 1.5; }}
.age {{ border: 1.2pt solid #f6f2ea; color: #f6f2ea; font-weight: 800; font-size: 11pt; padding: 1mm 2mm; }}

.front {{ page: front; break-before: page; font-family: 'Golos Text', sans-serif; }}
.fhead {{ display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; border-bottom: 1.2pt solid #14110f; padding-bottom: 2mm; }}
.fhead span:first-child {{ font-family: 'Playfair Display', serif; font-size: 13pt; letter-spacing: 0; text-transform: none; }}
.front h1 {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 34pt; line-height: 1.05; margin: 9mm 0 7mm; }}
.front h2 {{ font-family: 'Playfair Display', serif; font-weight: 700; font-size: 15pt; margin: 8mm 0 3mm; }}
.tlist {{ border-top: 1pt solid #14110f; }}
.ti {{ display: grid; grid-template-columns: 16mm 1fr; gap: 4mm; padding: 2.6mm 0; border-bottom: .5pt solid #e2d9cb; break-inside: avoid; }}
.tn {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 17pt; color: #d6402b; line-height: 1; }}
.tr {{ font-size: 6.6pt; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #8a8278; }}
.tt {{ font-family: 'Playfair Display', serif; font-weight: 700; font-size: 10.6pt; line-height: 1.2; margin-top: .6mm; }}
.edl {{ font-family: 'PT Serif', serif; font-size: 11pt; line-height: 1.5; margin: 0 0 3.5mm; color: #2b2724; }}
.prs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 7mm; }}
.pr b {{ font-size: 9pt; }}
.pr p {{ font-family: 'PT Serif', serif; font-size: 8.8pt; line-height: 1.4; margin: 1mm 0 0; color: #3b3631; }}
.edqr {{ display: flex; gap: 5mm; align-items: center; margin-top: 10mm; background: #f6f2ea; padding: 5mm; font-size: 8.5pt; line-height: 1.45; }}
.edqr .qr {{ width: 24mm; height: 24mm; flex: none; }}
.edqr.big .qr {{ width: 32mm; height: 32mm; }}
.hgrid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 7mm; margin-top: 4mm; }}
.hn {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 30pt; color: #d6402b; }}
.hgrid b {{ font-size: 11pt; }}
.hgrid p {{ font-family: 'PT Serif', serif; font-size: 9.4pt; line-height: 1.45; color: #3b3631; }}
.notes .lines {{ height: 205mm; background: repeating-linear-gradient(to bottom, transparent 0, transparent 8.6mm, #d4c8b6 8.6mm, #d4c8b6 8.9mm); }}
.imp {{ width: 100%; border-collapse: collapse; font-size: 8.4pt; }}
.imp td {{ padding: 1.6mm 0; border-bottom: .5pt solid #e2d9cb; vertical-align: top; }}
.imp td:first-child {{ width: 52mm; color: #5b5550; padding-right: 4mm; }}
.rules {{ padding-left: 5mm; margin: 0; font-family: 'PT Serif', serif; font-size: 8.6pt; line-height: 1.45; text-align: justify; }}
.rules li {{ margin-bottom: 1.8mm; }}

.art {{ break-before: page; position: relative; }}
.ahead {{ border-top: 3pt solid #14110f; padding-top: 3mm; margin-bottom: 4mm; }}
.arow {{ display: flex; justify-content: space-between; font-size: 7pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }}
.rub {{ color: #d6402b; }}
.dd {{ color: #8a8278; font-weight: 600; letter-spacing: .06em; }}
.art h1 {{ font-family: 'Playfair Display', serif; font-weight: 800; font-size: 25pt; line-height: 1.06; margin: 3.5mm 0 3mm; color: #14110f; }}
.lead {{ font-size: 11.6pt; line-height: 1.38; color: #3b3631; margin: 0; }}
.ameta {{ display: flex; justify-content: space-between; align-items: flex-end; margin-top: 3.5mm; padding-bottom: 2.5mm; border-bottom: .6pt solid #14110f; font-family: 'Golos Text', sans-serif; font-size: 7pt; color: #5b5550; }}
.online {{ display: flex; align-items: center; gap: 2mm; font-size: 6.3pt; line-height: 1.3; text-align: left; }}
.online .qr {{ width: 13mm; height: 13mm; }}
.hero {{ margin: 0 0 4mm; }}
.hero img {{ width: 100%; display: block; }}
.cols {{ columns: 2; column-gap: 6mm; column-rule: .4pt solid #e2d9cb; text-align: justify; orphans: 3; widows: 3; }}
.cols p {{ margin: 0 0 2.2mm; }}

.cols h2 {{ break-inside: avoid; page-break-after: avoid; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 12.6pt; line-height: 1.18; margin: 4.5mm 0 2mm; text-align: left; break-after: avoid; color: #14110f; }}
.cols h3 {{ font-family: 'Golos Text', sans-serif; font-weight: 800; font-size: 8.8pt; margin: 3.5mm 0 1.5mm; text-align: left; break-after: avoid; }}
.cols h2:first-child {{ margin-top: 0; }}
.cols ul, .cols ol {{ margin: 0 0 2.4mm; padding-left: 4.2mm; }}
.cols li {{ margin-bottom: 1.2mm; }}
.cols b {{ color: #14110f; }}
.note {{ font-size: 7.6pt; color: #8a8278; text-align: left; }}
blockquote {{ margin: 3mm 0 4mm; padding: 2.5mm 0 2.5mm 3.5mm; border-left: 2.4pt solid #d6402b; font-family: 'Playfair Display', serif; font-style: italic; font-size: 13pt; line-height: 1.25; color: #14110f; text-align: left; break-inside: avoid; }}
.key {{ background: #f6f2ea; padding: 3mm 3.5mm 1.5mm; margin-bottom: 4mm; break-inside: avoid; font-family: 'Golos Text', sans-serif; font-size: 8pt; line-height: 1.38; text-align: left; }}
.key ol {{ padding-left: 4mm; margin: 1.5mm 0 0; }}
.key li::marker {{ color: #d6402b; font-weight: 800; }}
.kk {{ font-size: 7pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #d6402b; }}
.wide, .tbl, .grp {{ break-inside: avoid; margin: 3mm 0 4.5mm; }}
.grp .wide {{ margin: 0; }}
.wide img {{ width: 100%; max-height: 82mm; width: auto; max-width: 100%; margin: 0 auto; object-fit: contain; display: block; }}
.sh h2 {{ font-family: 'Playfair Display', serif; font-weight: 700; font-size: 12.6pt; line-height: 1.18; margin: 1.5mm 0 2mm; color: #14110f; }}
.cols + .cols {{ margin-top: 0; }}
figcaption {{ font-family: 'Golos Text', sans-serif; font-size: 6.6pt; color: #8a8278; margin-top: 1.2mm; text-align: left; }}
.tbl table {{ width: 100%; border-collapse: collapse; font-family: 'Golos Text', sans-serif; font-size: 7.4pt; line-height: 1.3; text-align: left; }}
.tbl th {{ border-bottom: 1.2pt solid #14110f; padding: 1.3mm 2mm 1.3mm 0; font-weight: 700; vertical-align: bottom; }}
.tbl td {{ border-bottom: .4pt solid #e2d9cb; padding: 1.1mm 2mm 1.1mm 0; vertical-align: top; }}
.tbl .r {{ text-align: right; white-space: nowrap; }}
.end {{ color: #d6402b; font-size: 7pt; }}
.task {{ background: #14110f; color: #f6f2ea; padding: 3mm 3.5mm; margin: 4mm 0 3mm; break-inside: avoid; font-family: 'Golos Text', sans-serif; font-size: 8pt; line-height: 1.42; text-align: left; }}
.task p {{ margin: 1.2mm 0 0; }}
.task .kk {{ color: #e8836f; }}
.src {{ font-family: 'Golos Text', sans-serif; font-size: 6.4pt; line-height: 1.38; color: #5b5550; text-align: left; margin-bottom: 2mm; }}
.cr {{ font-family: 'Golos Text', sans-serif; font-size: 6.2pt; color: #8a8278; text-align: left; border-top: .4pt solid #e2d9cb; padding-top: 1.2mm; }}
.m500 .tbl {{ column-span: none; break-inside: auto; }}
.rt table {{ font-size: 7.1pt; }}
.rt td {{ padding: .9mm 1.6mm .9mm 0; }}
.rt thead {{ display: table-header-group; }}
.rt tr {{ break-inside: avoid; }}
.rt .n {{ font-weight: 800; color: #d6402b; width: 6mm; }}
.rt .g {{ font-weight: 800; color: #16803c; }}
.disc {{ font-family: 'Golos Text', sans-serif; font-size: 6.6pt; color: #8a8278; margin-top: 3mm; }}
.qr {{ color: #14110f; }}
.qr path {{ fill: currentColor; }}
'''


def build_html(posts, rating, pages, fill):
    parts = [cover(posts, pages), contents(posts, pages), editorial()]
    for k in ORDER:
        parts.append(m500(rating, '§M500§') if k == 'M500' else article(posts[k], f'§A{k}§'))
    if fill:
        parts.append(house())
        parts += [notes() for _ in range(fill - 1)]
    parts += [imprint(), back()]
    return f'<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Масштаб № {ISSUE["number"]}</title><style>{css()}</style></head><body>{"".join(parts)}</body></html>'


def render(html_text, pdf):
    path = f'{WORK}/issue.html'
    open(path, 'w').write(html_text)
    last = None
    for attempt in range(3):
        prof = f'{WORK}/chrome-{os.getpid()}-{attempt}'
        shutil.rmtree(prof, ignore_errors=True)
        r = subprocess.run(['chromium', '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-pdf-header-footer',
                            f'--user-data-dir={prof}', '--virtual-time-budget=15000', f'--print-to-pdf={pdf}', f'file://{path}'],
                           capture_output=True, timeout=300)
        shutil.rmtree(prof, ignore_errors=True)
        if r.returncode == 0 and os.path.exists(pdf):
            return
        last = r.stderr.decode(errors='ignore')[-800:]
    sys.exit(f'Chromium не смог собрать PDF: {last}')


def find_pages(pdf):
    doc = pdfium.PdfDocument(pdf)
    found = {}
    for i in range(len(doc)):
        t = doc[i].get_textpage().get_text_range()
        for m in re.finditer(r'§(A\d+|M500)§', t):
            k = m.group(1)
            key = 'M500' if k == 'M500' else int(k[1:])
            found.setdefault(key, i + 1)
    return found, len(doc)


def finalize(src, print_pdf, read_pdf):
    mm = 72 / 25.4
    meta = {'/Title': f'Масштаб. Деловой журнал. № {ISSUE["number"]}, {ISSUE["month"]}', '/Author': PUBLISHER,
            '/Subject': 'Деловой журнал «Масштаб»', '/Keywords': f'{COPY}; перепечатка только с письменного согласия издателя; 16+',
            '/Creator': 'Журнал «Масштаб»', '/Producer': PUBLISHER}
    for target, crop in ((print_pdf, False), (read_pdf, True)):
        r = PdfReader(src)
        w = PdfWriter()
        for pg in r.pages:
            W, H = float(pg.mediabox.width), float(pg.mediabox.height)
            trim = RectangleObject([BLEED * mm, BLEED * mm, W - BLEED * mm, H - BLEED * mm])
            if crop:
                pg.mediabox = trim
                pg.cropbox = trim
            else:
                pg.bleedbox = RectangleObject([0, 0, W, H])
                pg.trimbox = trim
                pg.artbox = trim
            w.add_page(pg)
        w.add_metadata(meta)
        w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
        with open(target, 'wb') as f:
            w.write(f)


def previews(read_pdf, out_dir):
    os.makedirs(f'{out_dir}/p', exist_ok=True)
    os.makedirs(f'{out_dir}/t', exist_ok=True)
    doc = pdfium.PdfDocument(read_pdf)
    for i in range(len(doc)):
        pg = doc[i]
        scale = 1200 / pg.get_width()
        im = pg.render(scale=scale).to_pil().convert('RGB')
        im.save(f'{out_dir}/p/{i + 1:03d}.webp', 'WEBP', quality=80, method=6)
        im.resize((180, round(180 * im.height / im.width))).save(f'{out_dir}/t/{i + 1:03d}.webp', 'WEBP', quality=72)
        if i == 0:
            im.resize((900, round(900 * im.height / im.width))).save(f'{out_dir}/cover.jpg', 'JPEG', quality=86)
    return len(doc)


def main():
    os.makedirs(WORK, exist_ok=True)
    ensure_fonts()
    feed = get(f'{API}/?action=feed&limit=50')['posts']
    posts = {p['id']: p for p in feed}
    missing = [k for k in ORDER if k != 'M500' and k not in posts]
    if missing:
        sys.exit(f'Нет статей: {missing}')
    rating = get(f'{API}/?action=rating')
    first = f'{WORK}/pass1.pdf'
    render(build_html(posts, rating, {}, 0), first)
    pages, n = find_pages(first)
    fill = (-(n + 1)) % 4 + 1
    final = f'{WORK}/pass2.pdf'
    render(build_html(posts, rating, pages, fill), final)
    pages2, n2 = find_pages(final)
    if pages2 != pages:
        render(build_html(posts, rating, pages2, fill), final)
        pages2, n2 = find_pages(final)
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    name = ISSUE['file']
    finalize(final, f'{OUT}/{name}-print.pdf', f'{OUT}/{name}.pdf')
    total = previews(f'{OUT}/{name}.pdf', OUT)
    info = {'pages': total, 'toc': {str(k): v for k, v in pages2.items()},
            'print_mb': round(os.path.getsize(f'{OUT}/{name}-print.pdf') / 1e6, 1), 'read_mb': round(os.path.getsize(f'{OUT}/{name}.pdf') / 1e6, 1)}
    json.dump(info, open(f'{WORK}/info.json', 'w'), ensure_ascii=False)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == '__main__':
    main()