import { AppShell } from "@/components/dashboard/AppShell";
import {
  EmptyHygiene,
  HYGIENE_ACCENTS,
  HYGIENE_ICONS,
  HygieneSection,
  HygieneStatusPill,
  HygieneWorkflowStrip,
  KpiTile,
  SensorStatusPill,
  SourcePill,
  Sparkline,
} from "@/components/hygiene/HygieneBits";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useLiveNow } from "@/hooks/use-live-now";
import {
  formatHygieneTime,
  relativeHygieneTime,
  type HygieneCategoryKey,
} from "@/lib/hygiene";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  Cpu,
  Droplets,
  Gauge,
  Info,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = {
  clean: "#16A078",
  attention: "#F59E0B",
  failed: "#DC4545",
  pending: "#3185D8",
};

export default function Hygiene() {
  const { user } = useAuth();
  const now = useLiveNow();
  const data = useQuery(api.hygiene.dashboard, { now });

  if (!data) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
        <HygieneSkeleton />
      </AppShell>
    );
  }

  const statusData = [
    { name: "Clean", value: data.summary.clean, color: STATUS_COLORS.clean },
    { name: "Attention", value: data.summary.unclean + data.summary.overdue, color: STATUS_COLORS.attention },
    { name: "Verification", value: data.summary.verificationPending, color: STATUS_COLORS.pending },
    { name: "Unknown", value: data.summary.unknown, color: "#8296AD" },
  ];

  return (
    <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
              Plant module · Hygiene Management
            </p>
            <h1 className="mt-1.5 font-display text-[25px] font-semibold tracking-tight text-navy sm:text-[30px]">
              Hygiene control across the plant
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
              Six operating categories, connected sensor evidence and a QA release
              workflow — from cleaning record to verified production readiness.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-2 text-[10.5px] font-medium text-muted-foreground shadow-sm">
              <CalendarClock className="size-3.5 text-primary" />
              {new Date(data.generatedAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-warning-ink">
              <span className="size-1.5 rounded-full bg-warning" />
              Demo telemetry
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-warning/25 bg-warning/[0.055] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-[11.5px] leading-relaxed text-navy/75">
              <span className="font-semibold text-navy">Simulated sensor evidence.</span>{" "}
              {data.disclaimer}
            </p>
          </div>
          <span className="ml-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning-ink sm:ml-0">
            {data.summary.onlineSensors}/{data.summary.sensors} sensors online
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile label="Total assets" value={data.summary.total} note="Across all six categories" icon={Layers} tone="navy" />
          <KpiTile label="Clean & verified" value={data.summary.clean} note="QA-released for food contact" icon={ShieldCheck} tone="success" />
          <KpiTile
            label="Needs attention"
            value={data.summary.unclean + data.summary.overdue}
            note={`${data.summary.overdue} overdue · ${data.summary.unclean} unclean`}
            icon={CircleAlert}
            tone="warning"
          />
          <KpiTile
            label="Verification pending"
            value={data.summary.verificationPending}
            note="Cleaned, awaiting QA evidence review"
            icon={ClipboardCheck}
            tone="primary"
          />
          <KpiTile
            label="Connected sensors"
            value={data.summary.onlineSensors}
            unit={`/ ${data.summary.sensors}`}
            note={`${data.summary.offlineSensors} offline — never treated as normal`}
            icon={Cpu}
            tone={data.summary.offlineSensors > 0 ? "danger" : "success"}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-card sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Equipment", data.summary.equipment, "equipment"],
            ["Tankers", data.summary.tankers, "tankers"],
            ["Employees", data.summary.employees, "employees"],
            ["Packaging", data.summary.packaging, "packaging"],
            ["Laboratory", data.summary.laboratory, "laboratory"],
            [
              "Zones",
              data.categories.find((category) => category.key === "environment")?.total ?? 0,
              "environment",
            ],
          ].map(([label, value, key]) => {
            const Icon = HYGIENE_ICONS[key as HygieneCategoryKey];
            return (
              <Link
                key={String(key)}
                to={`/dashboard/hygiene/category/${key}`}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
              >
                <span className={cn("flex size-7 items-center justify-center rounded-lg", HYGIENE_ACCENTS[key as HygieneCategoryKey])}>
                  <Icon className="size-3.5" />
                </span>
                <span>
                  <span className="block text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <span className="font-display text-[14px] font-semibold text-navy">{value}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <HygieneWorkflowStrip />

        <div>
          <div className="mb-2.5 flex items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-navy">Six hygiene categories</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Click a category to inspect assets, evidence and release status.
              </p>
            </div>
            <span className="hidden text-[9.5px] uppercase tracking-wider text-muted-foreground sm:block">
              Green = verified · grey = no evidence
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.categories.map((category) => {
              const Icon = HYGIENE_ICONS[category.key];
              return (
                <Link
                  key={category.key}
                  to={`/dashboard/hygiene/category/${category.key}`}
                  className="group rounded-xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("flex size-9 items-center justify-center rounded-lg", HYGIENE_ACCENTS[category.key])}>
                      <Icon className="size-4" />
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {category.clean}/{category.total} clean
                    </span>
                  </div>
                  <h3 className="mt-3 text-[13px] font-semibold text-navy">{category.label}</h3>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {category.short} · {category.overdue} overdue · {category.verificationPending} awaiting QA
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="flex gap-2.5">
                      <CategoryCount label="Clean" value={category.clean} tone="text-success-ink" />
                      <CategoryCount label="Unclean" value={category.unclean} tone="text-danger" />
                      <CategoryCount label="Pending" value={category.pending} tone="text-warning-ink" />
                    </div>
                    <Sparkline values={category.trend.map((point) => point.value)} width={88} height={28} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-[9px] text-muted-foreground">7-day clean trend</span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-primary">
                      Open category <ArrowRight className="size-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <HygieneSection
            title="Compliance trend"
            subtitle="Verified assets versus assets needing attention"
            className="lg:col-span-3"
            action={
              <div className="flex gap-3 text-[9.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" /> Clean
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-warning" /> Attention
                </span>
              </div>
            }
          >
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.complianceTrend}>
                  <defs>
                    <linearGradient id="hygieneCleanFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A078" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#16A078" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E7EEF7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: "#8296AD" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<SimpleHygieneTooltip />} />
                  <Area type="monotone" dataKey="clean" name="Clean" stroke="#16A078" strokeWidth={2} fill="url(#hygieneCleanFill)" />
                  <Area type="monotone" dataKey="attention" name="Attention" stroke="#F59E0B" strokeWidth={1.8} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </HygieneSection>

          <HygieneSection
            title="Current status mix"
            subtitle="Assets by release status"
            className="lg:col-span-2"
          >
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid stroke="#E7EEF7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#8296AD" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={74} tick={{ fontSize: 9.5, fill: "#8296AD" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<SimpleHygieneTooltip />} />
                  <Bar dataKey="value" name="Assets" radius={[0, 4, 4, 0]} barSize={14}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-[10.5px]">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="ml-auto font-semibold text-navy">{entry.value}</span>
                </div>
              ))}
            </div>
          </HygieneSection>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <HygieneSection
            title="Needs attention now"
            subtitle="Failed, overdue, awaiting verification or unknown evidence"
            className="lg:col-span-3"
            action={
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[9.5px] font-semibold text-warning-ink">
                {data.attention.length} shown
              </span>
            }
          >
            {data.attention.length === 0 ? (
              <EmptyHygiene text="No asset currently needs hygiene attention." />
            ) : (
              <div className="space-y-1.5">
                {data.attention.map((asset) => (
                  <Link
                    key={asset.key}
                    to={`/dashboard/hygiene/asset/${asset.key}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/45 px-2.5 py-2 transition-colors hover:border-primary/25 hover:bg-white"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[9px] font-bold text-navy/70 shadow-sm">
                      {asset.code.slice(0, 3)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold text-navy">{asset.name}</span>
                      <span className="block text-[9.5px] text-muted-foreground">
                        {asset.code} · {asset.zone} · {asset.operator}
                      </span>
                    </span>
                    <HygieneStatusPill status={asset.status} />
                    <span className="hidden shrink-0 text-right text-[9px] text-muted-foreground sm:block">
                      {asset.status === "overdue"
                        ? `Due ${relativeHygieneTime(asset.nextCleaningAt, now)}`
                        : `Last ${relativeHygieneTime(asset.lastCleanedAt, now)}`}
                    </span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </HygieneSection>

          <HygieneSection
            title="Live sensor evidence"
            subtitle="Latest configured readings linked to assets"
            className="lg:col-span-2"
            action={<span className="text-[9px] text-muted-foreground">Demo</span>}
          >
            <div className="space-y-2">
              {data.sensors.map((sensor) => (
                <Link
                  key={sensor.key}
                  to={`/dashboard/hygiene/asset/${sensor.assetKey}`}
                  className="block rounded-lg border border-border/60 bg-background/45 px-2.5 py-2 transition-colors hover:border-primary/25 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-medium text-navy">{sensor.label}</p>
                      <p className="truncate text-[9px] text-muted-foreground">
                        {sensor.assetName} · range {sensor.requirement}
                      </p>
                    </div>
                    <SensorStatusPill status={sensor.status} />
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <p className="font-display text-[15px] font-semibold text-navy">
                      {sensor.value}
                      <span className="ml-1 text-[9px] font-medium text-muted-foreground">{sensor.unit}</span>
                    </p>
                    <Sparkline
                      values={sensor.history.map((point) => point.value)}
                      color={sensor.outOfRange ? "#DC4545" : "#3185D8"}
                      width={74}
                      height={22}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-muted-foreground">
                    <SourcePill source={sensor.source} />
                    <span>Last seen {formatHygieneTime(sensor.lastSeen)}</span>
                  </div>
                </Link>
              ))}
              {data.sensors.length === 0 && <EmptyHygiene text="No linked sensors in this view." />}
            </div>
          </HygieneSection>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <HygieneSection title="Operating model" subtitle="How a reading becomes a release decision">
            <div className="space-y-2.5">
              {[
                { icon: Droplets, title: "Sensor or manual evidence", copy: "Temperature, flow, pressure, conductivity, pH, turbidity and manual checks." },
                { icon: Activity, title: "Requirement evaluation", copy: "Backend compares the reading with the configured SOP range and flags deviations." },
                { icon: ShieldCheck, title: "QA release", copy: "Cleaning evidence is reviewed. Missing evidence stays grey — never automatically clean." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-navy">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </HygieneSection>

          <HygieneSection title="Category health" subtitle="Verified share by category">
            <div className="space-y-2">
              {data.categories.map((category) => {
                const pct = Math.round((category.clean / Math.max(1, category.total)) * 100);
                return (
                  <div key={category.key}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{category.short}</span>
                      <span className="font-semibold text-navy">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </HygieneSection>

          <HygieneSection title="Operator summary" subtitle="People and zones covered">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Employees", value: data.summary.employees, icon: Users, note: "Pre-shift inspections" },
                {
                  label: "Zones",
                  value:
                    data.categories.find((category) => category.key === "environment")?.total ?? 0,
                  icon: Gauge,
                  note: "Environmental checks",
                },
                { label: "Sensors", value: data.summary.onlineSensors, icon: Cpu, note: "Online now" },
                { label: "Verified", value: data.summary.clean, icon: ShieldCheck, note: "QA released" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-border/60 bg-background/45 p-2.5">
                    <Icon className="size-3.5 text-primary" />
                    <p className="mt-1.5 font-display text-[16px] font-semibold text-navy">{item.value}</p>
                    <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
            <Link
              to="/dashboard/waste"
              className="mt-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] px-2.5 py-2 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/[0.07]"
            >
              Compare CIP wastewater in Waste Management
              <ArrowRight className="size-3" />
            </Link>
          </HygieneSection>
        </div>

        <p className="flex items-start justify-center gap-1.5 pt-1 text-center text-[10px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
          Sensor readings alone do not prove microbiological safety. QA verification and release are always recorded separately.
        </p>
      </div>
    </AppShell>
  );
}

function CategoryCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className={cn("font-display text-[15px] font-semibold leading-none", tone)}>{value}</p>
      <p className="mt-0.5 text-[8.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function SimpleHygieneTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-2 shadow-card">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-1.5 text-[10px]">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto pl-3 font-semibold text-navy">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function HygieneSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-9 w-96" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[190px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
