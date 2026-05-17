"""
Генерирует PDF со стратегическим планом развития MAT Labs на 3 года (1095 дней)
на основе анализа всех 10 продуктов портфолио. Загружает в S3, возвращает URL.
"""
import os
import io
import base64
import boto3
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily


# ─── Регистрация кириллического шрифта ─────────────────────────────────────
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

_FONT_CANDIDATES = [
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
     "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ("/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf",
     "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf"),
    ("/usr/share/fonts/google-noto/NotoSans-Regular.ttf",
     "/usr/share/fonts/google-noto/NotoSans-Bold.ttf"),
]

for reg_path, bold_path in _FONT_CANDIDATES:
    if os.path.exists(reg_path) and os.path.exists(bold_path):
        try:
            pdfmetrics.registerFont(TTFont("AppFont", reg_path))
            pdfmetrics.registerFont(TTFont("AppFont-Bold", bold_path))
            registerFontFamily(
                "AppFont",
                normal="AppFont",
                bold="AppFont-Bold",
                italic="AppFont",
                boldItalic="AppFont-Bold",
            )
            FONT_REGULAR = "AppFont"
            FONT_BOLD = "AppFont-Bold"
            break
        except Exception:
            continue


# ─── Цвета бренда ───────────────────────────────────────────────────────────
DARK      = colors.HexColor("#080812")
VIOLET    = colors.HexColor("#7C3AED")
VIOLET_LT = colors.HexColor("#A78BFA")
CYAN      = colors.HexColor("#06B6D4")
CYAN_LT   = colors.HexColor("#67E8F9")
WHITE     = colors.HexColor("#FFFFFF")
GREY      = colors.HexColor("#94A3B8")
GREY_LT   = colors.HexColor("#1E2035")
GREY_CARD = colors.HexColor("#12132A")
GREEN     = colors.HexColor("#10B981")
ORANGE    = colors.HexColor("#F59E0B")
PINK      = colors.HexColor("#EC4899")


def make_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle("Cover_Title",
        fontName=FONT_BOLD, fontSize=30, leading=38,
        textColor=WHITE, alignment=TA_LEFT, spaceAfter=6))
    styles.add(ParagraphStyle("Cover_Sub",
        fontName=FONT_REGULAR, fontSize=14, leading=20,
        textColor=CYAN_LT, alignment=TA_LEFT, spaceAfter=4))
    styles.add(ParagraphStyle("Cover_Date",
        fontName=FONT_REGULAR, fontSize=10, leading=14,
        textColor=GREY, alignment=TA_LEFT))
    styles.add(ParagraphStyle("Section_Title",
        fontName=FONT_BOLD, fontSize=17, leading=22,
        textColor=VIOLET_LT, spaceBefore=14, spaceAfter=8))
    styles.add(ParagraphStyle("Sub_Title",
        fontName=FONT_BOLD, fontSize=13, leading=18,
        textColor=CYAN_LT, spaceBefore=12, spaceAfter=5))
    styles.add(ParagraphStyle("Sub2_Title",
        fontName=FONT_BOLD, fontSize=11, leading=15,
        textColor=WHITE, spaceBefore=8, spaceAfter=3))
    styles.add(ParagraphStyle("Body",
        fontName=FONT_REGULAR, fontSize=10, leading=14,
        textColor=colors.HexColor("#CBD5E1"), spaceAfter=4))
    styles.add(ParagraphStyle("Body_Bold",
        fontName=FONT_BOLD, fontSize=10, leading=14,
        textColor=WHITE, spaceAfter=4))
    styles.add(ParagraphStyle("Body_Small",
        fontName=FONT_REGULAR, fontSize=9, leading=12,
        textColor=colors.HexColor("#94A3B8"), spaceAfter=3))
    styles.add(ParagraphStyle("BulletItem",
        fontName=FONT_REGULAR, fontSize=10, leading=14,
        textColor=colors.HexColor("#CBD5E1"),
        leftIndent=14, spaceAfter=2))
    styles.add(ParagraphStyle("Footer",
        fontName=FONT_REGULAR, fontSize=8, leading=11,
        textColor=GREY, alignment=TA_CENTER))
    styles.add(ParagraphStyle("Metric_Label",
        fontName=FONT_REGULAR, fontSize=9, leading=12,
        textColor=GREY, alignment=TA_CENTER))
    styles.add(ParagraphStyle("Metric_Value",
        fontName=FONT_BOLD, fontSize=22, leading=26,
        textColor=CYAN_LT, alignment=TA_CENTER))
    styles.add(ParagraphStyle("Product_Name",
        fontName=FONT_BOLD, fontSize=12, leading=15,
        textColor=WHITE, spaceAfter=2))
    styles.add(ParagraphStyle("Product_Cat",
        fontName=FONT_BOLD, fontSize=8, leading=10,
        textColor=VIOLET_LT, spaceAfter=4))

    return styles


def hr_line(color=VIOLET, width=1):
    return HRFlowable(width="100%", thickness=width, color=color, spaceAfter=10, spaceBefore=4)


def section_header(text, styles):
    return [hr_line(VIOLET, 1.5), Paragraph(text, styles["Section_Title"])]


def bul(text, styles):
    return Paragraph(f"  \u2022  {text}", styles["BulletItem"])


def colored_table(data, col_widths, header_bg=VIOLET, row_bg=GREY_CARD, alt_bg=GREY_LT, font_size=9):
    style = TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), FONT_BOLD),
        ("FONTSIZE",      (0, 0), (-1, 0), font_size),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [row_bg, alt_bg]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), colors.HexColor("#CBD5E1")),
        ("FONTNAME",      (0, 1), (-1, -1), FONT_REGULAR),
        ("FONTSIZE",      (0, 1), (-1, -1), font_size),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
    ])
    t = Table(data, colWidths=col_widths)
    t.setStyle(style)
    return t


def kpi_block(title, text, bg_header, bg_body, styles):
    data = [[Paragraph(title, styles["Body_Bold"])],
            [Paragraph(text, styles["Body"])]]
    t = Table(data, colWidths=None)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bg_header),
        ("BACKGROUND", (0, 1), (-1, 1), bg_body),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), FONT_BOLD),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    return t


def product_card(num, name, cat, desc, audience, monetization, role, styles, CW):
    """Карточка продукта с детальным анализом."""
    header = Table(
        [[Paragraph(f"<b>{num}. {name}</b>", styles["Product_Name"]),
          Paragraph(cat.upper(), styles["Product_Cat"])]],
        colWidths=[CW * 0.65, CW * 0.35 - 4 * mm]
    )
    header.setStyle(TableStyle([
        ("ALIGN",         (1, 0), (1, 0), "RIGHT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))

    body = Table(
        [
            [header],
            [Paragraph(f"<b>Что делает:</b> {desc}", styles["Body"])],
            [Paragraph(f"<b>ЦА:</b> {audience}", styles["Body_Small"])],
            [Paragraph(f"<b>Модель монетизации:</b> {monetization}", styles["Body_Small"])],
            [Paragraph(f"<b>Стратегическая роль:</b> {role}", styles["Body_Small"])],
        ],
        colWidths=[CW - 4 * mm]
    )
    body.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREY_CARD),
        ("LINEBEFORE",    (0, 0), (0, -1), 3, VIOLET_LT),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return body


def build_pdf_bytes():
    buf = io.BytesIO()
    W, H = A4
    margin = 18 * mm

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin, bottomMargin=18 * mm,
        title="MAT Labs — Стратегия развития 3 года",
        author="MAT Labs",
    )

    styles = make_styles()
    story = []
    CW = W - 2 * margin

    def on_page(c, d):
        c.saveState()
        c.setFillColor(DARK)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.restoreState()

    # ═══════════════════════════════════════════════════════════════════
    # ОБЛОЖКА
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 25 * mm))
    story.append(Paragraph("MAT Labs", styles["Cover_Sub"]))
    story.append(Paragraph("Стратегия развития компании на 3 года", styles["Cover_Title"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "Анализ 10 продуктов портфолио  \u00b7  4 направления услуг  \u00b7  Дорожная карта 2026-2029",
        styles["Cover_Sub"]
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Май 2026  \u00b7  Конфиденциально  \u00b7  mat-labs.ru", styles["Cover_Date"]))
    story.append(Spacer(1, 10 * mm))
    story.append(hr_line(CYAN, 2))
    story.append(Spacer(1, 8 * mm))

    metrics = [
        ("10",   "продуктов\nв портфолио"),
        ("200+", "реализованных\nпроектов"),
        ("50+",  "специалистов\nв команде"),
        ("3",    "года\nдо цели"),
    ]
    mt = Table(
        [[Paragraph(m[0], styles["Metric_Value"]) for m in metrics],
         [Paragraph(m[1], styles["Metric_Label"]) for m in metrics]],
        colWidths=[CW / 4] * 4
    )
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_CARD),
        ("BOX",        (0, 0), (-1, -1), 0.5, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(mt)
    story.append(Spacer(1, 8 * mm))

    # Резюме для CEO
    summary = Table(
        [[Paragraph(
            "<b>Резюме для CEO.</b> MAT Labs — компания с 200+ проектами и широким портфолио "
            "из 10 запущенных продуктов в 7 отраслях (агро, недвижимость, маркетинг, авиация, "
            "промышленность, бухгалтерия). Основная проблема — все продукты разовые, нет SaaS-выручки. "
            "Стратегия на 3 года: <b>выделить 3 SaaS-флагмана</b> (MAIL-KA, RoomScan AI, MAT-AD), "
            "<b>построить корпоративную вертикаль</b> на базе АгроПорт/СмартМаш, "
            "и <b>сохранить агентский поток</b> через 4 услуги. Цель к концу 3 года — выручка "
            "<b>15 млн руб/мес</b>, из них MRR от продуктов — <b>40%</b>.",
            styles["Body"]
        )]],
        colWidths=[CW]
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#1E1040")),
        ("LINEBEFORE",    (0, 0), (0, -1), 4, VIOLET_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(summary)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ I — АНАЛИЗ ВСЕХ ПРОДУКТОВ
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ I. АНАЛИЗ 10 ПРОДУКТОВ ПОРТФОЛИО", styles)

    products = [
        (1, "Авангард",        "ИИ / Интерьер / Флагман",
         "AI-консультации по дизайну и ремонту, генерация дизайн-проектов, расчёт сметы.",
         "Собственники квартир, дизайнеры интерьера, подрядчики.",
         "Lead-gen в услуги ремонта (комиссия 5-10%) или SaaS-подписка дизайнерам.",
         "ВИТРИНА бренда. Сильнее упаковать кейсы, использовать как магнит для услуг."),
        (2, "RoomScan AI",     "ИИ / 3D-планировщик",
         "3D-сканирование комнаты телефоном, AI-калькулятор сметы, виртуальный хоумстейджинг с GPT Vision.",
         "Собственники квартир, дизайнеры, бригады, риелторы, застройщики.",
         "Freemium + Pro 990 руб/мес дизайнеру + B2B 15 000 руб/мес застройщику.",
         "SaaS-КАНДИДАТ №2. Низкая конкуренция в РФ, виральный продукт (бесплатно)."),
        (3, "MAIL-KA",         "Email-маркетинг / ИИ",
         "Российская платформа рассылок с AI-копирайтером, омниканальность (Email/SMS/Telegram/Push).",
         "Маркетологи, e-commerce, малый и средний бизнес.",
         "Подписка 2 900 руб/мес (до 5K контактов) до 29 900 руб/мес (Enterprise).",
         "SaaS-ФЛАГМАН №1. Огромный спрос после ухода Mailchimp. Самый быстрый путь к MRR."),
        (4, "MAT-AD",          "ИИ / Реклама",
         "AI-генерация объявлений, работа с фидами, шаблоны — автоматизация PPC-рутины.",
         "Рекламные агентства, PPC-специалисты, in-house маркетологи.",
         "Подписка 1 990 руб/мес (фрилансер) до 9 900 руб/мес (агентство).",
         "SaaS-КАНДИДАТ №3. Узкая ниша, но платёжеспособная. Подходит для B2B-партнёрки."),
        (5, "AVT",             "CRM + AI-звонки",
         "Платформа автоматизации продаж: AI-обзвон, email-рассылки, встроенная CRM.",
         "Отделы продаж, контакт-центры, B2B-компании со звонками.",
         "Подписка от 4 900 руб/мес + плата за минуты AI-звонков.",
         "ОБЪЕДИНИТЬ с MAIL-KA в единый Sales+Marketing Suite (cross-sell)."),
        (6, "АгроПорт",        "ИИ / Агробизнес",
         "AI-мониторинг агрорынка, прогноз цен на зерновые, NDVI-карта рисков по 23 регионам.",
         "Агрохолдинги, фермерские хозяйства, зерновые трейдеры.",
         "Корпоративная подписка 50 000-300 000 руб/мес + проектные внедрения.",
         "КОРПОРАТИВНЫЙ ФЛАГМАН. Высокий чек, длинный цикл, устойчивая выручка."),
        (7, "СмартМаш",        "ПО / Станкостроение",
         "Цифровая платформа для станкостроения: проектирование, управление ЧПУ, мониторинг оборудования.",
         "Машиностроительные заводы, КБ, цеха с ЧПУ.",
         "Лицензия 500 000-2 000 000 руб + поддержка 15% годовых.",
         "ИМПОРТОЗАМЕЩЕНИЕ. Гранты Минпромторга. Высокий чек, длинный цикл."),
        (8, "SoloFly",         "Авиация / Сообщество",
         "Платформа для пилотов-любителей: маршруты, документация, обучение, сообщество.",
         "Частные пилоты, учлёты, авиаклубы.",
         "Freemium + Pro 590 руб/мес + реклама авиашкол + marketplace.",
         "НИШЕВОЙ. Передать партнёру или продать. Не профильное направление."),
        (9, "БухКонтроль",     "Бухгалтерия / Агро",
         "Бухгалтерский аутсорсинг для агробизнеса: учёт, налоговая оптимизация, консультации.",
         "Фермерские хозяйства, агропредприятия.",
         "Сервисная модель: 30 000-150 000 руб/мес на клиента.",
         "ИНТЕГРИРОВАТЬ с АгроПорт как пакетное предложение AgriSuite."),
        (10, "Купец в плюсе",  "Агрегатор B2B-услуг",
         "Агрегатор бизнес-услуг от проверенных партнёров.",
         "Предприниматели МСБ.",
         "Комиссия 5-15% от партнёрских сделок + premium-размещение.",
         "ВТОРИЧНЫЙ. Использовать как канал cross-sell услуг MAT Labs."),
    ]

    for p in products:
        story.append(product_card(*p, styles=styles, CW=CW))
        story.append(Spacer(1, 3 * mm))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ II — СЕГМЕНТАЦИЯ И ВЫВОДЫ
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ II. СЕГМЕНТАЦИЯ ПОРТФОЛИО ПО КЛАСТЕРАМ", styles)

    story.append(colored_table([
        ["Кластер", "Продукты", "Стратегия 3 года"],
        ["A. SaaS Marketing\nи Sales Suite",
         "MAIL-KA + MAT-AD + AVT",
         "Объединить в единую платформу для МСБ. Целевой MRR 4 млн руб/мес."],
        ["B. PropTech\n(недвижимость и ремонт)",
         "Авангард + RoomScan AI",
         "Freemium-воронка + B2B для застройщиков. MRR 2 млн руб/мес."],
        ["C. Корпоративные\nотраслевые решения",
         "АгроПорт + СмартМаш + БухКонтроль",
         "Длинный цикл, высокий чек, гранты. Выручка 6 млн руб/мес."],
        ["D. Нишевые\n(передача/закрытие)",
         "SoloFly + Купец в плюсе",
         "Передать партнёрам, оставить как канал лидогенерации."],
        ["E. Сервисный\nагентский бизнес",
         "4 услуги (AI, сайты, ML, кибербез)",
         "Целевая выручка 3 млн руб/мес. Минимальный чек 100 000 руб."],
    ], [CW * 0.22, CW * 0.30, CW * 0.48]))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("SWOT-анализ компании", styles["Sub_Title"]))
    swot = Table([
        [Paragraph("<b>СИЛЬНЫЕ СТОРОНЫ</b>", styles["Body_Bold"]),
         Paragraph("<b>УЯЗВИМЫЕ МЕСТА</b>", styles["Body_Bold"])],
        [Paragraph(
            "• 10 запущенных продуктов в 7 отраслях\n"
            "• 200+ кейсов — есть что показать\n"
            "• Полный AI-стек: GPT Vision, NLP, прогнозы\n"
            "• Команда 50+ — можно держать несколько SaaS\n"
            "• Импортозамещение (MAIL-KA, СмартМаш)\n"
            "• Скорость: 7-14 дней до результата",
            styles["Body"]),
         Paragraph(
            "• Распылённость: 10 продуктов = 10 фокусов\n"
            "• Все продукты разовые, MRR = 0\n"
            "• Нет публичной цены ни на один SaaS\n"
            "• Слабый бренд: компания «всё для всех»\n"
            "• Нет sales-функции под продукты\n"
            "• Не используется кросс-продажа",
            styles["Body"])],
        [Paragraph("<b>ВОЗМОЖНОСТИ</b>", styles["Body_Bold"]),
         Paragraph("<b>УГРОЗЫ</b>", styles["Body_Bold"])],
        [Paragraph(
            "• Импортозамещение SaaS (бюджеты 2026-2029)\n"
            "• Гранты РФРИТ, Минпромторг, Сколково\n"
            "• Партнёрство с 1С, Битрикс, AmoCRM\n"
            "• AI-бум: каждый бизнес ищет внедрение\n"
            "• Корпоративный спрос на отраслевые решения\n"
            "• Экспорт в СНГ (Казахстан, Узбекистан)",
            styles["Body"]),
         Paragraph(
            "• Возврат Mailchimp и Active Campaign в РФ\n"
            "• Большие игроки (СБЕР, Яндекс) на тех же нишах\n"
            "• Удорожание OpenAI API\n"
            "• Кадровый голод в AI/ML\n"
            "• Регуляторика (152-ФЗ, ИИ-закон)\n"
            "• Зависимость от 1-2 крупных клиентов",
            styles["Body"])],
    ], colWidths=[CW/2, CW/2])
    swot.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#1E1040")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#1A0530")),
        ("BACKGROUND", (0, 1), (0, 1), GREY_CARD),
        ("BACKGROUND", (1, 1), (1, 1), GREY_CARD),
        ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#0A2030")),
        ("BACKGROUND", (1, 2), (1, 2), colors.HexColor("#2A1010")),
        ("BACKGROUND", (0, 3), (0, 3), GREY_CARD),
        ("BACKGROUND", (1, 3), (1, 3), GREY_CARD),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("TEXTCOLOR",  (0, 2), (-1, 2), WHITE),
        ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(swot)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ III — СТРАТЕГИЯ НА 3 ГОДА
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ III. СТРАТЕГИЯ РАЗВИТИЯ — 3 ГОРИЗОНТА", styles)

    story.append(Paragraph(
        "<b>Стратегический вектор:</b> от «студии под заказ с 10 продуктами» к "
        "<b>«фокусной продуктово-сервисной компании»</b> с 3 SaaS-флагманами, "
        "корпоративной вертикалью и услугами как каналом продаж в продукты.",
        styles["Body"]
    ))
    story.append(Spacer(1, 4 * mm))

    # ─────────────────────────────────────────────────────────────────────
    # ГОД 1
    # ─────────────────────────────────────────────────────────────────────
    story.append(Paragraph("ГОД 1 (2026-2027) — ФОКУС И УПАКОВКА", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача года:</b> перестать быть «всем для всех», запустить первый SaaS-биллинг.",
        styles["Body"]
    ))

    story.append(Paragraph("Q1 — Аудит и упаковка (мес 1-3)", styles["Sub2_Title"]))
    for t in [
        "Customer development: интервью клиентов всех 10 продуктов, сбор «было больше стало» в цифрах",
        "Переупаковать 10 кейсов с конкретными результатами (% роста, руб экономии)",
        "Сегментировать продукты по кластерам A-E (см. Часть II)",
        "Принять решения по SoloFly и Купец в плюсе: оставить / передать / закрыть",
        "Нанять Head of Product (200K руб/мес) — отвечает за SaaS-флагманы",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Q2 — Запуск SaaS MAIL-KA (мес 4-6)", styles["Sub2_Title"]))
    for t in [
        "Закрыть биллинг MAIL-KA: тарифы 2 900 / 9 900 / 29 900 руб/мес + Enterprise",
        "Закрытая beta для 30 клиентов, бесплатно на 3 мес",
        "Контент-маркетинг: Telegram-канал, VC.ru, Хабр — 3 поста в неделю",
        "Партнёрка с 1С-Битрикс, AmoCRM, Битрикс24 (10-20% от сделок)",
        "Цель к концу Q2: MRR MAIL-KA 200 000 руб",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Q3 — Sales-функция и АгроПорт (мес 7-9)", styles["Sub2_Title"]))
    for t in [
        "Нанять Sales Manager (120K руб + %), отдельная воронка под услуги",
        "Лендинг «Бесплатный AI-разбор бизнеса за 45 мин» + трафик Яндекс.Директ/ВК",
        "АгроПорт: первый корпоративный пилот с агрохолдингом (от 500 000 руб)",
        "БухКонтроль: интегрировать в АгроПорт как пакет AgriSuite",
        "Подать на грант РФРИТ (импортозамещение MAIL-KA)",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Q4 — Подготовка SaaS №2 RoomScan AI (мес 10-12)", styles["Sub2_Title"]))
    for t in [
        "RoomScan AI: запустить Pro-тариф 990 руб/мес дизайнеру",
        "B2B-пилот с 2-3 застройщиками (15 000 руб/мес)",
        "Объединить AVT + MAIL-KA в единый интерфейс (cross-sell)",
        "Принять решение по SoloFly: продать или передать партнёру",
    ]:
        story.append(bul(t, styles))

    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI ГОДА 1",
        "Выручка 4 500 000 руб/мес  |  MRR от SaaS: 400 000 руб  |  10+ корпоративных контрактов  |  "
        "Команда 65+  |  Telegram 1 500 подписчиков  |  10 кейсов с цифрами",
        VIOLET, colors.HexColor("#1E1040"), styles
    ))

    # ─────────────────────────────────────────────────────────────────────
    # ГОД 2
    # ─────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("ГОД 2 (2027-2028) — МАСШТАБИРОВАНИЕ", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача года:</b> вывести MAIL-KA и RoomScan AI в прибыль, "
        "построить корпоративную вертикаль на базе АгроПорт + СмартМаш.",
        styles["Body"]
    ))

    story.append(Paragraph("Стратегические инициативы Года 2", styles["Sub2_Title"]))
    for t in [
        "<b>MAIL-KA:</b> 2 000 платящих, MRR 2 млн руб/мес. Запустить whitelabel для агентств",
        "<b>RoomScan AI:</b> 3 000 freemium, 300 Pro, 20 застройщиков. MRR 900K руб/мес",
        "<b>MAT-AD:</b> запустить третий SaaS, ниша для агентств. MRR 300K руб/мес",
        "<b>АгроПорт:</b> 8-10 крупных агрохолдингов, средний чек 200K руб/мес = 2 млн руб/мес",
        "<b>СмартМаш:</b> 2-3 завода-лицензиата, выручка 4 млн руб разово + 600K руб/мес поддержка",
        "<b>Сервисные услуги:</b> сохранить как канал лидов в SaaS, выручка 2,5 млн руб/мес",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Команда и процессы", styles["Sub2_Title"]))
    for t in [
        "Нанять Product Manager на каждый из 3 SaaS-флагманов",
        "Создать SDR-команду (3 человека) для outbound в корпоративный сегмент",
        "Внедрить собственную CRM (или AmoCRM) + автоматизацию воронок",
        "Customer Success команда (2 человека) — снижение churn SaaS до 5%",
        "Регулярные продуктовые исследования: NPS, A/B тесты, юзабилити",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Маркетинг и бренд", styles["Sub2_Title"]))
    for t in [
        "Запустить подкаст «AI в российском бизнесе» (еженедельно)",
        "Выступления: РИФ, ProductSense, AI Journey, AgriTech Russia",
        "Ежеквартальный отчёт «Состояние AI в МСБ» — медийный актив",
        "Telegram 10 000 подписчиков, YouTube 5 000 подписчиков",
    ]:
        story.append(bul(t, styles))

    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI ГОДА 2",
        "Выручка 9 000 000 руб/мес  |  MRR от SaaS: 3 200 000 руб (35%)  |  "
        "2 000+ платящих клиентов SaaS  |  Команда 90+  |  NPS 60+",
        CYAN, colors.HexColor("#0A2030"), styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────
    # ГОД 3
    # ─────────────────────────────────────────────────────────────────────
    story.append(Paragraph("ГОД 3 (2028-2029) — ЛИДЕРСТВО И ЭКСПОРТ", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача года:</b> закрепить позицию лидера в 2-3 нишах, "
        "выйти на рынки СНГ, подготовиться к привлечению инвестиций (Series A) или выходу на самоокупаемость.",
        styles["Body"]
    ))

    story.append(Paragraph("Стратегические инициативы Года 3", styles["Sub2_Title"]))
    for t in [
        "<b>MAIL-KA</b> — №1 или №2 в РФ среди российских email-сервисов. 5 000 платящих, MRR 5 млн руб/мес",
        "<b>RoomScan AI</b> — стандарт для дизайнеров и риелторов. 1 000 Pro, 60 застройщиков, MRR 2 млн руб/мес",
        "<b>MAT-AD</b> — №1 для агентств. 500 платящих, MRR 1 млн руб/мес",
        "<b>AgriSuite (АгроПорт + БухКонтроль)</b> — лидер АПК-цифры. 25+ агрохолдингов, 3 млн руб/мес",
        "<b>СмартМаш</b> — 10+ заводов-лицензиатов, выручка 2 млн руб/мес",
        "<b>Экспорт в СНГ:</b> локализация MAIL-KA и RoomScan AI для Казахстана и Узбекистана",
    ]:
        story.append(bul(t, styles))

    story.append(Paragraph("Корпоративное развитие", styles["Sub2_Title"]))
    for t in [
        "Подготовить компанию к Series A (оценка 500 млн - 1 млрд руб) или сохранить bootstrapping",
        "Юридическое разделение: MAIL-KA / RoomScan AI / Услуги — отдельные юрлица для гибкости",
        "Опционная программа для топ-менеджмента и ключевых разработчиков",
        "Open-source SDK для MAIL-KA — build community + найм через open-source",
    ]:
        story.append(bul(t, styles))

    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI ГОДА 3 — ФИНАЛ",
        "Выручка 15 000 000 руб/мес  |  MRR от SaaS: 6 000 000 руб (40%)  |  "
        "6 500+ платящих клиентов  |  Команда 130+  |  NPS 70+  |  Экспорт в 2 страны СНГ",
        GREEN, colors.HexColor("#0A2015"), styles
    ))

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ IV — ФИНАНСОВАЯ МОДЕЛЬ
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8 * mm))
    story += section_header("ЧАСТЬ IV. ФИНАНСОВАЯ МОДЕЛЬ ПО ГОДАМ", styles)

    story.append(colored_table([
        ["Поток выручки",                     "Год 1, руб/мес", "Год 2, руб/мес", "Год 3, руб/мес"],
        ["SaaS MAIL-KA",                       "200 000",       "2 000 000",     "5 000 000"],
        ["SaaS RoomScan AI",                   "150 000",       "900 000",       "2 000 000"],
        ["SaaS MAT-AD",                        "50 000",        "300 000",       "1 000 000"],
        ["AgriSuite (АгроПорт+БухКонтроль)",   "800 000",       "2 000 000",     "3 000 000"],
        ["СмартМаш (лицензии+поддержка)",      "500 000",       "1 100 000",     "2 000 000"],
        ["Сервисные услуги (4 направления)",   "2 500 000",     "2 500 000",     "2 000 000"],
        ["Партнёрские комиссии (Купец+др)",    "300 000",       "200 000",       "—"],
        ["ИТОГО ВЫРУЧКА",                       "4 500 000",     "9 000 000",     "15 000 000"],
        ["Доля MRR от SaaS",                   "9%",            "35%",           "40%"],
    ], [CW * 0.40, CW * 0.20, CW * 0.20, CW * 0.20]))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Структура расходов (целевая)", styles["Sub2_Title"]))
    story.append(colored_table([
        ["Статья",              "% от выручки",  "Комментарий"],
        ["ФОТ (зарплаты)",       "55-60%",        "Основная статья, рост команды до 130+ к Году 3"],
        ["Маркетинг и продажи",  "12-15%",        "Реклама, контент, конференции, sales-команда"],
        ["Инфраструктура",       "5-8%",          "OpenAI API, серверы, SaaS-инструменты"],
        ["Операционные",         "5-7%",          "Офис, юристы, бухгалтерия, бизнес-сервисы"],
        ["Резерв / прибыль",     "15-20%",        "Реинвестиции в продукты + дивиденды"],
    ], [CW * 0.30, CW * 0.20, CW * 0.50]))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Источники финансирования роста", styles["Sub2_Title"]))
    for t in [
        "<b>Собственная выручка</b> — основной источник (bootstrapping)",
        "<b>Гранты:</b> РФРИТ (импортозамещение, до 20 млн руб), Минпромторг (СмартМаш, до 50 млн руб), Сколково",
        "<b>Партнёрские авансы</b> от корпоративных клиентов (АгроПорт, СмартМаш)",
        "<b>Series A</b> в Год 3 (опционально) — для агрессивного захвата рынка",
    ]:
        story.append(bul(t, styles))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ V — КОМАНДА
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ V. ПЛАН НАЙМА НА 3 ГОДА", styles)

    story.append(colored_table([
        ["Роль",                     "Год 1",  "Год 2",  "Год 3",  "Зона ответственности"],
        ["Head of Product",           "1",      "1",      "1",      "Стратегия продуктов, P&L"],
        ["Product Managers (SaaS)",   "1",      "3",      "4",      "По одному на флагман"],
        ["Sales Manager / SDR",       "1",      "4",      "8",      "Прямые продажи SaaS и корпоратив"],
        ["Customer Success",          "0",      "2",      "5",      "Снижение churn, апсейлы"],
        ["ML-инженеры",               "+2",     "+3",     "+3",     "AI-функции продуктов"],
        ["Frontend",                  "+2",     "+3",     "+4",     "SaaS-интерфейсы"],
        ["Backend / DevOps",          "+2",     "+3",     "+4",     "Инфраструктура и масштаб"],
        ["Маркетинг / контент",       "+1",     "+2",     "+3",     "Inbound, бренд, PR"],
        ["Дизайнеры (UI/UX)",         "+1",     "+1",     "+2",     "Продуктовый дизайн"],
        ["ИТОГО размер команды",      "65+",    "90+",    "130+",   "—"],
    ], [CW * 0.26, CW * 0.10, CW * 0.10, CW * 0.10, CW * 0.44]))

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ VI — РИСКИ
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 6 * mm))
    story += section_header("ЧАСТЬ VI. КЛЮЧЕВЫЕ РИСКИ И МИТИГАЦИЯ", styles)

    story.append(colored_table([
        ["Риск",                                       "Вероятн.",  "План митигации"],
        ["Распыление: не закрыть фокус на 3 SaaS",      "ВЫСОКАЯ",
         "Жёсткое решение Год 1 Q1 по продуктам D-кластера. Закрыть/продать"],
        ["Возврат Mailchimp в РФ → давление на MAIL-KA","Средняя",
         "Ставка на локальную поддержку, интеграции с 1С/Битрикс, цены в руб"],
        ["Удорожание OpenAI API",                        "ВЫСОКАЯ",
         "Гибридная архитектура: GPT-4 для премиум + open-source модели"],
        ["Кадровый голод (ML, Sales)",                   "ВЫСОКАЯ",
         "Опционная программа, удалёнка по СНГ, выращивание из джунов"],
        ["Зависимость от 1-2 корп. клиентов",            "Средняя",
         "Диверсификация: ни один клиент >15% выручки. Контракты от 12 мес"],
        ["Регуляторика 152-ФЗ и ИИ-закон",               "Средняя",
         "Юрист на аутсорсе, размещение данных в РФ, сертификация ФСТЭК"],
        ["Churn SaaS > 10%/мес",                         "Средняя",
         "Customer Success команда, onboarding, ежемесячные QBR с клиентами"],
    ], [CW * 0.34, CW * 0.14, CW * 0.52]))

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ VII — ДОРОЖНАЯ КАРТА
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 6 * mm))
    story += section_header("ЧАСТЬ VII. ДОРОЖНАЯ КАРТА — ПОКВАРТАЛЬНО", styles)

    story.append(colored_table([
        ["Квартал", "Фокус", "Ключевая веха"],
        ["Y1 Q1",   "Аудит",        "Сегментация портфолио · Head of Product · 10 кейсов"],
        ["Y1 Q2",   "MAIL-KA SaaS", "Биллинг + закрытая beta + Telegram-канал"],
        ["Y1 Q3",   "Sales+АгроПорт","Sales Manager · 1-й корп. пилот · грант РФРИТ"],
        ["Y1 Q4",   "RoomScan AI",  "Pro-тариф · 2-3 застройщика · AVT+MAIL-KA cross-sell"],
        ["Y2 Q1",   "MAT-AD",       "Запуск 3-го SaaS · whitelabel MAIL-KA"],
        ["Y2 Q2",   "Корпоратив",   "СмартМаш — 2 завода · 5+ агрохолдингов"],
        ["Y2 Q3",   "Бренд",        "Подкаст · РИФ · ProductSense · отчёт об AI"],
        ["Y2 Q4",   "Процессы",     "CSM-команда · собственная CRM · NPS 60+"],
        ["Y3 Q1",   "Экспорт",      "Локализация MAIL-KA для Казахстана"],
        ["Y3 Q2",   "Лидерство",    "MAIL-KA №1-2 в РФ · Open-source SDK"],
        ["Y3 Q3",   "Капитал",      "Подготовка к Series A или дивиденды"],
        ["Y3 Q4",   "Финал",        "15 млн руб/мес · 6500 платящих · 130+ команда"],
    ], [CW * 0.10, CW * 0.20, CW * 0.70]))

    # ═══════════════════════════════════════════════════════════════════
    # ГЛАВНЫЙ ВЫВОД
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8 * mm))
    story += section_header("ГЛАВНЫЙ ВЫВОД", styles)
    conclusion = Table(
        [[Paragraph(
            "<b>MAT Labs — это компания с уникальным портфолио из 10 запущенных продуктов</b>, "
            "которая сегодня недополучает выручку из-за распыления. "
            "<br/><br/>Стратегия 3 лет — <b>фокус на 3 SaaS-флагманах (MAIL-KA, RoomScan AI, MAT-AD)</b>, "
            "<b>построение корпоративной вертикали (АгроПорт + СмартМаш)</b> и "
            "<b>сохранение услуг как канала продаж в продукты</b>. "
            "<br/><br/>Реалистичная цель — <b>выручка 15 млн руб/мес к концу 3 года</b>, "
            "из которых <b>40% — повторяющиеся (MRR)</b>. "
            "Это превращает MAT Labs из «студии» в <b>устойчивую продуктовую компанию</b> "
            "с потенциалом привлечения инвестиций или стабильной самоокупаемостью.",
            styles["Body"]
        )]],
        colWidths=[CW]
    )
    conclusion.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#1E1040")),
        ("LINEBEFORE",    (0, 0), (0, -1), 4, VIOLET_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(conclusion)
    story.append(Spacer(1, 8 * mm))
    story.append(hr_line(CYAN, 0.5))
    story.append(Paragraph("mat-labs.ru  \u00b7  Конфиденциально  \u00b7  Май 2026  \u00b7  Стратегия 2026-2029", styles["Footer"]))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)
    return buf.read()


def handler(event: dict, context) -> dict:
    """Генерирует PDF со стратегией развития MAT Labs на 3 года и возвращает файл напрямую (base64)."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    pdf_bytes = build_pdf_bytes()

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="MAT-Labs-Strategy-3-years.pdf"',
        },
        "isBase64Encoded": True,
        "body": base64.b64encode(pdf_bytes).decode("ascii"),
    }