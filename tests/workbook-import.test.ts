import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyState } from "../src/lib/empty-state";
import {
  prepareWorkbookImport,
  type WorkbookPayload,
} from "../src/lib/workbook-import";
function empty() {
  const s = createEmptyState();
  s.students = [];
  s.bills = [];
  s.entries = [];
  s.audit = [];
  return s;
}
function payload(): WorkbookPayload {
  return {
    source: { file: "test.xlsx", sha256: "a".repeat(64), sheet: "Data" },
    students: [
      {
        name: "Test learner",
        joined: "2026-09",
        status: "active",
        belt: "Nhập môn",
        notes: "",
        sourceRow: 3,
      },
    ],
    entries: [
      {
        kind: "tuition",
        category: "Học phí",
        description: "Học phí Test learner",
        amount: 1200000,
        date: "2026-09-07",
        month: "2026-09",
        studentName: "Test learner",
        periods: [
          { month: "2026-09", amount: 400000 },
          { month: "2026-10", amount: 400000 },
          { month: "2026-11", amount: 400000 },
        ],
        review: "",
        source: JSON.stringify({ file: "test.xlsx", sheet: "Data", row: 3 }),
      },
    ],
    skipped: [],
    totals: { "2026-09": 1200000 },
    expected: { "2026-09": 1200000 },
  };
}
test("workbook import is idempotent and retains unrelated content and settings", () => {
  const current = empty();
  const original = JSON.stringify(current);
  const initial = prepareWorkbookImport(current, payload());
  assert.equal(JSON.stringify(current), original);
  assert.equal(initial.state.students.length, 1);
  assert.equal(initial.state.bills.length, 3);
  assert.equal(initial.state.entries.length, 1);
  assert.deepEqual(initial.state.settings, current.settings);
  assert.deepEqual(initial.state.classes, current.classes);
  const second = prepareWorkbookImport(initial.state, payload());
  assert.equal(second.summary.addedEntries, 0);
  assert.equal(second.summary.addedStudents, 0);
  assert.deepEqual(second.state, initial.state);
});
test("workbook import preserves explicit blank dates and missing-amount notes", () => {
  const p = payload();
  p.entries.push({
    kind: "legacy_margin",
    category: "Bán hàng",
    description: "Tặng võ phục",
    amount: -150000,
    date: "",
    month: "2026-09",
    studentName: null,
    periods: [],
    review: "Thiếu ngày giao dịch · Tặng 3 tháng",
    source: JSON.stringify({ file: "test.xlsx", sheet: "Data", row: 4 }),
  });
  p.expected["2026-09"] = 1050000;
  p.skipped.push({
    sheet: "Data",
    row: 5,
    month: "2026-09",
    description: "Chưa đóng",
    category: "Học phí",
    reason: "Chưa có số tiền",
  });
  const result = prepareWorkbookImport(empty(), p);
  assert.equal(result.summary.missingDates, 1);
  assert.equal(result.summary.skippedMissingAmount, 1);
  assert.equal(result.state.entries[1].date, "");
  assert.equal(result.state.bills.length, 3);
  assert.ok(result.state.audit[0].detail.includes("Chưa đóng"));
});
test("mismatched source totals and conflicting paid periods block the entire import", () => {
  const current = empty();
  const p = payload();
  p.expected["2026-09"] = 1;
  assert.throws(() => prepareWorkbookImport(current, p), /không khớp/);
  assert.equal(current.students.length, 0);
  const first = prepareWorkbookImport(current, payload());
  const conflict = payload();
  conflict.entries[0].source = JSON.stringify({
    file: "test.xlsx",
    sheet: "Data",
    row: 4,
  });
  conflict.entries[0].amount = 300000;
  conflict.entries[0].periods = [{ month: "2026-09", amount: 300000 }];
  conflict.expected["2026-09"] = 300000;
  assert.throws(
    () => prepareWorkbookImport(first.state, conflict),
    /thanh toán khác/,
  );
});
test("identical cash entries on distinct source rows are retained separately", () => {
  const p = payload();
  const base = {
    kind: "income" as const,
    category: "Ủng hộ",
    description: "Ủng hộ",
    amount: 100000,
    date: "2026-09-07",
    month: "2026-09",
    studentName: null,
    periods: [],
    review: "",
  };
  p.entries = [
    {
      ...base,
      source: JSON.stringify({ file: "test.xlsx", sheet: "Data", row: 3 }),
    },
    {
      ...base,
      source: JSON.stringify({ file: "test.xlsx", sheet: "Data", row: 4 }),
    },
  ];
  p.expected["2026-09"] = 200000;
  const first = prepareWorkbookImport(empty(), p);
  assert.equal(first.state.entries.length, 2);
  assert.equal(prepareWorkbookImport(first.state, p).summary.addedEntries, 0);
});
