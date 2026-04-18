import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
      <Toaster position="top-right" />
    </AppShell>
  );
}
