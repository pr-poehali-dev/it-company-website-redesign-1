import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL } from "./types";

const VACANCY_PRESETS = [
  // Маркетинг / реклама — признак потребности в автоматизации
  { label: "Таргетолог", query: "таргетолог", industry: "Рекламные агентства" },
  { label: "SEO-специалист", query: "SEO оптимизатор", industry: "Digital-агентства" },
  { label: "Маркетолог", query: "интернет-маркетолог", industry: "Маркетинговые агентства" },
  { label: "SMM", query: "SMM менеджер", industry: "SMM агентства" },
  // IT — кандидаты на аутсорс
  { label: "Разработчик", query: "программист разработчик", industry: "ИТ" },
  { label: "1С разработчик", query: "1С программист", industry: "ERP" },
  { label: "Аналитик данных", query: "аналитик данных BI", industry: "Аналитика" },
  { label: "DevOps", query: "DevOps инженер", industry: "Инфраструктура" },
  { label: "CRM менеджер", query: "CRM администратор", industry: "CRM" },
  { label: "Директор по ИТ", query: "CIO IT директор", industry: "Управление ИТ" },
];

const REGIONS_HH = [
  { label: "Вся Россия", value: "" },
  { label: "Москва", value: "Москва" },
  { label: "Санкт-Петербург", value: "Санкт-Петербург" },
  { label: "Екатеринбург", value: "Екатеринбург" },
  { label: "Новосибирск", value: "Новосибирск" },
  { label: "Казань", value: "Казань" },
  { label: "Нижний Новгород", value: "Нижний Новгород" },
  { label: "Самара", value: "Самара" },
  { label: "Краснодар", value: "Краснодар" },
  { label: "Ростов-на-Дону", value: "Ростов-на-Дону" },
  { label: "Уфа", value: "Уфа" },
  { label: "Челябинск", value: "Челябинск" },
  { label: "Пермь", value: "Пермь" },
];

interface Company {
  company_name: string;
  region: string;
  website: string;
  hh_url: string;
  vacancy_count: number;
  vacancy_titles: string[];
  description: string;
  industry: string;
  source: string;
  source_url: string;
  inn: string;
  ogrn: string;
  email: string;
  phone: string;
  address: string;
  revenue_range: string;
  employee_count: string;
  founded_year: null;
}

interface SearchResult {
  companies: Company[];
  total_vacancies: number;
  total_companies: number;
  query: string;
  region: string;
  error?: string;
}

interface Props {
  token: string;
}

export default function HHSearch({ token }: Props) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllCount, setSaveAllCount] = useState<number | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setSavedIds(new Set());
    setSaveAllCount(null);
    try {
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "hh_search", vacancy_query: query.trim(), region }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ companies: [], total_vacancies: 0, total_companies: 0, query, region, error: "Ошибка запроса" });
    } finally {
      setLoading(false);
    }
  }

  async function saveCompany(company: Company): Promise<boolean> {
    const res = await fetch(PROSPECTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({
        action: "create",
        company_name: company.company_name,
        region: company.region,
        website: company.website,
        industry: company.industry,
        description: company.description,
        source: "HH.ru",
        source_url: company.hh_url,
        status: "new",
        priority: company.vacancy_count >= 3 ? "high" : "medium",
        note: `Ищут на HH: ${company.vacancy_titles.join(", ")}. Вакансий: ${company.vacancy_count}`,
      }),
    });
    return res.ok;
  }

  async function handleSaveOne(company: Company) {
    const key = company.company_name;
    setSavedIds(prev => new Set(prev).add(key + "_loading"));
    const ok = await saveCompany(company);
    setSavedIds(prev => { const s = new Set(prev); s.delete(key + "_loading"); if (ok) s.add(key); return s; });
  }

  async function handleSaveAll() {
    if (!result?.companies.length) return;
    setSavingAll(true);
    setSaveAllCount(null);
    let count = 0;
    for (const company of result.companies) {
      const key = company.company_name;
      if (savedIds.has(key)) continue;
      const ok = await saveCompany(company);
      if (ok) { count++; setSavedIds(prev => new Set(prev).add(key)); }
    }
    setSaveAllCount(count);
    setSavingAll(false);
  }

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon name="Briefcase" size={20} className="text-red-400" />
          Поиск клиентов по отрасли
        </h2>
        <p className="text-sm text-white/50 mt-1">
          Ищем компании по отрасли / роли через ЕГРЮЛ и госзакупки → готовые лиды с ИНН и регионом
        </p>
      </div>

      {/* Форма */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        {/* Быстрые пресеты */}
        <div>
          <p className="text-xs text-white/40 mb-2">Популярные запросы:</p>
          <div className="flex flex-wrap gap-1.5">
            {VACANCY_PRESETS.map(p => (
              <button key={p.query} onClick={() => setQuery(p.query)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                  query === p.query
                    ? "bg-red-500/30 border-red-500/50 text-red-300"
                    : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Запрос */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Вакансия / запрос *</label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Например: маркетолог, 1С, CRM..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
            />
          </div>
          {/* Регион */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Регион</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-white border border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-500"
            >
              {REGIONS_HH.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 disabled:text-white/30 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
        >
          {loading
            ? <><Icon name="Loader2" size={16} className="animate-spin" />Ищу компании на HH.ru...</>
            : <><Icon name="Search" size={16} />Найти компании</>}
        </button>
      </div>

      {/* Результаты */}
      {result && !result.error && (
        <div className="space-y-4">
          {/* Шапка */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-white/60">
              По запросу <span className="text-white font-medium">«{result.query}»</span>
              {result.region && <> в <span className="text-white font-medium">{result.region}</span></>}
              {" — "}<span className="text-white font-medium">{result.total_companies}</span> компаний,{" "}
              <span className="text-white font-medium">{result.total_vacancies}</span> вакансий
            </div>
            <button
              onClick={handleSaveAll}
              disabled={savingAll || result.companies.every(c => savedIds.has(c.company_name))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
            >
              {savingAll
                ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняю...</>
                : <><Icon name="DatabaseZap" size={14} />Сохранить все в CRM</>}
            </button>
            {saveAllCount !== null && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Icon name="CheckCircle" size={13} />Добавлено {saveAllCount} компаний
              </span>
            )}
          </div>

          {/* Список компаний */}
          <div className="space-y-2">
            {result.companies.map((company, i) => {
              const key = company.company_name;
              const isSaved = savedIds.has(key);
              const isSaving = savedIds.has(key + "_loading");
              return (
                <div key={i} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Название + кол-во вакансий */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-white text-sm">{company.company_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          company.vacancy_count >= 3
                            ? "bg-red-500/20 text-red-300"
                            : "bg-white/10 text-white/50"
                        }`}>
                          {company.vacancy_count} {company.vacancy_count === 1 ? "вакансия" : "вакансий"}
                        </span>
                      </div>

                      {/* Регион и сайт */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {company.region && (
                          <span className="text-xs text-white/50 flex items-center gap-1">
                            <Icon name="MapPin" size={11} />{company.region}
                          </span>
                        )}
                        {company.website && (
                          <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <Icon name="Globe" size={11} />Сайт
                          </a>
                        )}
                        <a href={company.hh_url} target="_blank" rel="noreferrer"
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                          <Icon name="ExternalLink" size={11} />HH.ru
                        </a>
                      </div>

                      {/* Вакансии */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {company.vacancy_titles.map((t, j) => (
                          <span key={j} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/60 rounded text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Кнопка В CRM */}
                    <button
                      onClick={() => handleSaveOne(company)}
                      disabled={isSaved || isSaving}
                      className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                        isSaved
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                          : "border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5"
                      }`}
                    >
                      {isSaving
                        ? <><Icon name="Loader2" size={11} className="animate-spin" />...</>
                        : isSaved
                        ? <><Icon name="CheckCircle" size={11} />В CRM</>
                        : <><Icon name="Plus" size={11} />В CRM</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300 flex items-center gap-2">
          <Icon name="AlertCircle" size={16} />{result.error}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-white/25 text-sm">
          <Icon name="Briefcase" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Введите тип вакансии и нажмите «Найти»</p>
          <p className="text-xs mt-1">Компании которые нанимают — ваши потенциальные клиенты.<br/>
          Если ищут маркетолога — им нужна автоматизация маркетинга.</p>
        </div>
      )}
    </div>
  );
}