import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

const SITE = "https://mat-labs.ru";

export default function PageBreadcrumbs({ items, className = "" }: PageBreadcrumbsProps) {
  const all: Crumb[] = [{ label: "Главная", href: "/" }, ...items];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE}${c.href === "/" ? "/" : c.href}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <nav aria-label="Хлебные крошки" className={className}>
        <ol className="flex items-center flex-wrap gap-1.5 text-sm">
          {all.map((c, i) => {
            const isLast = i === all.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <Icon name="ChevronRight" size={12} className="text-white/25 shrink-0" />
                )}
                {isLast || !c.href ? (
                  <span className="text-white/70" aria-current="page">
                    {c.label}
                  </span>
                ) : (
                  <Link
                    to={c.href}
                    className="text-white/40 hover:text-white/80 transition-colors"
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
