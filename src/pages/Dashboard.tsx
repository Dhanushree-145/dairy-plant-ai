import { AppShell } from "@/components/dashboard/AppShell";
import { Overview } from "@/components/dashboard/Overview";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardRange } from "@/lib/dashboard";
import { useQuery } from "convex/react";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState<DashboardRange>(7);
  const data = useQuery(api.dashboard.overview, { days });

  return (
    <AppShell
      plantName={user?.plantName}
      alertCount={data?.alertSummary.total ?? 0}
      alerts={data?.alerts ?? []}
    >
      <Overview data={data} days={days} onDaysChange={setDays} />
    </AppShell>
  );
}
