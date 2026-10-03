const YM_ID = 108507151;

declare global {
  interface Window {
    ym?: (id: number, action: string, goal: string, params?: object) => void;
  }
}

export function ymGoal(goal: string, params?: object) {
  try {
    if (typeof window !== "undefined" && window.ym) {
      window.ym(YM_ID, "reachGoal", goal, params);
    }
  } catch (_) { /* silent */ }
}

export function ymLead(kind: string, params?: object) {
  ymGoal(kind, params);
  ymGoal("lead", { kind, ...params });
}

const CONTACT_RULES: { test: (href: string) => boolean; goal: string }[] = [
  { test: (h) => h.startsWith("tel:"), goal: "phone_click" },
  { test: (h) => h.startsWith("mailto:"), goal: "email_click" },
  { test: (h) => /(^|\/\/)(t\.me|telegram\.me)\//i.test(h) && !h.includes("/share/"), goal: "telegram_click" },
  { test: (h) => /wa\.me\/|api\.whatsapp\.com|whatsapp:/i.test(h), goal: "whatsapp_click" },
  { test: (h) => /max\.ru\//i.test(h), goal: "max_click" },
];

let contactTrackingInstalled = false;

export function installContactTracking() {
  if (contactTrackingInstalled || typeof document === "undefined") return;
  contactTrackingInstalled = true;
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const rule = CONTACT_RULES.find((r) => r.test(href));
      if (!rule) return;
      ymLead(rule.goal, { page: window.location.pathname });
    },
    { capture: true },
  );
}
