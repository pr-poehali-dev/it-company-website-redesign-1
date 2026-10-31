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
  {"id": "2026-11", "dir": "n01", "file": "masshtab-n01-noyabr-2026", "number": 1, "month": "ноябрь 2026", "title": "Масштаб № 1, ноябрь 2026", "pages": 52, "toc": [{"page": 4, "rubric": "Индикаторы рынка", "title": "Индикаторы рынка. Октябрь 2026: ставка 14% надолго, рубль крепче, инфляция 7,1%"}, {"page": 7, "rubric": "Регуляторный дайджест", "title": "Регуляторный дайджест. Налоги 2027–2029: что поменяется для собственников, продавцов на маркетплейсах и всех компаний"}, {"page": 12, "rubric": "Разбор", "title": "«Масштаб-500»: кто вырос в 15 раз за три года и почему темп падает"}, {"page": 15, "rubric": "Рейтинг", "title": "«Масштаб-500»: первые 50 компаний"}, {"page": 17, "rubric": "Индикаторы рынка", "title": "Средний бизнес в 2025 году: выручка встала, почти половина компаний ушла в минус"}, {"page": 19, "rubric": "Индикаторы рынка", "title": "Госзакупки в октябре 2026: 256 тысяч закупок на 2 трлн ₽ и сезон закрытия бюджетов"}, {"page": 24, "rubric": "Финансы для нефинансистов", "title": "Выработка и маржа: два числа, по которым видно, здоров ли бизнес — и нормы для 13 отраслей"}, {"page": 27, "rubric": "Экономика проекта", "title": "Реклама кофейни за 60 000 ₽ в месяц: клиенты шли, а бизнес терял 790 ₽ на каждом"}, {"page": 29, "rubric": "Люди и роли", "title": "Подрядчик за 80 000 ₽ сделал «не то»: где теряются деньги при найме исполнителя"}, {"page": 31, "rubric": "Регуляторный дайджест", "title": "Одна жалоба уволенного сотрудника — 340 000 ₽ штрафов: что трудовая инспекция проверяет на самом деле"}, {"page": 33, "rubric": "Инструменты", "title": "Отчёт из 1С и CRM за 10 минут: пошаговая настройка без Excel"}, {"page": 36, "rubric": "Обучение руководителей", "title": "Директор продавал сам и не успевал руководить: как мебельная фабрика передала продажи и выросла на 18%"}, {"page": 39, "rubric": "Недвижимость", "title": "Аренда или покупка офиса при ставке 14%: как посчитать, что выгоднее вашей компании"}, {"page": 41, "rubric": "Автомобили", "title": "Автомобиль для компании: купить, взять в лизинг или платить сотруднику за личный"}, {"page": 43, "rubric": "Инвестиции", "title": "Куда предпринимателю положить свободные деньги: подушка, вклады, облигации и доля в бизнесе"}, {"page": 45, "rubric": "Отдых", "title": "Отпуск собственника: как отдохнуть так, чтобы бизнес не просел, а вы действительно восстановились"}, {"page": 47, "rubric": "Путешествия", "title": "Поездка на отраслевую выставку: как подготовиться, чтобы командировка окупилась"}, {"page": 49, "rubric": "Хобби", "title": "Хобби, которое стало делом: когда увлечение можно превратить в бизнес, а когда лучше оставить для души"}], "printMb": 4.1, "readMb": 4.1},
];

export const DEADLINE_DAY = 25;
export const PRINT_NOTE = "Журнал выходит в электронном виде (PDF). Бумажный тираж — не раньше февраля 2027 года, решение пока не принято.";

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export function nextIssue(today: { y: number; m: number; d: number }) {
  const last = ISSUES[0];
  const [ly, lm] = last ? last.id.split("-").map(Number) : [today.y, today.m];
  const lastIdx = ly * 12 + (lm - 1);
  const nowIdx = today.y * 12 + (today.m - 1) + (today.d > DEADLINE_DAY ? 1 : 0);
  const idx = Math.max(lastIdx + 1, nowIdx + 1);
  const dIdx = idx - 1;
  return {
    number: (last?.number ?? 0) + 1,
    month: `${MONTHS[idx % 12]} ${Math.floor(idx / 12)}`,
    deadline: `${DEADLINE_DAY} ${MONTHS_GEN[dIdx % 12]} ${Math.floor(dIdx / 12)}`,
  };
}

export const issueBase = (i: PrintIssue) => `/masshtab-print/${i.dir}`;
export const issuePage = (i: PrintIssue, n: number) => `${issueBase(i)}/p/${String(n).padStart(3, "0")}.webp`;
export const issueThumb = (i: PrintIssue, n: number) => `${issueBase(i)}/t/${String(n).padStart(3, "0")}.webp`;
export const issuePdf = (i: PrintIssue, print = false) => `${issueBase(i)}/${i.file}${print ? "-print" : ""}.pdf`;
export const issueCover = (i: PrintIssue) => `${issueBase(i)}/cover.jpg`;
