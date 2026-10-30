import { useState } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../../../../backend/func2url.json";
import type { NightState } from "./api";

const URL_BASE = (func2url as Record<string, string>)["advertisers"];

interface Props { night?: NightState; cronReady: boolean; queue: number }

function ago(iso: string | null) {
  if (!iso) return "";
  const d = Math.max(0, Math.round((new Date().getTime() - Date.parse(iso)) / 60000));
  if (d < 60) return `${d} мин назад`;
  if (d < 1440) return `${Math.round(d / 60)} ч назад`;
  return `${Math.round(d / 1440)} дн назад`;
}

export default function NightPanel({ night, cronReady, queue }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const st = night?.night;
  const active = !!night?.last_run && Date.parse(night.last_run) > new Date().getTime() - 36 * 3600 * 1000;
  const link = `${URL_BASE}/?action=night&key=ВАШ_CRON_SECRET`;

  function copy() {
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined);
  }

  return (
    <div className="glass border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="Moon" size={16} className="text-violet-300" />
          <span className="text-white font-semibold">Ночной поиск контактов</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>
            {active ? "работает" : "не запускался"}
          </span>
        </div>
        <button onClick={() => setOpen(v => !v)} className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
          <Icon name="Settings2" size={13} fallback="Settings" />{open ? "Скрыть настройку" : "Как включить"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
        {([
          ["Последний запуск", night?.last_run ? ago(night.last_run) : "—"],
          ["Проверено за ночь", st ? st.processed : 0],
          ["Найдено почт", st ? st.email : 0],
          ["Найдено телефонов", st ? st.phone : 0],
          ["Осталось в очереди", queue],
        ] as [string, string | number][]).map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white/5 p-3">
            <div className="text-[11px] text-white/40">{l}</div>
            <div className="text-white font-bold mt-0.5">{typeof v === "number" ? v.toLocaleString("ru-RU") : v}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/50">
        С 00:00 до 07:00 по Москве база проверяется пачками по 8 компаний: реестр юрлиц → официальный сайт → почта и телефоны.
        Найденное сразу появляется в таблице ниже. Днём поиск не работает, чтобы не мешать вашей работе в админке.
      </p>

      {open && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm text-white/75">
          {!cronReady && <div className="text-amber-200 text-xs">Не задан секрет CRON_SECRET — добавьте его в настройках проекта.</div>}
          <div className="font-semibold text-white">Подключение на cron-job.org (бесплатно, 3 минуты)</div>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Зарегистрируйтесь на cron-job.org и нажмите «Create cronjob».</li>
            <li>В поле URL вставьте ссылку ниже, заменив ВАШ_CRON_SECRET на значение секрета CRON_SECRET из настроек проекта.</li>
            <li>Расписание: «Custom» → минуты: каждые 2 (*/2), часы: 0–6, часовой пояс Europe/Moscow. Так поиск идёт только ночью и не расходует лимит вызовов днём.</li>
            <li>Сохраните. Утром здесь появятся итоги ночи.</li>
            <li>Один раз увеличьте время работы функции: Ядро → Функции → advertisers → Настройки → таймаут 30 секунд. Иначе за один запуск она успевает проверить слишком мало компаний.</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-lg bg-black/40 px-3 py-2 text-xs text-cyan-300">{link}</code>
            <button onClick={copy} className="shrink-0 px-3 py-2 rounded-lg bg-white/10 text-xs text-white hover:bg-white/15 flex items-center gap-1">
              <Icon name={copied ? "Check" : "Copy"} size={13} />{copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <div className="text-xs text-white/40">За ночь — около 210 запусков и до 1 600 проверенных компаний. Вся текущая база пройдёт за 1–2 ночи.</div>
        </div>
      )}
    </div>
  );
}