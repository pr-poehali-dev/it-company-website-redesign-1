import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PROSPECTS_URL } from "./types";
import { TechSignal, RadarResult } from "./TechRadarTypes";
import TechRadarForm from "./TechRadarForm";
import TechRadarResults from "./TechRadarResults";

interface Props {
  token: string;
}

export default function TechRadar({ token }: Props) {
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RadarResult | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterPotential, setFilterPotential] = useState<string>("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllCount, setSaveAllCount] = useState<number | null>(null);

  async function saveSignalToCrm(signal: TechSignal): Promise<boolean> {
    const res = await fetch(PROSPECTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({
        action: "create",
        company_name: signal.company_name,
        inn: signal.inn || "",
        region: signal.region || "",
        industry: signal.industry || "",
        description: signal.signal || "",
        website: signal.website || "",
        source: "Технологический радар",
        source_url: "",
        status: "new",
        priority: signal.potential === "high" ? "high" : signal.potential === "medium" ? "medium" : "low",
        note: `Технологии: ${signal.tech_tags.join(", ")}. Источник: ${signal.source || "Радар"}`,
      }),
    });
    return res.ok;
  }

  async function handleAddToCrm(signal: TechSignal, key: string) {
    setSavedIds(prev => new Set(prev).add(key + "_loading"));
    await saveSignalToCrm(signal);
    setSavedIds(prev => { const s = new Set(prev); s.delete(key + "_loading"); s.add(key); return s; });
  }

  async function handleSaveAllToCrm() {
    if (!result?.tech_signals.length) return;
    setSavingAll(true);
    setSaveAllCount(null);
    let count = 0;
    for (const signal of result.tech_signals) {
      const key = signal.company_name + signal.inn;
      if (savedIds.has(key)) continue;
      const ok = await saveSignalToCrm(signal);
      if (ok) { count++; setSavedIds(prev => new Set(prev).add(key)); }
    }
    setSaveAllCount(count);
    setSavingAll(false);
  }

  async function runRadar() {
    if (!region.trim()) return;
    setLoading(true);
    setResult(null);
    setFilterTag("");
    setFilterPotential("");
    setSavedIds(new Set());
    setSaveAllCount(null);
    try {
      const res = await fetch(PROSPECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "radar",
          region: region.trim(),
          industry: industry === "Все отрасли" ? "" : industry,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ region, industry_filter: industry, summary: "", tech_signals: [], hot_industries: [], regional_trends: [], error: "Ошибка запроса" });
    } finally {
      setLoading(false);
    }
  }

  const allTags = result
    ? Array.from(new Set(result.tech_signals.flatMap(s => s.tech_tags)))
    : [];

  const filtered = result?.tech_signals.filter(s => {
    if (filterTag && !s.tech_tags.includes(filterTag)) return false;
    if (filterPotential && s.potential !== filterPotential) return false;
    return true;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon name="Radar" size={20} className="text-violet-400" />
          Технологический радар
        </h2>
        <p className="text-sm text-white/50 mt-1">
          ИИ-анализ регионов: выявление компаний, активно внедряющих новые технологии
        </p>
      </div>

      <TechRadarForm
        region={region}
        industry={industry}
        loading={loading}
        onRegionChange={setRegion}
        onIndustryChange={setIndustry}
        onSubmit={runRadar}
      />

      {result && !result.error && (
        <TechRadarResults
          result={result}
          allTags={allTags}
          filtered={filtered}
          filterTag={filterTag}
          filterPotential={filterPotential}
          savedIds={savedIds}
          savingAll={savingAll}
          saveAllCount={saveAllCount}
          onFilterTag={tag => setFilterTag(filterTag === tag ? "" : tag)}
          onFilterPotential={p => setFilterPotential(filterPotential === p ? "" : p)}
          onAddToCrm={handleAddToCrm}
          onSaveAll={handleSaveAllToCrm}
        />
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300 flex items-center gap-2">
          <Icon name="AlertCircle" size={16} />
          {result.error}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-white/25 text-sm">
          <Icon name="Radar" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Выберите регион и запустите радар</p>
          <p className="text-xs mt-1">ИИ проанализирует открытые источники и найдёт компании,<br/>активно внедряющие технологии</p>
        </div>
      )}
    </div>
  );
}
