/** Shared demo seats. Passwords are intentional — this workspace is an interview demo. */
export const DEMO_PASSWORD = "DemoHR#2026";

export const DEMO_SEATS = [
  {
    seat: "admin",
    email: "adrian.teh@demohr.example",
    name: "Adrian Teh",
    title: "Chief Executive Officer",
    blurb: "Full access, including the audit log and permanent removal.",
  },
  {
    seat: "hr",
    email: "aisha.rahman@demohr.example",
    name: "Aisha Rahman",
    title: "Head of People",
    blurb: "Roster, payroll, holidays, and every leave request.",
  },
  {
    seat: "manager",
    email: "priya.nair@demohr.example",
    name: "Priya Nair",
    title: "Engineering Manager",
    blurb: "An employee. She can approve only her direct reports.",
  },
  {
    seat: "employee",
    email: "daniel.ong@demohr.example",
    name: "Daniel Ong",
    title: "Software Engineer",
    blurb: "Own profile, leave, clock-in, and payslips. Nothing else.",
  },
] as const;

export type DemoSeat = (typeof DEMO_SEATS)[number]["seat"];
