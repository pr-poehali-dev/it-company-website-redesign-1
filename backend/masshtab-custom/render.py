"""Сборка PDF индивидуального выпуска «Масштаба»: обложка, содержание, статьи, рейтинг, индикаторы, полосы архива."""
import io
import os
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from xml.sax.saxutils import escape

import requests
from PIL import Image as PILImage
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, Image, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer,
                                Table, TableStyle)

SITE = 'https://mat-labs.ru'
W, H = 210 * mm, 280 * mm
ML, MR, MT, MB = 20 * mm, 18 * mm, 20 * mm, 20 * mm
CW = W - ML - MR
INK, RED, PAPER, MUTED, LINE = (colors.HexColor(c) for c in ('#14110f', '#d6402b', '#f6f2ea', '#8a8278', '#e2d9cb'))
MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
UA = {'User-Agent': 'Mozilla/5.0 (compatible; MasshtabBot/1.0; +https://mat-labs.ru/masshtab)'}

GF = 'https://fonts.gstatic.com/s/'
FONTS = {'Golos': 'golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plVRRQ5c.ttf', 'Golos-Bold': 'golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plW2Qg5c.ttf',
         'Golos-Black': 'golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plX4Qg5c.ttf', 'Serif': 'ptserif/v19/EJRVQgYoZZY2vCFuvDFR.ttf',
         'Serif-Bold': 'ptserif/v19/EJRSQgYoZZY2vCFuvAnt65qV.ttf', 'Serif-Italic': 'ptserif/v19/EJRTQgYoZZY2vCFuvAFTzro.ttf',
         'Display': 'playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKfFukDQ.ttf'}
FONT_DIR = '/tmp/masshtab-fonts'


def _font(name, path):
    local = f'{FONT_DIR}/{name}.ttf'
    if not os.path.exists(local) or os.path.getsize(local) < 10000:
        os.makedirs(FONT_DIR, exist_ok=True)
        r = requests.get(GF + path, timeout=15)
        r.raise_for_status()
        with open(local + '.part', 'wb') as f:
            f.write(r.content)
        os.replace(local + '.part', local)
    return name, local


with ThreadPoolExecutor(7) as _ex:
    for _n, _p in _ex.map(lambda kv: _font(*kv), FONTS.items()):
        pdfmetrics.registerFont(TTFont(_n, _p))
pdfmetrics.registerFontFamily('Serif', normal='Serif', bold='Serif-Bold', italic='Serif-Italic', boldItalic='Serif-Bold')
pdfmetrics.registerFontFamily('Golos', normal='Golos', bold='Golos-Bold', italic='Golos', boldItalic='Golos-Bold')


def st(name, **kw):
    base = dict(fontName='Serif', fontSize=10, leading=14.2, textColor=INK, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    'body': st('body', spaceAfter=6),
    'lead': st('lead', fontSize=12.5, leading=17, textColor=colors.HexColor('#3b3631'), spaceAfter=10),
    'kick': st('kick', fontName='Golos-Bold', fontSize=7.5, leading=10, textColor=RED, spaceAfter=4),
    'h1': st('h1', fontName='Display', fontSize=25, leading=29, spaceAfter=8),
    'h2': st('h2', fontName='Golos-Bold', fontSize=13.5, leading=17, spaceBefore=10, spaceAfter=5),
    'h3': st('h3', fontName='Golos-Bold', fontSize=11, leading=14, spaceBefore=6, spaceAfter=3),
    'meta': st('meta', fontName='Golos', fontSize=7.5, leading=10, textColor=MUTED, spaceAfter=8),
    'quote': st('quote', fontName='Serif-Italic', fontSize=11, leading=15.5, leftIndent=8 * mm, textColor=colors.HexColor('#3b3631'), spaceBefore=4, spaceAfter=8),
    'li': st('li', leftIndent=6 * mm, bulletIndent=1.5 * mm, spaceAfter=3),
    'cap': st('cap', fontName='Golos', fontSize=7.3, leading=9.5, textColor=MUTED, spaceBefore=2, spaceAfter=8),
    'cell': st('cell', fontName='Golos', fontSize=7.6, leading=9.8),
    'cellb': st('cellb', fontName='Golos-Bold', fontSize=7.6, leading=9.8),
    'box': st('box', fontName='Golos', fontSize=9, leading=12.5, textColor=colors.white),
    'boxh': st('boxh', fontName='Golos-Bold', fontSize=8, leading=11, textColor=colors.HexColor('#ff8a73'), spaceAfter=3),
    'src': st('src', fontName='Golos', fontSize=7, leading=9.5, textColor=colors.HexColor('#5b5550'), spaceAfter=2),
    'toc_n': st('toc_n', fontName='Display', fontSize=16, leading=19, textColor=RED),
    'toc_r': st('toc_r', fontName='Golos-Bold', fontSize=7, leading=9, textColor=MUTED),
    'toc_t': st('toc_t', fontName='Serif-Bold', fontSize=11, leading=14),
    'big': st('big', fontName='Display', fontSize=24, leading=28),
    'small': st('small', fontName='Golos', fontSize=8, leading=11, textColor=MUTED),
}


def ru_date(d):
    return f'{d.day} {MONTHS[d.month - 1]} {d.year}'


def esc(s):
    return escape(str(s or ''))


def inline(s):
    out, last = [], 0
    for m in re.finditer(r'\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\((https?://[^)\s]+)\)', s):
        out.append(esc(s[last:m.start()]))
        if m.group(1):
            out.append(f'<b>{esc(m.group(1))}</b>')
        elif m.group(2):
            out.append(f'<i>{esc(m.group(2))}</i>')
        else:
            out.append(f'<link href="{esc(m.group(4))}" color="#d6402b">{esc(m.group(3))}</link>')
        last = m.end()
    out.append(esc(s[last:]))
    return ''.join(out)


def img_url(u):
    m = re.match(r'^https?://[^/]+(/img/masshtab/[^?#]+)$', u or '')
    if m:
        return SITE + m.group(1)
    if (u or '').startswith('/'):
        return SITE + u
    return u


class Images:
    def __init__(self):
        self.cache = {}

    def prefetch(self, urls):
        urls = [img_url(u) for u in set(urls) if u]
        urls = [u for u in urls if u not in self.cache]
        def get(u):
            try:
                r = requests.get(u, headers=UA, timeout=6)
                r.raise_for_status()
                im = PILImage.open(io.BytesIO(r.content))
                im.load()
                if im.mode not in ('RGB', 'L'):
                    bg = PILImage.new('RGB', im.size, (255, 255, 255))
                    bg.paste(im, mask=im.convert('RGBA').split()[-1])
                    im = bg
                if im.width > 1600:
                    im = im.resize((1600, round(1600 * im.height / im.width)))
                buf = io.BytesIO()
                im.save(buf, 'JPEG', quality=82)
                return u, (buf.getvalue(), im.width, im.height)
            except Exception as e:
                print(f'[custom] image {u}: {e}')
                return u, None
        with ThreadPoolExecutor(8) as ex:
            for u, v in ex.map(get, urls):
                self.cache[u] = v

    def flow(self, u, max_h=105 * mm):
        v = self.cache.get(img_url(u))
        if not v:
            return None
        data, w, h = v
        dw = CW
        dh = dw * h / w
        if dh > max_h:
            dh, dw = max_h, max_h * w / h
        return Image(io.BytesIO(data), width=dw, height=dh)


def md_images(md):
    return re.findall(r'!\[[^\]]*\]\((\S+?)\)', md or '')


def md_flow(md, images):
    out = []
    for b in [x.strip() for x in re.split(r'\n{2,}', (md or '').replace('\r', '')) if x.strip()]:
        lines = b.split('\n')
        im = re.match(r'^!\[([^\]]*)\]\((\S+?)\)$', b)
        if im:
            f = images.flow(im.group(2))
            if f:
                out.append(KeepTogether([f, Paragraph(inline(im.group(1)), S['cap'])]))
        elif b.startswith('|'):
            rows = [[c.strip() for c in re.sub(r'^\||\|$', '', l).split('|')] for l in lines if not re.match(r'^\|[\s:|-]+\|$', l)]
            n = max(len(r) for r in rows)
            rows = [r + [''] * (n - len(r)) for r in rows]
            data = [[Paragraph(inline(c), S['cellb' if i == 0 else 'cell']) for c in r] for i, r in enumerate(rows)]
            first = CW * (0.34 if n > 2 else 0.5)
            widths = [first] + [(CW - first) / (n - 1)] * (n - 1) if n > 1 else [CW]
            t = Table(data, colWidths=widths, repeatRows=1)
            t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, 0), 0.8, INK), ('LINEBELOW', (0, 1), (-1, -1), 0.3, LINE),
                                   ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                                   ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5), ('LEFTPADDING', (0, 0), (-1, -1), 2), ('RIGHTPADDING', (0, 0), (-1, -1), 4)]))
            out += [t, Spacer(1, 8)]
        elif b.startswith('### '):
            out.append(Paragraph(inline(b[4:]), S['h3']))
        elif b.startswith('## '):
            out.append(Paragraph(inline(b[3:]), S['h2']))
        elif b.startswith('> '):
            out.append(Paragraph(inline(re.sub(r'(?m)^>\s?', '', b)).replace('\n', '<br/>'), S['quote']))
        elif all(re.match(r'^[-*] ', l) for l in lines):
            out += [Paragraph(inline(l[2:]), S['li'], bulletText='•') for l in lines]
        elif all(re.match(r'^\d+[.)]\s', l) for l in lines):
            out += [Paragraph(inline(re.sub(r'^\d+[.)]\s', '', l)), S['li'], bulletText=f'{i + 1}.') for i, l in enumerate(lines)]
        else:
            out.append(Paragraph('<br/>'.join(inline(l) for l in lines), S['body']))
    return out


def dark_box(title, items):
    body = [Paragraph(esc(title), S['boxh'])] + [Paragraph(x, S['box']) for x in items]
    t = Table([[body]], colWidths=[CW])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INK), ('LEFTPADDING', (0, 0), (-1, -1), 9),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
    return t


def article_flow(p, images):
    fl = [Paragraph(esc((p.get('rubric') or 'Материал').upper()), S['kick']), Paragraph(esc(p['title']), S['h1'])]
    meta = [p.get('author') or 'Редакция «Масштаба»']
    if p.get('data_date'):
        try:
            meta.append('данные на ' + ru_date(datetime.fromisoformat(str(p['data_date'])[:10])))
        except ValueError:
            pass
    if p.get('read_min'):
        meta.append(f"{p['read_min']} мин чтения")
    fl.append(Paragraph(esc(' · '.join(meta)), S['meta']))
    if p.get('lead'):
        fl.append(Paragraph(inline(p['lead']), S['lead']))
    content = p.get('content') or ''
    cov = p.get('cover_url')
    if cov and img_url(cov) not in [img_url(u) for u in md_images(content)]:
        f = images.flow(cov, 90 * mm)
        if f:
            fl += [f, Spacer(1, 8)]
    tk = [x.strip(' -•') for x in (p.get('takeaways') or '').split('\n') if x.strip()]
    if tk:
        fl += [dark_box('ГЛАВНОЕ', [f'— {inline(x)}' for x in tk]), Spacer(1, 10)]
    fl += md_flow(content, images)
    if p.get('question'):
        fl += [Spacer(1, 6), dark_box('ПОСЧИТАЙТЕ ДЛЯ СЕБЯ', [inline(p['question'])])]
    src = [x.strip() for x in (p.get('sources') or '').split('\n') if x.strip()]
    if src:
        fl += [Spacer(1, 8), Paragraph('<b>Источники</b>', S['src'])] + [Paragraph(inline(x), S['src']) for x in src]
    fl.append(Paragraph(f'Онлайн-версия: mat-labs.ru/masshtab/{esc(p.get("slug") or "")}', S['src']))
    return fl


FORMS = [('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', 'ООО'), ('АКЦИОНЕРНОЕ ОБЩЕСТВО', 'АО'), ('ПУБЛИЧНОЕ АО', 'ПАО'),
         ('НЕПУБЛИЧНОЕ АО', 'АО'), ('ЗАКРЫТОЕ АО', 'ЗАО'), ('ОТКРЫТОЕ АО', 'ОАО')]


def short_name(n):
    n = re.sub(r'\s+', ' ', str(n or '')).strip()
    for a, b in FORMS:
        n = re.sub(a, b, n, flags=re.I)
    return n.replace('"', '«', 1).replace('"', '»', 1)


def money(v):
    v = float(v or 0)
    if v >= 1e9:
        return f'{v / 1e9:.1f} млрд'.replace('.', ',')
    return f'{v / 1e6:.0f} млн'


def rating_flow(r):
    flt = ', '.join(x for x in (r.get('region_name'), r.get('section')) if x) or 'вся Россия, все отрасли'
    fl = [Paragraph('РЕЙТИНГ', S['kick']), Paragraph('«Масштаб-500»: самые быстрорастущие компании', S['h1']),
          Paragraph(esc(f'Выборка: {flt}. Рост выручки с 2022 по 2025 год по открытой бухгалтерской отчётности ФНС (ГИР БО). '
                        f'Компаний в выборке: {r["total"]}. Медианный рост — в {r["median_x"]} раза.'), S['lead'])]
    head = ['№', 'Компания', 'Регион', 'Отрасль', 'Выручка 2025, ₽', 'Рост']
    data = [[Paragraph(h, S['cellb']) for h in head]]
    for it in r['items']:
        data.append([Paragraph(str(it['rank']), S['cellb']), Paragraph(esc(short_name(it['name'])), S['cell']), Paragraph(esc(it['region_name']), S['cell']),
                     Paragraph(esc(it['section'] or '—'), S['cell']), Paragraph(money(it['rev2025']), S['cell']),
                     Paragraph(f'<font color="#16803c"><b>×{it["x"]}</b></font>', S['cell'])])
    t = Table(data, colWidths=[9 * mm, 64 * mm, 30 * mm, 28 * mm, 25 * mm, CW - 156 * mm], repeatRows=1)
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, 0), 0.8, INK), ('LINEBELOW', (0, 1), (-1, -1), 0.3, LINE),
                           ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 2.2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
                           ('LEFTPADDING', (0, 0), (-1, -1), 2), ('RIGHTPADDING', (0, 0), (-1, -1), 3)]))
    fl += [t, Spacer(1, 6), Paragraph('Рейтинг составлен редакцией по открытой отчётности и не является оценкой надёжности компаний. '
                                       'Полный рейтинг с фильтрами — mat-labs.ru/masshtab/500', S['src'])]
    return fl


def indicators_flow(ind, built):
    cbr, news = ind.get('cbr') or {}, ind.get('news') or []
    fl = [Paragraph('ИНДИКАТОРЫ РЫНКА', S['kick']), Paragraph(f'Деньги и рынок на {ru_date(built)}', S['h1']),
          Paragraph('Ключевые показатели Банка России и главные экономические новости на день сборки вашего выпуска.', S['lead'])]
    cells = []
    if cbr.get('key_rate'):
        cells.append(('Ключевая ставка', f"{cbr['key_rate']:g}%".replace('.', ','), f"решение от {cbr.get('key_rate_date') or '—'}"))
    for c, label in (('USD', 'Доллар'), ('EUR', 'Евро'), ('CNY', 'Юань')):
        if cbr.get(c):
            prev = (cbr.get('prev') or {}).get(c)
            d = f'{cbr[c] - prev:+.2f} ₽ за день'.replace('.', ',') if prev else ''
            cells.append((label, f'{cbr[c]:.2f} ₽'.replace('.', ','), d))
    if cells:
        row = [[Paragraph(esc(a.upper()), S['toc_r']), Paragraph(esc(b), S['big']), Paragraph(esc(c), S['small'])] for a, b, c in cells]
        t = Table([row], colWidths=[CW / len(row)] * len(row))
        t.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 1.5, INK), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                               ('TOPPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
        fl += [t, Paragraph(f"Курсы ЦБ на {esc(cbr.get('rates_date') or '—')}. Источник: Банк России.", S['cap'])]
    if news:
        fl.append(Paragraph('Главное в экономике', S['h2']))
        for n in news[:12]:
            d = ''
            try:
                d = datetime.fromisoformat(n['date']).strftime('%d.%m %H:%M') + ' · '
            except (TypeError, ValueError, KeyError):
                pass
            fl.append(Paragraph(f'<font name="Golos" size="7.5" color="#8a8278">{esc(d)}</font><b>{esc(n.get("title"))}</b>', S['body']))
        fl.append(Paragraph('Источник новостей: ТАСС, раздел «Экономика и бизнес».', S['cap']))
    return fl


class Doc(BaseDocTemplate):
    def __init__(self, buf, offset, label):
        super().__init__(buf, pagesize=(W, H), leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
                         title='Мой «Масштаб»', author='Журнал «Масштаб»')
        self.offset, self.label = offset, label
        self.addPageTemplates([PageTemplate('p', [Frame(ML, MB, CW, H - MT - MB, 0, 0, 0, 0)], onPage=self.deco)])

    def deco(self, c, doc):
        n = self.offset + doc.page
        c.saveState()
        c.setFont('Golos-Bold', 6.5)
        c.setFillColor(MUTED)
        c.drawString(ML, H - 11 * mm, 'МАСШТАБ · ПЕРСОНАЛЬНЫЙ ВЫПУСК')
        c.drawRightString(W - MR, H - 11 * mm, self.label.upper()[:60])
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.line(ML, H - 13 * mm, W - MR, H - 13 * mm)
        c.setFont('Golos-Bold', 8.5)
        c.setFillColor(INK)
        c.drawString(ML, 10 * mm, str(n))
        c.setFont('Golos', 6)
        c.setFillColor(MUTED)
        c.drawRightString(W - MR, 10 * mm, '© Журнал «Масштаб», mat-labs.ru/masshtab · Для личного использования, перепечатка запрещена · 16+')
        c.restoreState()


def render_flow(flow, offset, label):
    buf = io.BytesIO()
    Doc(buf, offset, label).build(flow)
    return buf.getvalue()


def cover_pdf(issue, toc, built):
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    c.setTitle(issue['title'])
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, 0, 1)
    x = 16 * mm
    c.setFillColor(INK)
    c.setFont('Golos-Bold', 8)
    c.drawString(x, H - 16 * mm, 'ДЕЛОВОЙ ЖУРНАЛ · ПЕРСОНАЛЬНЫЙ ВЫПУСК')
    c.drawRightString(W - x, H - 16 * mm, ru_date(built).upper())
    c.setLineWidth(1.4)
    c.line(x, H - 18.5 * mm, W - x, H - 18.5 * mm)
    c.setFont('Display', 92)
    c.drawString(x - 1.5 * mm, H - 52 * mm, 'Масштаб')
    c.setFillColor(RED)
    c.drawString(x - 1.5 * mm + pdfmetrics.stringWidth('Масштаб', 'Display', 92), H - 52 * mm, '.')
    c.setFillColor(colors.HexColor('#5b5550'))
    c.setFont('Serif-Italic', 13)
    c.drawString(x, H - 61 * mm, 'Бизнес, деньги и люди — проверено цифрами')
    c.setFillColor(RED)
    c.rect(x, H - 76 * mm, W - 2 * x, 3.5, 0, 1)
    y = H - 84 * mm
    c.setFont('Golos-Bold', 8)
    c.drawString(x, y, 'СОБРАНО ЛИЧНО ДЛЯ ВАС')
    for_whom = ', '.join(v for v in (issue.get('cover_name'), issue.get('cover_company')) if v)
    p = Paragraph(esc(issue['title']), st('ct', fontName='Display', fontSize=34, leading=38))
    _, ph = p.wrap(W - 2 * x, 60 * mm)
    p.drawOn(c, x, y - 5 * mm - ph)
    y = y - 5 * mm - ph
    if for_whom:
        p = Paragraph(esc(for_whom), st('cw', fontName='Golos-Bold', fontSize=15, leading=19))
        _, ph = p.wrap(W - 2 * x, 30 * mm)
        p.drawOn(c, x, y - 4 * mm - ph)
        y = y - 4 * mm - ph
    y -= 12 * mm
    c.setStrokeColor(INK)
    c.setLineWidth(1.2)
    c.line(x, y, W - x, y)
    y -= 4 * mm
    for page, rub, title in toc[:7]:
        p = Paragraph(f'<font name="Golos-Bold" size="7" color="#d6402b">{esc(rub.upper())} · С. {page}</font><br/>{esc(title)}',
                      st('cl', fontName='Serif-Bold', fontSize=11.5, leading=14.5))
        _, ph = p.wrap(W - 2 * x, 40 * mm)
        if y - ph < 30 * mm:
            break
        p.drawOn(c, x, y - ph)
        y -= ph + 3.5 * mm
    c.setFillColor(INK)
    c.rect(0, 0, W, 14 * mm, 0, 1)
    c.setFillColor(PAPER)
    c.setFont('Golos', 7.5)
    c.drawString(x, 5.5 * mm, 'mat-labs.ru/masshtab')
    c.drawCentredString(W / 2, 5.5 * mm, f'{issue["pages_hint"]} полос · материалов: {len(toc)}')
    c.drawRightString(W - x, 5.5 * mm, '© Журнал «Масштаб» · 16+')
    c.showPage()
    c.save()
    return buf.getvalue()


def toc_flow(toc, issue):
    fl = [Paragraph('СОДЕРЖАНИЕ', S['kick']), Paragraph(esc(issue['title']), S['h1']), Spacer(1, 4)]
    rows = [[Paragraph(str(p), S['toc_n']), [Paragraph(esc(r.upper()), S['toc_r']), Paragraph(esc(t), S['toc_t'])]] for p, r, t in toc]
    if rows:
        t = Table(rows, colWidths=[16 * mm, CW - 16 * mm])
        t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.3, LINE), ('LINEABOVE', (0, 0), (-1, 0), 1.4, INK), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                               ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
        fl.append(t)
    fl += [Spacer(1, 10), Paragraph('Выпуск собран по вашему выбору из материалов журнала «Масштаб»: статей онлайн-версии, полос вышедших номеров, '
                                    'рейтинга «Масштаб-500» и рыночных индикаторов на дату сборки. Данные в каждом материале — на дату, указанную в нём.', S['small'])]
    return fl


def back_pdf(issue, built):
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    c.setFillColor(INK)
    c.rect(0, 0, W, H, 0, 1)
    x = 20 * mm
    c.setFillColor(PAPER)
    c.setFont('Display', 64)
    c.drawString(x, H - 60 * mm, 'Масштаб')
    c.setFillColor(RED)
    c.drawString(x + pdfmetrics.stringWidth('Масштаб', 'Display', 64), H - 60 * mm, '.')
    c.setFillColor(colors.HexColor('#d4c8b6'))
    c.setFont('Serif-Italic', 17)
    c.drawString(x, H - 74 * mm, 'Бизнес, деньги и люди —')
    c.drawString(x, H - 82 * mm, 'проверено цифрами')
    lines = [('Новый номер — каждый месяц', 'mat-labs.ru/masshtab/arhiv'), ('Рейтинг «Масштаб-500»', 'mat-labs.ru/masshtab/500'),
             ('Соберите следующий выпуск под себя', 'mat-labs.ru/masshtab/kabinet'), ('ИИ-автоматизация для бизнеса — МАТ-Лабс', 'mat-labs.ru')]
    y = H - 130 * mm
    for a, b in lines:
        c.setStrokeColor(colors.HexColor('#5b5550'))
        c.setLineWidth(0.6)
        c.line(x, y + 9 * mm, W - x, y + 9 * mm)
        c.setFillColor(PAPER)
        c.setFont('Golos-Bold', 12)
        c.drawString(x, y + 2 * mm, a)
        c.setFillColor(colors.HexColor('#ff8a73'))
        c.setFont('Golos', 10)
        c.drawString(x, y - 3.5 * mm, b)
        y -= 20 * mm
    c.setFillColor(colors.HexColor('#8a8278'))
    c.setFont('Golos', 7)
    c.drawString(x, 18 * mm, f'Персональный выпуск собран {ru_date(built)} для личного использования.')
    c.drawString(x, 13 * mm, 'Перепечатка и распространение — только с письменного согласия издателя. 16+')
    c.showPage()
    c.save()
    return buf.getvalue()


def build(issue, modules, archive_pdfs):
    """modules: список dict(kind, rub, title, data). Возвращает (pdf_bytes, pages)."""
    built = datetime.now()
    images = Images()
    urls = []
    for m in modules:
        if m['kind'] == 'post':
            urls += md_images(m['data'].get('content')) + ([m['data']['cover_url']] if m['data'].get('cover_url') else [])
    images.prefetch(urls)
    archive_readers = {k: PdfReader(io.BytesIO(v)) for k, v in archive_pdfs.items()}

    def toc_draft(n):
        return [(n, m['rub'], m['title']) for m in modules]

    toc_pages = len(PdfReader(io.BytesIO(render_flow(toc_flow(toc_draft(99), issue), 1, issue['title']))).pages)
    offset = 1 + toc_pages
    parts, toc = [], []
    for m in modules:
        start = offset + 1
        if m['kind'] == 'archive':
            rd = archive_readers[m['data']['issue']]
            pages = [rd.pages[i - 1] for i in range(m['data']['from'], m['data']['to'] + 1) if 0 < i <= len(rd.pages)]
            parts.append(('pages', pages))
            offset += len(pages)
        else:
            if m['kind'] == 'post':
                fl = article_flow(m['data'], images)
            elif m['kind'] == 'rating':
                fl = rating_flow(m['data'])
            else:
                fl = indicators_flow(m['data'], built)
            pdf = render_flow(fl, offset, issue['title'])
            n = len(PdfReader(io.BytesIO(pdf)).pages)
            parts.append(('pdf', pdf))
            offset += n
        toc.append((start, m['rub'], m['title']))
    total = offset + 1
    issue = {**issue, 'pages_hint': total}
    w = PdfWriter()
    for blob in (cover_pdf(issue, toc, built), render_flow(toc_flow(toc, issue), 1, issue['title'])):
        for pg in PdfReader(io.BytesIO(blob)).pages:
            w.add_page(pg)
    for kind, v in parts:
        for pg in (v if kind == 'pages' else PdfReader(io.BytesIO(v)).pages):
            w.add_page(pg)
    for pg in PdfReader(io.BytesIO(back_pdf(issue, built))).pages:
        w.add_page(pg)
    w.add_metadata({'/Title': issue['title'], '/Author': 'Журнал «Масштаб»', '/Subject': 'Персональный выпуск делового журнала «Масштаб»',
                    '/Creator': 'mat-labs.ru/masshtab'})
    w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    out = io.BytesIO()
    w.write(out)
    return out.getvalue(), len(w.pages)
