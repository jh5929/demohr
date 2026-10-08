import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lateMinutes, overtimeMinutes } from "./attendance-calc.ts";

describe("attendance", () => {
  it("waives lateness inside the 15-minute grace and counts from 09:00 after that", () => {
    assert.equal(lateMinutes(9 * 60 + 10), 0);
    assert.equal(lateMinutes(9 * 60 + 15), 0);
    assert.equal(lateMinutes(9 * 60 + 16), 16);
    assert.equal(lateMinutes(8 * 60 + 50), 0);
  });

  it("counts overtime only after 18:00, including a next-day punch", () => {
    assert.equal(overtimeMinutes(17 * 60), 0);
    assert.equal(overtimeMinutes(18 * 60 + 30), 30);
    assert.equal(overtimeMinutes(24 * 60 + 60), 7 * 60);
  });
});
