import { useState } from "react";
import { Link, Navigate, useParams } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import BizShell from "@/components/biz/BizShell";
import { Card } from "@/components/biz/BizUi";
import BizOrderModal from "@/components/biz/BizOrderModal";
import ServiceCalculator, { CalcResult } from "@/components/biz/ServiceCalculator";
import { FaqSchema, ServiceSchema } from "@/components/biz/SeoSchema";
import { GROUPS, SERVICES, findService, rub } from "@/components/biz/servicesData";

export default function ServiceDetail() {
  const { slug = "" } = useParams();
  const s = findService(slug);
  const [order, setOrder] = useState<CalcResult | null>(null);
  if (!s) return <Navigate to="/analytics/services" replace />;
  const url = `https://mat-labs.ru/analytics/services/${s.slug}`;
  const related = SERVICES.filter(x => x.slug !== s.slug && x.group === s.group).concat(SERVICES.filter(x => x.group !== s.group)).slice(0, 3);

  return (
    <BizShell title={`${s.title} под ключ — от ${rub(s.priceFrom)}, ${s.daysFrom}–${s.daysTo} дней | МАТ-Лабс`}
      description={`${s.short}. ${s.description.slice(0, 140)}… Цена от ${rub(s.priceFrom)}, калькулятор на сайте.`}
      path={`/analytics/services/${s.slug}`}
      crumbs={[{ label: "Бизнес-аналитика", href: "/analytics" }, { label: "Услуги под ключ", href: "/analytics/services" }, { label: s.title }]}>
      <ServiceSchema name={s.title} description={s.description} url={url} priceFrom={s.priceFrom} category={GROUPS[s.group].title} />
      <FaqSchema items={s.faq} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-5 min-w-0">
          <header>
            <div className="text-sm text-violet-300 mb-2 flex items-center gap-1.5"><Icon name={GROUPS[s.group].icon} fallback="Layers" size={14} />{GROUPS[s.group].title}</div>
            <h1 className="font-['Oswald',sans-serif] text-3xl md:text-5xl font-bold leading-tight mb-3">{s.title}</h1>
            <p className="text-white/65 text-lg">{s.description}</p>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5"><div className="text-xs text-white/45">Стоимость</div><div className="text-white font-semibold">от {rub(s.priceFrom)}</div></div>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5"><div className="text-xs text-white/45">Срок</div><div className="text-white font-semibold">{s.daysFrom}–{s.daysTo} рабочих дней</div></div>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5"><div className="text-xs text-white/45">Формат</div><div className="text-white font-semibold">Удалённо, договор</div></div>
            </div>
          </header>

          <div className="grid md:grid-cols-2 gap-5">
            <Card title="Когда нужно" icon="Target">
              <ul className="space-y-2">{s.forWhom.map(t => <li key={t} className="flex gap-2 text-sm text-white/75"><Icon name="ArrowRight" size={15} className="text-violet-300 shrink-0 mt-0.5" />{t}</li>)}</ul>
            </Card>
            <Card title="Что вы получите" icon="PackageCheck">
              <ul className="space-y-2">{s.deliverables.map(t => <li key={t} className="flex gap-2 text-sm text-white/75"><Icon name="Check" size={15} className="text-emerald-300 shrink-0 mt-0.5" />{t}</li>)}</ul>
            </Card>
          </div>

          <Card title="Этапы работы" icon="Route">
            <ol className="space-y-3">
              {s.steps.map(([h, t], i) => (
                <li key={h} className="flex gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-violet-500/20 text-violet-200 font-bold flex items-center justify-center">{i + 1}</div>
                  <div><div className="text-white font-medium">{h}</div><p className="text-sm text-white/55">{t}</p></div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Чем мы отличаемся" icon="Sparkles">
            <p className="text-sm text-white/70">
              Обычно такую работу делят между агентством, парсинг-студией и BI-интегратором, а цену называют только «по запросу».
              У нас цена считается на сайте, а в работе используются собственные данные о 2,16 млн компаний России: выручка, штат, налоги, господдержка и контакты.
            </p>
          </Card>

          {s.faq.length > 0 && (
            <Card title="Вопросы" icon="HelpCircle">
              <div className="divide-y divide-white/5">
                {s.faq.map(([q, a]) => (
                  <details key={q} className="py-2.5 group" open>
                    <summary className="cursor-pointer text-white text-sm font-medium list-none">{q}</summary>
                    <p className="text-sm text-white/60 mt-1.5">{a}</p>
                  </details>
                ))}
              </div>
            </Card>
          )}

          <Card title="Другие услуги" icon="Layers">
            <div className="grid sm:grid-cols-3 gap-3">
              {related.map(r => (
                <Link key={r.slug} to={`/analytics/services/${r.slug}`} className="bg-white/[0.03] border border-white/10 hover:border-violet-500/50 rounded-xl p-3">
                  <Icon name={r.icon} fallback="Sparkles" size={17} className="text-violet-300 mb-1.5" />
                  <div className="text-sm text-white font-medium leading-snug">{r.title}</div>
                  <div className="text-xs text-white/45 mt-1">от {rub(r.priceFrom)}</div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 self-start">
          <ServiceCalculator service={s} onOrder={setOrder} />
        </aside>
      </div>

      {order && (
        <BizOrderModal reportType="service" reportKey={JSON.stringify({ service: s.slug, days: order.days, config: order.summary })}
          title={`${s.title}: ${order.summary}`} price={order.price}
          includes={[`Ориентир: ${rub(order.price)}, ${order.days} рабочих дней`, "Созвон 30 минут для уточнения задачи", "КП с фиксированной ценой в течение рабочего дня"]}
          onClose={() => setOrder(null)} />
      )}
    </BizShell>
  );
}
