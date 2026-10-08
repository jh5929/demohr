import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth/server";
import { getSql, type Sql } from "@/lib/db";
import { lateMinutes, overtimeMinutes } from "./attendance-calc";
import { DEMO_PASSWORD, DEMO_SEATS } from "./demo";
import { ageOn, calculatePayroll, periodEnd } from "./payroll";
import { DEPARTMENTS, HOLIDAYS_2026, ROSTER } from "./roster";

const globalRef = globalThis as typeof globalThis & { __hrSeed?: Promise<void> };

export function ensureHr(): Promise<void> {
  globalRef.__hrSeed ??= seed().catch((error) => {
    globalRef.__hrSeed = undefined;
    throw error;
  });
  return globalRef.__hrSeed;
}

async function seed() {
  const sql = await getSql();
  const flagged = await sql<{ value: string }>`select value from hr_meta where key = 'seeded'`;
  if (!flagged.length) {
    await seedCompany(sql);
    await sql`insert into hr_meta (key, value) values ('seeded', '1')`;
  }
  await ensureDemoLogins(sql);
}

async function seedCompany(sql: Sql) {
  await sql`delete from documents`;
  await sql`delete from payslips`;
  await sql`delete from attendance`;
  await sql`delete from leave_requests`;
  await sql`delete from audit_logs`;
  await sql`delete from memberships`;

  const deptIds = new Map<string, number>();
  for (const dept of DEPARTMENTS) {
    const rows = await sql<{ id: number }>`
      insert into departments (name, code) values (${dept.name}, ${dept.code})
      on conflict (code) do update set name = excluded.name
      returning id
    `;
    deptIds.set(dept.name, rows[0].id);
  }

  const positionIds = new Map<string, number>();
  for (const person of ROSTER) {
    const key = `${person.dept}::${person.title}`;
    if (positionIds.has(key)) continue;
    const rows = await sql<{ id: number }>`
      insert into positions (department_id, title)
      values (${deptIds.get(person.dept)}, ${person.title})
      on conflict (department_id, title) do update set title = excluded.title
      returning id
    `;
    positionIds.set(key, rows[0].id);
  }

  const ids = new Map<string, number>();
  for (const person of ROSTER) {
    const n = Number(person.no.replace(/\D/g, ""));
    const ic = `${person.dob.slice(2, 4)}${person.dob.slice(5, 7)}${person.dob.slice(8, 10)}-14-${String(1000 + n).slice(1)}`;
    const rows = await sql<{ id: number }>`
      insert into employees (
        employee_no, full_name, email, phone, department_id, position_id, role, status,
        hire_date, contract_end, date_of_birth, gender, ic_no, address,
        basic_salary, allowance, annual_entitlement, annual_balance, sick_balance,
        emergency_contact, bank_name, bank_account, epf_no, socso_no, tax_no
      ) values (
        ${person.no}, ${person.name}, ${person.email}, ${person.phone},
        ${deptIds.get(person.dept)}, ${positionIds.get(`${person.dept}::${person.title}`)},
        ${person.role}, ${person.status}, ${person.hire}, ${person.contractEnd},
        ${person.dob}, ${person.gender}, ${ic}, ${person.address},
        ${person.basic}, ${person.allowance}, ${person.annual}, ${person.annualLeft}, ${person.sickLeft},
        ${`${person.name.split(" ")[0]}'s family · ${person.phone}`},
        ${"Maybank"}, ${`1640${String(n).padStart(8, "0")}`},
        ${String(18000000 + n)}, ${String(29000000 + n)}, ${`SG ${10000000 + n}`}
      )
      on conflict (email) do update set full_name = excluded.full_name
      returning id
    `;
    ids.set(person.email, rows[0].id);
  }

  for (const person of ROSTER) {
    if (!person.manager) continue;
    await sql`update employees set manager_id = ${ids.get(person.manager)} where id = ${ids.get(person.email)}`;
  }

  for (const holiday of HOLIDAYS_2026) {
    await sql`
      insert into holidays (name, holiday_date, scope)
      values (${holiday.name}, ${holiday.date}, 'Kuala Lumpur')
      on conflict (holiday_date) do nothing
    `;
  }

  const leaves: {
    email: string;
    type: string;
    start: string;
    end: string;
    days: number;
    reason: string;
    status: string;
    approver: string | null;
  }[] = [
    { email: "hafiz.abdullah@demohr.example", type: "sick", start: "2026-10-08", end: "2026-10-08", days: 1, reason: "Clinic visit — fever.", status: "approved", approver: "priya.nair@demohr.example" },
    { email: "daniel.ong@demohr.example", type: "annual", start: "2026-10-20", end: "2026-10-21", days: 2, reason: "Family ceremony in Ipoh.", status: "pending", approver: null },
    { email: "mei.ling.tan@demohr.example", type: "annual", start: "2026-10-15", end: "2026-10-16", days: 2, reason: "Sister's wedding.", status: "pending", approver: null },
    { email: "nurul.izzati@demohr.example", type: "emergency", start: "2026-10-22", end: "2026-10-22", days: 1, reason: "Parents travelling, need to cover the house.", status: "pending", approver: null },
    { email: "jason.koh@demohr.example", type: "unpaid", start: "2026-09-18", end: "2026-09-18", days: 1, reason: "Personal errand after annual balance was planned out.", status: "rejected", approver: "priya.nair@demohr.example" },
    { email: "sarah.khoo@demohr.example", type: "annual", start: "2026-10-12", end: "2026-10-13", days: 2, reason: "Long weekend with family in Penang.", status: "approved", approver: "adrian.teh@demohr.example" },
    { email: "siti.aminah@demohr.example", type: "annual", start: "2026-10-27", end: "2026-10-28", days: 2, reason: "Balik kampung.", status: "pending", approver: null },
  ];
  for (const leave of leaves) {
    await sql`
      insert into leave_requests (
        employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, decided_at, decision_note
      ) values (
        ${ids.get(leave.email)}, ${leave.type}, ${leave.start}, ${leave.end}, ${leave.days}, ${leave.reason},
        ${leave.status}, ${leave.approver ? ids.get(leave.approver) : null},
        ${leave.status === "pending" ? null : "2026-10-02T02:30:00Z"},
        ${leave.status === "rejected" ? "Cover already thin that Friday — take it as annual next month." : ""}
      )
    `;
  }

  const days = ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"];
  let index = 0;
  for (const person of ROSTER) {
    if (person.status === "resigned") continue;
    for (const [offset, day] of days.entries()) {
      const late = (index + offset) % 7 === 0 ? 27 : (index + offset) % 9 === 0 ? 40 : 0;
      const ot = (index + offset) % 5 === 0 ? 85 : (index + offset) % 4 === 0 ? 25 : 0;
      const inMin = late > 0 ? 9 * 60 + late : 9 * 60 + (index % 4) * 3;
      const outMin = 18 * 60 + ot;
      const inLabel = clock(day, inMin);
      const outLabel = clock(day, outMin);
      await sql`
        insert into attendance (employee_id, work_date, clock_in, clock_out, late_minutes, ot_minutes)
        values (
          ${ids.get(person.email)}, ${day}, ${inLabel}, ${outLabel},
          ${lateMinutes(inMin)}, ${overtimeMinutes(outMin)}
        )
        on conflict (employee_id, work_date) do nothing
      `;
    }
    index += 1;
  }

  for (const person of ROSTER) {
    if (person.status === "resigned") continue;
    const age = ageOn(person.dob, periodEnd("2026-09"));
    const pay = calculatePayroll({ basic: person.basic, allowance: person.allowance, age });
    await sql`
      insert into payslips (
        employee_id, period, basic, allowance, gross,
        epf_employee, epf_employer, socso_employee, socso_employer,
        eis_employee, eis_employer, pcb, net, employer_cost, socso_category, generated_at
      ) values (
        ${ids.get(person.email)}, '2026-09', ${pay.basic}, ${pay.allowance}, ${pay.gross},
        ${pay.epf.employee}, ${pay.epf.employer}, ${pay.socso.employee}, ${pay.socso.employer},
        ${pay.eis.employee}, ${pay.eis.employer}, ${pay.pcb}, ${pay.net}, ${pay.employerCost},
        ${pay.socsoCategory}, '2026-09-28T01:00:00Z'
      )
      on conflict (employee_id, period) do nothing
    `;
  }

  await sql`
    insert into audit_logs (actor_name, action, entity, entity_id, detail)
    values
      ('System', 'seed', 'workspace', 'demo', 'Loaded departments, 20 employees, KL 2026 holidays, September payslips.'),
      ('Aisha Rahman', 'approve', 'leave', 'hafiz', 'Approved Hafiz Abdullah sick leave for 8 Oct 2026.'),
      ('Priya Nair', 'reject', 'leave', 'jason', 'Rejected Jason Koh unpaid leave for 18 Sep 2026.')
  `;
}

function clock(day: string, minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${day} ${hour}:${minute}:00+08`;
}

async function ensureDemoLogins(sql: Sql) {
  for (const demo of DEMO_SEATS) {
    const existing = await sql<{ id: string }>`select id from "user" where email = ${demo.email}`;
    if (existing.length) continue;
    try {
      await auth.api.signUpEmail({
        body: { name: demo.name, email: demo.email, password: DEMO_PASSWORD },
        headers: new Headers({ origin: "http://127.0.0.1:8080", host: "127.0.0.1:8080" }),
      });
    } catch {
      const again = await sql<{ id: string }>`select id from "user" where email = ${demo.email}`;
      if (again.length) continue;
      const id = randomUUID();
      const password = await hashPassword(DEMO_PASSWORD);
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${id}, ${demo.name}, ${demo.email}, true, now(), now())
      `;
      await sql`
        insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
        values (${randomUUID()}, ${id}, 'credential', ${id}, ${password}, now(), now())
      `;
    }
  }
}
