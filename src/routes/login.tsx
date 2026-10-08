import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { DEMO_PASSWORD, DEMO_SEATS } from "@/lib/hr/demo";
import { prepareDemo } from "@/lib/hr/api";
import { Button, Field, Input, errText } from "@/components/hr/ui";

export const Route = createFileRoute("/login")({ component: Login });

const BEARER_KEY = "grok-auth.bearer-token";

async function finishEmailSession(result: { data?: { token?: string | null } | null; error?: { message?: string } | null }) {
  if (result.error) throw new Error(result.error.message ?? "Sign-in failed");
  const token = result.data?.token;
  if (token) sessionStorage.setItem(BEARER_KEY, token);
  window.location.href = "/";
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    prepareDemo().catch((error) => toast.error(errText(error)));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        await finishEmailSession(
          await authClient.signUp.email({ name, email, password, callbackURL: "/" }),
        );
      } else {
        await finishEmailSession(
          await authClient.signIn.email({ email, password, callbackURL: "/" }),
        );
      }
    } catch (error) {
      toast.error(errText(error));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <Toaster position="top-center" />
      <section className="flex flex-col justify-between bg-accent px-6 py-8 text-accent-fg md:px-12">
        <div>
          <p className="text-xs font-medium tracking-widest">DEMO SDN BHD</p>
          <h1 className="mt-10 max-w-md font-display text-5xl">The people workspace.</h1>
          <p className="mt-4 max-w-md text-sm text-accent-fg/80">
            Roster, leave approvals, clock-in, and Malaysia payroll — EPF, SOCSO, and EIS — for a Kuala Lumpur team.
          </p>
        </div>
        <p className="mt-10 text-sm text-accent-fg/70">Demo password for every seat: {DEMO_PASSWORD}</p>
      </section>
      <section className="flex items-center bg-bg px-4 py-10 md:px-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div>
            <h2 className="font-display text-3xl">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use a demo seat, or your own email, then pick who you are.</p>
          </div>
          <div className="grid gap-2">
            {DEMO_SEATS.map((seat) => (
              <button
                key={seat.seat}
                type="button"
                className="flex h-14 items-center justify-between rounded-xl border border-line bg-surface px-4 text-left hover:border-accent"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await finishEmailSession(
                      await authClient.signIn.email({
                        email: seat.email,
                        password: DEMO_PASSWORD,
                        callbackURL: "/",
                      }),
                    );
                  } catch (error) {
                    toast.error(errText(error));
                    setBusy(false);
                  }
                }}
              >
                <span>
                  <span className="block text-sm font-medium">{seat.name}</span>
                  <span className="block text-xs text-muted">{seat.title}</span>
                </span>
                <span className="text-xs font-medium tracking-wide text-accent uppercase">{seat.seat}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface p-4">
            {mode === "up" && (
              <Field label="Name">
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in with email"}
            </Button>
            <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
            </button>
          </form>
          <div className="grid gap-2">
            {GROK_PROVIDERS.map((provider) => (
              <Button key={provider.providerId} variant="ghost" type="button" onClick={() => signIn(provider.providerId, { callbackURL: "/" })}>
                Continue with {provider.label}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
