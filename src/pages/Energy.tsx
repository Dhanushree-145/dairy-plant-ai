import { CostTab } from "@/components/energy/CostTab";
import { EnergyTab } from "@/components/energy/EnergyTab";
import { FleetTab } from "@/components/energy/FleetTab";
import { MachineFormDialog } from "@/components/energy/MachineFormDialog";
import { MachineSetup } from "@/components/energy/MachineSetup";
import { OptimizationTab } from "@/components/energy/OptimizationTab";
import { AppShell } from "@/components/dashboard/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useLiveNow } from "@/hooks/use-live-now";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import {
  formatTime,
  friendlyError,
  type MachineRecord,
  type MachineSnapshot,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Boxes,
  CalendarDays,
  CircleAlert,
  Gauge,
  IndianRupee,
  Info,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TabKey = "fleet" | "energy" | "costs" | "optimization";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "fleet", label: "Fleet", icon: Boxes },
  { key: "energy", label: "Energy", icon: Zap },
  { key: "costs", label: "Costs", icon: IndianRupee },
  { key: "optimization", label: "AI optimisation", icon: Sparkles },
];

export default function Energy() {
  const { isAuthenticated, user } = useAuth();
  const now = useLiveNow();
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [tab, setTab] = useState<TabKey>("fleet");
  const [dialog, setDialog] = useState<{ open: boolean; machine: MachineRecord | null }>({
    open: false,
    machine: null,
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<MachineSnapshot["id"] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const records = useQuery(api.machines.list, isAuthenticated ? {} : "skip");
  const data = useQuery(
    api.energy.dashboard,
    isAuthenticated && records && records.length > 0 ? { now, days } : "skip",
  );
  const removeMachine = useMutation(api.machines.remove);

  const deleteTarget = records?.find((record) => record._id === pendingDeleteId) ?? null;

  const openEdit = (id: MachineSnapshot["id"]) => {
    const record = records?.find((item) => item._id === id);
    if (record) setDialog({ open: true, machine: record });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeMachine({ machineId: deleteTarget._id });
      toast.success("Machine removed", {
        description: `${deleteTarget.name} is no longer part of your fleet.`,
      });
      setPendingDeleteId(null);
    } catch (error) {
      toast.error("Could not remove machine", { description: friendlyError(error) });
    } finally {
      setDeleting(false);
    }
  };

  if (records === undefined) {
    return (
      <AppShell
        plantName={user?.plantName}
        sectionLabel="Energy & Machines"
        activeKey="energy"
      >
        <EnergySkeleton />
      </AppShell>
    );
  }

  if (records.length === 0) {
    return (
      <AppShell
        plantName={user?.plantName}
        sectionLabel="Energy & Machines"
        activeKey="energy"
      >
        <MachineSetup />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell
        plantName={user?.plantName}
        sectionLabel="Energy & Machines"
        activeKey="energy"
      >
        <EnergySkeleton />
      </AppShell>
    );
  }

  const kpis: {
    label: string;
    value: string;
    unit?: string;
    caption: string;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      label: "Registered machines",
      value: numberFormatter.format(data.summary.registered),
      caption: `Across ${data.categoryBreakdown.length} machine categories`,
      icon: Boxes,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "ON now",
      value: numberFormatter.format(data.summary.on),
      caption: "Meter reporting an active load",
      icon: Power,
      tone: "bg-success/10 text-success-ink",
    },
    {
      label: "OFF now",
      value: numberFormatter.format(data.summary.off),
      caption: "Confirmed stopped, 0 kW draw",
      icon: PowerOff,
      tone: "bg-muted text-muted-foreground",
    },
    {
      label: "Fault / unknown",
      value: numberFormatter.format(data.summary.unknown),
      caption: "No reading — not assumed off",
      icon: TriangleAlert,
      tone: "bg-danger/10 text-danger",
    },
    {
      label: `Energy · ${data.rangeDays} days`,
      value: numberFormatter.format(Math.round(data.totals.energyKwh)),
      unit: "kWh",
      caption: `${data.totals.energyChangePct >= 0 ? "+" : ""}${data.totals.energyChangePct}% vs previous period`,
      icon: Zap,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Electricity spend",
      value: formatCurrency(data.totals.cost),
      caption: `${data.totals.costChangePct >= 0 ? "+" : ""}${data.totals.costChangePct}% vs previous period`,
      icon: IndianRupee,
      tone: "bg-warning/10 text-warning-ink",
    },
    {
      label: "Energy per litre",
      value: data.plant.energyPerLitre.toFixed(3),
      unit: "kWh/L",
      caption: `${numberFormatter.format(data.plant.litresProcessed)} L processed`,
      icon: Gauge,
      tone: "bg-primary/10 text-primary",
    },
  ];

  return (
    <AppShell
      plantName={user?.plantName}
      sectionLabel="Energy & Machines"
      activeKey="energy"
    >
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
              Plant module · Energy &amp; Machines
            </p>
            <h1 className="mt-1.5 font-display text-[25px] font-semibold tracking-tight text-navy sm:text-[30px]">
              Machine energy intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {data.summary.registered} registered machines from reception to cold
              storage. Status and consumption are generated demo telemetry at{" "}
              <span className="font-medium text-navy/80">
                ₹{data.tariff.toFixed(2)}/kWh
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 shadow-sm">
              <CalendarDays className="ml-1.5 size-3.5 text-muted-foreground" />
              {([7, 30, 90] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDays(range)}
                  aria-pressed={days === range}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                    days === range
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-navy",
                  )}
                >
                  {range} days
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setDialog({ open: true, machine: null })}
              className="h-8 gap-1.5 text-[11.5px]"
            >
              <Plus className="size-3.5" />
              Add machine
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-warning/25 bg-warning/[0.055] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-[11.5px] leading-relaxed text-navy/75">
              <span className="font-semibold text-navy">Simulated telemetry.</span>{" "}
              Machine ON/OFF state, meter readings and temperatures are
              generated demo data, not live IoT or manual readings. Machines without a
              reading show fault/unknown instead of OFF.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-6 text-[10px] font-medium text-muted-foreground sm:pl-0">
            <span className="flex items-center gap-1">
              <RefreshCw className="size-3 text-warning" />
              {formatTime(data.generatedAt)}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-navy">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              {data.totals.currentLoadKw.toFixed(1)} kW metered
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {kpi.label}
                  </p>
                  <span className={cn("flex size-7 items-center justify-center rounded-lg", kpi.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                </div>
                <p className="mt-2.5 font-display text-[24px] font-semibold leading-none tracking-tight text-navy">
                  {kpi.value}
                  {kpi.unit && (
                    <span className="ml-1 text-[10.5px] font-medium text-muted-foreground">
                      {kpi.unit}
                    </span>
                  )}
                </p>
                <p className="mt-2 border-t border-border/70 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {kpi.caption}
                </p>
              </div>
            );
          })}
        </div>

        <div
          role="tablist"
          aria-label="Energy and machines views"
          className="flex gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card p-1 shadow-card"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            const badge = item.key === "fleet" ? data.summary.registered : null;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-colors",
                  active
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-navy",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
                {badge !== null && badge > 0 && (
                  <span className="rounded-full bg-muted px-1 text-[9px] font-bold text-muted-foreground">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === "fleet" && (
            <FleetTab
              machines={data.machines}
              breaks={data.categoryBreakdown}
              now={now}
              days={days}
              onAdd={() => setDialog({ open: true, machine: null })}
              onEdit={openEdit}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          )}
          {tab === "energy" && (
            <EnergyTab
              data={data}
              onOpenFleet={() => setTab("fleet")}
              onOpenOptimization={() => setTab("optimization")}
            />
          )}
          {tab === "costs" && <CostTab data={data} />}
          {tab === "optimization" && <OptimizationTab data={data} />}
        </div>

        <p className="flex items-start justify-center gap-1.5 pt-1 text-center text-[10.5px] leading-relaxed text-muted-foreground">
          <CircleAlert className="mt-0.5 size-3 shrink-0" />
          Machine data is simulated for demonstration. Readings are labelled by source,
          and a missing meter value never implies the machine is switched off.
        </p>
      </div>

      <MachineFormDialog
        key={`${dialog.machine?._id ?? "new"}-${dialog.open ? "open" : "closed"}`}
        open={dialog.open}
        onOpenChange={(open) =>
          setDialog((current) => ({
            open,
            machine: open ? current.machine : null,
          }))
        }
        machine={dialog.machine}
        existingCodes={records.map((record) => record.code)}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this machine?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} (${deleteTarget.code}) will be deleted from your fleet, along with its acknowledgement history. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Removing
                </>
              ) : (
                "Remove machine"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EnergySkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3 w-80" />
        </div>
        <Skeleton className="h-9 w-52" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[112px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[232px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
