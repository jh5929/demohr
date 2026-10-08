import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeatSwitch } from "@/components/hr/shell";
import { Badge, Empty } from "@/components/hr/ui";
import { getDashboard } from "@/lib/hr/api";
import { formatDate, formatDays, titleCase } from "@/lib/hr/format";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [chart, setChart] = useState(false);
  useEffect(() => setChart(true), []);
  if (query.isPending) return <p className="text-sm text-muted">Loading the floor…</p>;
  if (query.isError) return <p className="text-sm text-danger">Could not load the dashboard.</p>;
  const data = query.data;
  const stats = [
    { label: "People", value: String(data.headcount), note: "Active and on probation" },
    { label: "Out today", value: String(data.onLeave.length), note: formatDate(data.today) },
    { label: "Waiting on you", value: String(data.pending.length), note: data.showQueue ? "Leave to approve" : "Nothing routes to you" },
    { label: "Clocked in", value: String(data.clockedIn), note: "Punches recorded today" },
  ];
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium tracking-widest text-muted">TODAY</p>
        <h1 className="mt-1 font-display text-4xl">How the company is staffed</h1>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 font-display text-4xl tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-faint">{stat.note}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Headcount</h2>
          <div className="mt-4 h-56">
            {chart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} margin={{ left: 0, right: 8, top: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" fill="currentColor" className="text-accent" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Out today</h2>
            <Link to="/leave" className="text-sm text-accent">Leave</Link>
          </div>
          {data.onLeave.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Everyone is in.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.onLeave.map((person) => (
                <li key={person.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    <span className="block font-medium">{person.name}</span>
                    <span className="text-muted">{person.department}</span>
                  </span>
                  <Badge tone="warn">{titleCase(person.type)} · {formatDays(person.days)}d</Badge>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4 lg:col-span-1">
          <h2 className="font-display text-2xl">Approvals</h2>
          {data.pending.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{data.myPending ? `You have ${data.myPending} request(s) still open.` : "Queue is clear."}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.pending.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted">{titleCase(item.type)} · {formatDate(item.start)} – {formatDate(item.end)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/leave" className="mt-4 inline-block text-sm font-medium text-accent">Open leave</Link>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Birthdays</h2>
          {data.birthdays.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None this month.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.birthdays.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-2">
                  <span>{person.name}</span>
                  <span className="text-muted">{person.today ? "Today" : formatDate(person.date).replace(/ \d{4}$/, "")}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-2xl">Contracts</h2>
          {data.contracts.length === 0 ? (
            <Empty title="None due" body="No contract ends in the next 60 days." />
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.contracts.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-2">
                  <span>{person.name}</span>
                  <span className="text-muted">{formatDate(person.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <SeatSwitch />
    </div>
  );
}
