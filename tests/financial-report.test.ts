import test from "node:test";
import assert from "node:assert/strict";
import { financialReport } from "../src/lib/financial-report";
import type { Entry } from "../src/lib/types";

const entries: Entry[] = [
  {
    id: "tuition",
    kind: "tuition",
    category: "Học phí",
    description: "Synthetic prepayment",
    amount: 1200000,
    date: "2026-09-01",
    month: "2026-09",
  },
  {
    id: "sale",
    kind: "sale",
    category: "Bán hàng",
    description: "Synthetic combined sale",
    amount: 400000,
    cost: 200000,
    date: "2026-10-01",
    month: "2026-10",
  },
  {
    id: "expense",
    kind: "expense",
    category: "Chi phí",
    description: "Synthetic expense",
    amount: 50000,
    date: "2026-11-01",
    month: "2026-10",
  },
  {
    id: "purchase",
    kind: "purchase",
    category: "Nhập hàng",
    description: "Synthetic separate purchase",
    amount: 100000,
    date: "2026-10-02",
    month: "2026-10",
  },
  {
    id: "income",
    kind: "income",
    category: "Tiền khác",
    description: "Synthetic income",
    amount: 200000,
    date: "2026-11-01",
    month: "2026-11",
  },
  {
    id: "legacy",
    kind: "legacy_margin",
    category: "Bán hàng",
    description: "Synthetic margin",
    amount: 30000,
    date: "",
    month: "2026-10",
  },
  {
    id: "void",
    kind: "income",
    category: "Tiền khác",
    description: "Synthetic void",
    amount: 9000000,
    date: "2026-11-01",
    month: "2026-11",
    voided: true,
  },
];
test("all-time report totals equal summed monthly rows and ignore voided transactions", () => {
  const before = JSON.stringify(entries);
  const report = financialReport(entries);
  assert.equal(report.revenue, 1800000);
  assert.equal(report.cost, 350000);
  assert.equal(report.profit, 1480000);
  assert.equal(report.legacyProfit, 30000);
  assert.equal(report.count, 6);
  assert.deepEqual(
    report.rows.map((row) => row.period),
    ["2026-11", "2026-10", "2026-09"],
  );
  for (const key of ["revenue", "cost", "profit"] as const)
    assert.equal(
      report.rows.reduce((sum, row) => sum + row[key], 0),
      report[key],
    );
  assert.equal(JSON.stringify(entries), before);
});
test("monthly report uses accounting month consistently with its cards and table", () => {
  const report = financialReport(entries, "2026-10");
  assert.equal(report.revenue, 400000);
  assert.equal(report.cost, 350000);
  assert.equal(report.profit, 80000);
  assert.equal(report.count, 4);
  assert.equal(report.rows.length, 1);
  const empty = financialReport(entries, "2027-01");
  assert.equal(empty.count, 0);
  assert.equal(empty.revenue, 0);
  assert.equal(empty.cost, 0);
  assert.equal(empty.profit, 0);
  assert.deepEqual(empty.rows, []);
});
