import test from "node:test";
import assert from "node:assert/strict";
import { matchesSelectOption } from "../src/lib/select-search";
import { unpaidStudents } from "../src/lib/unpaid-students";
import { createEmptyState } from "../src/lib/empty-state";

test("select search matches labels and values without case or Vietnamese accents", () => {
  const option = { label: "Đặng Minh · Đang học", value: "VS-ABC-007" };
  for (const query of ["dang minh", "ĐẶNG", "abc-007", " VS-ABC ", ""])
    assert.equal(matchesSelectOption(option, query), true, query);
  assert.equal(matchesSelectOption(option, "no-match"), false);
});

test("unpaid list includes debts and unbilled learners but excludes prepaid, waived and future learners", () => {
  const state = createEmptyState();
  state.students = ["debt", "unbilled", "paid", "waived", "future", "left"].map(
    (id) => ({
      id,
      name: `Synthetic ${id}`,
      joined: id === "future" ? "2027-01" : "2026-09",
      status: id === "left" ? "inactive" : "active",
    }),
  );
  state.bills = ["debt", "paid", "waived"].map((id) => ({
    id,
    studentId: id,
    month: "2026-11",
    amount: id === "waived" ? 0 : 400000,
  }));
  state.entries = [
    {
      id: "prepay",
      kind: "tuition",
      category: "Học phí",
      description: "Synthetic prepayment",
      amount: 400000,
      date: "2026-10-01",
      month: "2026-10",
      allocations: [{ billId: "paid", amount: 400000 }],
    },
  ];
  const rows = unpaidStudents(state, "2026-11");
  assert.deepEqual(rows.map((r) => r.student.id).sort(), ["debt", "unbilled"]);
  assert.equal(rows.find((r) => r.student.id === "debt")?.debt, 400000);
  assert.equal(rows.find((r) => r.student.id === "unbilled")?.bill, undefined);
  state.bills.push({
    id: "left",
    studentId: "left",
    month: "2026-11",
    amount: 300000,
  });
  assert.ok(
    unpaidStudents(state, "2026-11").some((r) => r.student.id === "left"),
  );
});
