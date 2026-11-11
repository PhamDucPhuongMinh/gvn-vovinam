import { createHash, randomUUID } from "node:crypto";
import type { ClubState, Entry, Student } from "./types";
import { sourceValue } from "./finance";
export type WorkbookPayload = {
  source: { file: string; sha256: string; sheet: string };
  students: {
    name: string;
    joined: string;
    status: "active" | "inactive";
    belt: string;
    notes: string;
    sourceRow: number;
  }[];
  entries: {
    kind: Entry["kind"];
    category: string;
    description: string;
    amount: number;
    date: string;
    month: string;
    studentName: string | null;
    periods: { month: string; amount: number }[];
    review: string;
    source: string;
  }[];
  skipped: {
    sheet: string;
    row: number;
    month: string;
    description: string;
    category: string;
    reason: string;
  }[];
  totals: Record<string, number>;
  expected: Record<string, number>;
};
const normalized = (s: string) =>
  s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
const hash = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 16);
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function signature(e: Entry) {
  return JSON.stringify([
    e.kind,
    e.month,
    e.date,
    e.studentId || normalized(e.description),
    e.amount,
  ]);
}
export function prepareWorkbookImport(
  current: ClubState,
  payload: WorkbookPayload,
) {
  check(payload.source?.sha256?.length === 64, "Thiếu mã kiểm tra file nguồn.");
  check(
    Array.isArray(payload.students) && Array.isArray(payload.entries),
    "Cấu trúc dữ liệu nhập chưa hợp lệ.",
  );
  const state = structuredClone(current);
  const studentIds = new Map<string, string>();
  let addedStudents = 0,
    updatedStudents = 0,
    addedEntries = 0,
    matchedEntries = 0,
    addedBills = 0;
  for (const input of payload.students) {
    check(
      /^20\d{2}-(0[1-9]|1[0-2])$/.test(input.joined),
      "Tháng tham gia chưa hợp lệ.",
    );
    check(
      ["active", "inactive"].includes(input.status),
      "Trạng thái võ sinh chưa hợp lệ.",
    );
    const matches = state.students.filter(
      (st) => normalized(st.name) === normalized(input.name),
    );
    check(
      matches.length <= 1,
      `Có nhiều hồ sơ cùng tên ${input.name}; cần ghép thủ công.`,
    );
    let student = matches[0];
    if (student) {
      const before = JSON.stringify(student);
      Object.assign(student, {
        name: input.name.trim(),
        joined: input.joined,
        status: input.status,
      });
      if (input.notes) student.notes = input.notes;
      student.belt ||= "Nhập môn";
      if (before !== JSON.stringify(student)) updatedStudents++;
    } else {
      student = {
        id: `xlsx-vs-${hash(input.name)}`,
        name: input.name.trim(),
        joined: input.joined,
        status: input.status,
        belt: "Nhập môn",
        notes: input.notes || "",
      };
      state.students.push(student);
      addedStudents++;
    }
    studentIds.set(normalized(input.name), student.id);
  }
  const importedEntries: Entry[] = [];
  const originalIds = new Set(current.entries.map((e) => e.id));
  const matchedIds = new Set<string>();
  const sourceIds = new Set<string>();
  for (const input of payload.entries) {
    check(Number.isSafeInteger(input.amount), "Số tiền phải là số nguyên VND.");
    check(
      input.kind === "legacy_margin" || input.amount > 0,
      "Số tiền giao dịch chưa hợp lệ.",
    );
    const source = JSON.parse(input.source) as {
      file: string;
      sheet: string;
      row: number;
    };
    check(
      source.file === payload.source.file &&
        source.sheet === payload.source.sheet &&
        Number.isInteger(source.row),
      "Nguồn giao dịch chưa hợp lệ.",
    );
    const id = `xlsx-${hash(source.file + "|" + source.sheet)}-r${source.row}`;
    check(!sourceIds.has(id), `Dòng nguồn bị lặp: ${source.row}`);
    sourceIds.add(id);
    const studentId = input.studentName
      ? studentIds.get(normalized(input.studentName))
      : undefined;
    if (input.kind === "tuition")
      check(studentId, `Không ghép được võ sinh tại dòng ${source.row}.`);
    const entry: Entry = {
      id,
      kind: input.kind,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: input.date,
      month: input.month,
      legacy: true,
      source: input.source,
    };
    if (studentId) entry.studentId = studentId;
    if (input.review) entry.review = input.review;
    const existing =
      state.entries.find((e) => e.id === id) ||
      state.entries.find(
        (e) =>
          !e.voided &&
          originalIds.has(e.id) &&
          !matchedIds.has(e.id) &&
          signature(e) === signature(entry),
      );
    if (existing) {
      check(
        !existing.voided && signature(existing) === signature(entry),
        `Giao dịch dòng ${source.row} đã thay đổi; chưa ghi đè.`,
      );
      check(
        !matchedIds.has(existing.id),
        "Một giao dịch hiện tại bị ghép hai lần.",
      );
      if (input.kind === "tuition") {
        const stored = (existing.allocations || [])
          .map((a) => ({
            month: state.bills.find((b) => b.id === a.billId)?.month,
            amount: a.amount,
          }))
          .sort((a, b) => (a.month || "").localeCompare(b.month || ""));
        const expected = input.periods
          .slice()
          .sort((a, b) => a.month.localeCompare(b.month));
        check(
          JSON.stringify(stored) === JSON.stringify(expected),
          `Phân bổ học phí dòng ${source.row} khác dữ liệu hiện tại; chưa ghi đè.`,
        );
      }
      matchedIds.add(existing.id);
      matchedEntries++;
      importedEntries.push(existing);
      continue;
    }
    if (input.kind === "tuition") {
      check(
        input.periods.length > 0 &&
          input.periods.reduce((sum, p) => sum + p.amount, 0) === input.amount,
        "Phân bổ không khớp tổng học phí.",
      );
      entry.allocations = [];
      for (const period of input.periods) {
        let bill = state.bills.find(
          (b) => b.studentId === studentId && b.month === period.month,
        );
        if (bill) {
          check(
            !state.entries.some(
              (e) =>
                !e.voided && e.allocations?.some((a) => a.billId === bill!.id),
            ),
            `Học phí ${input.studentName} tháng ${period.month} đã có thanh toán khác.`,
          );
          check(
            bill.amount === period.amount,
            `Khoản phải thu ${input.studentName} tháng ${period.month} khác file nguồn.`,
          );
        } else {
          bill = {
            id: `xlsx-bill-${studentId}-${period.month}`,
            studentId: studentId!,
            month: period.month,
            amount: period.amount,
          };
          state.bills.push(bill);
          addedBills++;
        }
        entry.allocations.push({ billId: bill.id, amount: period.amount });
      }
    }
    state.entries.push(entry);
    importedEntries.push(entry);
    addedEntries++;
  }
  const totals: Record<string, number> = {};
  for (const entry of importedEntries)
    totals[entry.month] = (totals[entry.month] || 0) + sourceValue(entry);
  for (const [month, total] of Object.entries(payload.expected))
    check(
      totals[month] === total,
      `Tổng tháng ${month} không khớp file nguồn.`,
    );
  check(
    Object.keys(totals).length === Object.keys(payload.expected).length,
    "Số tháng nhập không khớp.",
  );
  const missingDates = importedEntries.filter((e) => !e.date).length;
  if (addedStudents || updatedStudents || addedEntries) {
    state.audit.unshift({
      id: randomUUID(),
      at: new Date().toISOString(),
      action: "Nhập dữ liệu từ Excel",
      detail: JSON.stringify({
        file: payload.source.file,
        sha256: payload.source.sha256,
        addedStudents,
        updatedStudents,
        addedEntries,
        addedBills,
        missingDates,
        skippedMissingAmount: payload.skipped,
        totals,
      }),
    });
  }
  return {
    state,
    summary: {
      addedStudents,
      updatedStudents,
      addedEntries,
      matchedEntries,
      addedBills,
      missingDates,
      skippedMissingAmount: payload.skipped.length,
      totals,
    },
  };
}
