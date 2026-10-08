import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { klParts, lateMinutes, overtimeMinutes } from "./attendance-calc";
import { DEMO_SEATS, type DemoSeat } from "./demo";
import { countLeaveDays } from "./leave-days";
import { ageOn, calculatePayroll, periodEnd, statutoryTables } from "./payroll";
import { ensureHr } from "./seed.server";

type Role = "admin" | "hr" | "employee";
type LeaveType = "annual" | "sick" | "emergency" | "unpaid";
type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

type Actor = {
  id: number;
  employeeNo: string;
  fullName: string;
  email: string;
  role: Role;
  title: string;
  department: string;
  reportCount: number;
  annualBalance: number;
  sickBalance: number;
  avatarData: string | null;
};

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function day(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text ? text.slice(0, 10) : null;
}

function stamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("Missing form data.");
  return value as Record<string, unknown>;
}

function isHr(actor: Actor) {
  return actor.role === "admin" || actor.role === "hr";
}

function assertHr(actor: Actor) {
  if (!isHr(actor)) throw new Error("Only HR or an admin can do that.");
}

async function loadActor(sql: Sql, userId: string): Promise<Actor | null> {
  const users = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const email = users[0]?.email ?? "";
  if (email) {
    await sql`
      insert into memberships (user_id, employee_id)
      select ${userId}, e.id from employees e where lower(e.email) = lower(${email})
      on conflict (user_id) do nothing
    `;
  }
  const rows = await sql<Record<string, unknown>>`
    select e.id, e.employee_no, e.full_name, e.email, e.role, e.avatar_data,
      e.annual_balance, e.sick_balance, p.title as position_title, d.name as department_name,
      (select count(*)::int from employees r where r.manager_id = e.id and r.status <> 'resigned') as report_count
    from memberships m
    join employees e on e.id = m.employee_id
    join positions p on p.id = e.position_id
    join departments d on d.id = e.department_id
    where m.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: num(row.id),
    employeeNo: String(row.employee_no),
    fullName: String(row.full_name),
    email: String(row.email),
    role: String(row.role) as Role,
    title: String(row.position_title),
    department: String(row.department_name),
    reportCount: num(row.report_count),
    annualBalance: num(row.annual_balance),
    sickBalance: num(row.sick_balance),
    avatarData: row.avatar_data ? String(row.avatar_data) : null,
  };
}

async function requireActor(userId: string): Promise<{ sql: Sql; actor: Actor }> {
  await ensureHr();
  const sql = await getSql();
  const actor = await loadActor(sql, userId);
  if (!actor) throw new Error("Pick a demo seat before continuing.");
  return { sql, actor };
}

function presentEmployee(row: Record<string, unknown>, actor: Actor, withAvatar: boolean) {
  const id = num(row.id);
  const managerId = row.manager_id == null ? null : num(row.manager_id);
  const money = isHr(actor) || actor.id === id;
  const balance = money || managerId === actor.id;
  return {
    id,
    employeeNo: String(row.employee_no),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    departmentId: num(row.department_id),
    department: String(row.department_name),
    positionId: num(row.position_id),
    title: String(row.position_title),
    managerId,
    managerName: row.manager_name ? String(row.manager_name) : null,
    role: String(row.role) as Role,
    status: String(row.status),
    hireDate: day(row.hire_date),
    contractEnd: day(row.contract_end),
    dateOfBirth: balance || isHr(actor) ? day(row.date_of_birth) : null,
    gender: String(row.gender ?? ""),
    address: money || managerId === actor.id ? String(row.address ?? "") : "",
    emergencyContact: money ? String(row.emergency_contact ?? "") : "",
    icNo: money ? String(row.ic_no ?? "") : "",
    basicSalary: money ? num(row.basic_salary) : null,
    allowance: money ? num(row.allowance) : null,
    annualEntitlement: balance ? num(row.annual_entitlement) : null,
    annualBalance: balance ? num(row.annual_balance) : null,
    sickBalance: balance ? num(row.sick_balance) : null,
    bankName: money ? String(row.bank_name ?? "") : "",
    bankAccount: money ? String(row.bank_account ?? "") : "",
    epfNo: money ? String(row.epf_no ?? "") : "",
    socsoNo: money ? String(row.socso_no ?? "") : "",
    taxNo: money ? String(row.tax_no ?? "") : "",
    avatarData: withAvatar && row.avatar_data ? String(row.avatar_data) : null,
    reportCount: num(row.report_count),
  };
}

const EMPLOYEE_FROM = `
  from employees e
  join departments d on d.id = e.department_id
  join positions p on p.id = e.position_id
  left join employees mgr on mgr.id = e.manager_id
`;

const EMPLOYEE_COLS = `
  e.id, e.employee_no, e.full_name, e.email, e.phone, e.department_id, d.name as department_name,
  e.position_id, p.title as position_title, e.manager_id, mgr.full_name as manager_name,
  e.role, e.status, e.hire_date, e.contract_end, e.date_of_birth, e.gender, e.ic_no, e.address,
  e.avatar_data, e.basic_salary, e.allowance, e.annual_entitlement, e.annual_balance, e.sick_balance,
  e.emergency_contact, e.bank_name, e.bank_account, e.epf_no, e.socso_no, e.tax_no,
  (select count(*)::int from employees r where r.manager_id = e.id and r.status <> 'resigned') as report_count
`;

async function audit(
  sql: Sql,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string,
  detail: string,
) {
  await sql`
    insert into audit_logs (actor_employee_id, actor_name, action, entity, entity_id, detail)
    values (${actor.id}, ${actor.fullName}, ${action}, ${entity}, ${entityId}, ${detail})
  `;
}

async function holidayDates(sql: Sql): Promise<string[]> {
  const rows = await sql<{ holiday_date: unknown }>`select holiday_date from holidays`;
  return rows.map((row) => day(row.holiday_date) ?? "").filter(Boolean);
}

export const prepareDemo = createServerFn({ method: "POST" }).handler(async () => {
  await ensureHr();
  return { ok: true as const };
});

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureHr();
    const sql = await getSql();
    const actor = await loadActor(sql, context.userId);
    return {
      actor: actor
        ? {
            ...actor,
            canManagePeople: isHr(actor),
            canPayroll: isHr(actor),
            canAudit: isHr(actor),
            canHardDelete: actor.role === "admin",
            canApprove: isHr(actor) || actor.reportCount > 0,
            attendanceScope: isHr(actor) ? "all" : actor.reportCount > 0 ? "team" : "self",
          }
        : null,
      seats: DEMO_SEATS.map((seat) => ({
        seat: seat.seat,
        name: seat.name,
        title: seat.title,
        blurb: seat.blurb,
        email: seat.email,
      })),
      today: klParts().date,
    };
  });

export const claimSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const seat = text(asRecord(input).seat) as DemoSeat;
    if (!DEMO_SEATS.some((item) => item.seat === seat)) throw new Error("Unknown seat.");
    return { seat };
  })
  .handler(async ({ context, data }) => {
    await ensureHr();
    const sql = await getSql();
    const chosen = DEMO_SEATS.find((item) => item.seat === data.seat)!;
    const updated = await sql<{ id: number }>`
      insert into memberships (user_id, employee_id)
      select ${context.userId}, e.id from employees e where e.email = ${chosen.email}
      on conflict (user_id) do update set employee_id = excluded.employee_id
      returning employee_id as id
    `;
    if (!updated.length) throw new Error("That seat is not on the roster.");
    return { ok: true as const };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, actor } = await requireActor(context.userId);
    const today = klParts().date;
    const head = await sql<{ n: number }>`
      select count(*)::int as n from employees where status <> 'resigned'
    `;
    const out = await sql<Record<string, unknown>>`
      select e.id, e.full_name, d.name as department, l.leave_type, l.days
      from leave_requests l
      join employees e on e.id = l.employee_id
      join departments d on d.id = e.department_id
      where l.status = 'approved' and l.start_date <= ${today}::date and l.end_date >= ${today}::date
      order by e.full_name
    `;
    const pendingWhere =
      actor.role === "admin" || actor.role === "hr"
        ? sql<Record<string, unknown>>`
            select l.id, e.full_name, l.leave_type, l.start_date, l.end_date, l.days, p.title
            from leave_requests l
            join employees e on e.id = l.employee_id
            join positions p on p.id = e.position_id
            where l.status = 'pending'
            order by l.created_at
          `
        : sql<Record<string, unknown>>`
            select l.id, e.full_name, l.leave_type, l.start_date, l.end_date, l.days, p.title
            from leave_requests l
            join employees e on e.id = l.employee_id
            join positions p on p.id = e.position_id
            where l.status = 'pending' and e.manager_id = ${actor.id}
            order by l.created_at
          `;
    const pending = await pendingWhere;
    const mine = await sql<{ n: number }>`
      select count(*)::int as n from leave_requests where employee_id = ${actor.id} and status = 'pending'
    `;
    const birthdays = await sql<Record<string, unknown>>`
      select id, full_name, date_of_birth from employees
      where status <> 'resigned' and to_char(date_of_birth, 'MM') = to_char(${today}::date, 'MM')
      order by to_char(date_of_birth, 'DD')
    `;
    const contracts = await sql<Record<string, unknown>>`
      select id, full_name, contract_end, status from employees
      where status <> 'resigned' and contract_end is not null
        and contract_end >= ${today}::date
        and contract_end <= ${today}::date + interval '60 days'
      order by contract_end
    `;
    const departments = await sql<Record<string, unknown>>`
      select d.name, count(e.id)::int as n
      from departments d
      left join employees e on e.department_id = d.id and e.status <> 'resigned'
      group by d.name
      order by d.name
    `;
    const clocked = await sql<{ n: number }>`
      select count(*)::int as n from attendance where work_date = ${today}::date and clock_in is not null
    `;
    const minePunch = await sql<Record<string, unknown>>`
      select clock_in, clock_out, late_minutes, ot_minutes
      from attendance where employee_id = ${actor.id} and work_date = ${today}::date
    `;
    return {
      today,
      headcount: num(head[0]?.n),
      onLeave: out.map((row) => ({
        id: num(row.id),
        name: String(row.full_name),
        department: String(row.department),
        type: String(row.leave_type),
        days: num(row.days),
      })),
      pending: pending.map((row) => ({
        id: num(row.id),
        name: String(row.full_name),
        title: String(row.title),
        type: String(row.leave_type),
        start: day(row.start_date),
        end: day(row.end_date),
        days: num(row.days),
      })),
      myPending: num(mine[0]?.n),
      birthdays: birthdays.map((row) => ({
        id: num(row.id),
        name: String(row.full_name),
        date: day(row.date_of_birth),
        today: day(row.date_of_birth)?.slice(5) === today.slice(5),
      })),
      contracts: contracts.map((row) => ({
        id: num(row.id),
        name: String(row.full_name),
        date: day(row.contract_end),
        status: String(row.status),
      })),
      departments: departments.map((row) => ({ name: String(row.name), count: num(row.n) })),
      clockedIn: num(clocked[0]?.n),
      myPunch: minePunch[0]
        ? {
            clockIn: stamp(minePunch[0].clock_in),
            clockOut: stamp(minePunch[0].clock_out),
            late: num(minePunch[0].late_minutes),
            ot: num(minePunch[0].ot_minutes),
          }
        : null,
      showQueue: isHr(actor) || actor.reportCount > 0,
    };
  });

export const listEmployees = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const status = text(raw.status) || "current";
    if (!["current", "active", "probation", "resigned", "all"].includes(status)) {
      throw new Error("Unknown status filter.");
    }
    return {
      q: text(raw.q).slice(0, 80),
      departmentId: raw.departmentId ? num(raw.departmentId) : null,
      positionId: raw.positionId ? num(raw.positionId) : null,
      status,
    };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const like = `%${data.q}%`;
    const found = await sql.query<Record<string, unknown>>(
      `select ${EMPLOYEE_COLS} ${EMPLOYEE_FROM}
       where ($1 = '' or e.full_name ilike $2 or e.email ilike $2 or e.employee_no ilike $2 or p.title ilike $2 or d.name ilike $2)
         and ($3::int is null or e.department_id = $3)
         and ($4::int is null or e.position_id = $4)
         and ($5 = 'all' or ($5 = 'current' and e.status <> 'resigned') or e.status = $5)
       order by e.full_name`,
      [data.q, like, data.departmentId, data.positionId, data.status],
    );
    return found.map((row) => presentEmployee(row, actor, false));
  });

export const getEmployee = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql.query<Record<string, unknown>>(
      `select ${EMPLOYEE_COLS} ${EMPLOYEE_FROM} where e.id = $1`,
      [data.id],
    );
    if (!rows[0]) throw new Error("Employee not found.");
    const docs = await sql<Record<string, unknown>>`
      select id, filename, mime, uploaded_at from documents
      where employee_id = ${data.id} order by uploaded_at desc
    `;
    const visibleDocs = isHr(actor) || actor.id === data.id;
    return {
      employee: presentEmployee(rows[0], actor, true),
      documents: visibleDocs
        ? docs.map((doc) => ({
            id: num(doc.id),
            filename: String(doc.filename),
            mime: String(doc.mime),
            uploadedAt: stamp(doc.uploaded_at),
          }))
        : [],
    };
  });

type EmployeeInput = {
  id: number | null;
  fullName: string;
  email: string;
  phone: string;
  departmentId: number;
  positionId: number;
  managerId: number | null;
  role: Role;
  status: "active" | "probation" | "resigned";
  hireDate: string;
  contractEnd: string | null;
  dateOfBirth: string;
  gender: string;
  icNo: string;
  address: string;
  basicSalary: number;
  allowance: number;
  annualEntitlement: number;
  annualBalance: number;
  sickBalance: number;
  emergencyContact: string;
  bankName: string;
  bankAccount: string;
  epfNo: string;
  socsoNo: string;
  taxNo: string;
  avatarData: string | null;
};

function readEmployee(input: unknown): EmployeeInput {
  const raw = asRecord(input);
  const role = text(raw.role) as Role;
  const status = text(raw.status) as EmployeeInput["status"];
  if (!["admin", "hr", "employee"].includes(role)) throw new Error("Pick a role.");
  if (!["active", "probation", "resigned"].includes(status)) throw new Error("Pick a status.");
  const fullName = text(raw.fullName);
  const email = text(raw.email).toLowerCase();
  if (fullName.length < 2) throw new Error("Name is required.");
  if (!email.includes("@")) throw new Error("A valid email is required.");
  const hireDate = text(raw.hireDate);
  const dateOfBirth = text(raw.dateOfBirth);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    throw new Error("Hire date and date of birth are required.");
  }
  const avatar = raw.avatarData == null ? null : String(raw.avatarData);
  if (avatar && avatar.length > 180_000) throw new Error("Photo is too large. Use a smaller image.");
  return {
    id: raw.id ? num(raw.id) : null,
    fullName,
    email,
    phone: text(raw.phone),
    departmentId: num(raw.departmentId),
    positionId: num(raw.positionId),
    managerId: raw.managerId ? num(raw.managerId) : null,
    role,
    status,
    hireDate,
    contractEnd: text(raw.contractEnd) || null,
    dateOfBirth,
    gender: text(raw.gender),
    icNo: text(raw.icNo),
    address: text(raw.address),
    basicSalary: num(raw.basicSalary),
    allowance: num(raw.allowance),
    annualEntitlement: num(raw.annualEntitlement),
    annualBalance: num(raw.annualBalance),
    sickBalance: num(raw.sickBalance),
    emergencyContact: text(raw.emergencyContact),
    bankName: text(raw.bankName),
    bankAccount: text(raw.bankAccount),
    epfNo: text(raw.epfNo),
    socsoNo: text(raw.socsoNo),
    taxNo: text(raw.taxNo),
    avatarData: avatar,
  };
}

export const saveEmployee = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(readEmployee)
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    if (data.role === "admin" && actor.role !== "admin") {
      throw new Error("Only an admin can grant the admin role.");
    }
    if (data.managerId === data.id) throw new Error("Someone cannot report to themselves.");
    if (data.id) {
      const current = await sql<{ role: string }>`select role from employees where id = ${data.id}`;
      if (!current[0]) throw new Error("Employee not found.");
      if (current[0].role === "admin" && data.role !== "admin") {
        const admins = await sql<{ n: number }>`
          select count(*)::int as n from employees
          where role = 'admin' and status <> 'resigned' and id <> ${data.id}
        `;
        if (num(admins[0]?.n) === 0) throw new Error("Keep at least one active admin.");
      }
      await sql`
        update employees set
          full_name = ${data.fullName}, email = ${data.email}, phone = ${data.phone},
          department_id = ${data.departmentId}, position_id = ${data.positionId},
          manager_id = ${data.managerId}, role = ${data.role}, status = ${data.status},
          hire_date = ${data.hireDate}, contract_end = ${data.contractEnd},
          date_of_birth = ${data.dateOfBirth}, gender = ${data.gender}, ic_no = ${data.icNo},
          address = ${data.address}, basic_salary = ${data.basicSalary}, allowance = ${data.allowance},
          annual_entitlement = ${data.annualEntitlement}, annual_balance = ${data.annualBalance},
          sick_balance = ${data.sickBalance}, emergency_contact = ${data.emergencyContact},
          bank_name = ${data.bankName}, bank_account = ${data.bankAccount},
          epf_no = ${data.epfNo}, socso_no = ${data.socsoNo}, tax_no = ${data.taxNo},
          avatar_data = coalesce(${data.avatarData}, avatar_data),
          updated_at = now()
        where id = ${data.id}
      `;
      await audit(sql, actor, "update", "employee", String(data.id), `Updated ${data.fullName}.`);
      return { id: data.id };
    }
    const noRow = await sql<{ n: number }>`select coalesce(max(id), 1000)::int as n from employees`;
    const employeeNo = `DH-${1000 + num(noRow[0]?.n) + 1}`;
    const inserted = await sql<{ id: number }>`
      insert into employees (
        employee_no, full_name, email, phone, department_id, position_id, manager_id, role, status,
        hire_date, contract_end, date_of_birth, gender, ic_no, address, avatar_data,
        basic_salary, allowance, annual_entitlement, annual_balance, sick_balance,
        emergency_contact, bank_name, bank_account, epf_no, socso_no, tax_no
      ) values (
        ${employeeNo}, ${data.fullName}, ${data.email}, ${data.phone}, ${data.departmentId},
        ${data.positionId}, ${data.managerId}, ${data.role}, ${data.status}, ${data.hireDate},
        ${data.contractEnd}, ${data.dateOfBirth}, ${data.gender}, ${data.icNo}, ${data.address},
        ${data.avatarData}, ${data.basicSalary}, ${data.allowance}, ${data.annualEntitlement},
        ${data.annualBalance}, ${data.sickBalance}, ${data.emergencyContact}, ${data.bankName},
        ${data.bankAccount}, ${data.epfNo}, ${data.socsoNo}, ${data.taxNo}
      ) returning id
    `;
    await audit(sql, actor, "create", "employee", String(inserted[0].id), `Added ${data.fullName} (${employeeNo}).`);
    return { id: num(inserted[0].id) };
  });

export const updateSelf = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const avatar = raw.avatarData === undefined ? undefined : raw.avatarData == null ? null : String(raw.avatarData);
    if (avatar && avatar.length > 180_000) throw new Error("Photo is too large.");
    return {
      phone: text(raw.phone),
      address: text(raw.address),
      emergencyContact: text(raw.emergencyContact),
      avatarData: avatar,
    };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    if (data.avatarData === undefined) {
      await sql`
        update employees set phone = ${data.phone}, address = ${data.address},
          emergency_contact = ${data.emergencyContact}, updated_at = now()
        where id = ${actor.id}
      `;
    } else {
      await sql`
        update employees set phone = ${data.phone}, address = ${data.address},
          emergency_contact = ${data.emergencyContact}, avatar_data = ${data.avatarData}, updated_at = now()
        where id = ${actor.id}
      `;
    }
    await audit(sql, actor, "update", "employee", String(actor.id), "Updated own contact details.");
    return { ok: true as const };
  });

export const removeEmployee = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    if (actor.role !== "admin") throw new Error("Only an admin can permanently remove someone.");
    if (data.id === actor.id) throw new Error("You can't remove your own record.");
    const reports = await sql<{ n: number }>`
      select count(*)::int as n from employees where manager_id = ${data.id}
    `;
    if (num(reports[0]?.n) > 0) throw new Error("Reassign their direct reports before removing them.");
    const name = await sql<{ full_name: string }>`select full_name from employees where id = ${data.id}`;
    if (!name[0]) throw new Error("Employee not found.");
    await sql`delete from employees where id = ${data.id}`;
    await audit(sql, actor, "delete", "employee", String(data.id), `Removed ${name[0].full_name}.`);
    return { ok: true as const };
  });

export const listOrg = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireActor(context.userId);
    const departments = await sql<Record<string, unknown>>`
      select d.id, d.name, d.code, count(e.id)::int as headcount
      from departments d
      left join employees e on e.department_id = d.id and e.status <> 'resigned'
      group by d.id order by d.name
    `;
    const positions = await sql<Record<string, unknown>>`
      select p.id, p.title, p.department_id, d.name as department, count(e.id)::int as headcount
      from positions p
      join departments d on d.id = p.department_id
      left join employees e on e.position_id = p.id and e.status <> 'resigned'
      group by p.id, d.name order by d.name, p.title
    `;
    const people = await sql<Record<string, unknown>>`
      select id, full_name, manager_id, email from employees where status <> 'resigned' order by full_name
    `;
    return {
      departments: departments.map((row) => ({
        id: num(row.id),
        name: String(row.name),
        code: String(row.code),
        headcount: num(row.headcount),
      })),
      positions: positions.map((row) => ({
        id: num(row.id),
        title: String(row.title),
        departmentId: num(row.department_id),
        department: String(row.department),
        headcount: num(row.headcount),
      })),
      people: people.map((row) => ({
        id: num(row.id),
        name: String(row.full_name),
        managerId: row.manager_id == null ? null : num(row.manager_id),
        email: String(row.email),
      })),
    };
  });

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const name = text(raw.name);
    const code = text(raw.code).toUpperCase();
    if (name.length < 2 || code.length < 2) throw new Error("Department name and code are required.");
    return { id: raw.id ? num(raw.id) : null, name, code };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    if (data.id) {
      await sql`update departments set name = ${data.name}, code = ${data.code} where id = ${data.id}`;
      await audit(sql, actor, "update", "department", String(data.id), data.name);
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into departments (name, code) values (${data.name}, ${data.code}) returning id
    `;
    await audit(sql, actor, "create", "department", String(rows[0].id), data.name);
    return { id: num(rows[0].id) };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    const used = await sql<{ n: number }>`select count(*)::int as n from employees where department_id = ${data.id}`;
    if (num(used[0]?.n) > 0) throw new Error("Move everyone out of this department first.");
    await sql`delete from positions where department_id = ${data.id}`;
    await sql`delete from departments where id = ${data.id}`;
    await audit(sql, actor, "delete", "department", String(data.id), "Deleted a department.");
    return { ok: true as const };
  });

export const savePosition = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const title = text(raw.title);
    if (title.length < 2) throw new Error("Position title is required.");
    return { id: raw.id ? num(raw.id) : null, title, departmentId: num(raw.departmentId) };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    if (data.id) {
      await sql`update positions set title = ${data.title}, department_id = ${data.departmentId} where id = ${data.id}`;
      await audit(sql, actor, "update", "position", String(data.id), data.title);
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into positions (title, department_id) values (${data.title}, ${data.departmentId}) returning id
    `;
    await audit(sql, actor, "create", "position", String(rows[0].id), data.title);
    return { id: num(rows[0].id) };
  });

export const deletePosition = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    const used = await sql<{ n: number }>`select count(*)::int as n from employees where position_id = ${data.id}`;
    if (num(used[0]?.n) > 0) throw new Error("People still hold this position.");
    await sql`delete from positions where id = ${data.id}`;
    await audit(sql, actor, "delete", "position", String(data.id), "Deleted a position.");
    return { ok: true as const };
  });

export const listLeave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql.query<Record<string, unknown>>(
      `select l.id, l.employee_id, e.full_name, e.manager_id, d.name as department, p.title,
              l.leave_type, l.start_date, l.end_date, l.days, l.half_day, l.reason, l.status,
              l.decision_note, l.created_at, l.decided_at, a.full_name as approver_name,
              e.annual_balance, e.sick_balance
       from leave_requests l
       join employees e on e.id = l.employee_id
       join departments d on d.id = e.department_id
       join positions p on p.id = e.position_id
       left join employees a on a.id = l.approver_id
       where ($1 = 'all' or l.employee_id = $2 or e.manager_id = $2)
       order by l.created_at desc`,
      [isHr(actor) ? "all" : "scoped", actor.id],
    );
    return {
      annualBalance: actor.annualBalance,
      sickBalance: actor.sickBalance,
      requests: rows.map((row) => {
        const own = num(row.employee_id) === actor.id;
        const manages = num(row.manager_id) === actor.id;
        const seeReason = own || manages || isHr(actor);
        return {
          id: num(row.id),
          employeeId: num(row.employee_id),
          name: String(row.full_name),
          department: String(row.department),
          title: String(row.title),
          type: String(row.leave_type) as LeaveType,
          start: day(row.start_date),
          end: day(row.end_date),
          days: num(row.days),
          halfDay: Boolean(row.half_day),
          reason: seeReason ? String(row.reason) : "",
          status: String(row.status) as LeaveStatus,
          note: seeReason ? String(row.decision_note ?? "") : "",
          createdAt: stamp(row.created_at),
          decidedAt: stamp(row.decided_at),
          approver: row.approver_name ? String(row.approver_name) : null,
          canDecide:
            String(row.status) === "pending" &&
            !own &&
            (isHr(actor) || manages),
          annualBalance: own || manages || isHr(actor) ? num(row.annual_balance) : null,
          sickBalance: own || manages || isHr(actor) ? num(row.sick_balance) : null,
        };
      }),
    };
  });

export const submitLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const type = text(raw.type) as LeaveType;
    if (!["annual", "sick", "emergency", "unpaid"].includes(type)) throw new Error("Pick a leave type.");
    const start = text(raw.start);
    const end = text(raw.end);
    const reason = text(raw.reason);
    if (reason.length < 3) throw new Error("Add a short reason.");
    return { type, start, end, reason, halfDay: Boolean(raw.halfDay) };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const days = countLeaveDays(data.start, data.end, await holidayDates(sql), data.halfDay);
    if (days <= 0) throw new Error("That range has no working days.");
    const self = await sql<{ annual_balance: unknown; sick_balance: unknown }>`
      select annual_balance, sick_balance from employees where id = ${actor.id}
    `;
    const annual = num(self[0]?.annual_balance);
    const sick = num(self[0]?.sick_balance);
    if ((data.type === "annual" || data.type === "emergency") && annual < days) {
      throw new Error(`Annual balance is ${annual} day(s). This request needs ${days}.`);
    }
    if (data.type === "sick" && sick < days) {
      throw new Error(`Sick balance is ${sick} day(s). This request needs ${days}.`);
    }
    const overlap = await sql<{ id: number }>`
      select id from leave_requests
      where employee_id = ${actor.id} and status in ('pending', 'approved')
        and start_date <= ${data.end}::date and end_date >= ${data.start}::date
    `;
    if (overlap.length) throw new Error("Those dates overlap a leave request that's already open.");
    const rows = await sql<{ id: number }>`
      insert into leave_requests (employee_id, leave_type, start_date, end_date, days, half_day, reason, status)
      values (${actor.id}, ${data.type}, ${data.start}, ${data.end}, ${days}, ${data.halfDay}, ${data.reason}, 'pending')
      returning id
    `;
    await audit(sql, actor, "submit", "leave", String(rows[0].id), `${data.type} leave, ${days} day(s).`);
    return { id: num(rows[0].id), days };
  });

export const decideLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const decision = text(raw.decision);
    if (decision !== "approved" && decision !== "rejected") throw new Error("Approve or reject.");
    return { id: num(raw.id), decision, note: text(raw.note).slice(0, 400) };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const updated = await sql.query<Record<string, unknown>>(
      `with req as (
         select l.* from leave_requests l where l.id = $1 and l.status = 'pending'
       ),
       ok as (
         select r.* from req r
         join employees e on e.id = r.employee_id
         where ($2 in ('admin', 'hr') or e.manager_id = $3)
           and e.id <> $3
           and (
             $4 = 'rejected'
             or r.leave_type = 'unpaid'
             or (r.leave_type in ('annual', 'emergency') and e.annual_balance >= r.days)
             or (r.leave_type = 'sick' and e.sick_balance >= r.days)
           )
       ),
       updated as (
         update leave_requests l
         set status = $4, approver_id = $3, decided_at = now(), decision_note = $5
         from ok where l.id = ok.id
         returning l.*
       )
       update employees e
       set annual_balance = e.annual_balance - case
             when u.status = 'approved' and u.leave_type in ('annual', 'emergency') then u.days else 0 end,
           sick_balance = e.sick_balance - case
             when u.status = 'approved' and u.leave_type = 'sick' then u.days else 0 end,
           updated_at = now()
       from updated u
       where e.id = u.employee_id
       returning u.id, u.status, u.leave_type, u.days, e.full_name`,
      [data.id, actor.role, actor.id, data.decision, data.note],
    );
    if (!updated.length) {
      const current = await sql<Record<string, unknown>>`
        select l.status, l.employee_id, l.leave_type, l.days, e.manager_id, e.annual_balance, e.sick_balance
        from leave_requests l join employees e on e.id = l.employee_id where l.id = ${data.id}
      `;
      const row = current[0];
      if (!row) throw new Error("Leave request not found.");
      if (String(row.status) !== "pending") throw new Error("That request is no longer pending.");
      const manages = num(row.manager_id) === actor.id;
      if (num(row.employee_id) === actor.id || (!isHr(actor) && !manages)) {
        throw new Error("You can't decide this request.");
      }
      throw new Error("Not enough leave balance to approve this.");
    }
    await audit(
      sql,
      actor,
      data.decision === "approved" ? "approve" : "reject",
      "leave",
      String(data.id),
      `${data.decision} ${updated[0].leave_type} leave (${num(updated[0].days)} day(s)).`,
    );
    return { ok: true as const };
  });

export const cancelLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const pending = await sql<{ id: number }>`
      update leave_requests set status = 'cancelled', decided_at = now()
      where id = ${data.id} and employee_id = ${actor.id} and status = 'pending'
      returning id
    `;
    if (pending.length) {
      await audit(sql, actor, "cancel", "leave", String(data.id), "Cancelled a pending request.");
      return { ok: true as const };
    }
    if (!isHr(actor)) throw new Error("Only a pending request of yours can be cancelled.");
    const restored = await sql.query(
      `with updated as (
         update leave_requests set status = 'cancelled', decided_at = now(), approver_id = $2
         where id = $1 and status = 'approved'
         returning *
       )
       update employees e
       set annual_balance = e.annual_balance + case when u.leave_type in ('annual', 'emergency') then u.days else 0 end,
           sick_balance = e.sick_balance + case when u.leave_type = 'sick' then u.days else 0 end,
           updated_at = now()
       from updated u where e.id = u.employee_id
       returning u.id`,
      [data.id, actor.id],
    );
    if (!restored.length) throw new Error("Nothing to cancel.");
    await audit(sql, actor, "cancel", "leave", String(data.id), "Cancelled approved leave and restored the balance.");
    return { ok: true as const };
  });

export const listAttendance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input ?? {});
    const month = text(raw.month) || klParts().date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Pick a month.");
    return { month, employeeId: raw.employeeId ? num(raw.employeeId) : null };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const start = `${data.month}-01`;
    const rows = await sql.query<Record<string, unknown>>(
      `select a.id, a.employee_id, e.full_name, d.name as department, a.work_date,
              a.clock_in, a.clock_out, a.late_minutes, a.ot_minutes
       from attendance a
       join employees e on e.id = a.employee_id
       join departments d on d.id = e.department_id
       where a.work_date >= $1::date and a.work_date < ($1::date + interval '1 month')
         and ($2::int is null or a.employee_id = $2)
         and ($3 = 'all' or e.id = $4 or ($3 = 'team' and (e.id = $4 or e.manager_id = $4)))
       order by a.work_date desc, e.full_name`,
      [
        start,
        data.employeeId,
        isHr(actor) ? "all" : actor.reportCount > 0 ? "team" : "self",
        actor.id,
      ],
    );
    const people = await sql.query<Record<string, unknown>>(
      `select id, full_name from employees
       where status <> 'resigned' and ($1 = 'all' or id = $2 or ($1 = 'team' and (id = $2 or manager_id = $2)))
       order by full_name`,
      [isHr(actor) ? "all" : actor.reportCount > 0 ? "team" : "self", actor.id],
    );
    return {
      month: data.month,
      today: klParts().date,
      rows: rows.map((row) => ({
        id: num(row.id),
        employeeId: num(row.employee_id),
        name: String(row.full_name),
        department: String(row.department),
        date: day(row.work_date),
        clockIn: stamp(row.clock_in),
        clockOut: stamp(row.clock_out),
        late: num(row.late_minutes),
        ot: num(row.ot_minutes),
      })),
      people: people.map((row) => ({ id: num(row.id), name: String(row.full_name) })),
    };
  });

export const clock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const action = text(asRecord(input).action);
    if (action !== "in" && action !== "out") throw new Error("Clock in or out.");
    return { action };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const now = new Date();
    const parts = klParts(now);
    const existing = await sql<Record<string, unknown>>`
      select id, clock_in, clock_out from attendance
      where employee_id = ${actor.id} and work_date = ${parts.date}::date
    `;
    if (data.action === "in") {
      if (existing[0]?.clock_in) throw new Error("You already clocked in today.");
      const late = lateMinutes(parts.minutes);
      await sql`
        insert into attendance (employee_id, work_date, clock_in, late_minutes)
        values (${actor.id}, ${parts.date}, ${now.toISOString()}, ${late})
      `;
      await audit(sql, actor, "clock-in", "attendance", parts.date, late ? `Late by ${late} minutes.` : "On time.");
      return { late, ot: 0 };
    }
    if (!existing[0]?.clock_in) throw new Error("Clock in before clocking out.");
    if (existing[0].clock_out) throw new Error("You already clocked out today.");
    const rawIn = existing[0].clock_in;
    const started = klParts(rawIn instanceof Date ? rawIn : new Date(String(rawIn)));
    let outMin = parts.minutes;
    if (parts.date > started.date) outMin += 24 * 60;
    const ot = overtimeMinutes(outMin);
    await sql`
      update attendance set clock_out = ${now.toISOString()}, ot_minutes = ${ot}
      where id = ${num(existing[0].id)}
    `;
    await audit(sql, actor, "clock-out", "attendance", parts.date, ot ? `Overtime ${ot} minutes.` : "Clocked out.");
    return { late: lateMinutes(started.minutes), ot };
  });

export const listPayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const period = text(asRecord(input ?? {}).period) || previousPeriod(klParts().date);
    if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Pick a month.");
    return { period };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql.query<Record<string, unknown>>(
      `select s.id, s.employee_id, e.full_name, e.employee_no, d.name as department,
              s.period, s.gross, s.net, s.epf_employee, s.socso_employee, s.eis_employee
       from payslips s
       join employees e on e.id = s.employee_id
       join departments d on d.id = e.department_id
       where s.period = $1 and ($2 = 'all' or s.employee_id = $3)
       order by e.full_name`,
      [data.period, isHr(actor) ? "all" : "self", actor.id],
    );
    return {
      period: data.period,
      canGenerate: isHr(actor),
      slips: rows.map((row) => ({
        id: num(row.id),
        employeeId: num(row.employee_id),
        name: String(row.full_name),
        employeeNo: String(row.employee_no),
        department: String(row.department),
        gross: num(row.gross),
        net: num(row.net),
        epf: num(row.epf_employee),
        socso: num(row.socso_employee),
        eis: num(row.eis_employee),
      })),
      tables: isHr(actor) ? statutoryTables() : null,
    };
  });

export const generatePayroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const period = text(asRecord(input).period);
    if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Pick a month.");
    return { period };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    const people = await sql<Record<string, unknown>>`
      select id, full_name, date_of_birth, basic_salary, allowance
      from employees where status <> 'resigned' order by id
    `;
    const end = periodEnd(data.period);
    for (const person of people) {
      const pay = calculatePayroll({
        basic: num(person.basic_salary),
        allowance: num(person.allowance),
        age: ageOn(day(person.date_of_birth) ?? "1990-01-01", end),
      });
      await sql`
        insert into payslips (
          employee_id, period, basic, allowance, gross, epf_employee, epf_employer,
          socso_employee, socso_employer, eis_employee, eis_employer, pcb, net, employer_cost,
          socso_category, generated_at
        ) values (
          ${num(person.id)}, ${data.period}, ${pay.basic}, ${pay.allowance}, ${pay.gross},
          ${pay.epf.employee}, ${pay.epf.employer}, ${pay.socso.employee}, ${pay.socso.employer},
          ${pay.eis.employee}, ${pay.eis.employer}, ${pay.pcb}, ${pay.net}, ${pay.employerCost},
          ${pay.socsoCategory}, now()
        )
        on conflict (employee_id, period) do update set
          basic = excluded.basic, allowance = excluded.allowance, gross = excluded.gross,
          epf_employee = excluded.epf_employee, epf_employer = excluded.epf_employer,
          socso_employee = excluded.socso_employee, socso_employer = excluded.socso_employer,
          eis_employee = excluded.eis_employee, eis_employer = excluded.eis_employer,
          pcb = excluded.pcb, net = excluded.net, employer_cost = excluded.employer_cost,
          socso_category = excluded.socso_category, generated_at = now()
      `;
    }
    await audit(sql, actor, "generate", "payroll", data.period, `Generated ${people.length} payslips.`);
    return { count: people.length };
  });

export const getPayslip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql<Record<string, unknown>>`
      select s.*, e.full_name, e.employee_no, e.ic_no, e.epf_no, e.socso_no, e.tax_no,
        e.bank_name, e.bank_account, d.name as department, p.title, e.date_of_birth
      from payslips s
      join employees e on e.id = s.employee_id
      join departments d on d.id = e.department_id
      join positions p on p.id = e.position_id
      where s.id = ${data.id}
    `;
    const row = rows[0];
    if (!row) throw new Error("Payslip not found.");
    if (!isHr(actor) && num(row.employee_id) !== actor.id) throw new Error("That payslip isn't yours.");
    const age = ageOn(day(row.date_of_birth) ?? "1990-01-01", periodEnd(String(row.period)));
    const computed = calculatePayroll({
      basic: num(row.basic),
      allowance: num(row.allowance),
      age,
    });
    return {
      id: num(row.id),
      period: String(row.period),
      name: String(row.full_name),
      employeeNo: String(row.employee_no),
      department: String(row.department),
      title: String(row.title),
      icNo: String(row.ic_no ?? ""),
      epfNo: String(row.epf_no ?? ""),
      socsoNo: String(row.socso_no ?? ""),
      taxNo: String(row.tax_no ?? ""),
      bankName: String(row.bank_name ?? ""),
      bankAccount: String(row.bank_account ?? ""),
      generatedAt: stamp(row.generated_at),
      ...computed,
    };
  });

export const listHolidays = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql<Record<string, unknown>>`
      select id, name, holiday_date, scope from holidays order by holiday_date
    `;
    return {
      canEdit: isHr(actor),
      holidays: rows.map((row) => ({
        id: num(row.id),
        name: String(row.name),
        date: day(row.holiday_date) ?? "",
        scope: String(row.scope),
      })),
    };
  });

export const saveHoliday = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const name = text(raw.name);
    const date = text(raw.date);
    if (name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Name and date are required.");
    return { id: raw.id ? num(raw.id) : null, name, date, scope: text(raw.scope) || "Kuala Lumpur" };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    if (data.id) {
      await sql`
        update holidays set name = ${data.name}, holiday_date = ${data.date}, scope = ${data.scope}
        where id = ${data.id}
      `;
      await audit(sql, actor, "update", "holiday", String(data.id), `${data.name} · ${data.date}`);
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into holidays (name, holiday_date, scope) values (${data.name}, ${data.date}, ${data.scope})
      returning id
    `;
    await audit(sql, actor, "create", "holiday", String(rows[0].id), `${data.name} · ${data.date}`);
    return { id: num(rows[0].id) };
  });

export const deleteHoliday = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    await sql`delete from holidays where id = ${data.id}`;
    await audit(sql, actor, "delete", "holiday", String(data.id), "Removed a holiday.");
    return { ok: true as const };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql, actor } = await requireActor(context.userId);
    assertHr(actor);
    const rows = await sql<Record<string, unknown>>`
      select id, actor_name, action, entity, entity_id, detail, created_at
      from audit_logs order by id desc limit 200
    `;
    return rows.map((row) => ({
      id: num(row.id),
      actor: String(row.actor_name),
      action: String(row.action),
      entity: String(row.entity),
      entityId: String(row.entity_id ?? ""),
      detail: String(row.detail ?? ""),
      at: stamp(row.created_at),
    }));
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = asRecord(input);
    const filename = text(raw.filename).slice(0, 120);
    const mime = text(raw.mime).slice(0, 80);
    const data = typeof raw.data === "string" ? raw.data : "";
    const employeeId = num(raw.employeeId);
    if (!filename || !data) throw new Error("Choose a file.");
    if (data.length > 420_000) throw new Error("File is over 300KB. Keep documents small in this demo.");
    return { employeeId, filename, mime: mime || "application/octet-stream", data };
  })
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    if (!isHr(actor) && actor.id !== data.employeeId) throw new Error("You can only upload to your own file.");
    const rows = await sql<{ id: number }>`
      insert into documents (employee_id, filename, mime, data, uploaded_by)
      values (${data.employeeId}, ${data.filename}, ${data.mime}, ${data.data}, ${actor.id})
      returning id
    `;
    await audit(sql, actor, "upload", "document", String(rows[0].id), data.filename);
    return { id: num(rows[0].id) };
  });

export const getDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(asRecord(input).id) }))
  .handler(async ({ context, data }) => {
    const { sql, actor } = await requireActor(context.userId);
    const rows = await sql<Record<string, unknown>>`
      select id, employee_id, filename, mime, data from documents where id = ${data.id}
    `;
    const row = rows[0];
    if (!row) throw new Error("File not found.");
    if (!isHr(actor) && num(row.employee_id) !== actor.id) throw new Error("That file isn't yours.");
    return {
      filename: String(row.filename),
      mime: String(row.mime),
      data: String(row.data),
    };
  });

function previousPeriod(today: string): string {
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
