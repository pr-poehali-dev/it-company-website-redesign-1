import { useState } from "react";
import Icon from "@/components/ui/icon";

type Priority = "high" | "medium" | "low";

interface Step {
  title: string;
  desc: string;
  actions: string[];
  metric: string;
  priority: Priority;
}

interface Phase {
  period: string;
  goal: string;
  steps: Step[];
}

const PHASES: Phase[] = [
  {
    period: "Неделя 1–2 · Быстрый старт",
    goal: "Получить первые 3–5 живых диалогов с потенциальными клиентами",
    steps: [
      {
        title: "Проработать тёплый круг",
        desc: "Самые быстрые продажи — через личные связи и знакомых предпринимателей.",
        actions: [
          "Составить список 30–50 знакомых с бизнесом (чаты, контакты, бывшие коллеги)",
          "Написать каждому короткое персональное сообщение с оффером",
          "Предложить бесплатный аудит бизнес-процессов или разбор задачи",
        ],
        metric: "Цель: 30 сообщений → 5 диалогов → 1 встреча",
        priority: "high",
      },
      {
        title: "Упаковать одно конкретное предложение",
        desc: "«Всё для всех» не продаётся. Нужен один понятный оффер с ценой и сроком.",
        actions: [
          "Выбрать флагман: AI-автоматизация заявок за 7–14 дней от 30 000 ₽",
          "Сформулировать результат в деньгах клиента (экономия / рост заявок)",
          "Подготовить 2–3 мини-кейса или расчёт эффекта на цифрах",
        ],
        metric: "Цель: 1 готовый оффер на 1 странице",
        priority: "high",
      },
      {
        title: "Запустить прямой аутрич",
        desc: "Холодные, но точечные обращения к бизнесам, которым нужна автоматизация.",
        actions: [
          "Собрать 50 компаний из ниши (сфера услуг, интернет-магазины, клиники)",
          "Найти контакты ЛПР (сайт, 2ГИС, соцсети, Telegram)",
          "Отправить персональные письма/сообщения с оффером и вопросом",
        ],
        metric: "Цель: 50 контактов → 10 ответов → 3 диалога",
        priority: "high",
      },
    ],
  },
  {
    period: "Неделя 3–6 · Каналы привлечения",
    goal: "Построить 2–3 стабильных источника заявок",
    steps: [
      {
        title: "Тендеры и госзакупки",
        desc: "У вас уже есть модуль поиска тендеров в админке — это готовый поток заказов.",
        actions: [
          "Ежедневно проверять раздел «Тендеры» в админке",
          "Откликаться на 3–5 подходящих закупок в неделю",
          "Зарегистрироваться на zakupki.gov.ru и B2B-площадках",
        ],
        metric: "Цель: 15–20 откликов → 2–3 заявки на КП",
        priority: "high",
      },
      {
        title: "Контент и SEO",
        desc: "Блог и услуги уже настроены под SEO. Нужен регулярный полезный контент.",
        actions: [
          "Публиковать 1–2 статьи в неделю под запросы клиентов",
          "Темы: «сколько стоит автоматизация», «AI для малого бизнеса»",
          "Добавить призыв на бесплатный разбор в каждую статью",
        ],
        metric: "Цель: рост органического трафика, 1–2 заявки/мес с блога",
        priority: "medium",
      },
      {
        title: "Партнёрская сеть",
        desc: "Быстрее всего продавать через тех, у кого уже есть ваши клиенты.",
        actions: [
          "Договориться с веб-студиями и маркетологами о реферальных 10–15%",
          "Предложить бухгалтерским и юридическим фирмам совместные услуги",
          "Разместиться в каталогах IT-подрядчиков и на Хабр Карьере",
        ],
        metric: "Цель: 3–5 партнёров-рекомендателей",
        priority: "medium",
      },
      {
        title: "Платный трафик (тест)",
        desc: "Небольшой бюджет на проверку спроса через Яндекс.Директ.",
        actions: [
          "Запустить кампанию на 1 услугу-флагман, бюджет 15–20 тыс/мес",
          "Вести на страницу услуги или AI-консультанта",
          "Считать стоимость заявки, отключать неэффективное",
        ],
        metric: "Цель: понять цену заявки, найти рабочую связку",
        priority: "low",
      },
    ],
  },
  {
    period: "Месяц 2–3 · Система и деньги на развитие",
    goal: "Стабильные 3–5 заявок в неделю + грантовое финансирование",
    steps: [
      {
        title: "Отладить воронку продаж",
        desc: "Использовать разделы «Заявки», «Диалоги» и «Воронка» в админке.",
        actions: [
          "Каждую заявку заносить и вести по этапам до сделки",
          "Перезванивать по заявке в течение 15 минут",
          "Анализировать, на каком этапе теряются клиенты",
        ],
        metric: "Цель: конверсия из заявки в договор ≥ 20%",
        priority: "high",
      },
      {
        title: "Собрать первые кейсы и отзывы",
        desc: "Даже 1–2 успешных проекта резко повышают доверие и конверсию.",
        actions: [
          "После каждого проекта — оформить кейс с цифрами результата",
          "Просить видео- или текстовый отзыв клиента",
          "Разместить кейсы на сайте и в соцсетях",
        ],
        metric: "Цель: 2–3 кейса на сайте",
        priority: "medium",
      },
      {
        title: "Подать заявки на гранты",
        desc: "Гранты дают деньги на развитие без возврата. Список — ниже.",
        actions: [
          "Выбрать 1–2 подходящие программы из списка грантов ниже",
          "Использовать AI-помощника в разделе «Гранты» для подготовки заявки",
          "Подготовить описание проекта и подать до дедлайна",
        ],
        metric: "Цель: 1–2 поданные заявки",
        priority: "medium",
      },
    ],
  },
];

interface GrantItem {
  name: string;
  org: string;
  amount: string;
  fit: string;
  note: string;
}

const GRANTS: GrantItem[] = [
  {
    name: "Грант «Старт» (очереди СТАРТ-1, СТАРТ-2)",
    org: "Фонд содействия инновациям (ФСИ)",
    amount: "до 4–8 млн ₽",
    fit: "Высокое совпадение",
    note: "Для малых инновационных IT-компаний на разработку продукта. Ваши AI/ML-решения подходят напрямую. Приём заявок — несколько очередей в год.",
  },
  {
    name: "Поддержка разработчиков ИИ",
    org: "Фонд содействия инновациям / Минцифры",
    amount: "до 20–50 млн ₽",
    fit: "Высокое совпадение",
    note: "Целевые программы под проекты искусственного интеллекта. Требуется собственный ИИ-продукт или платформа.",
  },
  {
    name: "Гранты на внедрение российского ПО",
    org: "РФРИТ (Российский фонд развития ИТ)",
    amount: "до 50% стоимости проекта",
    fit: "Среднее совпадение",
    note: "Софинансирование внедрения отечественных цифровых решений. Можно участвовать как разработчик-исполнитель.",
  },
  {
    name: "Гранты для стартапов от «Сколково»",
    org: "Фонд «Сколково»",
    amount: "до 5–30 млн ₽",
    fit: "Среднее совпадение",
    note: "Нужен статус резидента Сколково. Даёт налоговые льготы + доступ к грантам и инвесторам. Стоит рассмотреть при масштабировании.",
  },
  {
    name: "Программа «Студенческий стартап» / молодёжные гранты",
    org: "Фонд содействия инновациям",
    amount: "1 млн ₽",
    fit: "Если есть молодая команда",
    note: "Если в команде есть студенты/молодые основатели — быстрый способ получить первое финансирование.",
  },
  {
    name: "Региональные IT-гранты и субсидии",
    org: "Региональные фонды и центры «Мой бизнес»",
    amount: "от 100 тыс до 2 млн ₽",
    fit: "Зависит от региона",
    note: "У многих регионов есть свои программы поддержки IT и субсидии на продвижение. Уточнить в местном центре «Мой бизнес».",
  },
];

const fitColor: Record<string, string> = {
  "Высокое совпадение": "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  "Среднее совпадение": "text-amber-300 border-amber-500/30 bg-amber-500/10",
};

const prioBadge: Record<Priority, { label: string; cls: string }> = {
  high: { label: "Сделать в первую очередь", cls: "text-red-300 border-red-500/30 bg-red-500/10" },
  medium: { label: "Важно", cls: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  low: { label: "Когда дойдут руки", cls: "text-white/50 border-white/15 bg-white/5" },
};

export default function SalesPlan() {
  const [tab, setTab] = useState<"plan" | "grants">("plan");

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-oswald text-2xl font-bold gradient-text mb-1">
          План привлечения клиентов
        </h1>
        <p className="text-white/50 text-sm">
          Пошаговый план на ближайшие 3 месяца, чтобы получить первые продажи, и подборка грантов на развитие.
        </p>
      </div>

      <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("plan")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "plan" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <Icon name="ListChecks" size={14} />
          План действий
        </button>
        <button
          onClick={() => setTab("grants")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "grants" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <Icon name="Award" size={14} />
          Гранты и конкурсы
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">{GRANTS.length}</span>
        </button>
      </div>

      {tab === "plan" && (
        <div className="space-y-8">
          <div className="glass border border-violet-500/20 rounded-2xl p-5 flex gap-4">
            <Icon name="Rocket" size={22} className="text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">Главный принцип: скорость важнее идеальности</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Продажи с марта не пошли, потому что клиенты не приходят сами — их нужно активно искать.
                Первые 2 недели сфокусируйтесь на прямых диалогах: тёплый круг, аутрич, тендеры.
                Одна встреча в день важнее любых доработок сайта.
              </p>
            </div>
          </div>

          {PHASES.map((phase, i) => (
            <div key={i}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center flex-shrink-0">
                  <span className="font-oswald font-bold text-sm text-white">{i + 1}</span>
                </div>
                <div>
                  <h2 className="font-oswald font-bold text-lg text-white">{phase.period}</h2>
                  <p className="text-white/50 text-sm">{phase.goal}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {phase.steps.map((step, j) => (
                  <div key={j} className="glass border border-white/10 rounded-2xl p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white">{step.title}</h3>
                      <span className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full border ${prioBadge[step.priority].cls}`}>
                        {prioBadge[step.priority].label}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm mb-3">{step.desc}</p>
                    <ul className="space-y-2 mb-4 flex-1">
                      {step.actions.map((a, k) => (
                        <li key={k} className="flex gap-2 text-sm text-white/70">
                          <Icon name="Check" size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                      <Icon name="Target" size={13} className="flex-shrink-0" />
                      <span>{step.metric}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "grants" && (
        <div className="space-y-4">
          <div className="glass border border-amber-500/20 rounded-2xl p-5 flex gap-4">
            <Icon name="Info" size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-white/60 text-sm leading-relaxed">
              Ниже — программы, подходящие под ваш профиль (IT-разработка, AI/ML). Суммы и сроки приёма
              заявок меняются — проверяйте актуальные условия на сайтах фондов. Готовить заявки удобно
              через AI-помощника в разделе <span className="text-white">«Гранты»</span>.
            </p>
          </div>

          {GRANTS.map((g, i) => (
            <div key={i} className="glass border border-white/10 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-white text-lg">{g.name}</h3>
                  <p className="text-white/50 text-sm flex items-center gap-1.5 mt-0.5">
                    <Icon name="Building2" size={13} />
                    {g.org}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${fitColor[g.fit] ?? "text-white/50 border-white/15 bg-white/5"}`}>
                  {g.fit}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-sm mb-3">
                <Icon name="Banknote" size={16} />
                {g.amount}
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{g.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
