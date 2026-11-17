import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { cellText, compareCells } from "../src/lib/table-sort";
test("table sorting compares whole-VND amounts, calendar dates and Vietnamese names", () => {
  assert.ok(compareCells("90.000 ₫", "400.000 ₫") < 0);
  assert.ok(compareCells("-1.500.000 ₫", "0 ₫") < 0);
  assert.ok(compareCells("31/12/2025", "01/01/2026") < 0);
  assert.ok(compareCells("12/2025", "01/2026") < 0);
  assert.ok(compareCells("An", "Bình") < 0);
  assert.ok(compareCells(20, 100) < 0);
});
test("rendered cell labels use selected values and learner names", () => {
  const Component = () => null;
  assert.equal(
    cellText(
      createElement(Component as never, {
        student: { name: "Synthetic learner" },
      }),
    ),
    "Synthetic learner",
  );
  assert.equal(cellText(createElement("span", null, "Đang học")), "Đang học");
  assert.equal(
    cellText(
      createElement(
        "select",
        { value: "Mới" },
        createElement("option", null, "Mới"),
        createElement("option", null, "Đã liên hệ"),
      ),
    ),
    "Mới",
  );
});
