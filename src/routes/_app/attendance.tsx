import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, Select, errText } from "@/components/hr/ui";
import { clock, listAttendance } from "@/lib/hr/api";
import { downloadWorkbook } from "@/lib/hr/excel";
import { formatDate, formatMinutes } from "@/lib/hr/format";
import { klParts } from "@/lib/hr/attendance-calc";

export const Route = createFileRoute("/_app/attendance")({ component: AttendancePage });

function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  return klParts(new Date(iso)).label;
}

function AttendancePage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(klParts().date.slice(0, 7));
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [pending, setPending] = useState<"in" | "out" | null>(null);
  const query = useQuery({
    queryKey: ["attendance", month, employeeId],
    queryFn: () => listAttendance({ data: { month, employeeId } }),
  });

  async function punch(action: "in" | "out") {
    setPending(action);
    try {
      const result = await clock({ data: { action } });
      toast.success(action === "in" ? (result.late ? `Clocked in · late ${formatMinutes(result.late)}` : "Clocked in on time") : (result.ot ? `Clocked out · OT ${formatMinutes(result.ot)}` : "Clocked out"));
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setPending(null);
    }
  }

  if (query.isPending) return <p className="text-sm text-muted">Loading attendance…</p>;
  if (query.isError || !query.data) return <p className="text-sm text-danger">{errText(query.error)}</p>;
  const rows = query.data.rows;
  const late = rows.reduce((sum, row) => sum + row.late, 0);
  const ot = rows.reduce((sum, row) => sum + row.ot, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Attendance</h1>
          <p className="mt-1 text-sm text-muted">09:00–18:00, 15-minute grace. Late is counted from 09:00 after that. Overtime starts at 18:00.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => punch("in")} disabled={pending !== null}>{pending === "in" ? "Clocking…" : "Clock in"}</Button>
          <Button variant="ghost" onClick={() => punch("out")} disabled={pending !== null}>{pending === "out" ? "Clocking…" : "Clock out"}</Button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rows" value={String(rows.length)} />
        <Stat label="Late" value={formatMinutes(late)} />
        <Stat label="Overtime" value={formatMinutes(ot)} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Month">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-md border border-line bg-surface px-3 text-sm" />
        </Field>
        {query.data.people.length > 1 && (
          <Field label="Person">
            <Select value={employeeId ?? ""} onChange={(event) => setEmployeeId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Everyone I can see</option>
              {query.data.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </Select>
          </Field>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            downloadWorkbook(`attendance-${month}.xls`, "Attendance", [
              ["Date", "Name", "Department", "Clock in", "Clock out", "Late minutes", "OT minutes"],
              ...rows.map((row) => [
                row.date ?? "",
                row.name,
                row.department,
                timeLabel(row.clockIn),
                timeLabel(row.clockOut),
                String(row.late),
                String(row.ot),
              ]),
            ]);
          }}
        >
          Export Excel
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">In</th>
              <th className="px-4 py-3 font-medium">Out</th>
              <th className="px-4 py-3 font-medium">Late</th>
              <th className="px-4 py-3 font-medium">OT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 tabular-nums">{timeLabel(row.clockIn)}</td>
                <td className="px-4 py-3 tabular-nums">{timeLabel(row.clockOut)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMinutes(row.late)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMinutes(row.ot)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
    </article>
  );
}
