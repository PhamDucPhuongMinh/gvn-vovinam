import type { Entry } from "./types";
import { financialTotals } from "./finance";

export function financialReport(entries: Entry[], month?: string) {
  const selected = entries.filter(
    (entry) => !entry.voided && (!month || entry.month === month),
  );
  const periods = [...new Set(selected.map((entry) => entry.month))].sort(
    (a, b) => b.localeCompare(a),
  );
  const rows = periods.map((period) => ({
    period,
    ...financialTotals(selected.filter((entry) => entry.month === period)),
  }));
  return {
    ...financialTotals(selected),
    rows,
    count: selected.length,
    legacyProfit: selected
      .filter((entry) => entry.kind === "legacy_margin")
      .reduce((sum, entry) => sum + entry.amount, 0),
    hasLegacy: selected.some((entry) => entry.kind === "legacy_margin"),
  };
}
