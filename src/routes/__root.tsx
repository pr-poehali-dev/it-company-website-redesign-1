import {useEffect, type ReactNode} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import {installContactTracking} from "@/lib/ym";
import {SITE_JSON_LD} from "@/lib/jsonld";
import appCss from "@/index.css?url";

const TITLE = "Автоматизация рутины в бизнесе с помощью AI | ***";
const OG_IMAGE = "https://cdn.poehali.dev/projects/***/bucket/445e832b-e1ed-413e-a842-7a510d6d41f1.jpg";

const METRIKA = `(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108507151', 'ym');
ym(108507151, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`;

// Заголовок, описание, canonical и og:title/description задаёт каждая страница сама
// (через <Helmet> → нативные <title>/<meta> React 19).
export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0"},
            {name: "author", content: "***"},
            {name: "yandex-verification", content: "ddb1647ee89a5bd5"},
            {name: "zen-verification", content: "0xQ5WQeFiKC5CbKnoM7Oui368eYccdWtuGJgH4mKwq4TxUGg8ekiHB0zL3G2hKLp"},
            {name: "google-site-verification", content: "7Yjed4o2NAvRCAdWxZNl-MsL-npnkApI0aFr_E48xfU"},
            {name: "theme-color", content: "#06b6d4"},
            {property: "og:locale", content: "ru_RU"},
            {property: "og:site_name", content: "ООО ***"},
            {property: "og:image", content: OG_IMAGE},
            {property: "og:image:type", content: "image/jpeg"},
            {property: "og:image:width", content: "1024"},
            {property: "og:image:height", content: "1024"},
            {property: "og:image:alt", content: "ООО *** — команда разработчиков"},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: appCss},
            {rel: "preconnect", href: "https://fonts.googleapis.com"},
            {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;900&family=Oswald:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&display=swap",
            },
            {rel: "icon", type: "image/jpeg", href: OG_IMAGE},
            {rel: "manifest", href: "/manifest.json"},
            {rel: "sitemap", type: "application/xml", href: "/sitemap-index"},
        ],
        styles: [{children: "html, body { background: #080812; color: #fff; margin: 0; }"}],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            ...SITE_JSON_LD.map((json) => ({type: "application/ld+json", children: json})),
            {children: METRIKA},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
    return (
        <>
            <title>{TITLE}</title>
            <NotFound/>
        </>
    );
}

function RootComponent() {
    useEffect(() => {
        installContactTracking();
    }, []);

    return (
        <RootDocument>
            <ErrorBoundary>
                <TooltipProvider>
                    <Toaster/>
                    <Sonner/>
                    <Outlet/>
                </TooltipProvider>
            </ErrorBoundary>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru">
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}