import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  LayoutDashboard,
  Menu,
  Network,
  ScrollText,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { claimSeat, getWorkspace } from "@/lib/hr/api";
import type { DemoSeat } from "@/lib/hr/demo";
import { cn } from "@/lib/utils";
import { Avatar, Button, errText } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/people", label: "People", icon: Users, exact: false },
  { to: "/organisation", label: "Organisation", icon: Network, exact: true },
  { to: "/leave", label: "Leave", icon: CalendarRange, exact: true },
  { to: "/attendance", label: "Attendance", icon: Clock, exact: true },
  { to: "/payroll", label: "Payroll", icon: Wallet, exact: false },
  { to: "/calendar", label: "Holidays", icon: CalendarDays, exact: true },
  { to: "/audit", label: "Audit", icon: ScrollText, exact: true, hr: true },
] as const;

export function useWorkspace() {
  return useQuery({ queryKey: ["workspace"], queryFn: () => getWorkspace() });
}

export function Shell() {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();

  if (workspace.isPending) return <Boot />;
  if (workspace.isError) {
    return (
      <Boot>
        <p className="mt-3 max-w-sm text-sm text-danger">{errText(workspace.error)}</p>
      </Boot>
    );
  }
  if (!workspace.data.actor) {
    return <SeatPicker onClaimed={() => queryClient.invalidateQueries({ queryKey: ["workspace"] })} />;
  }

  const actor = workspace.data.actor;
  const items = NAV.filter((item) => !("hr" in item && item.hr) || actor.canAudit);

  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[16rem_1fr]">
      <aside className={cn("no-print border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r", open ? "block" : "hidden md:flex")}>
        <div className="flex items-center justify-between px-4 py-5">
          <Link to="/" className="block" onClick={() => setOpen(false)}>
            <span className="font-display text-2xl leading-none">Demo HR</span>
            <span className="mt-1 block text-xs font-medium tracking-widest text-muted">DEMO SDN BHD</span>
          </Link>
          <button type="button" className="grid h-11 w-11 place-items-center md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-bg hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-3">
            <Avatar name={actor.fullName} src={actor.avatarData} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{actor.fullName}</p>
              <p className="truncate text-xs text-muted">{actor.role === "hr" ? "HR" : actor.role === "admin" ? "Admin" : actor.title}</p>
            </div>
          </div>
          <UserButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="no-print flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <button type="button" className="grid h-11 w-11 place-items-center" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-xl">Demo HR</span>
          <span className="w-11" />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Boot({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 text-center">
      <div>
        <p className="font-display text-4xl">Demo HR</p>
        <p className="mt-2 text-sm text-muted">DEMO SDN BHD</p>
        {children}
      </div>
    </div>
  );
}

function SeatPicker({ onClaimed }: { onClaimed: () => void }) {
  const workspace = useWorkspace();
  const [pending, setPending] = useState<DemoSeat | null>(null);
  const seats = workspace.data?.seats ?? [];

  async function claim(seat: DemoSeat) {
    setPending(seat);
    try {
      await claimSeat({ data: { seat } });
      onClaimed();
    } catch (error) {
      toast.error(errText(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-muted">DEMO SDN BHD</p>
        <h1 className="mt-2 font-display text-4xl">Choose a seat</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          The roster is already loaded. Each seat is a real signed-in identity with different access — the server checks the role, not just the menu.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {seats.map((seat) => (
            <button
              key={seat.seat}
              type="button"
              disabled={pending !== null}
              onClick={() => claim(seat.seat)}
              className="rounded-xl border border-line bg-surface p-4 text-left hover:border-accent"
            >
              <p className="text-xs font-medium tracking-wide text-accent uppercase">{seat.seat}</p>
              <p className="mt-2 font-display text-2xl">{seat.name}</p>
              <p className="text-sm text-muted">{seat.title}</p>
              <p className="mt-3 text-sm">{seat.blurb}</p>
              <p className="mt-4 text-sm font-medium text-accent">{pending === seat.seat ? "Opening…" : "Enter"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SeatSwitch({ className }: { className?: string }) {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const actorEmail = workspace.data?.actor?.email;
  if (!workspace.data) return null;
  return (
    <div className={cn("no-print", className)}>
      <p className="text-xs font-medium text-muted">Switch demo seat</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {workspace.data.seats.map((seat) => (
          <Button
            key={seat.seat}
            variant={seat.email === actorEmail ? "primary" : "ghost"}
            className="h-9 px-3"
            onClick={async () => {
              try {
                await claimSeat({ data: { seat: seat.seat } });
                await queryClient.invalidateQueries();
              } catch (error) {
                toast.error(errText(error));
              }
            }}
          >
            {seat.name.split(" ")[0]}
          </Button>
        ))}
      </div>
    </div>
  );
}
