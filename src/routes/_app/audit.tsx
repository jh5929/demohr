import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { errText } from "@/components/hr/ui";
import { listAudit } from "@/lib/hr/api";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

function AuditPage() {
  const query = useQuery({ queryKey: ["audit"], queryFn: () => listAudit() });
  if (query.isPending) return <p className="text-sm text-muted">Loading the log…</p>;
  if (query.isError) return <p className="text-sm text-danger">{errText(query.error)}</p>;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl">Audit</h1>
        <p className="mt-1 text-sm text-muted">Who changed what. Visible to HR and admin.</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-muted">{row.at ? new Date(row.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour12: false }) : "—"}</td>
                <td className="px-4 py-3">{row.actor}</td>
                <td className="px-4 py-3">{row.action}</td>
                <td className="px-4 py-3">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
