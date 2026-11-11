import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyState } from "../src/lib/empty-state";

test("all setup records are empty and initialization returns independent states", () => {
  const state = createEmptyState();
  for (const key of ["students", "bills", "entries", "classes", "coaches", "exams", "leads", "posts", "media", "audit"] as const)
    assert.deepEqual(state[key], [], key);
  state.students.push({ id: "test", name: "Synthetic learner", joined: "2026-11", status: "active" });
  assert.deepEqual(createEmptyState().students, []);
  assert.equal(state.settings.logo, "");
});
