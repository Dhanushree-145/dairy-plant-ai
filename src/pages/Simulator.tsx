import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatInr } from "@/lib/waste";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Gauge,
  Lock,
  Milk,
  PackageCheck,
  Play,
  Recycle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TrendingDown,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ScenarioKey =
  | "cleaning_failure"
  | "temperature_excursion"
  | "waste_increase"
  | "maintenance_delay";

type ScenarioMeta = {
  key: ScenarioKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  defaults: { intensity: number; duration: number };
  intensity: { label: string; min: number; max: number; step: number; unit: string };
  duration: { label: string; min: number; max: number; step: number; unit: string };
};

const SCENARIOS: ScenarioMeta[] = [
  {
    key: "cleaning_failure",
    label: "Cleaning cycle fails",
    shortLabel: "CIP failure",
    description: "A CIP or cleaning release fails verification before the next production run.",
    icon: ShieldAlert,
    accent: "border-danger/25 bg-danger/[0.04] text-danger",
    defaults: { intensity: 60, duration: 2 },
    intensity: { label: "Failure severity", min: 10, max: 100, step: 5, unit: "%" },
    duration: { label: "Detection delay", min: 1, max: 5, step: 1, unit: "days" },
  },
  {
    key: "temperature_excursion",
    label: "Temperature exceeds limit",
    shortLabel: "Cold-chain excursion",
    description: "Milk storage rises above the configured cold-chain limit and stays there.",
    icon: Thermometer,
    accent: "border-warning/25 bg-warning/[0.045] text-warning-ink",
    defaults: { intensity: 4, duration: 8 },
    intensity: { label: "Degrees above limit", min: 1, max: 10, step: 1, unit: "°C" },
    duration: { label: "Hours unresolved", min: 1, max: 24, step: 1, unit: "hours" },
  },
  {
    key: "waste_increase",
    label: "Production waste rises",
    shortLabel: "Waste increase",
    description: "Waste generation moves above its current baseline for a sustained period.",
    icon: Recycle,
    accent: "border-primary/25 bg-primary/[0.04] text-primary",
    defaults: { intensity: 20, duration: 7 },
    intensity: { label: "Waste increase", min: 5, max: 50, step: 5, unit: "%" },
    duration: { label: "Days sustained", min: 1, max: 14, step: 1, unit: "days" },
  },
  {
    key: "maintenance_delay",
    label: "Maintenance is delayed",
    shortLabel: "Deferred service",
    description: "Preventive service slips while the machine continues to run.",
    icon: Wrench,
    accent: "border-navy/20 bg-navy/[0.035] text-navy",
    defaults: { intensity: 14, duration: 8 },
    intensity: { label: "Service delay", min: 1, max: 30, step: 1, unit: "days" },
    duration: { label: "Repair window", min: 1, max: 24, step: 1, unit: "hours" },
  },
];

const METRIC_ICONS: Record<string, LucideIcon> = {
  production: Milk,
  release: Clock,
  compliance: ShieldCheck,
  waste: Recycle,
  spoilage: Thermometer,
  energy: Zap,
  cost: CircleDollarSign,
  probability: AlertTriangle,
  downtime: Clock,
};

const TONE_STYLES = {
  danger: "border-danger/20 bg-danger/[0.035] text-danger",
  warning: "border-warning/25 bg-warning/[0.04] text-warning-ink",
  primary: "border-primary/20 bg-primary/[0.035] text-primary",
  success: "border-success/20 bg-success/[0.035] text-success-ink",
  navy: "border-border/80 bg-card text-navy",
} as const;

const RISK_STYLES = {
  low: {
    shell: "border-success/25 bg-success/[0.035]",
    badge: "bg-success/10 text-success-ink",
    bar: "bg-success",
    text: "text-success-ink",
  },
  moderate: {
    shell: "border-warning/25 bg-warning/[0.04]",
    badge: "bg-warning/10 text-warning-ink",
    bar: "bg-warning",
    text: "text-warning-ink",
  },
  high: {
    shell: "border-danger/20 bg-danger/[0.035]",
    badge: "bg-danger/10 text-danger",
    bar: "bg-danger",
    text: "text-danger",
  },
  critical: {
    shell: "border-danger/35 bg-danger/[0.055]",
    badge: "bg-danger text-white",
    bar: "bg-danger",
    text: "text-danger",
  },
} as const;

export default function Simulator() {
  const { user } = useAuth();
  const initial = SCENARIOS[0];
  const [scenario, setScenario] = useState<ScenarioKey>(initial.key);
  const [intensity, setIntensity] = useState(initial.defaults.intensity);
  const [duration, setDuration] = useState(initial.defaults.duration);
  const [applied, setApplied] = useState({
    scenario: initial.key,
    intensity: initial.defaults.intensity,
    duration: initial.defaults.duration,
  });
  const data = useQuery(api.simulation.whatIf, applied);
  const meta = SCENARIOS.find((item) => item.key === scenario) ?? initial;
  const appliedMeta = SCENARIOS.find((item) => item.key === applied.scenario) ?? initial;
  const dirty =
    scenario !== applied.scenario ||
    intensity !== applied.intensity ||
    duration !== applied.duration;

  const selectScenario = (next: ScenarioMeta) => {
    setScenario(next.key);
    setIntensity(next.defaults.intensity);
    setDuration(next.defaults.duration);
  };

  const reset = () => {
    const base = SCENARIOS.find((item) => item.key === applied.scenario) ?? initial;
    setScenario(base.key);
    setIntensity(base.defaults.intensity);
    setDuration(base.defaults.duration);
  };

  const run = () => {
    setApplied({ scenario, intensity, duration });
  };

  const risk = data ? RISK_STYLES[data.riskLevel] : RISK_STYLES.moderate;

  return (
    <AppShell
      plantName={user?.plantName}
      sectionLabel="What-If Simulator"
      activeKey="simulator"
    >
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] font-semibold tracking-tight text-navy">
                What-If Simulator
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/[0.07] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-warning-ink">
                <Sparkles className="size-3" /> Decision support
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
              Pressure-test a disruption before it happens. Change the scenario and
              see the estimated operational impact, then act on the preventive plan.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-success/25 bg-success/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-success-ink">
            <Lock className="size-3" /> Read-only · no plant records changed
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[355px_1fr]">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Choose a scenario
              </p>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                Simulated
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {SCENARIOS.map((item) => {
                const Icon = item.icon;
                const selected = item.key === scenario;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectScenario(item)}
                    aria-pressed={selected}
                    className={cn(
                      "group rounded-lg border p-2.5 text-left transition-all",
                      selected
                        ? item.accent
                        : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/25 hover:bg-background",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="mt-2 block text-[10px] font-semibold leading-snug">
                      {item.shortLabel}
                    </span>
                    <span className="mt-0.5 block text-[8px] leading-relaxed opacity-75">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="simulation-intensity" className="text-[10px] font-semibold text-navy">
                    {meta.intensity.label}
                  </label>
                  <span className="text-[11px] font-semibold text-primary">
                    {intensity} {meta.intensity.unit}
                  </span>
                </div>
                <Slider
                  id="simulation-intensity"
                  className="mt-2"
                  value={[intensity]}
                  min={meta.intensity.min}
                  max={meta.intensity.max}
                  step={meta.intensity.step}
                  onValueChange={(next) => setIntensity(next[0] ?? intensity)}
                />
                <div className="mt-1 flex justify-between text-[8px] text-muted-foreground">
                  <span>{meta.intensity.min} {meta.intensity.unit}</span>
                  <span>{meta.intensity.max} {meta.intensity.unit}</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="simulation-duration" className="text-[10px] font-semibold text-navy">
                    {meta.duration.label}
                  </label>
                  <span className="text-[11px] font-semibold text-primary">
                    {duration} {meta.duration.unit}
                  </span>
                </div>
                <Slider
                  id="simulation-duration"
                  className="mt-2"
                  value={[duration]}
                  min={meta.duration.min}
                  max={meta.duration.max}
                  step={meta.duration.step}
                  onValueChange={(next) => setDuration(next[0] ?? duration)}
                />
                <div className="mt-1 flex justify-between text-[8px] text-muted-foreground">
                  <span>{meta.duration.min} {meta.duration.unit}</span>
                  <span>{meta.duration.max} {meta.duration.unit}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" className="h-9 flex-1 text-[11px]" onClick={run}>
                <Play className="size-3.5" /> Run simulation
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                onClick={reset}
                disabled={!dirty}
                aria-label="Reset simulation controls"
                title="Reset controls"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
            {dirty && (
              <p className="mt-2 text-[9px] leading-relaxed text-warning-ink">
                Controls changed. Run the simulation to update the projection.
              </p>
            )}
            <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
              Scenarios use the demo plant baseline and never create, edit or
              delete a production, hygiene or waste record.
            </p>
          </section>

          <div className="space-y-4">
            {!data ? (
              <SimulatorSkeleton />
            ) : (
              <>
                <section className={cn("relative overflow-hidden rounded-xl border p-4 shadow-card sm:p-5", risk.shell)}>
                  <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/50 blur-3xl" />
                  <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider", risk.badge)}>
                          {data.riskLevel} risk
                        </span>
                        <span className="text-[9px] font-medium text-muted-foreground">
                          {data.scenarioLabel} · {data.inputSummary}
                        </span>
                      </div>
                      <h2 className="mt-2.5 font-display text-[20px] font-semibold leading-snug tracking-tight text-navy sm:text-[23px]">
                        {data.headline}
                      </h2>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-muted-foreground">
                        <span>
                          <span className="font-semibold text-navy">{formatInr(data.costImpact)}</span>{" "}
                          estimated cost exposure
                        </span>
                        <span>
                          <span className="font-semibold text-navy">{formatInr(data.baseline.revenue)}</span>{" "}
                          baseline daily revenue
                        </span>
                        <span>
                          <span className="font-semibold text-navy">{data.baseline.wasteKg.toLocaleString("en-IN")} kg</span>{" "}
                          baseline daily waste
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/70 bg-white/70 p-3 shadow-sm">
                      <div className="relative flex size-16 items-center justify-center rounded-full bg-white">
                        <svg viewBox="0 0 64 64" className="absolute inset-0 size-16 -rotate-90">
                          <circle cx="32" cy="32" r="26" fill="none" stroke="#E7EEF7" strokeWidth="6" />
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray="163.4"
                            strokeDashoffset={163.4 - (163.4 * data.riskScore) / 100}
                            className={risk.text}
                          />
                        </svg>
                        <span className="relative font-display text-[18px] font-semibold text-navy">
                          {data.riskScore}
                        </span>
                      </div>
                      <div>
                        <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Risk score
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-navy">out of 100</p>
                        <p className={cn("mt-1 text-[9px] font-semibold capitalize", risk.text)}>
                          {data.riskLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {data.metrics.map((metric) => {
                    const Icon = METRIC_ICONS[metric.id] ?? Activity;
                    return (
                      <div
                        key={metric.id}
                        className={cn("rounded-xl border p-3.5 shadow-card", TONE_STYLES[metric.tone])}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[8.5px] font-semibold uppercase tracking-[0.13em] opacity-70">
                            {metric.label}
                          </p>
                          <Icon className="size-3.5 shrink-0" />
                        </div>
                        <p className="mt-2 font-display text-[20px] font-semibold leading-none tracking-tight">
                          {metric.value}
                        </p>
                        <p className="mt-1.5 text-[8.5px] leading-relaxed opacity-70">
                          {metric.note}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-5">
                  <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card lg:col-span-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[14px] font-semibold text-navy">
                          Cumulative cost exposure
                        </h2>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          Baseline operating cost versus the same week with this disruption.
                        </p>
                      </div>
                      <Gauge className="size-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeline} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="simulationDelta" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#DC4545" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#DC4545" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#E7EEF7" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 8, fill: "#8296AD" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 8, fill: "#8296AD" }}
                            axisLine={false}
                            tickLine={false}
                            width={52}
                            tickFormatter={(value: number) => `₹${(value / 100_000).toFixed(1)}L`}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 10 }}
                            formatter={(value) => formatInr(Number(value))}
                          />
                          <Area
                            type="monotone"
                            dataKey="baseline"
                            name="Without scenario"
                            stroke="#8296AD"
                            strokeWidth={1.8}
                            fill="transparent"
                          />
                          <Area
                            type="monotone"
                            dataKey="scenario"
                            name="With scenario"
                            stroke="#DC4545"
                            strokeWidth={2}
                            fill="url(#simulationDelta)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[8.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 bg-[#8296AD]" /> Without scenario
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 bg-danger" /> With scenario
                      </span>
                      <span className="ml-auto">Planning estimate · 7-day view</span>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card lg:col-span-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[14px] font-semibold text-navy">
                          Baseline used
                        </h2>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          Demo plant model, not a live reading.
                        </p>
                      </div>
                      <Lock className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {[
                        ["Milk processed", `${data.baseline.dailyLitres.toLocaleString("en-IN")} L / day`],
                        ["Operating cost", `${formatInr(data.baseline.operatingCost)} / day`],
                        ["Product revenue", `${formatInr(data.baseline.revenue)} / day`],
                        ["Waste baseline", `${data.baseline.wasteKg.toLocaleString("en-IN")} kg / day`],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2.5 py-1.5 text-[9.5px]"
                        >
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-navy">{value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 border-t border-border/60 pt-2 text-[8.5px] leading-relaxed text-muted-foreground">
                      {data.modelNote}
                    </p>
                  </section>
                </div>

                <div className="grid gap-4 lg:grid-cols-5">
                  <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card lg:col-span-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[14px] font-semibold text-navy">
                          Preventive action plan
                        </h2>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          Ranked by the exposure this scenario could avoid.
                        </p>
                      </div>
                      <ShieldCheck className="size-4 text-primary" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {data.recommendations.map((recommendation, index) => (
                        <article
                          key={recommendation.id}
                          className="rounded-lg border border-border/70 bg-background/40 p-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-navy">
                                {recommendation.title}
                              </p>
                              <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                                {recommendation.detail}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <PackageCheck className="size-2.5" /> {recommendation.owner}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-2.5" /> {recommendation.window}
                                </span>
                                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-success-ink">
                                  <TrendingDown className="size-2.5" /> Avoid up to{" "}
                                  {formatInr(recommendation.avoidedCost)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card lg:col-span-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[14px] font-semibold text-navy">
                          Assumptions & guardrails
                        </h2>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          What this projection does and does not know.
                        </p>
                      </div>
                      <AlertTriangle className="size-4 text-warning" />
                    </div>
                    <ul className="mt-3 space-y-2">
                      {data.assumptions.map((assumption) => (
                        <li key={assumption} className="flex gap-2 text-[9px] leading-relaxed text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success" />
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.035] px-2.5 py-2 text-[8.5px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-navy">How to use it:</span>{" "}
                      run a pessimistic case, assign the owner below the action, and
                      verify the first real reading before changing production.
                    </div>
                  </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-[9px] text-muted-foreground shadow-card">
                  <span>
                    <span className="font-semibold text-navy">Current run:</span>{" "}
                    {appliedMeta.label} · {data.inputSummary}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Lock className="size-3" /> Simulation only
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SimulatorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[220px] rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[112px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-[310px] rounded-xl lg:col-span-3" />
        <Skeleton className="h-[310px] rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-[260px] rounded-xl" />
    </div>
  );
}
