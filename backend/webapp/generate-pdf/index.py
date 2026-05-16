"""
Генерирует PDF со стратегическим планом развития MAT Labs на 365 дней
и загружает его в S3. Возвращает публичный URL для скачивания.
v2
"""
import os
import io
import boto3
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


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

    base = dict(fontName="Helvetica", textColor=WHITE, backColor=DARK)

    styles.add(ParagraphStyle("Cover_Title",
        fontName="Helvetica-Bold", fontSize=32, leading=40,
        textColor=WHITE, alignment=TA_LEFT, spaceAfter=6))

    styles.add(ParagraphStyle("Cover_Sub",
        fontName="Helvetica", fontSize=14, leading=20,
        textColor=CYAN_LT, alignment=TA_LEFT, spaceAfter=4))

    styles.add(ParagraphStyle("Cover_Date",
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=GREY, alignment=TA_LEFT))

    styles.add(ParagraphStyle("Section_Title",
        fontName="Helvetica-Bold", fontSize=18, leading=24,
        textColor=VIOLET_LT, spaceBefore=18, spaceAfter=8))

    styles.add(ParagraphStyle("Sub_Title",
        fontName="Helvetica-Bold", fontSize=13, leading=18,
        textColor=CYAN_LT, spaceBefore=14, spaceAfter=5))

    styles.add(ParagraphStyle("Sub2_Title",
        fontName="Helvetica-Bold", fontSize=11, leading=16,
        textColor=WHITE, spaceBefore=10, spaceAfter=4))

    styles.add(ParagraphStyle("Body",
        fontName="Helvetica", fontSize=10, leading=15,
        textColor=colors.HexColor("#CBD5E1"), spaceAfter=4))

    styles.add(ParagraphStyle("Body_Bold",
        fontName="Helvetica-Bold", fontSize=10, leading=15,
        textColor=WHITE, spaceAfter=4))

    styles.add(ParagraphStyle("Bullet",
        fontName="Helvetica", fontSize=10, leading=15,
        textColor=colors.HexColor("#CBD5E1"),
        leftIndent=14, firstLineIndent=0, spaceAfter=2,
        bulletText="•", bulletFontName="Helvetica", bulletFontSize=10,
        bulletColor=VIOLET_LT))

    styles.add(ParagraphStyle("Tag",
        fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=DARK, backColor=VIOLET_LT,
        borderPadding=(2, 6, 2, 6), spaceAfter=2))

    styles.add(ParagraphStyle("Footer",
        fontName="Helvetica", fontSize=8, leading=11,
        textColor=GREY, alignment=TA_CENTER))

    styles.add(ParagraphStyle("Metric_Label",
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=GREY, alignment=TA_CENTER))

    styles.add(ParagraphStyle("Metric_Value",
        fontName="Helvetica-Bold", fontSize=22, leading=26,
        textColor=CYAN_LT, alignment=TA_CENTER))

    return styles


def hr(color=VIOLET, width=1):
    return HRFlowable(width="100%", thickness=width, color=color, spaceAfter=10, spaceBefore=4)


def section_header(text, styles):
    return [
        hr(VIOLET, 1.5),
        Paragraph(text, styles["Section_Title"]),
    ]


def bullet(text, styles, color=None):
    s = styles["Bullet"]
    return Paragraph(f"<bullet>&bull;</bullet> {text}", s)


def kv(key, val, styles):
    return Paragraph(f"<b><font color='#A78BFA'>{key}:</font></b>  {val}", styles["Body"])


def colored_table(data, col_widths, header_bg=VIOLET, row_bg=GREY_CARD, alt_bg=GREY_LT):
    n_cols = len(data[0])
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 9),
        ("ALIGN",      (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [row_bg, alt_bg]),
        ("TEXTCOLOR",  (0, 1), (-1, -1), colors.HexColor("#CBD5E1")),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 9),
        ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ])
    t = Table(data, colWidths=col_widths)
    t.setStyle(style)
    return t


def build_pdf_bytes():
    buf = io.BytesIO()
    W, H = A4
    margin = 20 * mm

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin, bottomMargin=20 * mm,
        title="MAT Labs — Стратегия развития 365 дней",
        author="MAT Labs",
    )

    styles = make_styles()
    story = []
    CW = W - 2 * margin  # content width

    # ═══════════════════════════════════════════════════════════════════
    # ОБЛОЖКА
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("MAT Labs", styles["Cover_Sub"]))
    story.append(Paragraph("Стратегия развития\nна 365 дней", styles["Cover_Title"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "AI-автоматизация · Сайты · ML · Кибербезопасность · Аналитика",
        styles["Cover_Sub"]
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Май 2026 · Конфиденциально", styles["Cover_Date"]))
    story.append(Spacer(1, 10 * mm))
    story.append(hr(CYAN, 2))
    story.append(Spacer(1, 8 * mm))

    # Метрики — 4 блока
    metrics = [
        ("10", "продуктов\nв портфолио"),
        ("5", "направлений\nуслуг"),
        ("0 ₽", "текущий MRR\n(цель: 500 K/мес)"),
        ("365", "дней до цели"),
    ]
    metric_data = [
        [Paragraph(m[0], styles["Metric_Value"]) for m in metrics],
        [Paragraph(m[1], styles["Metric_Label"]) for m in metrics],
    ]
    mt = Table(metric_data, colWidths=[CW / 4] * 4)
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_CARD),
        ("BOX",        (0, 0), (-1, -1), 0.5, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(mt)
    story.append(Spacer(1, 12 * mm))

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ I — АУДИТ
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ I. АУДИТ: ГДЕ КОМПАНИЯ СЕЙЧАС", styles)

    # --- Портфолио ---
    story.append(Paragraph("Портфолио — 10 продуктов", styles["Sub_Title"]))
    portfolio_data = [
        ["№", "Продукт", "Ниша", "Кластер"],
        ["1", "Авангард",          "AI-дизайн и ремонт",         "Б"],
        ["2", "RoomScan AI",       "3D-планировщик квартир",      "Б"],
        ["3", "MAIL-KA",           "Омниканальный маркетинг",     "А"],
        ["4", "MAT-AD",            "AI-реклама",                  "А"],
        ["5", "AVT",               "CRM + AI-звонки",             "А"],
        ["6", "АгроПорт",          "AI-мониторинг агрорынка",     "В"],
        ["7", "СмартМаш",          "ПО для станкостроения/ЧПУ",   "В"],
        ["8", "SoloFly",           "Платформа для пилотов",       "В"],
        ["9", "БухКонтроль",       "Бухгалтерия для агробизнеса", "В"],
        ["10","Купец в плюсе",     "Агрегатор бизнес-услуг",      "А"],
    ]
    story.append(colored_table(portfolio_data,
        [CW * 0.06, CW * 0.22, CW * 0.44, CW * 0.14]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "<b>Кластер А</b> — AI для роста продаж  |  "
        "<b>Кластер Б</b> — AI для недвижимости и ремонта  |  "
        "<b>Кластер В</b> — Корпоративные отраслевые решения",
        styles["Body"]
    ))

    # --- Услуги ---
    story.append(Paragraph("Услуги — 5 направлений", styles["Sub_Title"]))
    services_data = [
        ["Услуга", "Цена от", "Потолок"],
        ["AI-автоматизация",  "30 000 ₽",  "200 000 ₽"],
        ["Сайты и лендинги",  "50 000 ₽",  "300 000 ₽"],
        ["ИИ и ML-решения",   "80 000 ₽", "1 000 000 ₽"],
        ["Кибербезопасность", "60 000 ₽",  "400 000 ₽"],
        ["Аналитика данных",  "90 000 ₽",  "800 000 ₽"],
    ]
    story.append(colored_table(services_data, [CW * 0.5, CW * 0.25, CW * 0.25]))
    story.append(Spacer(1, 5 * mm))

    # --- SWOT ---
    story.append(Paragraph("Ключевые выводы аудита", styles["Sub_Title"]))

    swot = [
        [Paragraph("<b>СИЛЬНЫЕ СТОРОНЫ</b>", styles["Body_Bold"]),
         Paragraph("<b>УЯЗВИМЫЕ МЕСТА</b>", styles["Body_Bold"])],
        [
            Paragraph(
                "• Широкая экспертиза: сайты → MLOps\n"
                "• Реальные продукты в 7+ отраслях\n"
                "• Скорость: 7–14 дней до результата\n"
                "• Актуальное позиционирование «AI-первый»",
                styles["Body"]
            ),
            Paragraph(
                "• Все 10 продуктов — разовые проекты (MRR = 0)\n"
                "• Слишком широкий охват, нет чёткого «кто мы»\n"
                "• Кейсы без цифр — слабая конверсия\n"
                "• Нет контентной воронки и sales-функции",
                styles["Body"]
            ),
        ],
    ]
    swot_t = Table(swot, colWidths=[CW / 2, CW / 2])
    swot_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#1E1040")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#1A0530")),
        ("BACKGROUND", (0, 1), (0, 1), GREY_CARD),
        ("BACKGROUND", (1, 1), (1, 1), GREY_CARD),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(swot_t)

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ II — СТРАТЕГИЯ
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8 * mm))
    story += section_header("ЧАСТЬ II. СТРАТЕГИЯ: 3 ГОРИЗОНТА", styles)

    story.append(Paragraph(
        "Ключевой стратегический переход за год: <b>от «студии под заказ» "
        "к продуктово-сервисной компании</b> с повторяющейся выручкой от SaaS "
        "и партнёрской сетью.",
        styles["Body"]
    ))
    story.append(Spacer(1, 4 * mm))

    # --- Горизонт 1 ---
    story.append(Paragraph("ГОРИЗОНТ 1 — ФУНДАМЕНТ (Месяцы 1–3)", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача:</b> перестать быть «всем для всех» и выстроить "
        "систему входящих заявок.", styles["Body"]
    ))

    story.append(Paragraph("Месяц 1 — Упаковка и аналитика", styles["Sub2_Title"]))
    for t in [
        "Customer development: связаться с клиентами всех 10 продуктов, "
        "собрать данные «было → стало» в цифрах",
        "Переупаковать портфолио: структура «Клиент → Проблема → Решение → Результат»",
        "Выбрать главный фокус — Кластер А (AI для продаж): самый широкий рынок, "
        "самый короткий цикл сделки",
    ]:
        story.append(bullet(t, styles))

    story.append(Paragraph("Месяц 2 — Контент и трафик", styles["Sub2_Title"]))
    for t in [
        "Запустить Telegram-канал: 3 поста/неделю — кейс, образовательный, закулисье",
        "VC.ru / Хабр: 2 лонгрида в месяц из реального опыта",
        "Цель к концу месяца: 300+ подписчиков Telegram, 10 кейсов с цифрами",
    ]:
        story.append(bullet(t, styles))

    story.append(Paragraph("Месяц 3 — Продажи", styles["Sub2_Title"]))
    for t in [
        "«Бесплатный AI-разбор» → отдельный лендинг с конкретикой: "
        "«За 45 мин покажем 3 точки автоматизации именно в вашем бизнесе»",
        "Запустить трафик: таргет ВКонтакте + Яндекс.Директ",
        "Нанять первого sales-менеджера: 80–120 тыс. ₽/мес + % от сделок",
    ]:
        story.append(bullet(t, styles))

    story.append(Spacer(1, 3 * mm))
    kpi1 = [
        ["KPI Горизонта 1"],
        ["5+ новых контрактов из Кластера А · Средний чек → 120 000 ₽ · "
         "Конверсия сайт→заявка +30%"],
    ]
    kpi1_t = Table(kpi1, colWidths=[CW])
    kpi1_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VIOLET),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#1E1040")),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 10),
        ("FONTNAME",   (0, 1), (-1, 1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, 1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    story.append(kpi1_t)

    # --- Горизонт 2 ---
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("ГОРИЗОНТ 2 — МАСШТАБ (Месяцы 4–8)", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача:</b> создать первый источник повторяющейся выручки.",
        styles["Body"]
    ))

    story.append(Paragraph("Стратегическое решение: запустить SaaS", styles["Sub2_Title"]))

    saas_data = [
        ["Продукт", "Рынок / Позиция", "Монетизация"],
        ["MAIL-KA\n(приоритет)",
         "После ухода Mailchimp/ActiveCampaign — огромный спрос.\nДифференциатор: AI-копирайтер + омниканал",
         "2 900 ₽/мес (до 5K контактов)\n29 900 ₽/мес (корпоратив)"],
        ["RoomScan AI",
         "Рынок ремонта РФ — 2+ трлн ₽/год. Нет российского AI-инструмента.\nДифференциатор: сканирование телефоном + AI-смета",
         "Freemium + 990 ₽/мес (дизайнер)\n15 000 ₽/мес (B2B застройщик)"],
    ]
    story.append(colored_table(saas_data, [CW * 0.2, CW * 0.44, CW * 0.36], header_bg=CYAN))

    story.append(Paragraph("Партнёрская сеть", styles["Sub2_Title"]))
    for t in [
        "Кластер А: 10–15 маркетинговых агентств — реферальная модель 15–20% от сделки",
        "Кластер Б: сети дизайн-студий, застройщики, магазины стройматериалов",
        "Реферальная программа для клиентов: скидка 10% за рекомендацию",
    ]:
        story.append(bullet(t, styles))

    story.append(Paragraph("Продуктовый пакет для МСБ", styles["Sub2_Title"]))
    story.append(Paragraph(
        "Объединить услуги в понятный <b>«Старт-пакет»</b>: "
        "Лендинг + CRM-интеграция + AI-обработка заявок = <b>от 90 000 ₽ под ключ</b>. "
        "Сейчас это три разные услуги — клиент теряется при выборе.",
        styles["Body"]
    ))

    story.append(Paragraph("Корпоративный пилот (месяц 8)", styles["Sub2_Title"]))
    for t in [
        "АгроПорт и СмартМаш — корпоративный сегмент, нужна отдельная воронка",
        "Участие в 1–2 отраслевых выставках: Агрофорум, Иннопром",
        "Цель: 3–5 пилотных корпоративных клиентов",
    ]:
        story.append(bullet(t, styles))

    story.append(Spacer(1, 3 * mm))
    kpi2 = [
        ["KPI Горизонта 2"],
        ["MRR от SaaS: 150 000–300 000 ₽ · 10+ партнёров · "
         "1 корпоративный контракт от 500 000 ₽ · Средний чек проектов 200 000+ ₽"],
    ]
    kpi2_t = Table(kpi2, colWidths=[CW])
    kpi2_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), CYAN),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#0A2030")),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 10),
        ("FONTNAME",   (0, 1), (-1, 1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, 1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    story.append(kpi2_t)

    # --- Горизонт 3 ---
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("ГОРИЗОНТ 3 — СИСТЕМА (Месяцы 9–12)", styles["Sub_Title"]))
    story.append(Paragraph(
        "<b>Главная задача:</b> построить устойчивую компанию "
        "с тремя потоками выручки.", styles["Body"]
    ))

    rev_data = [
        ["Поток", "Источник", "Цель, ₽/мес"],
        ["Проектный",     "Услуги (AI, сайты, ML, кибербез)",       "2 000 000"],
        ["Продуктовый",   "SaaS MAIL-KA + RoomScan AI",             "500 000"],
        ["Корпоративный", "АгроПорт, СмартМаш, Enterprise",         "1 000 000"],
        ["ИТОГО", "", "3 500 000"],
    ]
    rev_t = Table(rev_data, colWidths=[CW * 0.22, CW * 0.52, CW * 0.26])
    rev_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VIOLET),
        ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#1E1040")),
        ("ROWBACKGROUNDS", (0, 1), (-1, 3), [GREY_CARD, GREY_LT]),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("TEXTCOLOR",  (0, 4), (-1, 4), CYAN_LT),
        ("TEXTCOLOR",  (0, 1), (-1, 3), colors.HexColor("#CBD5E1")),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",   (0, 4), (-1, 4), "Helvetica-Bold"),
        ("FONTNAME",   (0, 1), (-1, 3), "Helvetica"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("ALIGN",      (2, 0), (2, -1), "RIGHT"),
    ]))
    story.append(rev_t)
    story.append(Spacer(1, 4 * mm))

    for t in [
        "Запустить второй SaaS (RoomScan AI) с партнёрами ремонтной отрасли",
        "Внедрить CRM для собственных продаж: AmoCRM или Битрикс24",
        "Стандартизировать доставку проектов: Notion-шаблоны, онбординг, NPS (цель: 70+)",
        "Запустить подкаст «AI в бизнесе — без воды», выступления: RIF, ProductSense, AI Journey",
        "Ежеквартальный отчёт «Состояние AI-автоматизации в российском МСБ»",
    ]:
        story.append(bullet(t, styles))

    story.append(Spacer(1, 4 * mm))
    kpi3 = [
        ["KPI Горизонта 3"],
        ["Выручка 3 500 000+ ₽/мес · MRR SaaS 500 000+ ₽ · NPS 70+ · "
         "База клиентов 200+ · Telegram 3 000+ подписчиков"],
    ]
    kpi3_t = Table(kpi3, colWidths=[CW])
    kpi3_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#0A2015")),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 10),
        ("FONTNAME",   (0, 1), (-1, 1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, 1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    story.append(kpi3_t)

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ III — ДОРОЖНАЯ КАРТА
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8 * mm))
    story += section_header("ЧАСТЬ III. ДОРОЖНАЯ КАРТА — ПОКВАРТАЛЬНО", styles)

    road_data = [
        ["Период", "Фокус", "Ключевое действие"],
        ["Q1 (мес 1–3)", "УПАКОВКА",  "10 кейсов с цифрами · Telegram-канал · Sales-менеджер"],
        ["Q2 (мес 4–6)", "ПРОДУКТ",   "SaaS MAIL-KA бета · Партнёрская сеть · Старт-пакет МСБ"],
        ["Q3 (мес 7–9)", "РОСТ",      "Корпоратив · RoomScan AI SaaS · Внутренняя CRM"],
        ["Q4 (мес 10–12)", "СИСТЕМА", "3 потока выручки · Подкаст · Выставки · NPS 70+"],
    ]
    story.append(colored_table(road_data, [CW * 0.22, CW * 0.18, CW * 0.60]))
    story.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════════════════════════
    # ЧАСТЬ IV — КОМАНДА
    # ═══════════════════════════════════════════════════════════════════
    story += section_header("ЧАСТЬ IV. ПЛАН НАЙМА", styles)

    hire_data = [
        ["Роль", "Приоритет", "Когда", "Зарплата"],
        ["Sales Manager",          "Критичный", "Мес 3",   "100 000 ₽ + %"],
        ["Product Manager (SaaS)", "Высокий",   "Мес 4–5", "180 000 ₽"],
        ["ML Engineer",            "Высокий",   "Мес 4–6", "300 000 ₽"],
        ["Customer Success Mgr",   "Средний",   "Мес 7–8", "100 000 ₽"],
        ["Frontend Developer",     "Средний",   "Мес 5–7", "250 000 ₽"],
    ]
    story.append(colored_table(hire_data,
        [CW * 0.32, CW * 0.18, CW * 0.18, CW * 0.32]))

    # ═══════════════════════════════════════════════════════════════════
    # ГЛАВНЫЙ ВЫВОД
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8 * mm))
    story += section_header("ГЛАВНЫЙ ВЫВОД", styles)

    conclusion = Table(
        [[Paragraph(
            "MAT Labs — компания с сильной экспертизой, работающая в режиме ручного труда: "
            "каждый проект надо продать, сделать, сдать — и начать сначала. "
            "Из портфолио <b>MAIL-KA</b> и <b>RoomScan AI</b> — уже готовые продукты, "
            "которым нужен только биллинг и маркетинг. "
            "Это самый быстрый путь к MRR и кратному росту компании.",
            styles["Body"]
        )]],
        colWidths=[CW]
    )
    conclusion.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#1E1040")),
        ("LEFTBORDERPADDING", (0, 0), (-1, -1), 0),
        ("LINEBEFORE",    (0, 0), (0, -1), 4, VIOLET_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(conclusion)
    story.append(Spacer(1, 10 * mm))
    story.append(hr(CYAN, 0.5))
    story.append(Paragraph(
        "mat-labs.ru  ·  Конфиденциально  ·  Май 2026",
        styles["Footer"]
    ))

    # --- Фоновый цвет страниц ---
    def on_page(canvas_obj, doc):
        canvas_obj.saveState()
        canvas_obj.setFillColor(DARK)
        canvas_obj.rect(0, 0, W, H, fill=1, stroke=0)
        canvas_obj.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)
    return buf.read()


def handler(event: dict, context) -> dict:
    """Генерирует PDF со стратегией развития MAT Labs и возвращает URL для скачивания."""
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

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    key = "reports/mat-labs-strategy-365.pdf"
    s3.put_object(
        Bucket="files",
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
        ContentDisposition='attachment; filename="MAT-Labs-Strategy-365.pdf"',
    )

    cdn_url = (
        f"https://cdn.poehali.dev/projects/"
        f"{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    )

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": f'{{"url": "{cdn_url}"}}',
    }