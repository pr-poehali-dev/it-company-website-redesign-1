import { useMemo } from "react";
import { Dashboard, applyFilters } from "./biEngine";

export function useRows(dash: Dashboard | null) {
  return useMemo(() => (dash ? applyFilters(dash.dataset.rows, dash.filters) : []), [dash]);
}
