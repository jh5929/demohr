import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { Shell, Boot } from "@/components/hr/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  if (isPending) return <Boot />;
  if (!user) return <RedirectToSignIn />;
  return (
    <QueryClientProvider client={client}>
      <Toaster position="top-center" />
      <Shell />
    </QueryClientProvider>
  );
}
