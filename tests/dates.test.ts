import test from "node:test";
import assert from "node:assert/strict";
import { parseCalendarValue, formatCalendarValue } from "../src/lib/dates";
import { migrateState } from "../src/lib/migrations";
import { createFixture } from "./fixtures";
import { BELTS } from "../src/lib/constants";
test("date-only and month values round-trip without UTC conversion", () => {
  for (const value of ["2026-11-10", "2024-02-29", "1990-01-01"])
    assert.equal(formatCalendarValue(parseCalendarValue(value)), value);
  assert.equal(
    formatCalendarValue(parseCalendarValue("2026-11"), "month"),
    "2026-11",
  );
  assert.equal(
    formatCalendarValue(new Date(2026, 10, 10, 0, 30)),
    "2026-11-10",
  );
  for (const invalid of ["2026-02-30", "2026-13", "bad", ""])
    assert.equal(parseCalendarValue(invalid), null);
});
test("belt migration fills missing data and preserves recorded promotions", () => {
  const s = createFixture();
  delete s.students[0].belt;
  s.students[1].belt = "Lam đai I";
  migrateState(s);
  assert.equal(s.students[0].belt, "Nhập môn");
  assert.equal(s.students[1].belt, "Lam đai I");
  const before = JSON.stringify(s);
  migrateState(s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(BELTS.filter((b) => b === "Hồng đai V").length, 1);
  assert.equal(BELTS.at(-1), "Bạch đai Chưởng môn");
});
