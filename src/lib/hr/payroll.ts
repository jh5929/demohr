/**
 * Malaysia statutory payroll.
 *
 * EPF (KWSP): straight percentage, rounded to the sen.
 *   Employee 11%. Employer 13% when wages are RM5,000 or below, otherwise 12%.
 *   This is not the KWSP Third Schedule ringgit band table.
 *
 * SOCSO (PERKESO Act 4), wage ceiling RM6,000 from 1 Oct 2024.
 *   First Category (under 60): Employment Injury + Invalidity.
 *   Second Category (60 and over): Employment Injury, employer only.
 *
 * EIS (Act 800), same RM6,000 ceiling. Equal employer and employee shares.
 *
 * PCB / MTD is intentionally not calculated.
 */

export type Money = { employer: number; employee: number };

export type StatutoryInput = {
  basic: number;
  allowance: number;
  /** Age at the end of the pay period. 60+ uses SOCSO Second Category. */
  age: number;
};

export type StatutoryResult = {
  basic: number;
  allowance: number;
  gross: number;
  wage: number;
  epf: Money;
  socso: Money;
  eis: Money;
  pcb: number;
  employeeDeductions: number;
  net: number;
  employerCost: number;
  socsoCategory: 1 | 2;
  notes: string[];
};

type Band = { max: number; employer: number; employee: number };

/** Irregular low bands, then RM100 steps. Amounts in RM. */
const SOCSO_FIRST_LOW: Band[] = [
  { max: 30, employer: 0.4, employee: 0.1 },
  { max: 50, employer: 0.7, employee: 0.2 },
  { max: 70, employer: 1.1, employee: 0.3 },
  { max: 100, employer: 1.5, employee: 0.4 },
  { max: 140, employer: 2.1, employee: 0.6 },
  { max: 200, employer: 2.95, employee: 0.85 },
  { max: 300, employer: 4.35, employee: 1.25 },
  { max: 400, employer: 6.15, employee: 1.75 },
  { max: 500, employer: 7.85, employee: 2.25 },
];

const SOCSO_SECOND_LOW: Band[] = [
  { max: 30, employer: 0.3, employee: 0 },
  { max: 50, employer: 0.5, employee: 0 },
  { max: 70, employer: 0.8, employee: 0 },
  { max: 100, employer: 1.1, employee: 0 },
  { max: 140, employer: 1.5, employee: 0 },
  { max: 200, employer: 2.1, employee: 0 },
  { max: 300, employer: 3.1, employee: 0 },
  { max: 400, employer: 4.4, employee: 0 },
  { max: 500, employer: 5.6, employee: 0 },
];

const EIS_LOW: Band[] = [
  { max: 30, employer: 0.05, employee: 0.05 },
  { max: 50, employer: 0.1, employee: 0.1 },
  { max: 70, employer: 0.15, employee: 0.15 },
  { max: 100, employer: 0.2, employee: 0.2 },
  { max: 140, employer: 0.25, employee: 0.25 },
  { max: 200, employer: 0.35, employee: 0.35 },
  { max: 300, employer: 0.5, employee: 0.5 },
  { max: 400, employer: 0.7, employee: 0.7 },
  { max: 500, employer: 0.9, employee: 0.9 },
];

export const WAGE_CEILING = 6000;
export const EPF_EMPLOYEE_RATE = 0.11;
export const EPF_EMPLOYER_RATE_LOW = 0.13;
export const EPF_EMPLOYER_RATE_HIGH = 0.12;
export const EPF_THRESHOLD = 5000;

export function roundSen(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function bandAbove500(wage: number): { ceiling: number; steps: number } {
  const capped = Math.min(Math.max(wage, 0), WAGE_CEILING);
  const ceiling = capped % 100 === 0 ? capped : Math.ceil(capped / 100) * 100;
  return { ceiling, steps: (ceiling - 600) / 100 };
}

/** First Category employer alternates +1.70 / +1.80 from the RM600 band (RM9.65). */
function socsoFirstAbove500(wage: number): Money {
  const { steps } = bandAbove500(wage);
  const employer = roundSen(9.65 + Math.ceil(steps / 2) * 1.7 + Math.floor(steps / 2) * 1.8);
  const employee = roundSen(2.75 + steps * 0.5);
  return { employer, employee };
}

/** Second Category employer alternates +1.20 / +1.30 from the RM600 band (RM6.90). */
function socsoSecondAbove500(wage: number): Money {
  const { steps } = bandAbove500(wage);
  const employer = roundSen(6.9 + Math.ceil(steps / 2) * 1.2 + Math.floor(steps / 2) * 1.3);
  return { employer, employee: 0 };
}

function eisAbove500(wage: number): Money {
  const { steps } = bandAbove500(wage);
  const share = roundSen(1.1 + steps * 0.2);
  return { employer: share, employee: share };
}

function lookup(wage: number, low: Band[], above: (wage: number) => Money): Money {
  if (wage <= 0) return { employer: 0, employee: 0 };
  const capped = Math.min(wage, WAGE_CEILING);
  for (const band of low) {
    if (capped <= band.max) return { employer: band.employer, employee: band.employee };
  }
  return above(capped);
}

export function socsoContribution(wage: number, age: number): Money & { category: 1 | 2 } {
  if (age >= 60) {
    return { ...lookup(wage, SOCSO_SECOND_LOW, socsoSecondAbove500), category: 2 };
  }
  return { ...lookup(wage, SOCSO_FIRST_LOW, socsoFirstAbove500), category: 1 };
}

export function eisContribution(wage: number): Money {
  return lookup(wage, EIS_LOW, eisAbove500);
}

export function epfContribution(wage: number): Money {
  if (wage <= 0) return { employer: 0, employee: 0 };
  const employee = roundSen(wage * EPF_EMPLOYEE_RATE);
  const rate = wage <= EPF_THRESHOLD ? EPF_EMPLOYER_RATE_LOW : EPF_EMPLOYER_RATE_HIGH;
  return { employer: roundSen(wage * rate), employee };
}

export function calculatePayroll(input: StatutoryInput): StatutoryResult {
  const basic = roundSen(input.basic);
  const allowance = roundSen(input.allowance);
  const gross = roundSen(basic + allowance);
  const wage = gross;
  const epf = epfContribution(wage);
  const socso = socsoContribution(wage, input.age);
  const eis = eisContribution(wage);
  const pcb = 0;
  const employeeDeductions = roundSen(epf.employee + socso.employee + eis.employee + pcb);
  const net = roundSen(gross - employeeDeductions);
  const employerCost = roundSen(gross + epf.employer + socso.employer + eis.employer);
  return {
    basic,
    allowance,
    gross,
    wage,
    epf,
    socso: { employer: socso.employer, employee: socso.employee },
    eis,
    pcb,
    employeeDeductions,
    net,
    employerCost,
    socsoCategory: socso.category,
    notes: [
      "EPF uses the statutory percentage (11% employee; 13% employer at or below RM5,000, 12% above), rounded to the sen — not the KWSP ringgit band table.",
      `SOCSO is Act 4 ${socso.category === 1 ? "First Category (under 60)" : "Second Category (60 and over)"}, wage ceiling RM6,000 (1 Oct 2024).`,
      "EIS is Act 800, equal shares, wage ceiling RM6,000.",
      "PCB (monthly tax deduction) is not calculated in this payslip.",
    ],
  };
}

export function ageOn(dateOfBirth: string, onDate: string): number {
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  const on = new Date(`${onDate}T00:00:00Z`);
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const month = on.getUTCMonth() - born.getUTCMonth();
  if (month < 0 || (month === 0 && on.getUTCDate() < born.getUTCDate())) age -= 1;
  return age;
}

/** Last calendar day of a `YYYY-MM` period, used as the age cutoff. */
export function periodEnd(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}

/** Full lookup rows for the payroll reference panel. */
export function statutoryTables(): {
  socso: { max: number; firstEmployer: number; firstEmployee: number; secondEmployer: number }[];
  eis: { max: number; share: number }[];
} {
  const caps = [
    30, 50, 70, 100, 140, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 4000,
    5000, 6000,
  ];
  return {
    socso: caps.map((max) => {
      const first = socsoContribution(max, 30);
      const second = socsoContribution(max, 60);
      return {
        max,
        firstEmployer: first.employer,
        firstEmployee: first.employee,
        secondEmployer: second.employer,
      };
    }),
    eis: caps.map((max) => ({ max, share: eisContribution(max).employee })),
  };
}
