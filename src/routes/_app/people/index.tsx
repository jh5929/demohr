import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmployeeForm, blankDraft, type EmployeeDraft } from "@/components/hr/employee-form";
import { useWorkspace } from "@/components/hr/shell";
import { Avatar, Badge, Button, Empty, Field, Input, Modal, Select, errText, statusTone } from "@/components/hr/ui";
import { listEmployees, listOrg, saveEmployee } from "@/lib/hr/api";
import { rm, titleCase } from "@/lib/hr/format";

export const Route = createFileRoute("/_app/people/")({ component: PeoplePage });

function PeoplePage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [status, setStatus] = useState("current");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const org = useQuery({ queryKey: ["org"], queryFn: () => listOrg() });
  const people = useQuery({
    queryKey: ["people", q, departmentId, positionId, status],
    queryFn: () => listEmployees({ data: { q, departmentId, positionId, status } }),
  });
  const canEdit = workspace.data?.actor?.canManagePeople;
  const positions = (org.data?.positions ?? []).filter((item) => !departmentId || item.departmentId === departmentId);

  async function create(draft: EmployeeDraft) {
    setPending(true);
    try {
      await saveEmployee({ data: { ...draft, contractEnd: draft.contractEnd || null } });
      toast.success("Employee saved");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["people"] });
      await queryClient.invalidateQueries({ queryKey: ["org"] });
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">People</h1>
          <p className="mt-1 text-sm text-muted">Search by name, email, staff number, department, or position.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)} disabled={!org.data}>Add employee</Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Search">
          <Input value={q} placeholder="Name or staff no." onChange={(event) => setQ(event.target.value)} />
        </Field>
        <Field label="Department">
          <Select value={departmentId ?? ""} onChange={(event) => { setDepartmentId(event.target.value ? Number(event.target.value) : null); setPositionId(null); }}>
            <option value="">All</option>
            {org.data?.departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </Select>
        </Field>
        <Field label="Position">
          <Select value={positionId ?? ""} onChange={(event) => setPositionId(event.target.value ? Number(event.target.value) : null)}>
            <option value="">All</option>
            {positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="current">Current</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="resigned">Resigned</option>
            <option value="all">All</option>
          </Select>
        </Field>
      </div>
      {people.isPending ? <p className="text-sm text-muted">Loading roster…</p> : null}
      {people.isError ? <p className="text-sm text-danger">{errText(people.error)}</p> : null}
      {people.data && people.data.length === 0 ? <Empty title="No one matches" body="Try another department or clear the search." /> : null}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Manager</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 font-medium">Salary</th>}
            </tr>
          </thead>
          <tbody>
            {people.data?.map((person) => (
              <tr key={person.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link to="/people/$employeeId" params={{ employeeId: String(person.id) }} className="flex items-center gap-3">
                    <Avatar name={person.fullName} className="h-9 w-9 text-xs" />
                    <span>
                      <span className="block font-medium">{person.fullName}</span>
                      <span className="text-xs text-muted">{person.employeeNo}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">{person.department}</td>
                <td className="px-4 py-3">{person.title}</td>
                <td className="px-4 py-3 text-muted">{person.managerName ?? "—"}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(person.status)}>{titleCase(person.status)}</Badge></td>
                {canEdit && <td className="px-4 py-3 tabular-nums">{person.basicSalary == null ? "—" : rm(person.basicSalary)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {people.data?.map((person) => (
          <Link key={person.id} to="/people/$employeeId" params={{ employeeId: String(person.id) }} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <Avatar name={person.fullName} className="h-11 w-11" />
              <div>
                <p className="font-medium">{person.fullName}</p>
                <p className="text-sm text-muted">{person.title} · {person.department}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {org.data && (
        <Modal open={open} title="New employee" onClose={() => setOpen(false)}>
          <EmployeeForm
            initial={blankDraft(org.data)}
            org={org.data}
            allowAdmin={workspace.data?.actor?.role === "admin"}
            pending={pending}
            onSubmit={create}
          />
        </Modal>
      )}
    </div>
  );
}
