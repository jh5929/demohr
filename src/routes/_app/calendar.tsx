import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/hr/shell";
import { Button, Field, Input, errText } from "@/components/hr/ui";
import { deleteHoliday, listHolidays, saveHoliday } from "@/lib/hr/api";
import { formatDate } from "@/lib/hr/format";
import { klParts } from "@/lib/hr/attendance-calc";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["holidays"], queryFn: () => listHolidays() });
  const [cursor, setCursor] = useState(klParts().date.slice(0, 7));
  const [form, setForm] = useState({ name: "", date: "", scope: "Kuala Lumpur" });
  const [year, month] = cursor.split("-").map(Number);
  const cells = useMemo(() => buildMonth(year, month), [year, month]);

  if (query.isPending) return <p className="text-sm text-muted">Loading holidays…</p>;
  if (query.isError || !query.data) return <p className="text-sm text-danger">{errText(query.error)}</p>;
  const byDate = new Map(query.data.holidays.map((holiday) => [holiday.date, holiday]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Holidays</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Kuala Lumpur 2026, including replacement days. Leave requests skip these dates and weekends. Islamic dates can move with moon sighting — edit them here.
        </p>
      </header>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCursor(shift(cursor, -1))}>Previous</Button>
        <p className="font-display text-2xl">{monthName(month)} {year}</p>
        <Button variant="ghost" onClick={() => setCursor(shift(cursor, 1))}>Next</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-1">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          const holiday = cell ? byDate.get(cell) : undefined;
          return (
            <div key={cell ?? `e-${index}`} className={`min-h-16 rounded-md border p-1 text-xs ${holiday ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"} ${cell ? "" : "opacity-40"}`}>
              <p className="font-medium">{cell ? Number(cell.slice(8)) : ""}</p>
              {holiday && <p className="mt-1 leading-snug">{holiday.name}</p>}
            </div>
          );
        })}
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
        {query.data.holidays.map((holiday) => (
          <li key={holiday.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span><span className="font-medium">{holiday.name}</span> <span className="text-muted">{formatDate(holiday.date)} · {holiday.scope}</span></span>
            {workspace.data?.actor?.canManagePeople && (
              <button type="button" className="text-danger" onClick={async () => {
                try {
                  await deleteHoliday({ data: { id: holiday.id } });
                  await queryClient.invalidateQueries({ queryKey: ["holidays"] });
                } catch (error) { toast.error(errText(error)); }
              }}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      {query.data.canEdit && (
        <form className="grid gap-3 rounded-xl border border-line bg-surface p-4 md:grid-cols-4" onSubmit={async (event) => {
          event.preventDefault();
          try {
            await saveHoliday({ data: form });
            setForm({ name: "", date: "", scope: "Kuala Lumpur" });
            await queryClient.invalidateQueries({ queryKey: ["holidays"] });
          } catch (error) { toast.error(errText(error)); }
        }}>
          <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></Field>
          <Field label="Scope"><Input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} /></Field>
          <div className="md:self-end"><Button type="submit">Add holiday</Button></div>
        </form>
      )}
    </div>
  );
}

function buildMonth(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startPad = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: startPad }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function shift(period: string, delta: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthName(month: number) {
  return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1];
}
