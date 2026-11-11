import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";
import { applyCommand } from "../src/lib/commands";
import {
  cashValue,
  monthSummary,
  outstanding,
  isOverdue,
} from "../src/lib/finance";
import { currentMonth } from "../src/lib/utils";
test("prepayments cover Sep–Nov without recording cash three times", () => {
  const s = createFixture();
  for (const name of ["Test prepaid learner"]) {
    const st = s.students.find((st) => st.name === name)!;
    const bills = s.bills.filter((b) => b.studentId === st.id);
    assert.deepEqual(
      bills.map((b) => b.month),
      ["2026-09", "2026-10", "2026-11"],
    );
    assert.ok(bills.every((b) => outstanding(s, b) === 0));
    assert.equal(s.entries.filter((e) => e.studentId === st.id).length, 1);
  }
});
test("legacy sales margins are never treated as known cash receipts", () => {
  const e = createFixture().entries.find(
    (e) => e.kind === "legacy_margin" && e.amount === 125000,
  )!;
  assert.equal(cashValue(e), 0);
});
test("payment cannot settle an already paid period twice", () => {
  const s = createFixture();
  const st = s.students.find((st) => st.name === "Test prepaid learner")!;
  assert.throws(
    () =>
      applyCommand(s, {
        action: "pay",
        data: {
          studentId: st.id,
          period: "2026-11",
          months: 1,
          firstAmount: 400000,
          date: "2026-11-09",
          description: "",
        },
      }),
    /thu trùng/,
  );
});
test("new member first month override and multi-month payment remain fully allocated", () => {
  const s = createFixture();
  const period = currentMonth();
  applyCommand(s, {
    action: "save_student",
    data: { name: "Test member", joined: period, status: "active" },
  });
  const st = s.students.at(-1)!;
  applyCommand(s, {
    action: "pay",
    data: {
      studentId: st.id,
      period,
      months: 3,
      firstAmount: 250000,
      date: period + "-09",
      description: "",
    },
  });
  const payment = s.entries[0];
  assert.equal(payment.amount, 1050000);
  assert.equal(payment.allocations?.length, 3);
  assert.equal(
    payment.allocations?.reduce((a, b) => a + b.amount, 0),
    payment.amount,
  );
  assert.ok(
    s.bills
      .filter((b) => b.studentId === st.id)
      .every((b) => outstanding(s, b) === 0),
  );
});
test("voiding a payment reopens debt while retaining its original data", () => {
  const s = createFixture();
  const e = s.entries.find((e) => e.kind === "tuition")!;
  const bill = s.bills.find((b) => b.id === e.allocations![0].billId)!;
  applyCommand(s, {
    action: "void_entry",
    data: { entryId: e.id, reason: "Sai giao dịch" },
  });
  assert.equal(outstanding(s, bill), bill.amount);
  assert.equal(e.voided, true);
  assert.ok(s.audit[0].detail.includes("Sai giao dịch"));
});
test("paid invoices cannot be edited and fee changes preserve old invoices", () => {
  const s = createFixture();
  const b = s.bills[0],
    old = b.amount;
  assert.throws(
    () =>
      applyCommand(s, {
        action: "adjust_bill",
        data: { billId: b.id, amount: 100000, reason: "test" },
      }),
    /hủy giao dịch/,
  );
  applyCommand(s, {
    action: "settings",
    data: { ...s.settings, monthlyFee: 500000 },
  });
  assert.equal(b.amount, old);
});
test("generating month bills is idempotent and does not invent historical debt", () => {
  const s = createFixture();
  const period = currentMonth();
  applyCommand(s, { action: "generate_bills", data: { period } });
  const count = s.bills.length;
  applyCommand(s, { action: "generate_bills", data: { period } });
  assert.equal(s.bills.length, count);
  assert.throws(
    () =>
      applyCommand(s, {
        action: "generate_bills",
        data: { period: "2026-01" },
      }),
    /tháng hiện tại/,
  );
});
test("latest passed exam determines belt, a failed exam does not grant honors", () => {
  const s = createFixture();
  const st = s.students[0];
  const exam = {
    name: "Khóa 1",
    date: "2026-11-01",
    location: "TP.HCM",
    organizer: "Đơn vị tổ chức",
    results: [
      { studentId: st.id, passed: true, belt: "Lam đai I", honor: "Á khoa" },
    ],
  };
  applyCommand(s, { action: "save_exam", data: exam });
  assert.equal(st.belt, "Lam đai I");
  applyCommand(s, {
    action: "save_exam",
    data: {
      ...exam,
      date: "2026-10-01",
      results: [{ studentId: st.id, passed: true, belt: "Lam đai", honor: "" }],
    },
  });
  assert.equal(st.belt, "Lam đai I");
  assert.throws(
    () =>
      applyCommand(s, {
        action: "save_exam",
        data: {
          ...exam,
          results: [
            { studentId: st.id, passed: false, belt: "", honor: "Thủ khoa" },
          ],
        },
      }),
    /không đạt/,
  );
});
test("invalid calendar dates and negative new payments are rejected", () => {
  const s = createFixture();
  assert.throws(() =>
    applyCommand(s, {
      action: "entry",
      data: {
        kind: "income",
        category: "Thu khác",
        description: "test",
        date: "2026-02-31",
        month: "2026-02",
        amount: 100,
      },
    }),
  );
  assert.throws(() =>
    applyCommand(s, {
      action: "entry",
      data: {
        kind: "income",
        category: "Thu khác",
        description: "test",
        date: "2026-11-09",
        month: "2026-11",
        amount: -100,
      },
    }),
  );
});
test("due date is inclusive and debt becomes overdue the following day", () => {
  assert.equal(isOverdue("2026-11", 15, "2026-11-15"), false);
  assert.equal(isOverdue("2026-11", 15, "2026-11-16"), true);
});
test("correcting or removing a passed result restores the earlier belt", () => {
  const s = createFixture();
  const st = s.students[0];
  st.belt = "Lam đai";
  const data = {
    name: "Khóa sửa kết quả",
    date: "2026-11-01",
    location: "CLB",
    organizer: "Đơn vị thi",
    results: [{ studentId: st.id, passed: true, belt: "Lam đai I", honor: "" }],
  };
  applyCommand(s, { action: "save_exam", data });
  const exam = s.exams[0];
  assert.equal(st.belt, "Lam đai I");
  applyCommand(s, {
    action: "save_exam",
    data: { ...data, id: exam.id, results: [] },
  });
  assert.equal(st.belt, "Lam đai");
});
test("all initial students start at Nhập môn and new student belts are validated", () => {
  const s = createFixture();
  assert.ok(s.students.every((st) => st.belt === "Nhập môn"));
  applyCommand(s, {
    action: "save_student",
    data: { name: "New learner", joined: currentMonth(), status: "active" },
  });
  assert.equal(s.students.at(-1)?.belt, "Nhập môn");
  assert.throws(() =>
    applyCommand(s, {
      action: "save_student",
      data: {
        name: "Invalid belt",
        joined: currentMonth(),
        status: "active",
        belt: "Unknown belt",
      },
    }),
  );
});
test("custom tuition applies to any month and supports different prepaid monthly fees", () => {
  const s = createFixture();
  const st = s.students.find((st) => st.name === "Test unpaid learner")!;
  applyCommand(s, {
    action: "pay",
    data: {
      studentId: st.id,
      period: "2027-01",
      months: 3,
      amounts: [300000, 450000, 350000],
      date: "2026-11-10",
      description: "Mức thu riêng",
    },
  });
  assert.equal(s.entries[0].amount, 1100000);
  assert.deepEqual(
    s.entries[0].allocations?.map((a) => a.amount),
    [300000, 450000, 350000],
  );
  assert.ok(
    s.bills
      .filter((b) => b.studentId === st.id && b.month >= "2027-01")
      .every((b) => outstanding(s, b) === 0),
  );
});
test("custom payment updates an unpaid bill without leaving artificial debt", () => {
  const s = createFixture();
  const period = currentMonth();
  applyCommand(s, { action: "generate_bills", data: { period } });
  const st = s.students.find((st) => st.name === "Test unpaid learner")!;
  applyCommand(s, {
    action: "pay",
    data: {
      studentId: st.id,
      period,
      months: 1,
      amounts: [250000],
      date: period + "-10",
      description: "",
    },
  });
  const b = s.bills.find((b) => b.studentId === st.id && b.month === period)!;
  assert.equal(b.amount, 250000);
  assert.equal(outstanding(s, b), 0);
});
function editData(s: ReturnType<typeof createFixture>, entryId: string) {
  const entry = s.entries.find((e) => e.id === entryId)!;
  return { ...entry, entryId, reason: "Đối soát lại chứng từ" };
}
test("editing a legacy margin preserves original baseline and before/after audit", () => {
  const s = createFixture();
  const entry = s.entries.find(
    (e) => e.kind === "legacy_margin" && e.amount === 125000,
  )!;
  applyCommand(s, {
    action: "edit_entry",
    data: {
      ...editData(s, entry.id),
      amount: 180000,
      description: "Synthetic sale updated",
    },
  });
  const changed = s.entries.find((e) => e.id === entry.id)!;
  assert.equal(changed.amount, 180000);
  assert.equal(changed.original?.amount, 125000);
  assert.equal(s.audit[0].before?.amount, 125000);
  assert.equal(s.audit[0].after?.amount, 180000);
  assert.equal(monthSummary(s, "2026-11").sourceTotal, 580000);
});
test("editing tuition updates allocations and bill amount atomically", () => {
  const s = createFixture();
  const entry = s.entries.find(
    (e) => e.kind === "tuition" && e.amount === 400000,
  )!;
  const bill = s.bills.find((b) => b.id === entry.allocations![0].billId)!;
  applyCommand(s, {
    action: "edit_entry",
    data: {
      ...editData(s, entry.id),
      amount: 300000,
      periods: [{ month: bill.month, amount: 300000 }],
    },
  });
  const updated = s.entries.find((e) => e.id === entry.id)!;
  assert.equal(updated.amount, 300000);
  assert.equal(updated.allocations?.[0].amount, 300000);
  assert.equal(s.bills.find((b) => b.id === bill.id)?.amount, 300000);
  assert.equal(
    outstanding(
      s,
      s.bills.find((b) => b.id === bill.id)!,
    ),
    0,
  );
});
test("moving tuition cannot overwrite another payment and failed edit leaves state intact", () => {
  const s = createFixture();
  const entry = s.entries.find(
    (e) => e.studentId === "test-paid" && e.month === "2026-11",
  )!;
  const before = JSON.stringify(s);
  assert.throws(
    () =>
      applyCommand(s, {
        action: "edit_entry",
        data: {
          ...editData(s, entry.id),
          periods: [{ month: "2026-10", amount: entry.amount }],
        },
      }),
    /thu trùng/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("moving payment reopens the original period and settles the destination", () => {
  const s = createFixture();
  const entry = s.entries.find(
    (e) => e.studentId === "test-paid" && e.month === "2026-11",
  )!;
  const oldBill = entry.allocations![0].billId;
  applyCommand(s, {
    action: "edit_entry",
    data: {
      ...editData(s, entry.id),
      periods: [{ month: "2026-12", amount: entry.amount }],
    },
  });
  assert.equal(
    outstanding(
      s,
      s.bills.find((b) => b.id === oldBill)!,
    ),
    400000,
  );
  const newBill = s.bills.find(
    (b) => b.studentId === entry.studentId && b.month === "2026-12",
  )!;
  assert.equal(outstanding(s, newBill), 0);
});
test("voided entries cannot be edited and tuition must equal its allocations", () => {
  const s = createFixture();
  const entry = s.entries.find((e) => e.kind === "tuition")!;
  assert.throws(
    () =>
      applyCommand(s, {
        action: "edit_entry",
        data: {
          ...editData(s, entry.id),
          amount: 300000,
          periods: [{ month: "2026-11", amount: 400000 }],
        },
      }),
    /Tổng tiền/,
  );
  applyCommand(s, {
    action: "void_entry",
    data: { entryId: entry.id, reason: "Sai" },
  });
  assert.throws(
    () =>
      applyCommand(s, {
        action: "edit_entry",
        data: {
          ...editData(s, entry.id),
          periods: [{ month: "2026-11", amount: 400000 }],
        },
      }),
    /hiệu lực/,
  );
});
