import { useState } from "react";
import { Button, Field, Input, Select, shrinkImage } from "./ui";
import type { listOrg } from "@/lib/hr/api";

type Org = Awaited<ReturnType<typeof listOrg>>;

export type EmployeeDraft = {
  id: number | null;
  fullName: string;
  email: string;
  phone: string;
  departmentId: number;
  positionId: number;
  managerId: number | null;
  role: "admin" | "hr" | "employee";
  status: "active" | "probation" | "resigned";
  hireDate: string;
  contractEnd: string;
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

export function blankDraft(org: Org): EmployeeDraft {
  return {
    id: null,
    fullName: "",
    email: "",
    phone: "",
    departmentId: org.departments[0]?.id ?? 0,
    positionId: org.positions.find((item) => item.departmentId === org.departments[0]?.id)?.id ?? org.positions[0]?.id ?? 0,
    managerId: null,
    role: "employee",
    status: "active",
    hireDate: new Date().toISOString().slice(0, 10),
    contractEnd: "",
    dateOfBirth: "1995-01-01",
    gender: "",
    icNo: "",
    address: "",
    basicSalary: 4000,
    allowance: 0,
    annualEntitlement: 14,
    annualBalance: 14,
    sickBalance: 14,
    emergencyContact: "",
    bankName: "Maybank",
    bankAccount: "",
    epfNo: "",
    socsoNo: "",
    taxNo: "",
    avatarData: null,
  };
}

export function EmployeeForm({
  initial,
  org,
  allowAdmin,
  pending,
  onSubmit,
}: {
  initial: EmployeeDraft;
  org: Org;
  allowAdmin: boolean;
  pending: boolean;
  onSubmit: (draft: EmployeeDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const positions = org.positions.filter((item) => item.departmentId === draft.departmentId);
  function set<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <Field label="Full name">
        <Input value={draft.fullName} onChange={(event) => set("fullName", event.target.value)} required />
      </Field>
      <Field label="Email">
        <Input type="email" value={draft.email} onChange={(event) => set("email", event.target.value)} required />
      </Field>
      <Field label="Phone">
        <Input value={draft.phone} onChange={(event) => set("phone", event.target.value)} />
      </Field>
      <Field label="Gender">
        <Input value={draft.gender} onChange={(event) => set("gender", event.target.value)} />
      </Field>
      <Field label="Department">
        <Select
          value={draft.departmentId}
          onChange={(event) => {
            const departmentId = Number(event.target.value);
            const next = org.positions.find((item) => item.departmentId === departmentId);
            setDraft((current) => ({ ...current, departmentId, positionId: next?.id ?? current.positionId }));
          }}
        >
          {org.departments.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Position">
        <Select value={draft.positionId} onChange={(event) => set("positionId", Number(event.target.value))}>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>{position.title}</option>
          ))}
        </Select>
      </Field>
      <Field label="Reports to">
        <Select value={draft.managerId ?? ""} onChange={(event) => set("managerId", event.target.value ? Number(event.target.value) : null)}>
          <option value="">No manager</option>
          {org.people.filter((person) => person.id !== draft.id).map((person) => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Role">
        <Select value={draft.role} onChange={(event) => set("role", event.target.value as EmployeeDraft["role"])}>
          <option value="employee">Employee</option>
          <option value="hr">HR</option>
          {allowAdmin && <option value="admin">Admin</option>}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={draft.status} onChange={(event) => set("status", event.target.value as EmployeeDraft["status"])}>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="resigned">Resigned</option>
        </Select>
      </Field>
      <Field label="Hire date">
        <Input type="date" value={draft.hireDate} onChange={(event) => set("hireDate", event.target.value)} required />
      </Field>
      <Field label="Contract end">
        <Input type="date" value={draft.contractEnd} onChange={(event) => set("contractEnd", event.target.value)} />
      </Field>
      <Field label="Date of birth">
        <Input type="date" value={draft.dateOfBirth} onChange={(event) => set("dateOfBirth", event.target.value)} required />
      </Field>
      <Field label="IC number">
        <Input value={draft.icNo} onChange={(event) => set("icNo", event.target.value)} />
      </Field>
      <Field label="Basic salary (RM)">
        <Input type="number" min={0} step="0.01" value={draft.basicSalary} onChange={(event) => set("basicSalary", Number(event.target.value))} />
      </Field>
      <Field label="Fixed allowance (RM)">
        <Input type="number" min={0} step="0.01" value={draft.allowance} onChange={(event) => set("allowance", Number(event.target.value))} />
      </Field>
      <Field label="Annual entitlement">
        <Input type="number" min={0} step="0.5" value={draft.annualEntitlement} onChange={(event) => set("annualEntitlement", Number(event.target.value))} />
      </Field>
      <Field label="Annual balance">
        <Input type="number" min={0} step="0.5" value={draft.annualBalance} onChange={(event) => set("annualBalance", Number(event.target.value))} />
      </Field>
      <Field label="Sick balance">
        <Input type="number" min={0} step="0.5" value={draft.sickBalance} onChange={(event) => set("sickBalance", Number(event.target.value))} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address">
          <Input value={draft.address} onChange={(event) => set("address", event.target.value)} />
        </Field>
      </div>
      <Field label="Emergency contact">
        <Input value={draft.emergencyContact} onChange={(event) => set("emergencyContact", event.target.value)} />
      </Field>
      <Field label="Bank">
        <Input value={draft.bankName} onChange={(event) => set("bankName", event.target.value)} />
      </Field>
      <Field label="Account number">
        <Input value={draft.bankAccount} onChange={(event) => set("bankAccount", event.target.value)} />
      </Field>
      <Field label="EPF no.">
        <Input value={draft.epfNo} onChange={(event) => set("epfNo", event.target.value)} />
      </Field>
      <Field label="SOCSO no.">
        <Input value={draft.socsoNo} onChange={(event) => set("socsoNo", event.target.value)} />
      </Field>
      <Field label="Tax no.">
        <Input value={draft.taxNo} onChange={(event) => set("taxNo", event.target.value)} />
      </Field>
      <Field label="Photo">
        <Input
          type="file"
          accept="image/*"
          className="py-2"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            set("avatarData", await shrinkImage(file));
          }}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save employee"}</Button>
      </div>
    </form>
  );
}
