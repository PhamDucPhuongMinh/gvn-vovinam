import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyState } from "../src/lib/empty-state";
import { financialChartData } from "../src/lib/financial-chart";

test("fresh setup has no seeded chart data", () => {
  const chart = financialChartData(createEmptyState(), "2026-11");
  assert.equal(chart.points.length, 6);
  assert.equal(chart.empty, true);
  assert.equal(chart.maximum, 0);
  assert.equal(chart.span, 1);
});
test("scale uses all series in the visible window and excludes the same month in other years", () => {
  const s = createEmptyState();
  s.entries = [
    {
      id: "old",
      kind: "tuition",
      category: "Học phí",
      description: "Old",
      amount: 99999999,
      date: "2025-11-01",
      month: "2025-11",
    },
    {
      id: "tuition",
      kind: "tuition",
      category: "Học phí",
      description: "Current",
      amount: 400000,
      date: "2026-11-01",
      month: "2026-11",
    },
    {
      id: "support",
      kind: "income",
      category: "Ủng hộ",
      description: "Current",
      amount: 2000000,
      date: "2026-11-01",
      month: "2026-11",
    },
  ];
  const chart = financialChartData(s, "2026-11");
  assert.equal(chart.maximum, 2400000);
  assert.equal(chart.points.at(-1)?.revenue, 2400000);
});
test("negative balances extend the scale below zero and voided entries are excluded", () => {
  const s = createEmptyState();
  s.entries = [
    {
      id: "expense",
      kind: "expense",
      category: "Chi",
      description: "Expense",
      amount: 1000000,
      date: "2026-11-01",
      month: "2026-11",
    },
    {
      id: "voided",
      kind: "income",
      category: "Thu",
      description: "Voided",
      amount: 9000000,
      date: "2026-11-01",
      month: "2026-11",
      voided: true,
    },
  ];
  const chart = financialChartData(s, "2026-11");
  assert.equal(chart.minimum, -1000000);
  assert.equal(chart.maximum, 1000000);
  assert.equal(chart.span, 2000000);
});
test("empty data has a safe scale and six consecutive months across a year boundary", () => {
  const s = createEmptyState();
  s.entries = [];
  const chart = financialChartData(s, "2027-02");
  assert.deepEqual(
    chart.points.map((p) => p.period),
    ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"],
  );
  assert.equal(chart.empty, true);
  assert.equal(chart.span, 1);
});
test("offsetting receipts and expenses show zero values rather than a false no-data state", () => {
  const s = createEmptyState();
  s.entries = [
    {
      id: "in",
      kind: "income",
      category: "Thu",
      description: "Receipt",
      amount: 400000,
      date: "2026-11-01",
      month: "2026-11",
    },
    {
      id: "out",
      kind: "expense",
      category: "Chi",
      description: "Expense",
      amount: 400000,
      date: "2026-11-01",
      month: "2026-11",
    },
  ];
  const chart = financialChartData(s, "2026-11");
  assert.equal(chart.empty, false);
  assert.equal(chart.span, 400000);
  assert.equal(chart.points.at(-1)?.profit, 0);
});
test("sales revenue and cost are gross values and profit is counted once", () => {
  const s = createEmptyState();
  s.entries = [
    {
      id: "sale",
      kind: "sale",
      category: "Bán hàng",
      description: "Đơn bán",
      amount: 500000,
      cost: 300000,
      date: "2026-11-01",
      month: "2026-11",
    },
  ];
  const point = financialChartData(s, "2026-11").points.at(-1)!;
  assert.equal(point.revenue, 500000);
  assert.equal(point.cost, 300000);
  assert.equal(point.profit, 200000);
});
test("legacy sales profit does not invent missing gross revenue or costs", () => {
  const s = createEmptyState();
  s.entries = [
    {
      id: "legacy",
      kind: "legacy_margin",
      category: "Bán hàng",
      description: "Giao dịch cũ",
      amount: 125000,
      date: "2026-11-01",
      month: "2026-11",
      legacy: true,
    },
  ];
  const point = financialChartData(s, "2026-11").points.at(-1)!;
  assert.equal(point.revenue, 0);
  assert.equal(point.cost, 0);
  assert.equal(point.profit, 125000);
});
