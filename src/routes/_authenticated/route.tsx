import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DASHBOARD_UNLOCKED_KEY } from "@/lib/dashboard-lock";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (localStorage.getItem(DASHBOARD_UNLOCKED_KEY) !== "true") {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
