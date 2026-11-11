import type { ClubState } from "./types";
// Idempotent: fill only missing belts, never reset a recorded exam/promotion.
export function migrateState(state: ClubState): ClubState {
  for (const student of state.students) {
    if (!student.belt?.trim()) {
      const passed = state.exams
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .flatMap((exam) =>
          exam.results.filter((r) => r.studentId === student.id && r.passed),
        );
      student.belt = passed[0]?.belt || "Nhập môn";
    }
    if (student.beltBeforeExams === "") student.beltBeforeExams = "Nhập môn";
  }
  return state;
}
