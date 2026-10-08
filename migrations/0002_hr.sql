-- DEMO SDN BHD people workspace.

create table if not exists departments (
  id serial primary key,
  name text not null unique,
  code text not null unique
);

create table if not exists positions (
  id serial primary key,
  department_id integer not null references departments (id),
  title text not null,
  unique (department_id, title)
);

create table if not exists employees (
  id serial primary key,
  employee_no text not null unique,
  full_name text not null,
  email text not null unique,
  phone text not null default '',
  department_id integer not null references departments (id),
  position_id integer not null references positions (id),
  manager_id integer references employees (id),
  role text not null check (role in ('admin', 'hr', 'employee')),
  status text not null check (status in ('active', 'probation', 'resigned')),
  hire_date date not null,
  contract_end date,
  date_of_birth date not null,
  gender text not null default '',
  ic_no text not null default '',
  address text not null default '',
  avatar_data text,
  basic_salary numeric(12, 2) not null,
  allowance numeric(12, 2) not null default 0,
  annual_entitlement numeric(5, 1) not null,
  annual_balance numeric(5, 1) not null,
  sick_balance numeric(5, 1) not null,
  emergency_contact text not null default '',
  bank_name text not null default '',
  bank_account text not null default '',
  epf_no text not null default '',
  socso_no text not null default '',
  tax_no text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_department_idx on employees (department_id);
create index if not exists employees_manager_idx on employees (manager_id);
create index if not exists employees_status_idx on employees (status);

create table if not exists memberships (
  user_id text primary key,
  employee_id integer not null references employees (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists leave_requests (
  id serial primary key,
  employee_id integer not null references employees (id) on delete cascade,
  leave_type text not null check (leave_type in ('annual', 'sick', 'emergency', 'unpaid')),
  start_date date not null,
  end_date date not null,
  days numeric(5, 1) not null,
  half_day boolean not null default false,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id integer references employees (id),
  decided_at timestamptz,
  decision_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists leave_employee_idx on leave_requests (employee_id);
create index if not exists leave_status_idx on leave_requests (status);

create table if not exists attendance (
  id serial primary key,
  employee_id integer not null references employees (id) on delete cascade,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  late_minutes integer not null default 0,
  ot_minutes integer not null default 0,
  unique (employee_id, work_date)
);

create table if not exists holidays (
  id serial primary key,
  name text not null,
  holiday_date date not null unique,
  scope text not null default 'Kuala Lumpur'
);

create table if not exists payslips (
  id serial primary key,
  employee_id integer not null references employees (id) on delete cascade,
  period text not null,
  basic numeric(12, 2) not null,
  allowance numeric(12, 2) not null,
  gross numeric(12, 2) not null,
  epf_employee numeric(12, 2) not null,
  epf_employer numeric(12, 2) not null,
  socso_employee numeric(12, 2) not null,
  socso_employer numeric(12, 2) not null,
  eis_employee numeric(12, 2) not null,
  eis_employer numeric(12, 2) not null,
  pcb numeric(12, 2) not null default 0,
  net numeric(12, 2) not null,
  employer_cost numeric(12, 2) not null,
  socso_category integer not null,
  generated_at timestamptz not null default now(),
  unique (employee_id, period)
);

create table if not exists documents (
  id serial primary key,
  employee_id integer not null references employees (id) on delete cascade,
  filename text not null,
  mime text not null,
  data text not null,
  uploaded_by integer references employees (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id serial primary key,
  actor_employee_id integer references employees (id) on delete set null,
  actor_name text not null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_created_idx on audit_logs (created_at desc);

create table if not exists hr_meta (
  key text primary key,
  value text not null
);
