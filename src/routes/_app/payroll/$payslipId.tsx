import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, errText } from "@/components/hr/ui";
import { getPayslip } from "@/lib/hr/api";
import { monthLabel, rm } from "@/lib/hr/format";

export const Route = createFileRoute("/_app/payroll/$payslipId")({ component: PayslipPage });

function PayslipPage() {
  const { payslipId } = Route.useParams();
  const query = useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: () => getPayslip({ data: { id: Number(payslipId) } }),
  });
  if (query.isPending) return <p className="text-sm text-muted">Loading payslip…</p>;
  if (query.isError || !query.data) return <p className="text-sm text-danger">{errText(query.error)}</p>;
  const slip = query.data;
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to="/payroll" className="text-sm text-muted">Back to payroll</Link>
        <Button onClick={() => window.print()}>Save PDF</Button>
      </div>
      <article className="payslip rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-display text-3xl">Demo HR</p>
            <p className="text-xs tracking-widest text-muted">DEMO SDN BHD · PAYSLIP</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{monthLabel(slip.period)}</p>
            <p className="text-muted">{slip.employeeNo}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted">Name </span>{slip.name}</p>
          <p><span className="text-muted">Role </span>{slip.title}, {slip.department}</p>
          <p><span className="text-muted">IC </span>{slip.icNo || "—"}</p>
          <p><span className="text-muted">EPF / SOCSO </span>{slip.epfNo} / {slip.socsoNo}</p>
          <p><span className="text-muted">Tax </span>{slip.taxNo || "—"}</p>
          <p><span className="text-muted">Bank </span>{slip.bankName} {slip.bankAccount}</p>
        </div>
        <table className="mt-6 w-full text-sm">
          <tbody>
            <Row label="Basic salary" amount={slip.basic} />
            <Row label="Fixed allowance" amount={slip.allowance} />
            <Row label="Gross" amount={slip.gross} strong />
            <Row label="EPF employee 11%" amount={-slip.epf.employee} />
            <Row label={`SOCSO employee (category ${slip.socsoCategory})`} amount={-slip.socso.employee} />
            <Row label="EIS employee" amount={-slip.eis.employee} />
            <Row label="PCB / MTD" amount={0} />
            <Row label="Net pay" amount={slip.net} strong />
          </tbody>
        </table>
        <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
          <p>Employer EPF {rm(slip.epf.employer)} · SOCSO {rm(slip.socso.employer)} · EIS {rm(slip.eis.employer)}</p>
          <p>Employer cost {rm(slip.employerCost)}</p>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
            {slip.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </article>
    </div>
  );
}

function Row({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <tr className={strong ? "border-t border-line font-medium" : ""}>
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right tabular-nums">{rm(amount)}</td>
    </tr>
  );
}
