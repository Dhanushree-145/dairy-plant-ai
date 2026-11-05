import { AlertItem } from "@/components/energy/AlertItem";
import { ChartLegend, ChartTooltip, CHART } from "@/components/energy/ChartBits";
import { MachineFormDialog } from "@/components/energy/MachineFormDialog";
import { StatusPill } from "@/components/energy/StatusPill";
import { AppShell, type ShellAlert } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useLiveNow } from "@/hooks/use-live-now";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import {
  categoryMeta,
  formatDateIso,
  formatDecimal,
  formatTime,
  performanceMeta,
  rangeLabel,
  relativeFrom,
  specSummary,
  STATUS_META,
  type EnergyRange,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock,
  Gauge,
  Info,
  Pencil,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGES: { key: EnergyRange; label: string; short: string }[] = [
  { key: "24h", label: "Hourly · last 24 hours", short: "24h" },
  { key: "7d", label: "Daily · last 7 days", short: "7d" },
  { key: "30d", label: "Daily · last 30 days", short: "30d" },
  { key: "90d", label: "Weekly · last 13 weeks", short: "13w" },
  { key: "12m", label: "Monthly · last 12 months", short: "12m" },
];

export default function MachineDetail() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, isAuthenticated } = useAuth();
  const now = useLiveNow();
  const [range, setRange] = useState<EnergyRange>("30d");
  const [compare, setCompare] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const detail = useQuery(
    api.energy.machine,
    isAuthenticated && machineId
      ? { machineId: machineId as Id<"machines">, now, range }
      : "skip",
  );
  const records = useQuery(api.machines.list, isAuthenticated ? {} : "skip");
  const record = records?.find((item) => item._id === machineId) ?? null;

  if (detail === undefined) {
    return (
      <AppShell
        plantName={user?.plantName}
        alertCount={0}
        alerts={[]}
        sectionLabel="Energy & Machines"
        activeKey="energy"
      >
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (detail === null) {
    return (
      <AppShell
        plantName={user?.plantName}
        alertCount={0}
        alerts={[]}
        sectionLabel="Energy & Machines"
        activeKey="energy"
      >
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
            Energy &amp; Machines
          </p>
          <h1 className="mt-2 font-display text-[24px] font-semibold text-navy">
            Machine not found
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            This machine is not part of your plant fleet. It may have been removed.
          </p>
          <Button asChild size="sm" className="mt-4 h-8 text-[11.5px]">
            <Link to="/dashboard/energy">
              <ArrowLeft className="size-3.5" />
              Back to machines
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const machine = detail.machine;
  const category = categoryMeta(machine.category);
  const Icon = category.icon;
  const performance = performanceMeta(machine.performance);
  const statusMeta = STATUS_META[machine.status];
  const activeAlerts = detail.alerts.filter((alert) => alert.status !== "resolved");
  const changePct =
    detail.series.previousTotal > 0
      ? ((detail.series.currentTotal - detail.series.previousTotal) /
          detail.series.previousTotal) *
        100
      : 0;
  const baselinePct =
    detail.series.baselineTotal > 0
      ? ((detail.series.currentTotal - detail.series.baselineTotal) /
          detail.series.baselineTotal) *
        100
      : 0;
  const daysToService = Math.ceil((detail.nextMaintenanceAt - now) / 86_400_000);
  const serviceSoon = daysToService <= 14;

  const shellAlerts: ShellAlert[] = activeAlerts.slice(0, 3).map((alert) => ({
    id: alert.key,
    title: alert.title,
    module: `Energy · ${machine.code}`,
    severity: alert.severity === "critical" ? "critical" : "warning",
    minutesAgo: Math.max(1, Math.round((now - alert.detectedAt) / 60_000)),
  }));

  const energyTiles = [
    {
      label: "Current power",
      value: machine.currentKw === null ? "—" : formatDecimal(machine.currentKw, 1),
      unit: "kW",
      note:
        machine.status === "unknown"
          ? "No meter reading — status unconfirmed"
          : machine.status === "on"
            ? "Live simulated load"
            : "Confirmed stopped, 0 kW",
      tone: machine.status === "unknown" ? "text-danger" : "text-navy",
    },
    {
      label: "Today",
      value: numberFormatter.format(Math.round(detail.energy.todayKwh)),
      unit: "kWh",
      note: `${formatCurrency(detail.energy.todayCost)} today`,
    },
    {
      label: "This week",
      value: numberFormatter.format(Math.round(detail.energy.weekKwh)),
      unit: "kWh",
      note: `${formatCurrency(detail.energy.weekCost)} this week`,
    },
    {
      label: "This month",
      value: numberFormatter.format(Math.round(detail.energy.monthKwh)),
      unit: "kWh",
      note: `${formatCurrency(detail.energy.monthCost)} this month`,
    },
    {
      label: "Lifetime energy",
      value: numberFormatter.format(Math.round(detail.energy.totalKwh)),
      unit: "kWh",
      note: `${formatCurrency(detail.energy.totalCost)} estimated`,
    },
    {
      label: "Energy per operating hour",
      value: formatDecimal(detail.energy.kwhPerOperatingHour, 2),
      unit: "kWh/h",
      note: `${formatCurrency(detail.energy.costPerOperatingHour)} per hour`,
    },
  ];

  return (
    <AppShell
      plantName={user?.plantName}
      alertCount={activeAlerts.length}
      alerts={shellAlerts}
      sectionLabel="Energy & Machines"
      activeKey="energy"
      onViewAlerts={() => {
        document.getElementById("machine-alerts")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
    >
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/dashboard/energy"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Energy &amp; Machines
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/[0.07] px-2 py-0.5 text-[9.5px] font-semibold text-warning-ink">
            <span className="size-1.5 rounded-full bg-warning" />
            Simulated meter
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl",
                  machine.status === "unknown"
                    ? "bg-danger/10 text-danger"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-navy sm:text-[26px]">
                    {machine.name}
                  </h1>
                  <StatusPill status={machine.status} />
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  <span className="font-semibold text-navy/75">{machine.code}</span> ·{" "}
                  {category.label} · {machine.stage} stage
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Capacity {specSummary(machine.capacityValue, machine.capacityUnit)} ·
                  rated {machine.ratedKw} kW · installed {formatDateIso(machine.installedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {machine.status === "unknown" ? "Meter status" : "Current load"}
                </p>
                <p className="mt-0.5 text-[17px] font-semibold leading-none text-navy">
                  {machine.currentKw === null
                    ? "No reading"
                    : `${formatDecimal(machine.currentKw, 1)} kW`}
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Updated {relativeFrom(machine.lastUpdated, now)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                disabled={!record}
                className="h-8 gap-1.5 text-[11.5px]"
              >
                <Pencil className="size-3.5" />
                Edit machine
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {energyTiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-border/80 bg-card p-3.5 shadow-card"
            >
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {tile.label}
              </p>
              <p
                className={cn(
                  "mt-1.5 font-display text-[20px] font-semibold leading-none",
                  tile.tone ?? "text-navy",
                )}
              >
                {tile.value}
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  {tile.unit}
                </span>
              </p>
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
                {tile.note}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">
                  Energy consumption
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {rangeLabel(range)} · configured baseline comparison
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRange(item.key)}
                    aria-pressed={range === item.key}
                    title={item.label}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                      range === item.key
                        ? "bg-white text-navy shadow-sm"
                        : "text-muted-foreground hover:text-navy",
                    )}
                  >
                    {item.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <ChartLegend
                items={[
                  { label: "Consumption", color: CHART.blue },
                  ...(compare ? [{ label: "Previous period", color: CHART.blueSoft, dashed: true }] : []),
                  { label: "Configured baseline", color: CHART.amber, dashed: true },
                ]}
              />
              <button
                type="button"
                onClick={() => setCompare((current) => !current)}
                aria-pressed={compare}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold transition-colors",
                  compare
                    ? "border-primary/30 bg-primary/[0.07] text-primary"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                Compare previous
              </button>
            </div>

            <div className="mt-3 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={detail.series.points}
                  margin={{ top: 6, right: 6, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="machineEnergyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: CHART.axis, fontSize: 9.5 }}
                    interval={detail.series.points.length > 14 ? 4 : 0}
                    dy={5}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: CHART.axis, fontSize: 9.5 }}
                    tickFormatter={(value: number) =>
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`
                    }
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: "#CBD8E7" }} />
                  <Area
                    type="monotone"
                    dataKey="kwh"
                    name="Consumption"
                    stroke={CHART.blue}
                    strokeWidth={2.2}
                    fill="url(#machineEnergyFill)"
                    animationDuration={600}
                  />
                  {compare && (
                    <Line
                      type="monotone"
                      dataKey="previousKwh"
                      name="Previous period"
                      stroke={CHART.blueSoft}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      animationDuration={600}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="baselineKwh"
                    name="Configured baseline"
                    stroke={CHART.amber}
                    strokeWidth={1.3}
                    strokeDasharray="3 4"
                    dot={false}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 sm:grid-cols-4">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Selected period
                </p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-navy">
                  {numberFormatter.format(Math.round(detail.series.currentTotal))} kWh
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Previous period
                </p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-navy">
                  {numberFormatter.format(Math.round(detail.series.previousTotal))} kWh
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Change
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12.5px] font-semibold",
                    changePct <= 0 ? "text-success-ink" : "text-danger",
                  )}
                >
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  vs baseline
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12.5px] font-semibold",
                    baselinePct <= 0 ? "text-success-ink" : "text-warning-ink",
                  )}
                >
                  {baselinePct >= 0 ? "+" : ""}
                  {baselinePct.toFixed(1)}%
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">
                  Operating status
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Live machine state and runtime
                </p>
              </div>
              <span className={cn("flex size-7 items-center justify-center rounded-lg", statusMeta.chip)}>
                {machine.status === "unknown" ? (
                  <TriangleAlert className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-border/70 bg-background/55 px-3 py-2.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Machine state
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-navy">
                  {machine.status === "on"
                    ? "Running"
                    : machine.status === "off"
                      ? "Switched off"
                      : "Fault / unconfirmed"}
                </p>
                <StatusPill status={machine.status} />
              </div>
              <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">
                {machine.status === "unknown"
                  ? "The meter has not reported. This is not treated as OFF."
                  : machine.status === "on"
                    ? `Started at ${machine.startedAt ? formatTime(machine.startedAt) : "—"}.`
                    : `Stopped at ${machine.stoppedAt ? formatTime(machine.stoppedAt) : "—"}.`}
              </p>
            </div>

            <dl className="mt-3 space-y-2 text-[11px]">
              {[
                {
                  icon: Zap,
                  label: "Current draw",
                  value:
                    machine.currentKw === null
                      ? "No reading"
                      : `${formatDecimal(machine.currentKw, 1)} kW`,
                },
                {
                  icon: Clock,
                  label: "Operating hours",
                  value: `${numberFormatter.format(machine.operatingHours)} h`,
                },
                {
                  icon: Clock,
                  label: "Idle time",
                  value: `${numberFormatter.format(machine.idleHours)} h`,
                },
                {
                  icon: CircleAlert,
                  label: "Unexpected shutdowns",
                  value: `${machine.unexpectedShutdowns}`,
                },
                {
                  icon: Gauge,
                  label: "Last telemetry",
                  value: relativeFrom(machine.lastUpdated, now),
                },
              ].map((row) => {
                const RowIcon = row.icon;
                return (
                  <div key={row.label} className="flex items-center gap-2">
                    <RowIcon className="size-3 shrink-0 text-muted-foreground" />
                    <dt className="flex-1 text-muted-foreground">{row.label}</dt>
                    <dd className="font-semibold text-navy">{row.value}</dd>
                  </div>
                );
              })}
            </dl>

            <div className="mt-3 border-t border-border/70 pt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] font-medium text-muted-foreground">
                  Reading source
                </p>
                <span className="rounded-full border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning-ink">
                  Simulated meter
                </span>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                No IoT energy meter, machine controller or manual reading is connected
                in this build. Actual sensor and manual sources will be labelled
                separately when integrated.
              </p>
            </div>

            <div className="mt-3 border-t border-border/70 pt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] font-medium text-muted-foreground">
                  Last 24 hours
                </p>
                <div className="flex items-center gap-2 text-[8.5px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-success" /> ON
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" /> OFF
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-danger" /> Fault
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex gap-0.5">
                {detail.series.statusTimeline.map((point) => (
                  <span
                    key={point.label}
                    title={`${point.label} · ${point.status.toUpperCase()} · ${point.kwh} kWh`}
                    className={cn(
                      "h-6 flex-1 rounded-sm",
                      point.status === "on"
                        ? "bg-success/70"
                        : point.status === "off"
                          ? "bg-muted-foreground/25"
                          : "bg-danger/70",
                    )}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[8.5px] text-muted-foreground">
                <span>{detail.series.statusTimeline[0]?.label}</span>
                <span>
                  {detail.series.statusTimeline[detail.series.statusTimeline.length - 1]?.label}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <h2 className="font-display text-[15px] font-semibold text-navy">
              Machine information
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Nameplate and installed configuration
            </p>
            <dl className="mt-3 space-y-2 text-[11px]">
              {[
                ["Machine ID", machine.code],
                ["Category", category.label],
                ["Processing stage", machine.stage],
                [
                  "Capacity",
                  specSummary(machine.capacityValue, machine.capacityUnit),
                ],
                ["Rated power", `${machine.ratedKw} kW`],
                ["Baseline load", `${machine.baselineKwhPerHour} kWh/h`],
                ["Installed", formatDateIso(machine.installedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="max-w-[62%] text-right font-semibold text-navy">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 border-t border-border/70 pt-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Specifications
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-navy/75">
                {machine.specifications || "No specifications recorded for this machine."}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">
                  Maintenance history
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Service log and next due date
                </p>
              </div>
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wrench className="size-3.5" />
              </span>
            </div>

            <div
              className={cn(
                "mt-2.5 flex items-center gap-2 rounded-lg border px-2.5 py-2",
                serviceSoon
                  ? "border-warning/30 bg-warning/[0.06]"
                  : "border-success/25 bg-success/[0.05]",
              )}
            >
              <CalendarClock
                className={cn("size-3.5 shrink-0", serviceSoon ? "text-warning-ink" : "text-success")}
              />
              <div>
                <p className="text-[10.5px] font-semibold text-navy">
                  Next service {formatDateIso(new Date(detail.nextMaintenanceAt).toISOString().slice(0, 10))}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {daysToService <= 0
                    ? `Overdue by ${Math.abs(daysToService)} days`
                    : `In ${daysToService} days`}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {detail.maintenance.map((entry) => (
                <div key={entry.id} className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10.5px] font-semibold text-navy">{entry.type}</p>
                      <p className="shrink-0 text-[9px] text-muted-foreground">
                        {formatDateIso(entry.date)}
                      </p>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      {entry.technician} · {formatCurrency(entry.cost)} ·{" "}
                      {entry.downtimeHours} h downtime
                    </p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                      {entry.notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">
                  Performance trend
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Efficiency against the 90% target
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                  performance.tone === "text-success-ink"
                    ? "border-success/30 bg-success/10 text-success-ink"
                    : performance.tone === "text-warning-ink"
                      ? "border-warning/30 bg-warning/10 text-warning-ink"
                      : "border-danger/25 bg-danger/10 text-danger",
                )}
              >
                {machine.performance}% now
              </span>
            </div>

            <div className="mt-3 h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={detail.series.performance}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.green} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART.green} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: CHART.axis, fontSize: 9 }}
                    interval={Math.max(0, Math.floor(detail.series.performance.length / 4))}
                    dy={4}
                  />
                  <YAxis domain={[50, 100]} hide />
                  <Tooltip content={<ChartTooltip unit="%" />} cursor={{ stroke: "#CBD8E7" }} />
                  <ReferenceLine
                    y={90}
                    stroke={CHART.amber}
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="efficiency"
                    name="Efficiency"
                    stroke={CHART.green}
                    strokeWidth={2}
                    fill="url(#performanceFill)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/70 pt-2 text-[10px]">
              <div>
                <p className="text-muted-foreground">Current efficiency</p>
                <p className={cn("text-[13px] font-semibold", performance.tone)}>
                  {machine.performance}% · {performance.label}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Configured target</p>
                <p className="text-[13px] font-semibold text-navy">90%</p>
              </div>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Performance compares actual consumption and temperature behaviour with
              the saved baseline and nameplate specifications.
            </p>
          </section>
        </div>

        <section id="machine-alerts" className="scroll-mt-24 rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-navy">
                Machine alerts
                <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                  {activeAlerts.length}
                </span>
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Detected issues with readings, expected values and corrective actions
              </p>
            </div>
            {activeAlerts.some((alert) => alert.severity === "critical") && (
              <span className="inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger/10 px-2 py-0.5 text-[9.5px] font-semibold text-danger">
                <TriangleAlert className="size-3" />
                {activeAlerts.filter((alert) => alert.severity === "critical").length} critical
              </span>
            )}
          </div>

          {detail.alerts.length === 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/25 bg-success/[0.05] px-3 py-2.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              <p className="text-[11px] text-success-ink">
                No alerts are open for this machine in the current simulated dataset.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2.5 xl:grid-cols-2">
              {detail.alerts.map((alert) => (
                <AlertItem key={alert.key} alert={alert} now={now} compact />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2 rounded-xl border border-warning/25 bg-warning/[0.055] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2 text-[10.5px] leading-relaxed text-navy/75">
            <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
            Simulated machine telemetry. Status, energy, temperature and maintenance
            records are generated demo data, not live sensor or manually entered
            readings. Costs use a flat ₹8.20/kWh tariff.
          </p>
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-warning-ink">
            {detail.range} view
          </span>
        </div>
      </div>

      <MachineFormDialog
        key={`${record?._id ?? "record"}-${editOpen ? "open" : "closed"}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        machine={record}
        existingCodes={(records ?? []).map((item) => item.code)}
      />
    </AppShell>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-[116px] w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[300px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
