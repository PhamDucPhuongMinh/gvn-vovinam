import type { ClubState, Student, Bill } from "./types";
import { outstanding } from "./finance";

export function unpaidStudents(
  state: ClubState,
  period: string,
  includeInactive = false,
) {
  return state.students
    .flatMap<{ student: Student; bill: Bill | undefined; debt: number }>(
      (student) => {
        if (student.status === "inactive" && !includeInactive) return [];
        const bill = state.bills.find(
          (b) => b.studentId === student.id && b.month === period,
        );
        if (bill) {
          const debt = outstanding(state, bill);
          return debt > 0 ? [{ student, bill, debt }] : [];
        }
        const eligible =
          student.joined <= period &&
          student.status === "active" &&
          (!student.left || student.left > period);
        return eligible ? [{ student, bill: undefined, debt: 0 }] : [];
      },
    )
    .sort(
      (a, b) =>
        b.student.joined.localeCompare(a.student.joined) ||
        a.student.name.localeCompare(b.student.name, "vi"),
    );
}

export function tuitionStudentOptions(state: ClubState, period: string) {
  return state.students.filter(
    (student) =>
      (student.status === "active" &&
        student.joined <= period &&
        (!student.left || student.left > period)) ||
      state.bills.some(
        (bill) =>
          bill.studentId === student.id &&
          bill.month === period &&
          outstanding(state, bill) > 0,
      ),
  );
}
