import type { ClubState } from "./types";
import { monthSummary } from "./finance";

export function financialChartData(state: ClubState, endMonth: string) {
  const [year, month] = endMonth.split("-").map(Number);
  const points = Array.from({ length: 6 }, (_, index) => {
    const period = new Date(Date.UTC(year, month - 6 + index, 1))
      .toISOString()
      .slice(0, 7);
    const summary = monthSummary(state, period);
    return {
      period,
      revenue: summary.revenue,
      cost: summary.cost,
      profit: summary.profit,
    };
  });
  // A dense array avoids undefined values from missing calendar months.
  // Scale all three series over the visible window, including negative profit.
  const values = points.flatMap((point) => [
    point.revenue,
    point.cost,
    point.profit,
  ]);
  const maximum = Math.max(0, ...values);
  const minimum = Math.min(0, ...values);
  return {
    points,
    maximum,
    minimum,
    span: maximum - minimum || 1,
    empty: !state.entries.some(
      (entry) =>
        !entry.voided && points.some((point) => point.period === entry.month),
    ),
  };
}
