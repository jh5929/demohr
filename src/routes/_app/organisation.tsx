import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/hr/shell";
import { Button, Field, Input, Select, errText } from "@/components/hr/ui";
import { deleteDepartment, deletePosition, listOrg, saveDepartment, savePosition } from "@/lib/hr/api";

export const Route = createFileRoute("/_app/organisation")({ component: OrgPage });

function OrgPage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const org = useQuery({ queryKey: ["org"], queryFn: () => listOrg() });
  const canEdit = workspace.data?.actor?.canManagePeople;
  const [dept, setDept] = useState({ name: "", code: "" });
  const [position, setPosition] = useState({ title: "", departmentId: 0 });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["org"] });
  }

  if (org.isPending) return <p className="text-sm text-muted">Loading organisation…</p>;
  if (org.isError || !org.data) return <p className="text-sm text-danger">{errText(org.error)}</p>;

  const byManager = new Map<number | null, { id: number; name: string }[]>();
  for (const person of org.data.people) {
    const list = byManager.get(person.managerId) ?? [];
    list.push(person);
    byManager.set(person.managerId, list);
  }

  function Branch({ managerId, depth }: { managerId: number | null; depth: number }) {
    const nodes = byManager.get(managerId) ?? [];
    return (
      <ul className={depth ? "mt-2 space-y-2 border-l border-line pl-4" : "space-y-2"}>
        {nodes.map((node) => (
          <li key={node.id}>
            <p className="text-sm font-medium">{node.name}</p>
            <Branch managerId={node.id} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">Organisation</h1>
        <p className="mt-1 text-sm text-muted">Departments, positions, and who reports to whom.</p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Departments</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {org.data.departments.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <span><span className="font-medium">{item.name}</span> <span className="text-muted">{item.code} · {item.headcount}</span></span>
                {canEdit && (
                  <button type="button" className="text-danger" onClick={async () => {
                    try { await deleteDepartment({ data: { id: item.id } }); await refresh(); }
                    catch (error) { toast.error(errText(error)); }
                  }}>Delete</button>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto]" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await saveDepartment({ data: dept });
                setDept({ name: "", code: "" });
                await refresh();
              } catch (error) { toast.error(errText(error)); }
            }}>
              <Field label="Name"><Input value={dept.name} onChange={(event) => setDept({ ...dept, name: event.target.value })} required /></Field>
              <Field label="Code"><Input value={dept.code} onChange={(event) => setDept({ ...dept, code: event.target.value })} required /></Field>
              <div className="sm:self-end"><Button type="submit">Add</Button></div>
            </form>
          )}
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Positions</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {org.data.positions.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <span><span className="font-medium">{item.title}</span> <span className="text-muted">{item.department} · {item.headcount}</span></span>
                {canEdit && (
                  <button type="button" className="text-danger" onClick={async () => {
                    try { await deletePosition({ data: { id: item.id } }); await refresh(); }
                    catch (error) { toast.error(errText(error)); }
                  }}>Delete</button>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <form className="mt-4 grid gap-3" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await savePosition({ data: { title: position.title, departmentId: position.departmentId || org.data.departments[0].id } });
                setPosition({ title: "", departmentId: position.departmentId });
                await refresh();
              } catch (error) { toast.error(errText(error)); }
            }}>
              <Field label="Title"><Input value={position.title} onChange={(event) => setPosition({ ...position, title: event.target.value })} required /></Field>
              <Field label="Department">
                <Select value={position.departmentId || org.data.departments[0]?.id} onChange={(event) => setPosition({ ...position, departmentId: Number(event.target.value) })}>
                  {org.data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </Field>
              <Button type="submit">Add position</Button>
            </form>
          )}
        </article>
      </section>
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl">Reporting lines</h2>
        <div className="mt-4">
          <Branch managerId={null} depth={0} />
        </div>
      </section>
    </div>
  );
}
