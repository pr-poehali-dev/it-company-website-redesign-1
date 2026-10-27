export const IMG = {
  cover: "/presentation/cover.jpg",
  people: "/presentation/people.jpg",
  data: "/presentation/data.jpg",
  certificate: "/presentation/certificate-tochka.jpg",
};

export const CONTACTS = {
  phone: "+7 (927) 748-68-68",
  phoneHref: "tel:+79277486868",
  email: "maksT77@yandex.ru",
  tg: "t.me/mat_labs",
  site: "mat-labs.ru",
};

export const PAINS = [
  { icon: "Clock", value: "Часы", title: "уходят на рутину", desc: "менеджеры вручную переносят данные и отвечают на одни и те же вопросы вместо продаж" },
  { icon: "PhoneMissed", value: "Ночь", title: "и заявка остыла", desc: "клиент написал вечером или в выходной — и ушёл к тому, кто ответил первым" },
  { icon: "EyeOff", value: "Excel", title: "вместо картины", desc: "данные разбросаны по таблицам, 1С, CRM и мессенджерам — решения принимаются «на ощущениях»" },
];

export const DIRECTIONS = [
  { icon: "Bot", title: "AI-автоматизация", desc: "Заявки, CRM, AI-ассистенты 24/7, автоотчёты", price: "от 150 000 ₽", term: "7–14 дней", accent: "from-violet-500 to-fuchsia-500" },
  { icon: "BrainCircuit", title: "ИИ и ML-решения", desc: "AI-агенты на ваших данных, прогнозы, компьютерное зрение", price: "от 250 000 ₽", term: "пилот 2–3 недели", accent: "from-fuchsia-500 to-pink-500" },
  { icon: "BarChart3", title: "Аналитика и BI", desc: "Дашборды из 1С и CRM, хранилище данных, отчёты о рынках", price: "от 200 000 ₽", term: "2 недели", accent: "from-cyan-500 to-blue-500" },
  { icon: "Globe", title: "Сайты и лендинги", desc: "Продающие сайты с AI-чатом и интеграцией в CRM", price: "от 180 000 ₽", term: "7–10 дней", accent: "from-sky-500 to-indigo-500" },
  { icon: "Smartphone", title: "Мобильные приложения", desc: "iOS и Android: от MVP до маркетплейса", price: "от 180 000 ₽", term: "старт с MVP", accent: "from-emerald-500 to-teal-500" },
  { icon: "ShieldCheck", title: "Кибербезопасность", desc: "Пентест, аудит, соответствие 152-ФЗ", price: "от 150 000 ₽", term: "5–7 дней", accent: "from-amber-500 to-orange-500" },
];

export const AI_FLOW = [
  { icon: "MessageCircle", title: "Клиент пишет", desc: "сайт, Telegram, почта, WhatsApp — в любое время" },
  { icon: "Bot", title: "AI отвечает сразу", desc: "консультирует, квалифицирует, собирает контакты" },
  { icon: "Database", title: "Сделка в CRM", desc: "карточка заполнена, назначен ответственный" },
  { icon: "BellRing", title: "Менеджер в курсе", desc: "горячий лид — уведомление в Telegram" },
  { icon: "LineChart", title: "Отчёт руководителю", desc: "конверсия, источники, скорость ответа" },
];

export const AI_PACKS = [
  { name: "Заявки", price: "от 150 000 ₽", term: "7–10 дней", items: ["Формы и мессенджеры → CRM", "Уведомления менеджерам", "Автоответы клиентам"] },
  { name: "AI-обработка", price: "от 250 000 ₽", term: "10–14 дней", items: ["AI-ассистент 24/7", "Квалификация лидов", "Автоотчёты"], hot: true },
  { name: "Под ключ", price: "от 500 000 ₽", term: "3–4 недели", items: ["Связка всех систем", "Дашборд руководителя", "6 месяцев поддержки"] },
];

export const DATA_FACTS = [
  { value: "18 тыс.", label: "компаний-получателей господдержки в Радаре заказчиков" },
  { value: "26", label: "готовых баз компаний по отраслям и регионам" },
  { value: "2025", label: "свежая отчётность ФНС: выручка, штат, налоги" },
  { value: "1 мин", label: "от Excel до интерактивного дашборда в облачном BI" },
];

export const DATA_PRODUCTS = [
  { icon: "PieChart", title: "Отчёты о рынках", desc: "Объём, лидеры, доли, концентрация по любой отрасли и региону" },
  { icon: "Building2", title: "Проверка компаний", desc: "Статус, финансы, риски, место среди конкурентов по ИНН" },
  { icon: "Database", title: "Базы для продаж", desc: "Сегменты по ОКВЭД, региону, выручке и штату — выгрузка в Excel" },
  { icon: "Radar", title: "Радар заказчиков", desc: "Кто получил гранты и субсидии — у них есть бюджет прямо сейчас" },
];

export const STEPS = [
  { n: "01", title: "Бесплатный разбор", desc: "30–60 минут: находим, где теряются деньги и время", time: "1 день" },
  { n: "02", title: "План и смета", desc: "Задачи, сроки, фиксированная цена и ожидаемый эффект", time: "2–3 дня" },
  { n: "03", title: "Разработка", desc: "Показываем результат каждую неделю, а не в конце", time: "1–4 недели" },
  { n: "04", title: "Запуск", desc: "Интеграция, обучение команды, перенос данных", time: "2–5 дней" },
  { n: "05", title: "Поддержка", desc: "Мониторинг, доработки, новые сценарии", time: "от 30 000 ₽/мес" },
];

export const GUARANTEES = [
  { icon: "FileSignature", title: "Договор с этапами", desc: "Фиксируем сроки, состав работ и цену до старта" },
  { icon: "Eye", title: "Прозрачность", desc: "Результат каждую неделю — видите прогресс, а не обещания" },
  { icon: "LifeBuoy", title: "Поддержка включена", desc: "От 1 до 6 месяцев сопровождения в стоимости пакета" },
  { icon: "KeyRound", title: "Всё ваше", desc: "Код, доступы и данные принадлежат вам" },
];