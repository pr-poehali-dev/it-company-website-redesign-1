"""
Генерирует PDF со стратегическим планом развития MAT Labs на 365 дней
и загружает его в S3. Возвращает публичный URL для скачивания.
"""
import os
import io
import boto3
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)


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


def make_styles():
    styles = getSampleStyleSheet()

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
    styles.add(ParagraphStyle("BulletItem",
        fontName="Helvetica", fontSize=10, leading=15,
        textColor=colors.HexColor("#CBD5E1"),
        leftIndent=14, spaceAfter=2))
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


def hr_line(color=VIOLET, width=1):
    return HRFlowable(width="100%", thickness=width, color=color, spaceAfter=10, spaceBefore=4)


def section_header(text, styles):
    return [hr_line(VIOLET, 1.5), Paragraph(text, styles["Section_Title"])]


def bul(text, styles):
    return Paragraph(f"  \u2022  {text}", styles["BulletItem"])


def colored_table(data, col_widths, header_bg=VIOLET, row_bg=GREY_CARD, alt_bg=GREY_LT):
    style = TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [row_bg, alt_bg]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), colors.HexColor("#CBD5E1")),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
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
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    return t


def build_pdf_bytes():
    buf = io.BytesIO()
    W, H = A4
    margin = 20 * mm

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin, bottomMargin=20 * mm,
        title="MAT Labs — Стратегия развития 365 дней",
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

    # ── ОБЛОЖКА ──────────────────────────────────────────────────────────────
    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("MAT Labs", styles["Cover_Sub"]))
    story.append(Paragraph("Стратегия развития на 365 дней", styles["Cover_Title"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "AI-автоматизация  \u00b7  Сайты  \u00b7  ML  \u00b7  Кибербезопасность  \u00b7  Аналитика",
        styles["Cover_Sub"]
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Май 2026  \u00b7  Конфиденциально", styles["Cover_Date"]))
    story.append(Spacer(1, 10 * mm))
    story.append(hr_line(CYAN, 2))
    story.append(Spacer(1, 8 * mm))

    metrics = [
        ("10",  "продуктов\nв портфолио"),
        ("5",   "направлений\nуслуг"),
        ("0",   "текущий MRR\n(цель: 500K/мес)"),
        ("365", "дней\nдо цели"),
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
    story.append(Spacer(1, 12 * mm))

    # ── ЧАСТЬ I: АУДИТ ───────────────────────────────────────────────────────
    story += section_header("ЧАСТЬ I. АУДИТ: ГДЕ КОМПАНИЯ СЕЙЧАС", styles)

    story.append(Paragraph("Портфолио — 10 продуктов", styles["Sub_Title"]))
    story.append(colored_table([
        ["\u2116", "Продукт",         "Ниша",                        "Кластер"],
        ["1",  "Авангард",            "AI-дизайн и ремонт",          "Б"],
        ["2",  "RoomScan AI",         "3D-планировщик квартир",       "Б"],
        ["3",  "MAIL-KA",             "Омниканальный маркетинг",      "А"],
        ["4",  "MAT-AD",              "AI-реклама",                   "А"],
        ["5",  "AVT",                 "CRM + AI-звонки",              "А"],
        ["6",  "АгроПорт",            "AI-мониторинг агрорынка",      "В"],
        ["7",  "СмартМаш",            "ПО для станкостроения/ЧПУ",    "В"],
        ["8",  "SoloFly",             "Платформа для пилотов",        "В"],
        ["9",  "БухКонтроль",         "Бухгалтерия для агробизнеса",  "В"],
        ["10", "Купец в плюсе",       "Агрегатор бизнес-услуг",       "А"],
    ], [CW*0.06, CW*0.22, CW*0.44, CW*0.14]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "<b>Кластер А</b> — AI для роста продаж  |  "
        "<b>Кластер Б</b> — AI для недвижимости и ремонта  |  "
        "<b>Кластер В</b> — Корпоративные отраслевые решения",
        styles["Body"]
    ))

    story.append(Paragraph("Услуги — 5 направлений", styles["Sub_Title"]))
    story.append(colored_table([
        ["Услуга",            "Цена от",    "Потолок"],
        ["AI-автоматизация",  "30 000 руб", "200 000 руб"],
        ["Сайты и лендинги",  "50 000 руб", "300 000 руб"],
        ["ИИ и ML-решения",   "80 000 руб", "1 000 000 руб"],
        ["Кибербезопасность", "60 000 руб", "400 000 руб"],
        ["Аналитика данных",  "90 000 руб", "800 000 руб"],
    ], [CW*0.5, CW*0.25, CW*0.25]))
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("Ключевые выводы", styles["Sub_Title"]))
    swot = Table([
        [Paragraph("<b>СИЛЬНЫЕ СТОРОНЫ</b>", styles["Body_Bold"]),
         Paragraph("<b>УЯЗВИМЫЕ МЕСТА</b>",  styles["Body_Bold"])],
        [Paragraph(
            "• Широкая экспертиза: сайты до MLOps\n"
            "• Реальные продукты в 7+ отраслях\n"
            "• Скорость: 7-14 дней до результата\n"
            "• Актуальное позиционирование AI-first",
            styles["Body"]),
         Paragraph(
            "• Все 10 продуктов — разовые (MRR = 0)\n"
            "• Слишком широкий охват, нет позиционирования\n"
            "• Кейсы без цифр — слабая конверсия\n"
            "• Нет контентной воронки и sales-функции",
            styles["Body"])],
    ], colWidths=[CW/2, CW/2])
    swot.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#1E1040")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#1A0530")),
        ("BACKGROUND", (0, 1), (0, 1), GREY_CARD),
        ("BACKGROUND", (1, 1), (1, 1), GREY_CARD),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#2D2F50")),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(swot)

    # ── ЧАСТЬ II: СТРАТЕГИЯ ───────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story += section_header("ЧАСТЬ II. СТРАТЕГИЯ: 3 ГОРИЗОНТА", styles)
    story.append(Paragraph(
        "Ключевой переход за год: <b>от «студии под заказ» к продуктово-сервисной компании</b> "
        "с повторяющейся выручкой от SaaS и партнёрской сетью.",
        styles["Body"]
    ))
    story.append(Spacer(1, 4 * mm))

    # Горизонт 1
    story.append(Paragraph("ГОРИЗОНТ 1 — ФУНДАМЕНТ (Месяцы 1–3)", styles["Sub_Title"]))
    story.append(Paragraph("<b>Главная задача:</b> перестать быть «всем для всех» и выстроить систему входящих заявок.", styles["Body"]))
    story.append(Paragraph("Месяц 1 — Упаковка и аналитика", styles["Sub2_Title"]))
    for t in [
        "Customer development: связаться с клиентами всех 10 продуктов, собрать данные «было > стало» в цифрах",
        "Переупаковать портфолио: структура Клиент > Проблема > Решение > Результат",
        "Выбрать фокус — Кластер А (AI для продаж): самый широкий рынок, короткий цикл сделки",
    ]:
        story.append(bul(t, styles))
    story.append(Paragraph("Месяц 2 — Контент и трафик", styles["Sub2_Title"]))
    for t in [
        "Запустить Telegram-канал: 3 поста/неделю — кейс, образовательный, закулисье",
        "VC.ru / Хабр: 2 лонгрида в месяц из реального опыта",
        "Цель: 300+ подписчиков Telegram, 10 кейсов с цифрами опубликовано",
    ]:
        story.append(bul(t, styles))
    story.append(Paragraph("Месяц 3 — Продажи", styles["Sub2_Title"]))
    for t in [
        "«Бесплатный AI-разбор» — отдельный лендинг: «За 45 мин покажем 3 точки автоматизации»",
        "Запустить трафик: таргет ВКонтакте + Яндекс.Директ",
        "Нанять первого sales-менеджера: 80-120 тыс. руб/мес + % от сделок",
    ]:
        story.append(bul(t, styles))
    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI Горизонта 1",
        "5+ новых контрактов из Кластера А  |  Средний чек 120 000 руб  |  Конверсия сайт>заявка +30%",
        VIOLET, colors.HexColor("#1E1040"), styles
    ))

    # Горизонт 2
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("ГОРИЗОНТ 2 — МАСШТАБ (Месяцы 4–8)", styles["Sub_Title"]))
    story.append(Paragraph("<b>Главная задача:</b> создать первый источник повторяющейся выручки.", styles["Body"]))
    story.append(Paragraph("Запустить SaaS — два кандидата:", styles["Sub2_Title"]))
    story.append(colored_table([
        ["Продукт",       "Рынок / Позиция",                                         "Монетизация"],
        ["MAIL-KA\n(приоритет)",
         "После ухода Mailchimp — огромный спрос.\nДифференциатор: AI-копирайтер + омниканал",
         "2 900 руб/мес (до 5K конт.)\n29 900 руб/мес (корпоратив)"],
        ["RoomScan AI",
         "Рынок ремонта РФ — 2+ трлн руб/год.\nДифференциатор: сканирование телефоном + AI-смета",
         "990 руб/мес (дизайнер)\n15 000 руб/мес (B2B застройщик)"],
    ], [CW*0.2, CW*0.44, CW*0.36], header_bg=CYAN))
    story.append(Paragraph("Партнёрская сеть", styles["Sub2_Title"]))
    for t in [
        "Кластер А: 10-15 маркетинговых агентств — реферальная модель 15-20% от сделки",
        "Кластер Б: сети дизайн-студий, застройщики, магазины стройматериалов",
        "Для клиентов: скидка 10% за рекомендацию нового клиента",
    ]:
        story.append(bul(t, styles))
    story.append(Paragraph("Продуктовый пакет для МСБ", styles["Sub2_Title"]))
    story.append(Paragraph(
        "«Старт-пакет»: Лендинг + CRM-интеграция + AI-обработка заявок = <b>от 90 000 руб под ключ</b>. "
        "Сейчас это три разные услуги — клиент теряется при выборе.",
        styles["Body"]
    ))
    story.append(Paragraph("Корпоративный пилот (месяц 8)", styles["Sub2_Title"]))
    for t in [
        "АгроПорт и СмартМаш — корпоративный сегмент, нужна отдельная воронка",
        "Участие в 1-2 отраслевых выставках: Агрофорум, Иннопром",
        "Цель: 3-5 пилотных корпоративных клиентов",
    ]:
        story.append(bul(t, styles))
    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI Горизонта 2",
        "MRR от SaaS: 150-300K руб  |  10+ партнёров  |  1 корп. контракт от 500K руб  |  Средний чек 200K+ руб",
        CYAN, colors.HexColor("#0A2030"), styles
    ))

    # Горизонт 3
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("ГОРИЗОНТ 3 — СИСТЕМА (Месяцы 9–12)", styles["Sub_Title"]))
    story.append(Paragraph("<b>Главная задача:</b> построить устойчивую компанию с тремя потоками выручки.", styles["Body"]))
    story.append(colored_table([
        ["Поток",          "Источник",                              "Цель, руб/мес"],
        ["Проектный",      "Услуги (AI, сайты, ML, кибербез)",      "2 000 000"],
        ["Продуктовый",    "SaaS MAIL-KA + RoomScan AI",            "500 000"],
        ["Корпоративный",  "АгроПорт, СмартМаш, Enterprise",        "1 000 000"],
        ["ИТОГО",          "",                                       "3 500 000"],
    ], [CW*0.22, CW*0.52, CW*0.26]))
    story.append(Spacer(1, 4 * mm))
    for t in [
        "Запустить второй SaaS (RoomScan AI) с партнёрами ремонтной отрасли",
        "Внедрить CRM для собственных продаж: AmoCRM или Битрикс24",
        "Стандартизировать доставку: Notion-шаблоны проектов, онбординг, NPS (цель: 70+)",
        "Запустить подкаст «AI в бизнесе — без воды», выступления: RIF, ProductSense, AI Journey",
        "Ежеквартальный отчёт «Состояние AI-автоматизации в российском МСБ»",
    ]:
        story.append(bul(t, styles))
    story.append(Spacer(1, 3 * mm))
    story.append(kpi_block(
        "KPI Горизонта 3",
        "Выручка 3 500 000+ руб/мес  |  MRR SaaS 500K+  |  NPS 70+  |  200+ клиентов  |  Telegram 3000+ подписчиков",
        GREEN, colors.HexColor("#0A2015"), styles
    ))

    # ── ЧАСТЬ III: ДОРОЖНАЯ КАРТА ─────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story += section_header("ЧАСТЬ III. ДОРОЖНАЯ КАРТА — ПОКВАРТАЛЬНО", styles)
    story.append(colored_table([
        ["Период",          "Фокус",     "Ключевое действие"],
        ["Q1 (мес 1-3)",    "УПАКОВКА",  "10 кейсов с цифрами  |  Telegram-канал  |  Sales-менеджер"],
        ["Q2 (мес 4-6)",    "ПРОДУКТ",   "SaaS MAIL-KA бета  |  Партнёрская сеть  |  Старт-пакет МСБ"],
        ["Q3 (мес 7-9)",    "РОСТ",      "Корпоратив  |  RoomScan AI SaaS  |  Внутренняя CRM"],
        ["Q4 (мес 10-12)",  "СИСТЕМА",   "3 потока выручки  |  Подкаст  |  Выставки  |  NPS 70+"],
    ], [CW*0.22, CW*0.18, CW*0.60]))

    # ── ЧАСТЬ IV: НАЙМ ────────────────────────────────────────────────────────
    story.append(Spacer(1, 6 * mm))
    story += section_header("ЧАСТЬ IV. ПЛАН НАЙМА", styles)
    story.append(colored_table([
        ["Роль",                      "Приоритет",  "Когда",    "ЗП"],
        ["Sales Manager",             "Критичный",  "Мес 3",    "100K руб + %"],
        ["Product Manager (SaaS)",    "Высокий",    "Мес 4-5",  "180K руб"],
        ["ML Engineer",               "Высокий",    "Мес 4-6",  "300K руб"],
        ["Customer Success Manager",  "Средний",    "Мес 7-8",  "100K руб"],
        ["Frontend Developer",        "Средний",    "Мес 5-7",  "250K руб"],
    ], [CW*0.34, CW*0.18, CW*0.18, CW*0.30]))

    # ── ГЛАВНЫЙ ВЫВОД ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story += section_header("ГЛАВНЫЙ ВЫВОД", styles)
    conclusion = Table(
        [[Paragraph(
            "MAT Labs — компания с сильной экспертизой, работающая в режиме ручного труда. "
            "Из портфолио <b>MAIL-KA</b> и <b>RoomScan AI</b> — уже готовые продукты, "
            "которым нужен только биллинг и маркетинг. "
            "Это самый быстрый путь к MRR и кратному росту компании.",
            styles["Body"]
        )]],
        colWidths=[CW]
    )
    conclusion.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#1E1040")),
        ("LINEBEFORE",    (0, 0), (0, -1), 4, VIOLET_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(conclusion)
    story.append(Spacer(1, 10 * mm))
    story.append(hr_line(CYAN, 0.5))
    story.append(Paragraph("mat-labs.ru  \u00b7  Конфиденциально  \u00b7  Май 2026", styles["Footer"]))

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