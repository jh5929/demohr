import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/hr/shell";
import { Button, Field, errText } from "@/components/hr/ui";
import { generatePayroll, listPayroll } from "@/lib/hr/api";
import { monthLabel, rm } from "@/lib/hr/format";
import { klParts } from "@/lib/hr/attendance-calc";

export const Route = createFileRoute("/_app/payroll/")({ component: PayrollPage });

function previousPeriod(today: string) {
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function PayrollPage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(previousPeriod(klParts().date));
  const [pending, setPending] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const query = useQuery({
    queryKey: ["payroll", period],
    queryFn: () => listPayroll({ data: { period } }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Payroll</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Basic plus fixed allowance. EPF at 11% employee, and 13% or 12% employer. SOCSO and EIS come from the statutory lookup, capped at RM6,000. PCB is not calculated.
          </p>
        </div>
        {workspace.data?.actor?.canPayroll && (
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                const result = await generatePayroll({ data: { period } });
                toast.success(`Generated ${result.count} payslips`);
                await queryClient.invalidateQueries({ queryKey: ["payroll", period] });
              } catch (error) {
                toast.error(errText(error));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Generating…" : "Generate payslips"}
          </Button>
        )}
      </header>
      <Field label="Month">
        <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 rounded-md border border-line bg-surface px-3 text-sm" />
      </Field>
      {query.isPending ? <p className="text-sm text-muted">Loading payslips…</p> : null}
      {query.data && query.data.slips.length === 0 ? (
        <p className="text-sm text-muted">No payslips for {monthLabel(period)} yet.</p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">EPF</th>
              <th className="px-4 py-3 font-medium">SOCSO</th>
              <th className="px-4 py-3 font-medium">EIS</th>
              <th className="px-4 py-3 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.slips.map((slip) => (
              <tr key={slip.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link to="/payroll/$payslipId" params={{ payslipId: String(slip.id) }} className="font-medium text-accent">
                    {slip.name}
                  </Link>
                  <span className="block text-xs text-muted">{slip.employeeNo} · {slip.department}</span>
                </td>
                <td className="px-4 py-3 tabular-nums">{rm(slip.gross)}</td>
                <td className="px-4 py-3 tabular-nums">{rm(slip.epf)}</td>
                <td className="px-4 py-3 tabular-nums">{rm(slip.socso)}</td>
                <td className="px-4 py-3 tabular-nums">{rm(slip.eis)}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{rm(slip.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.data?.tables && (
        <div>
          <Button variant="ghost" onClick={() => setShowTables((value) => !value)}>
            {showTables ? "Hide statutory tables" : "Show SOCSO and EIS tables"}
          </Button>
          {showTables && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Table title="SOCSO (selected bands)" rows={query.data.tables.socso.map((row) => [String(row.max), rm(row.firstEmployer), rm(row.firstEmployee), rm(row.secondEmployer)])} head={["Wage up to", "Cat 1 employer", "Cat 1 employee", "Cat 2 employer"]} />
              <Table title="EIS (each side)" rows={query.data.tables.eis.map((row) => [String(row.max), rm(row.share)])} head={["Wage up to", "Share"]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <article className="overflow-x-auto rounded-xl border border-line bg-surface">
      <h2 className="px-4 pt-4 font-display text-2xl">{title}</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>{head.map((cell) => <th key={cell} className="px-4 py-2 font-medium">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-line">
              {row.map((cell) => <td key={cell} className="px-4 py-2 tabular-nums">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
