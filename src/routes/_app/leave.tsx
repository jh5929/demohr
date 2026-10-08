import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Field, Input, Select, Textarea, errText, statusTone } from "@/components/hr/ui";
import { cancelLeave, decideLeave, listLeave, submitLeave } from "@/lib/hr/api";
import { formatDate, formatDays, titleCase } from "@/lib/hr/format";

export const Route = createFileRoute("/_app/leave")({ component: LeavePage });

function LeavePage() {
  const queryClient = useQueryClient();
  const leave = useQuery({ queryKey: ["leave"], queryFn: () => listLeave() });
  const [form, setForm] = useState({ type: "annual", start: "", end: "", reason: "", halfDay: false });
  const [pending, setPending] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["leave"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (leave.isPending) return <p className="text-sm text-muted">Loading leave…</p>;
  if (leave.isError || !leave.data) return <p className="text-sm text-danger">{errText(leave.error)}</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Leave</h1>
        <p className="mt-1 text-sm text-muted">
          Annual {formatDays(leave.data.annualBalance)} left · Sick {formatDays(leave.data.sickBalance)} left. Weekends and KL public holidays are not counted.
        </p>
      </header>
      <form
        className="grid gap-3 rounded-xl border border-line bg-surface p-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          try {
            const result = await submitLeave({ data: form });
            toast.success(`Submitted · ${formatDays(result.days)} working day(s)`);
            setForm({ type: "annual", start: "", end: "", reason: "", halfDay: false });
            await refresh();
          } catch (error) {
            toast.error(errText(error));
          } finally {
            setPending(false);
          }
        }}
      >
        <h2 className="font-display text-2xl md:col-span-2">New request</h2>
        <Field label="Type">
          <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="emergency">Emergency (uses annual)</option>
            <option value="unpaid">Unpaid</option>
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={form.halfDay} onChange={(event) => setForm({ ...form, halfDay: event.target.checked, end: event.target.checked ? form.start : form.end })} />
          Half day
        </label>
        <Field label="Start">
          <Input type="date" required value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value, end: form.halfDay ? event.target.value : form.end })} />
        </Field>
        <Field label="End">
          <Input type="date" required disabled={form.halfDay} value={form.halfDay ? form.start : form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Reason">
            <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required />
          </Field>
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Submit"}</Button>
      </form>
      <div className="space-y-3">
        {leave.data.requests.map((request) => (
          <article key={request.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{request.name} <span className="font-normal text-muted">· {request.title}</span></p>
                <p className="text-sm text-muted">
                  {titleCase(request.type)} · {formatDate(request.start)} – {formatDate(request.end)} · {formatDays(request.days)} day(s)
                </p>
                {request.reason && <p className="mt-2 text-sm">{request.reason}</p>}
                {request.note && <p className="mt-1 text-sm text-muted">Note: {request.note}</p>}
              </div>
              <Badge tone={statusTone(request.status)}>{titleCase(request.status)}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {request.canDecide && (
                <>
                  <Button onClick={() => act(request.id, "approved")}>Approve</Button>
                  <Button variant="ghost" onClick={() => act(request.id, "rejected")}>Reject</Button>
                </>
              )}
              {(request.status === "pending" || request.status === "approved") && (
                <Button variant="ghost" onClick={async () => {
                  try { await cancelLeave({ data: { id: request.id } }); toast.success("Cancelled"); await refresh(); }
                  catch (error) { toast.error(errText(error)); }
                }}>Cancel</Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  async function act(id: number, decision: "approved" | "rejected") {
    const note = decision === "rejected" ? window.prompt("Reason for rejecting?") ?? "" : "";
    try {
      await decideLeave({ data: { id, decision, note } });
      toast.success(decision === "approved" ? "Approved and balance updated" : "Rejected");
      await refresh();
    } catch (error) {
      toast.error(errText(error));
    }
  }
}
