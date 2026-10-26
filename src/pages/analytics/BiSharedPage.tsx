import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import DashboardView from "@/components/bi/DashboardView";
import { useRows } from "@/components/bi/useRows";
import { Dashboard, exportCsv } from "@/components/bi/biEngine";
import { ShareMeta, loadShare, ownedShares } from "@/components/bi/shareApi";

const STORE = "matlabs_bi_v1";
const STORE_SHARE = "matlabs_bi_current_share";

export default function BiSharedPage() {
  const { id = "" } = useParams();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const rows = useRows(dash);
  const own = ownedShares().find(s => s.id === id);

  useEffect(() => {
    setLoading(true);
    loadShare(id).then(r => {
      if ("error" in r) setError(r.error);
      else { setDash({ ...r.dash, filters: [] }); setMeta(r.meta); }
    }).catch(() => setError("Не удалось загрузить дашборд")).finally(() => setLoading(false));
  }, [id]);

  const copyToMine = () => {
    if (!dash) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(dash));
      if (own) localStorage.setItem(STORE_SHARE, own.id); else localStorage.removeItem(STORE_SHARE);
    } catch { /* большой дашборд */ }
    window.location.href = "/analytics/bi";
  };

  const download = () => {
    if (!dash) return;
    const url = URL.createObjectURL(exportCsv(dash.dataset, rows));
    const a = document.createElement("a");
    a.href = url; a.download = `${dash.dataset.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const title = dash?.dataset.name || "Дашборд";
  const updated = meta ? new Date(meta.updated_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <BizShell title={`${title} — дашборд | Облачный BI МАТ-Лабс`} description="Интерактивный дашборд, опубликованный в облачном BI МАТ-Лабс." noindex
      path={`/analytics/bi/s/${id}`} crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Облачный BI", href: "/analytics/bi" }, { label: title }]}>
      {loading && <div className="space-y-4"><div className="h-16 rounded-2xl bg-white/5 animate-pulse" /><div className="grid md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}</div><div className="h-72 rounded-2xl bg-white/5 animate-pulse" /></div>}

      {!loading && error && (
        <Card>
          <div className="text-center py-12">
            <Icon name="Unlink" size={32} className="mx-auto text-white/30 mb-3" />
            <div className="text-white font-semibold text-lg mb-1">{error}</div>
            <p className="text-white/55 text-sm mb-5">Попросите автора прислать новую ссылку или соберите свой дашборд за минуту.</p>
            <Link to="/analytics/bi" className="inline-flex px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold">Открыть облачный BI</Link>
          </div>
        </Card>
      )}

      {!loading && dash && meta && (
        <div className="space-y-5">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="font-['Oswald',sans-serif] text-2xl md:text-3xl font-bold">{title}</h1>
              <div className="text-sm text-white/50 flex flex-wrap gap-x-3">
                {meta.author && <span>Автор: {meta.author}</span>}
                <span>Обновлён {updated}</span>
                <span>{rows.length.toLocaleString("ru-RU")} из {dash.dataset.rows.length.toLocaleString("ru-RU")} строк</span>
                <span className="flex items-center gap-1"><Icon name="Eye" size={13} />{meta.views}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {own && <span className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-200 flex items-center gap-1.5"><Icon name="CheckCircle2" size={15} />Это ваш дашборд</span>}
              <button onClick={copyToMine} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white flex items-center gap-1.5">
                <Icon name={own ? "Pencil" : "Copy"} size={15} />{own ? "Редактировать" : "Сделать копию"}
              </button>
              <button onClick={download} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Download" size={15} />CSV</button>
              <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/75 flex items-center gap-1.5"><Icon name="Printer" size={15} />PDF</button>
            </div>
          </header>

          <DashboardView dash={dash} setDash={fn => setDash(d => (d ? fn(d) : d))} readOnly />

          <div className="bg-gradient-to-br from-violet-600/20 to-cyan-600/10 border border-violet-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-white flex items-center gap-2"><Icon name="LayoutDashboard" size={17} className="text-violet-300" />Такой же дашборд — из вашего Excel за минуту</div>
              <p className="text-sm text-white/60 mt-1">Бесплатно, без регистрации. А с автообновлением из 1С и CRM — под ключ от 60 000 ₽.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/analytics/bi" className="px-5 py-2.5 rounded-xl bg-white text-[#10101c] font-semibold text-sm">Попробовать</Link>
              <Link to="/analytics/services/dashboards" className="px-5 py-2.5 rounded-xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10">BI под ключ</Link>
            </div>
          </div>
        </div>
      )}
    </BizShell>
  );
}
