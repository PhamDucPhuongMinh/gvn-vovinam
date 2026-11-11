import { createEmptyState } from "../src/lib/empty-state";
import { applyCommand } from "../src/lib/commands";

/** Invented regression data only; never imported by the application. */
export function createFixture() {
  const state = createEmptyState();
  state.students = [
    {
      id: "test-paid",
      name: "Test paid learner",
      joined: "2026-09",
      status: "active",
      belt: "Nhập môn",
    },
    {
      id: "test-prepaid",
      name: "Test prepaid learner",
      joined: "2026-09",
      status: "active",
      belt: "Nhập môn",
    },
    {
      id: "test-unpaid",
      name: "Test unpaid learner",
      joined: "2026-09",
      status: "active",
      belt: "Nhập môn",
    },
  ];
  for (const period of ["2026-10", "2026-11"]) {
    applyCommand(state, {
      action: "pay",
      data: {
        studentId: "test-paid",
        period,
        months: 1,
        totalAmount: 400000,
        date: `${period}-02`,
        description: "Synthetic payment",
      },
    });
  }
  applyCommand(state, {
    action: "pay",
    data: {
      studentId: "test-prepaid",
      period: "2026-09",
      months: 3,
      totalAmount: 1200000,
      date: "2026-09-02",
      description: "Synthetic prepayment",
    },
  });
  state.entries.push({
    id: "test-margin",
    kind: "legacy_margin",
    category: "Bán hàng",
    description: "Synthetic margin",
    amount: 125000,
    date: "2026-11-02",
    month: "2026-11",
    legacy: true,
  });
  state.audit = [];
  return state;
}
