import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmployeeForm, type EmployeeDraft } from "@/components/hr/employee-form";
import { useWorkspace } from "@/components/hr/shell";
import { Avatar, Badge, Button, Field, Input, Modal, errText, readDataUrl, shrinkImage, statusTone } from "@/components/hr/ui";
import { getDocument, getEmployee, listOrg, removeEmployee, saveEmployee, updateSelf, uploadDocument } from "@/lib/hr/api";
import { formatDate, formatDays, rm, titleCase } from "@/lib/hr/format";

export const Route = createFileRoute("/_app/people/$employeeId")({ component: EmployeePage });

function EmployeePage() {
  const { employeeId } = Route.useParams();
  const id = Number(employeeId);
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const person = useQuery({ queryKey: ["employee", id], queryFn: () => getEmployee({ data: { id } }) });
  const org = useQuery({ queryKey: ["org"], queryFn: () => listOrg(), enabled: Boolean(workspace.data?.actor?.canManagePeople) });
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const actor = workspace.data?.actor;
  const employee = person.data?.employee;
  const own = actor?.id === employee?.id;

  async function save(draft: EmployeeDraft) {
    setPending(true);
    try {
      await saveEmployee({ data: { ...draft, id, contractEnd: draft.contractEnd || null } });
      toast.success("Saved");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["employee", id] });
      await queryClient.invalidateQueries({ queryKey: ["people"] });
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm("Remove this person and their payslips permanently?")) return;
    try {
      await removeEmployee({ data: { id } });
      toast.success("Removed");
      window.location.href = "/people";
    } catch (error) {
      toast.error(errText(error));
    }
  }

  if (person.isPending) return <p className="text-sm text-muted">Loading profile…</p>;
  if (person.isError || !employee) return <p className="text-sm text-danger">{person.isError ? errText(person.error) : "Not found"}</p>;

  const draft: EmployeeDraft | null = employee.basicSalary == null ? null : {
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    departmentId: employee.departmentId,
    positionId: employee.positionId,
    managerId: employee.managerId,
    role: employee.role,
    status: employee.status as EmployeeDraft["status"],
    hireDate: employee.hireDate ?? "",
    contractEnd: employee.contractEnd ?? "",
    dateOfBirth: employee.dateOfBirth ?? "",
    gender: employee.gender,
    icNo: employee.icNo,
    address: employee.address,
    basicSalary: employee.basicSalary,
    allowance: employee.allowance ?? 0,
    annualEntitlement: employee.annualEntitlement ?? 0,
    annualBalance: employee.annualBalance ?? 0,
    sickBalance: employee.sickBalance ?? 0,
    emergencyContact: employee.emergencyContact,
    bankName: employee.bankName,
    bankAccount: employee.bankAccount,
    epfNo: employee.epfNo,
    socsoNo: employee.socsoNo,
    taxNo: employee.taxNo,
    avatarData: null,
  };

  return (
    <div className="space-y-6">
      <Link to="/people" className="text-sm text-muted">Back to people</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.fullName} src={employee.avatarData} className="h-16 w-16 text-xl" />
          <div>
            <h1 className="font-display text-4xl">{employee.fullName}</h1>
            <p className="text-sm text-muted">{employee.employeeNo} · {employee.title} · {employee.department}</p>
            <div className="mt-2 flex gap-2">
              <Badge tone={statusTone(employee.status)}>{titleCase(employee.status)}</Badge>
              <Badge>{employee.role === "hr" ? "HR" : titleCase(employee.role)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {actor?.canManagePeople && <Button onClick={() => setEditing(true)}>Edit</Button>}
          {actor?.canHardDelete && !own && <Button variant="danger" onClick={remove}>Remove</Button>}
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label="Reports to" value={employee.managerName ?? "—"} />
        <Fact label="Email" value={employee.email} />
        <Fact label="Phone" value={employee.phone || "—"} />
        <Fact label="Hired" value={formatDate(employee.hireDate)} />
        <Fact label="Contract end" value={formatDate(employee.contractEnd)} />
        <Fact label="Direct reports" value={String(employee.reportCount)} />
        {employee.annualBalance != null && <Fact label="Annual left" value={`${formatDays(employee.annualBalance)} / ${formatDays(employee.annualEntitlement ?? 0)}`} />}
        {employee.sickBalance != null && <Fact label="Sick left" value={formatDays(employee.sickBalance)} />}
        {employee.basicSalary != null && <Fact label="Basic" value={rm(employee.basicSalary)} />}
        {employee.allowance != null && <Fact label="Allowance" value={rm(employee.allowance)} />}
        {employee.address && <Fact label="Address" value={employee.address} />}
        {employee.icNo && <Fact label="IC" value={employee.icNo} />}
        {employee.bankAccount && <Fact label="Bank" value={`${employee.bankName} ${employee.bankAccount}`} />}
      </section>
      {own && !actor?.canManagePeople && (
        <SelfCard
          phone={employee.phone}
          address={employee.address}
          emergency={employee.emergencyContact}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["employee", id] })}
        />
      )}
      {(own || actor?.canManagePeople) && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Files</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {person.data?.documents.length === 0 && <li className="py-2 text-muted">No files yet.</li>}
            {person.data?.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-2">
                <span>{doc.filename}</span>
                <button
                  type="button"
                  className="text-accent"
                  onClick={async () => {
                    const file = await getDocument({ data: { id: doc.id } });
                    const link = document.createElement("a");
                    link.href = file.data;
                    link.download = file.filename;
                    link.click();
                  }}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
          <Field label="Upload">
            <Input
              type="file"
              className="mt-2 py-2"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 300_000) {
                  toast.error("Keep files under 300KB.");
                  return;
                }
                try {
                  await uploadDocument({
                    data: { employeeId: id, filename: file.name, mime: file.type, data: await readDataUrl(file) },
                  });
                  toast.success("Uploaded");
                  await queryClient.invalidateQueries({ queryKey: ["employee", id] });
                } catch (error) {
                  toast.error(errText(error));
                }
              }}
            />
          </Field>
        </section>
      )}
      {editing && draft && org.data && (
        <Modal open title="Edit employee" onClose={() => setEditing(false)}>
          <EmployeeForm initial={draft} org={org.data} allowAdmin={actor?.role === "admin"} pending={pending} onSubmit={save} />
        </Modal>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function SelfCard({
  phone,
  address,
  emergency,
  onSaved,
}: {
  phone: string;
  address: string;
  emergency: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ phone, address, emergencyContact: emergency });
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        try {
          await updateSelf({ data: form });
          toast.success("Contact details saved");
          onSaved();
        } catch (error) {
          toast.error(errText(error));
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-display text-2xl sm:col-span-2">Your details</h2>
      <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Emergency contact"><Input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></Field>
      <div className="sm:col-span-2">
        <Field label="Address"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
      </div>
      <Field label="Photo">
        <Input
          type="file"
          accept="image/*"
          className="py-2"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await updateSelf({ data: { ...form, avatarData: await shrinkImage(file) } });
              toast.success("Photo updated");
              onSaved();
            } catch (error) {
              toast.error(errText(error));
            }
          }}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>Save details</Button>
      </div>
    </form>
  );
}
