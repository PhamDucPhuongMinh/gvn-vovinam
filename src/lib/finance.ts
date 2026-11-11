import type { ClubState, Entry, Bill } from "./types";
export function paidAmount(state: ClubState, billId: string) {
  return state.entries
    .filter((e) => !e.voided)
    .flatMap((e) => e.allocations || [])
    .filter((a) => a.billId === billId)
    .reduce((sum, a) => sum + a.amount, 0);
}
export function outstanding(state: ClubState, bill: Bill) {
  return Math.max(0, bill.amount - paidAmount(state, bill.id));
}
export function isOverdue(month: string, day: number, date: string) {
  return date > `${month}-${String(day).padStart(2, "0")}`;
}
export function cashValue(entry: Entry): number {
  if (
    entry.voided ||
    (entry.legacy && (entry.kind === "legacy_margin" || !entry.date))
  )
    return 0;
  if (entry.kind === "expense" || entry.kind === "purchase")
    return -entry.amount;
  if (entry.kind === "sale") return entry.amount - (entry.cost || 0);
  return entry.amount;
}
export function sourceValue(e: Entry) {
  return e.voided
    ? 0
    : e.kind === "expense" || e.kind === "purchase"
      ? -e.amount
      : e.kind === "sale"
        ? e.amount - (e.cost || 0)
        : e.amount;
}
export function financialTotals(entries: Entry[]) {
  let revenue = 0,
    cost = 0,
    legacyProfit = 0;
  for (const entry of entries) {
    if (entry.voided) continue;
    if (
      entry.kind === "tuition" ||
      entry.kind === "income" ||
      entry.kind === "sale"
    )
      revenue += entry.amount;
    if (entry.kind === "expense" || entry.kind === "purchase")
      cost += entry.amount;
    if (entry.kind === "sale") cost += entry.cost || 0;
    if (entry.kind === "legacy_margin") legacyProfit += entry.amount;
  }
  return { revenue, cost, profit: revenue - cost + legacyProfit };
}
export function monthSummary(state: ClubState, month: string) {
  const entries = state.entries.filter((e) => !e.voided && e.month === month);
  return {
    ...financialTotals(entries),
    tuition: entries
      .filter((e) => e.kind === "tuition")
      .reduce((s, e) => s + e.amount, 0),
    sourceTotal: entries.reduce((s, e) => s + sourceValue(e), 0),
    debt: state.bills
      .filter((b) => b.month === month)
      .reduce((s, b) => s + outstanding(state, b), 0),
    margin: entries
      .filter((e) => e.kind === "legacy_margin" || e.kind === "sale")
      .reduce(
        (s, e) => s + (e.kind === "sale" ? e.amount - (e.cost || 0) : e.amount),
        0,
      ),
  };
}
