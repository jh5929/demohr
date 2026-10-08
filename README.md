# Demo HR

People operations for **DEMO SDN BHD** — a Kuala Lumpur HR workspace you can click through in an interview.

It is a full-stack web app (React, TanStack Start, Postgres) with real sign-in. Roles are enforced on the server, not only hidden in the menu.

## What it does

- **Sign-in and roles.** Admin, HR, and Employee. A manager is an employee who can approve only their direct reports.
- **People.** Create, edit, search, filter by department, position, and status. Photo and small file uploads.
- **Organisation.** Departments, positions, and a reporting line (`manager_id`).
- **Leave.** Submit, approve, reject, cancel. Status moves pending → approved or rejected. Working days skip weekends and the KL holiday calendar. Annual, emergency, and sick leave reduce the balance when approved; cancelling an approved request puts the days back.
- **Dashboard.** Headcount, who is out today, approvals waiting on you, birthdays this month, contracts ending within 60 days.
- **Malaysia payroll.** Gross = basic + fixed allowance.
  - EPF: employee 11%. Employer 13% at or below RM5,000, otherwise 12%. Rounded to the sen (not the KWSP ringgit band table).
  - SOCSO: Act 4 lookup, wage ceiling RM6,000 from 1 Oct 2024. First Category under 60, Second Category (employer only) at 60+.
  - EIS: Act 800 lookup, same ceiling, equal shares.
  - PCB / monthly tax is **not** calculated.
  - Payslips open in a print view. Use **Save PDF** and choose “Save as PDF” in the browser dialog.
- **Attendance.** Clock in and clock out (Asia/Kuala_Lumpur). Grace is 15 minutes; lateness is then counted from 09:00. Overtime is minutes after 18:00. Export the month to Excel.
- **Audit log** for HR and admin.

## Demo seats

Password for every seeded account: `DemoHR#2026`

| Seat | Person | Email |
| --- | --- | --- |
| Admin | Adrian Teh, CEO | adrian.teh@demohr.example |
| HR | Aisha Rahman, Head of People | aisha.rahman@demohr.example |
| Manager | Priya Nair, Engineering Manager | priya.nair@demohr.example |
| Employee | Daniel Ong, Software Engineer | daniel.ong@demohr.example |

If you are already signed in with another account, the workspace asks you to pick one of these seats. Switching seat is part of the demo so an interviewer can see each permission set. In a production deployment that switcher would be removed and roles would be assigned in the database.

The roster has 20 people, seven departments, September 2026 payslips, October attendance, and open leave for Priya and Aisha to act on. Hafiz Abdullah is on sick leave on 8 Oct 2026. Farah Nadia’s birthday is 8 Oct. Benjamin Tan’s contract ends 20 Nov 2026.

## Tests

Payroll, leave-day counting, and lateness / overtime:

```bash
node --experimental-strip-types --test src/lib/hr/payroll.test.ts src/lib/hr/leave-days.test.ts src/lib/hr/attendance-calc.test.ts
```

## Stack

TypeScript, TanStack Start, Better Auth (email, Google, X), Postgres (Neon when deployed, embedded Postgres in the live preview), Tailwind.

Holiday dates for Kuala Lumpur 2026 include replacement days. Islamic dates follow a published calendar and can be edited under Holidays.
