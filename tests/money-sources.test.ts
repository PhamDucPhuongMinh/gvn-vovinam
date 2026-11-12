import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";
import { applyCommand } from "../src/lib/commands";
import {
  cashValue,
  financialTotals,
  outstanding,
  sourceValue,
} from "../src/lib/finance";
import { splitTuition } from "../src/lib/tuition";

test("tuition notes remain separate from default and custom descriptions, including edits", () => {
  const state = createFixture();
  const student = state.students[0];
  for (const [period, description] of [
    ["2027-03", ""],
    ["2027-04", "Nội dung riêng"],
  ]) {
    applyCommand(state, {
      action: "pay",
      data: {
        studentId: student.id,
        period,
        months: 1,
        totalAmount: 400000,
        date: "2027-03-01",
        description,
        notes: "Phụ huynh chuyển khoản",
      },
    });
    const entry = state.entries[0];
    assert.equal(entry.description, description || `Học phí ${student.name}`);
    assert.equal(entry.notes, "Phụ huynh chuyển khoản");
    applyCommand(state, {
      action: "edit_entry",
      data: {
        ...entry,
        entryId: entry.id,
        reason: "Bổ sung ghi chú",
        notes: "Đã đối soát",
        periods: [{ month: period, amount: 400000 }],
      },
    });
    const updated = state.entries.find((e) => e.id === entry.id)!;
    assert.equal(updated.description, entry.description);
    assert.equal(updated.notes, "Đã đối soát");
    assert.equal(state.audit[0].before?.notes, "Phụ huynh chuyển khoản");
    assert.equal(state.audit[0].after?.notes, "Đã đối soát");
  }
});

test("total tuition covers consecutive months exactly, including VND remainder", () => {
  const s = createFixture();
  const studentId = s.students.find((s) => s.status === "active")!.id;
  applyCommand(s, {
    action: "pay",
    data: {
      studentId,
      period: "2026-12",
      months: 3,
      totalAmount: 1000000,
      date: "2026-11-11",
      description: "Đóng ba tháng",
    },
  });
  const entry = s.entries[0];
  assert.equal(entry.amount, 1000000);
  const bills = entry.allocations!.map((a) =>
    s.bills.find((b) => b.id === a.billId)!,
  );
  assert.deepEqual(
    bills.map((b) => b.month),
    ["2026-12", "2027-01", "2027-02"],
  );
  assert.deepEqual(
    bills.map((b) => b.amount),
    [333334, 333333, 333333],
  );
  assert.ok(bills.every((b) => outstanding(s, b) === 0));
  assert.throws(
    () =>
      applyCommand(s, {
        action: "pay",
        data: {
          studentId,
          period: "2026-12",
          months: 1,
          totalAmount: 400000,
          date: "2026-11-11",
          description: "Trùng tháng",
        },
      }),
    /đã thanh toán/,
  );
});

test("invalid total and period counts are rejected", () => {
  for (const [total, months] of [
    [0, 1],
    [1, 3],
    [100, 0],
    [100, 25],
    [100.5, 1],
  ])
    assert.throws(() => splitTuition(total, months));
});

test("separate purchase and sale count import cost once, support edits and voids", () => {
  const s = createFixture();
  s.entries = [];
  for (const [kind, category, amount] of [
    ["purchase", "Nhập hàng", 250000],
    ["sale", "Bán hàng", 400000],
    ["income", "Tiền khác", 100000],
    ["expense", "Sân bãi", 50000],
  ] as const) {
    applyCommand(s, {
      action: "entry",
      data: {
        kind,
        category,
        amount,
        description: category,
        date: "2026-11-11",
        month: "2026-11",
        quantity: 1,
      },
    });
  }
  assert.deepEqual(financialTotals(s.entries), {
    revenue: 500000,
    cost: 300000,
    profit: 200000,
  });
  const purchase = s.entries.find((e) => e.kind === "purchase")!;
  assert.equal(cashValue(purchase), -250000);
  assert.equal(sourceValue(purchase), -250000);
  applyCommand(s, {
    action: "edit_entry",
    data: {
      ...purchase,
      entryId: purchase.id,
      amount: 200000,
      reason: "Điều chỉnh giá nhập",
    },
  });
  assert.equal(financialTotals(s.entries).profit, 250000);
  applyCommand(s, {
    action: "void_entry",
    data: { entryId: purchase.id, reason: "Hủy nhập" },
  });
  assert.equal(financialTotals(s.entries).cost, 50000);
});
