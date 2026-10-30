export interface PrintIssue {
  id: string;
  dir: string;
  file: string;
  number: number;
  month: string;
  title: string;
  pages: number;
  toc: { page: number; rubric: string; title: string }[];
  printMb: number;
  readMb: number;
}

export const ISSUES: PrintIssue[] = [
  {"id": "2026-11", "dir": "n01", "file": "masshtab-n01-noyabr-2026", "number": 1, "month": "ноябрь 2026", "title": "Масштаб № 1, ноябрь 2026", "pages": 52, "toc": [{"page": 4, "rubric": "Индикаторы рынка", "title": "Индикаторы рынка. Октябрь 2026: ставка 14% надолго, рубль крепче, инфляция 7,1%"}, {"page": 7, "rubric": "Регуляторный дайджест", "title": "Регуляторный дайджест. Налоги 2027–2029: что поменяется для собственников, продавцов на маркетплейсах и всех компаний"}, {"page": 11, "rubric": "Разбор", "title": "«Масштаб-500»: кто вырос в 15 раз за три года и почему темп падает"}, {"page": 14, "rubric": "Рейтинг", "title": "«Масштаб-500»: первые 50 компаний"}, {"page": 16, "rubric": "Индикаторы рынка", "title": "Средний бизнес в 2025 году: выручка встала, почти половина компаний ушла в минус"}, {"page": 19, "rubric": "Индикаторы рынка", "title": "Госзакупки в октябре 2026: 256 тысяч закупок на 2 трлн ₽ и сезон закрытия бюджетов"}, {"page": 24, "rubric": "Разбор", "title": "Агробизнес на субсидиях: 120 млрд ₽ и почему среднему фермеру достаётся всё меньше"}, {"page": 29, "rubric": "Карта трендов", "title": "Гранты технологическому бизнесу: поток денег сжался втрое — кто ещё даёт и кому"}, {"page": 34, "rubric": "Финансы для нефинансистов", "title": "Выработка и маржа: два числа, по которым видно, здоров ли бизнес — и нормы для 13 отраслей"}, {"page": 37, "rubric": "Финансы для нефинансистов", "title": "Фонд оплаты труда для нового проекта: как посчитать команду по рынку, а не «на глаз»"}, {"page": 40, "rubric": "Экономика проекта", "title": "Реклама кофейни за 60 000 ₽ в месяц: клиенты шли, а бизнес терял 790 ₽ на каждом"}, {"page": 42, "rubric": "Люди и роли", "title": "Подрядчик за 80 000 ₽ сделал «не то»: где теряются деньги при найме исполнителя"}, {"page": 44, "rubric": "Регуляторный дайджест", "title": "Одна жалоба уволенного сотрудника — 340 000 ₽ штрафов: что трудовая инспекция проверяет на самом деле"}, {"page": 46, "rubric": "Инструменты", "title": "Отчёт из 1С и CRM за 10 минут: пошаговая настройка без Excel"}], "printMb": 2.7, "readMb": 2.7},
];

export const issueBase = (i: PrintIssue) => `/masshtab-print/${i.dir}`;
export const issuePage = (i: PrintIssue, n: number) => `${issueBase(i)}/p/${String(n).padStart(3, "0")}.webp`;
export const issueThumb = (i: PrintIssue, n: number) => `${issueBase(i)}/t/${String(n).padStart(3, "0")}.webp`;
export const issuePdf = (i: PrintIssue, print = false) => `${issueBase(i)}/${i.file}${print ? "-print" : ""}.pdf`;
export const issueCover = (i: PrintIssue) => `${issueBase(i)}/cover.jpg`;
