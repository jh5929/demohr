import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageOn, calculatePayroll, eisContribution, epfContribution, socsoContribution } from "./payroll.ts";

describe("EPF percentage", () => {
  it("charges 11% and 13% at or below RM5,000", () => {
    assert.deepEqual(epfContribution(4000), { employee: 440, employer: 520 });
    assert.deepEqual(epfContribution(5000), { employee: 550, employer: 650 });
  });

  it("drops the employer rate to 12% above RM5,000", () => {
    assert.deepEqual(epfContribution(5000.01), { employee: 550, employer: 600 });
    assert.deepEqual(epfContribution(8000), { employee: 880, employer: 960 });
  });
});

describe("SOCSO lookup", () => {
  it("matches the First Category table, including the corrected RM700 band", () => {
    assert.deepEqual(socsoContribution(650, 30), { employer: 11.35, employee: 3.25, category: 1 });
    assert.deepEqual(socsoContribution(4000, 30), { employer: 69.15, employee: 19.75, category: 1 });
    assert.deepEqual(socsoContribution(5000, 30), { employer: 86.65, employee: 24.75, category: 1 });
    assert.deepEqual(socsoContribution(5500, 30), { employer: 95.35, employee: 27.25, category: 1 });
    assert.deepEqual(socsoContribution(6000, 30), { employer: 104.15, employee: 29.75, category: 1 });
  });

  it("caps wages above the RM6,000 ceiling", () => {
    assert.deepEqual(socsoContribution(8200, 30), socsoContribution(6000, 30));
  });

  it("uses Second Category for age 60 and over", () => {
    assert.deepEqual(socsoContribution(5000, 60), { employer: 61.9, employee: 0, category: 2 });
    assert.deepEqual(socsoContribution(6000, 64), { employer: 74.4, employee: 0, category: 2 });
  });
});

describe("EIS lookup", () => {
  it("reads the Act 800 bands and the RM6,000 cap", () => {
    assert.deepEqual(eisContribution(30), { employer: 0.05, employee: 0.05 });
    assert.deepEqual(eisContribution(1000), { employer: 1.9, employee: 1.9 });
    assert.deepEqual(eisContribution(5000), { employer: 9.9, employee: 9.9 });
    assert.deepEqual(eisContribution(6000), { employer: 11.9, employee: 11.9 });
    assert.deepEqual(eisContribution(9000), eisContribution(6000));
  });
});

describe("payslip", () => {
  it("nets employee deductions and keeps PCB at zero", () => {
    const slip = calculatePayroll({ basic: 7200, allowance: 600, age: 29 });
    assert.equal(slip.gross, 7800);
    assert.equal(slip.epf.employee, 858);
    assert.equal(slip.epf.employer, 936);
    assert.equal(slip.socso.employee, 29.75);
    assert.equal(slip.socso.employer, 104.15);
    assert.equal(slip.eis.employee, 11.9);
    assert.equal(slip.pcb, 0);
    assert.equal(slip.net, 6900.35);
    assert.equal(slip.notes.some((note) => note.includes("PCB")), true);
  });

  it("computes age on the period date", () => {
    assert.equal(ageOn("1966-09-30", "2026-09-30"), 60);
    assert.equal(ageOn("1966-10-01", "2026-09-30"), 59);
  });
});
