import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countLeaveDays } from "./leave-days.ts";

const holidays = ["2026-10-09", "2026-12-25"];

describe("leave days", () => {
  it("counts a working week and skips the weekend", () => {
    assert.equal(countLeaveDays("2026-10-05", "2026-10-09", []), 5);
    assert.equal(countLeaveDays("2026-10-05", "2026-10-11", []), 5);
  });

  it("skips a public holiday inside the range", () => {
    assert.equal(countLeaveDays("2026-10-08", "2026-10-13", holidays), 3);
  });

  it("treats a half day as 0.5 and ignores one that lands on a weekend or holiday", () => {
    assert.equal(countLeaveDays("2026-10-08", "2026-10-08", holidays, true), 0.5);
    assert.equal(countLeaveDays("2026-10-10", "2026-10-10", holidays, true), 0);
    assert.equal(countLeaveDays("2026-10-09", "2026-10-09", holidays, true), 0);
  });

  it("rejects an inverted range and a multi-day half day", () => {
    assert.throws(() => countLeaveDays("2026-10-12", "2026-10-08", []), /end date/);
    assert.throws(() => countLeaveDays("2026-10-08", "2026-10-09", [], true), /single date/);
  });
});
