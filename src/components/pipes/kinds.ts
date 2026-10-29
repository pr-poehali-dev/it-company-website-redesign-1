import type { Kind } from "./pipesApi";

export interface Field {
  key: string; label: string; placeholder?: string; type?: "text" | "password" | "textarea" | "select"; options?: [string, string][];
  required?: boolean; hint?: string; def?: string;
}
export interface KindInfo { kind: Kind; title: string; group: string; icon: string; color: string; desc: string; fields: Field[]; help: string[] }

export const KINDS: KindInfo[] = [
  {
    kind: "google_sheets", title: "Google Таблицы", group: "Таблицы и файлы", icon: "Sheet", color: "from-emerald-500 to-green-600",
    desc: "Любой лист по ссылке — план продаж, реестры, ручные отчёты",
    fields: [{ key: "url", label: "Ссылка на таблицу", placeholder: "https://docs.google.com/spreadsheets/d/…/edit#gid=0", required: true, hint: "Откройте нужный лист и скопируйте адрес из браузера — номер листа (gid) подхватится сам" }],
    help: ["Откройте таблицу → «Настройки доступа»", "Выберите «Все, у кого есть ссылка» → роль «Читатель»", "Скопируйте адрес из строки браузера на нужном листе"],
  },
  {
    kind: "file_url", title: "Файл по ссылке", group: "Таблицы и файлы", icon: "FileSpreadsheet", color: "from-sky-500 to-blue-600",
    desc: "Excel или CSV на Яндекс Диске, сайте, FTP-выгрузке 1С",
    fields: [{ key: "url", label: "Ссылка на файл .xlsx или .csv", placeholder: "https://disk.yandex.ru/i/… или https://site.ru/export.csv", required: true, hint: "Подходят публичные ссылки Яндекс Диска и прямые ссылки на файл. Каждое обновление берёт свежую версию файла" }],
    help: ["Яндекс Диск: ПКМ по файлу → «Поделиться» → «Скопировать ссылку»", "Выгрузки 1С и учётных систем можно класть в одну и ту же папку с публичной ссылкой", "Первая строка файла — заголовки колонок"],
  },
  {
    kind: "amocrm", title: "amoCRM", group: "CRM и продажи", icon: "Handshake", color: "from-blue-500 to-indigo-600",
    desc: "Сделки с воронками, этапами, ответственными и доп. полями",
    fields: [
      { key: "subdomain", label: "Адрес аккаунта", placeholder: "mycompany (из mycompany.amocrm.ru)", required: true },
      { key: "token", label: "Долгосрочный токен", type: "password", required: true, hint: "Только чтение: мы ничего не меняем в CRM" },
    ],
    help: ["amoCRM → «amoМаркет» → «⋯» → «Создать интеграцию» → «Внешняя»", "Права: доступ к данным аккаунта", "Вкладка «Ключи и доступы» → «Сгенерировать долгосрочный токен»"],
  },
  {
    kind: "bitrix24", title: "Битрикс24", group: "CRM и продажи", icon: "Building", color: "from-cyan-500 to-sky-600",
    desc: "Сделки, лиды, контакты или компании с названиями стадий",
    fields: [
      { key: "webhook", label: "Адрес входящего вебхука", type: "password", placeholder: "https://ваш.bitrix24.ru/rest/1/abc123…/", required: true },
      { key: "entity", label: "Что загружать", type: "select", def: "deal", options: [["deal", "Сделки"], ["lead", "Лиды"], ["contact", "Контакты"], ["company", "Компании"]] },
    ],
    help: ["Битрикс24 → «Разработчикам» → «Другое» → «Входящий вебхук»", "Права: CRM (crm), только чтение достаточно", "Скопируйте «Вебхук для вызова rest api»"],
  },
  {
    kind: "moysklad", title: "МойСклад", group: "CRM и продажи", icon: "Package", color: "from-orange-500 to-amber-600",
    desc: "Отгрузки, заказы покупателей, остатки, товары, контрагенты",
    fields: [
      { key: "token", label: "Токен доступа", type: "password", required: true },
      { key: "report", label: "Что загружать", type: "select", def: "demand", options: [["demand", "Отгрузки"], ["customerorder", "Заказы покупателей"], ["stock", "Остатки по товарам"], ["product", "Товары"], ["counterparty", "Контрагенты"]] },
    ],
    help: ["МойСклад → «Настройки» → «Токены»", "Создайте токен для пользователя с правами на чтение нужных документов", "Суммы автоматически переводятся из копеек в рубли"],
  },
  {
    kind: "onec", title: "1С (OData)", group: "Учёт", icon: "Calculator", color: "from-yellow-500 to-amber-600",
    desc: "Документы, справочники и регистры 1С:Предприятие 8.3 через опубликованный OData",
    fields: [
      { key: "url", label: "Адрес OData", placeholder: "https://1c.company.ru/base/odata/standard.odata", required: true },
      { key: "entity", label: "Объект", placeholder: "Document_РеализацияТоваровУслуг", required: true, hint: "Например: Catalog_Номенклатура, AccumulationRegister_ТоварыНаСкладах_RecordType" },
      { key: "user", label: "Пользователь 1С", required: true },
      { key: "password", label: "Пароль", type: "password" },
      { key: "select", label: "Только поля (необязательно)", placeholder: "Date,Number,СуммаДокумента" },
      { key: "filter", label: "Фильтр OData (необязательно)", placeholder: "Date ge datetime'2026-01-01T00:00:00'" },
    ],
    help: ["Конфигуратор → «Администрирование» → «Публикация на веб-сервере» → включить «Публиковать стандартный интерфейс OData»", "В режиме предприятия: «Администрирование» → «Интерфейс OData» → отметить нужные объекты", "Заведите пользователя 1С только с правами на чтение. Сервер должен быть доступен из интернета по https"],
  },
  {
    kind: "postgres", title: "PostgreSQL", group: "Базы данных", icon: "Database", color: "from-indigo-500 to-violet-600",
    desc: "Любой SELECT-запрос к вашей базе — сайт, сервис, учётная система",
    fields: [
      { key: "host", label: "Хост", placeholder: "db.company.ru", required: true },
      { key: "port", label: "Порт", placeholder: "5432", def: "5432" },
      { key: "database", label: "База", required: true },
      { key: "user", label: "Пользователь", required: true },
      { key: "password", label: "Пароль", type: "password" },
      { key: "sslmode", label: "SSL", type: "select", def: "prefer", options: [["prefer", "По возможности"], ["require", "Обязательно"], ["disable", "Без SSL"]] },
      { key: "query", label: "SQL-запрос", type: "textarea", placeholder: "SELECT created_at, amount, status, channel FROM orders WHERE created_at > now() - interval '1 year'", required: true },
    ],
    help: ["Создайте пользователя только с правом SELECT", "Откройте доступ к базе с внешних адресов (pg_hba.conf, файрвол)", "Соединение работает в режиме «только чтение» — изменить данные невозможно"],
  },
  {
    kind: "mysql", title: "MySQL", group: "Базы данных", icon: "Database", color: "from-teal-500 to-cyan-600",
    desc: "SELECT-запрос к MySQL / MariaDB — интернет-магазины, Битрикс, WordPress",
    fields: [
      { key: "host", label: "Хост", required: true },
      { key: "port", label: "Порт", placeholder: "3306", def: "3306" },
      { key: "database", label: "База", required: true },
      { key: "user", label: "Пользователь", required: true },
      { key: "password", label: "Пароль", type: "password" },
      { key: "query", label: "SQL-запрос", type: "textarea", placeholder: "SELECT date, total, status FROM orders", required: true },
    ],
    help: ["Создайте пользователя с правом только SELECT", "Разрешите внешние подключения к базе", "Сессия открывается в режиме «только чтение»"],
  },
  {
    kind: "metrika", title: "Яндекс Метрика", group: "Маркетинг", icon: "BarChart3", color: "from-red-500 to-rose-600",
    desc: "Визиты, источники, UTM-метки, страницы входа, цели и конверсии по дням",
    fields: [
      { key: "counter", label: "Номер счётчика", placeholder: "12345678", required: true },
      { key: "token", label: "OAuth-токен", type: "password", required: true },
      { key: "report", label: "Отчёт", type: "select", def: "sources", options: [["sources", "Источники и UTM по дням"], ["pages", "Страницы входа по дням"], ["geo", "Города и устройства по дням"]] },
      { key: "goal", label: "ID цели (необязательно)", placeholder: "Например 123456789", hint: "Добавит достижения цели и конверсию" },
      { key: "days", label: "За сколько дней", type: "select", def: "90", options: [["30", "30 дней"], ["90", "90 дней"], ["180", "180 дней"], ["365", "Год"]] },
    ],
    help: ["Получите OAuth-токен с правом «Получение статистики» в oauth.yandex.ru", "Номер счётчика — в списке счётчиков metrika.yandex.ru", "ID цели — Метрика → Настройки → Цели"],
  },
  {
    kind: "zakupki", title: "Госзакупки (ЕИС)", group: "Тендеры", icon: "Landmark", color: "from-violet-500 to-fuchsia-600",
    desc: "Новые закупки 44-ФЗ и 223-ФЗ по вашим ключевым словам — с письмом о свежих лотах",
    fields: [
      { key: "keywords", label: "Ключевые слова и фразы", type: "textarea", required: true, placeholder: "разработке программного обеспечения\nинформационной системы\nсайта", hint: "Каждая фраза с новой строки, до 15. Ищем в названии закупки с учётом словоформ" },
      { key: "exclude", label: "Исключить, если в названии есть", placeholder: "охраны труда, бумаги", hint: "Через запятую — такие закупки не попадут в выгрузку и письмо" },
      { key: "law", label: "Закон", type: "select", def: "both", options: [["both", "44-ФЗ и 223-ФЗ"], ["44", "Только 44-ФЗ"], ["223", "Только 223-ФЗ"]] },
      { key: "price_from", label: "Цена от, ₽", placeholder: "300000" },
      { key: "price_to", label: "Цена до, ₽", placeholder: "10000000" },
      { key: "days", label: "Глубина поиска", type: "select", def: "2", options: [["1", "Сегодня"], ["2", "2 дня"], ["3", "3 дня"], ["7", "Неделя"], ["14", "2 недели"]], hint: "При ежедневной проверке хватит 2 дней — с запасом на выходные" },
      { key: "only_active", label: "Только с открытой подачей заявок", type: "select", def: "yes", options: [["yes", "Да"], ["no", "Все статусы"]] },
    ],
    help: ["Данные — с официального сайта zakupki.gov.ru, токены не нужны", "При каждой проверке на почту приходит письмо только о новых лотах, уже отправленные не повторяются", "Срок подачи заявок обычно 7–8 дней, поэтому лучше проверять ежедневно"],
  },
  {
    kind: "json_api", title: "Любой REST API", group: "Другое", icon: "Braces", color: "from-slate-500 to-zinc-600",
    desc: "Сервисы с JSON-API: Тильда, GetCourse, маркетплейсы, свои системы",
    fields: [
      { key: "url", label: "Адрес запроса (GET)", placeholder: "https://api.service.ru/v1/orders?limit=1000", required: true },
      { key: "header_name", label: "Заголовок авторизации", placeholder: "Authorization" },
      { key: "header_value", label: "Значение заголовка", type: "password", placeholder: "Bearer …" },
      { key: "path", label: "Путь к списку в ответе", placeholder: "data.items", hint: "Если ответ — сразу список, оставьте пустым" },
    ],
    help: ["Подойдёт любой адрес, который отдаёт JSON со списком записей", "Вложенные поля разворачиваются в колонки автоматически", "Нужен нестандартный API с постраничной загрузкой — настроим под ключ"],
  },
];

export const KIND: Record<Kind, KindInfo> = Object.fromEntries(KINDS.map(k => [k.kind, k])) as Record<Kind, KindInfo>;
export const GROUPS = Array.from(new Set(KINDS.map(k => k.group)));
