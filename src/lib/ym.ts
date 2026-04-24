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