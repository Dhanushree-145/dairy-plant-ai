import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  formatCurrency,
  numberFormatter,
  timeOfDayGreeting,
  type DashboardRange,
  type OverviewData,
  type OverviewRecommendation,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Droplets,
  Gauge,
  Info,
  Leaf,
  Recycle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { toast } from "sonner";

const COLORS = {
  blue: "#3185D8",
  blueSoft: "#7EA6D8",
  green: "#16A078",
  amber: "#F59E0B",
  red: "#DC4545",
  grid: "#E7EEF7",
  axis: "#8296AD",
  navy: "#162B4D",
};

const DONUT_COLORS = ["#3185D8", "#16A078", "#7EA6D8", "#F59E0B", "#1E3A5F", "#A8C6E8"];

export function Overview({
  data,
  days,
  onDaysChange,
}: {
  data: OverviewData | undefined;
  days: DashboardRange;
  onDaysChange: (range: DashboardRange) => void;
}) {
  const { user } = useAuth();

  if (!data) {
    return <OverviewSkeleton />;
  }

  const plantName = user?.plantName?.trim() || data.plant.name;
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const generatedAt = new Date(data.generatedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      id="overview"
      className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8"
    >
      {/* Page header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
            Owner overview
          </p>
          <h1 className="mt-1.5 font-display text-[25px] font-semibold tracking-tight text-navy sm:text-[30px]">
            {timeOfDayGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Here is how <span className="font-medium text-navy/80">{plantName}</span> ran
            over the last {days} days, based on the demo dataset.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 shadow-sm">
            <CalendarDays className="ml-1.5 size-3.5 text-muted-foreground" />
            {([7, 30] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onDaysChange(range)}
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
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] font-medium text-muted-foreground shadow-sm">
            <RefreshCw className="size-3.5 text-success" />
            Generated {generatedAt}
          </span>
        </div>
      </div>

      {/* Data provenance */}
      <div className="flex flex-col gap-2 rounded-xl border border-warning/25 bg-warning/[0.055] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[11.5px] leading-relaxed text-navy/75">
            <span className="font-semibold text-navy">Simulated dataset.</span>{" "}
            {data.disclaimer}
          </p>
        </div>
        <span className="ml-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning-ink sm:ml-0">
          Demo build
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Production + performance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ProductionCard data={data} days={days} />
        <PerformanceCard data={data} />
      </div>

      {/* Product mix */}
      <ProductMixCard products={data.productMix} />

      {/* Recommendation centre */}
      <RecommendationCentre
        recommendations={data.recommendations}
        savingsPotential={data.savingsPotential}
      />

      {/* Energy + snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <EnergyWasteCard data={data} />
        <SnapshotCard data={data} />
      </div>

      <p className="pt-1 text-center text-[10.5px] leading-relaxed text-muted-foreground">
        DairySense keeps milk, production, energy, cost and profit tied to the same
        plant records. Figures shown are simulated for demonstration and are not
        live sensor readings.
      </p>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: OverviewData["kpis"][number] }) {
  const icons = {
    milk: Droplets,
    products: Gauge,
    energy: Zap,
    waste: Recycle,
  } as const;
  const Icon = icons[kpi.id as keyof typeof icons] ?? Gauge;
  const isUp = kpi.delta >= 0;
  const good = kpi.deltaGood;
  const tone =
    kpi.id === "energy" || kpi.id === "waste"
      ? "text-success bg-success/10"
      : "text-primary bg-primary/10";

  return (
    <div className="group rounded-xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {kpi.label}
        </p>
        <span className={cn("flex size-7 items-center justify-center rounded-lg", tone)}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-display text-[26px] font-semibold leading-none tracking-tight text-navy">
          {numberFormatter.format(kpi.value)}
          <span className="ml-1 text-[11px] font-medium text-muted-foreground">
            {kpi.unit}
          </span>
        </p>
        <Sparkline values={kpi.spark} positive={kpi.id === "milk" || kpi.id === "products"} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
            good ? "bg-success/10 text-success-ink" : "bg-danger/10 text-danger",
          )}
        >
          {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {isUp ? "+" : ""}
          {kpi.delta.toFixed(1)}%
        </span>
        <span className="text-[10.5px] text-muted-foreground">vs previous period</span>
      </div>
      <p className="mt-2 border-t border-border/70 pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
        {kpi.caption}
      </p>
    </div>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const width = 76;
  const height = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const color = positive ? COLORS.blue : COLORS.green;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={color}
        fillOpacity={0.08}
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={Number(points[points.length - 1]?.split(",")[1] ?? height / 2)}
        r={2}
        fill={color}
      />
    </svg>
  );
}

function ProductionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-2.5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <p
            key={`${entry.dataKey}`}
            className="flex items-center gap-1.5 text-[11px]"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-navy">
              {numberFormatter.format(Number(entry.value))}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ProductionCard({
  data,
  days,
}: {
  data: OverviewData;
  days: DashboardRange;
}) {
  const totalProcessed = data.production.reduce((sum, day) => sum + day.processed, 0);
  const latest = data.production[data.production.length - 1];
  const vsTarget = latest ? ((latest.processed - latest.target) / latest.target) * 100 : 0;

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-navy">
            Daily production performance
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Milk received against processed, with the daily target
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" /> Processed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary/35" /> Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-3 border-t border-dashed border-warning" /> Target
          </span>
        </div>
      </div>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.production} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="processedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.blueSoft} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.blueSoft} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLORS.axis, fontSize: 10.5 }}
              interval={days === 7 ? 0 : 4}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLORS.axis, fontSize: 10.5 }}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
              domain={[0, "dataMax + 6000"]}
              width={46}
            />
            <Tooltip content={<ProductionTooltip />} cursor={{ stroke: "#CBD8E7" }} />
            <ReferenceLine
              y={latest?.target ?? 46000}
              stroke={COLORS.amber}
              strokeDasharray="5 5"
              strokeWidth={1.4}
            />
            <Area
              type="monotone"
              dataKey="received"
              name="Received"
              stroke={COLORS.blueSoft}
              strokeWidth={1.6}
              fill="url(#receivedFill)"
              animationDuration={700}
            />
            <Area
              type="monotone"
              dataKey="processed"
              name="Processed"
              stroke={COLORS.blue}
              strokeWidth={2.4}
              fill="url(#processedFill)"
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Period processed
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-navy">
            {numberFormatter.format(totalProcessed)} L
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Latest day vs target
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px] font-semibold",
              vsTarget >= 0 ? "text-success-ink" : "text-warning-ink",
            )}
          >
            {vsTarget >= 0 ? "+" : ""}
            {vsTarget.toFixed(1)}%
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Plant utilisation
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-navy">
            {data.plant.utilisation}% of {numberFormatter.format(data.plant.capacityLitresPerDay)} L
          </p>
        </div>
      </div>
    </section>
  );
}

function PerformanceCard({ data }: { data: OverviewData }) {
  const { overallScore, grade, pillars } = data.performance;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overallScore / 100) * circumference;

  return (
    <section className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-navy">
            Overall plant performance
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Weighted across four operating pillars
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            overallScore >= 85
              ? "bg-success/10 text-success-ink"
              : overallScore >= 75
                ? "bg-primary/10 text-primary"
                : "bg-warning/10 text-warning-ink",
          )}
        >
          {grade}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div className="relative size-[128px]">
          <svg viewBox="0 0 128 128" className="size-[128px] -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#EDF2F8" strokeWidth="10" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={COLORS.blue}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 700ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[30px] font-semibold leading-none text-navy">
              {overallScore}
            </span>
            <span className="mt-1 text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              / 100 score
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {pillars.map((pillar) => {
          const belowTarget = pillar.score < pillar.target;
          return (
            <div key={pillar.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11.5px] font-medium text-navy/85">
                  {pillar.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    belowTarget ? "text-warning-ink" : "text-success-ink",
                  )}
                >
                  {pillar.score}
                  <span className="ml-0.5 text-[9.5px] font-medium text-muted-foreground">
                    / {pillar.target}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    belowTarget ? "bg-warning" : "bg-success",
                  )}
                  style={{ width: `${pillar.score}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{pillar.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductMixCard({ products }: { products: OverviewData["productMix"] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected === null ? null : products[selected];

  return (
    <section className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-navy">
            Product mix
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Output by product line
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          kg
        </span>
      </div>

      <div className="relative mt-1 h-[172px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={products}
              dataKey="quantity"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={700}
            >
              {products.map((product, index) => (
                <Cell
                  key={product.name}
                  fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  opacity={selected === null || selected === index ? 1 : 0.3}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[22px] font-semibold leading-none text-navy">
            {active ? `${active.share}%` : numberFormatter.format(products.reduce((sum, p) => sum + p.quantity, 0))}
          </span>
          <span className="mt-1 max-w-[100px] text-center text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            {active ? active.name : "total kg output"}
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {products.map((product, index) => (
          <button
            key={product.name}
            type="button"
            onMouseEnter={() => setSelected(index)}
            onFocus={() => setSelected(index)}
            onClick={() => setSelected(selected === index ? null : index)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors",
              selected === index ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-navy/80">
              {product.name}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {product.share}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecommendationCentre({
  recommendations,
  savingsPotential,
}: {
  recommendations: OverviewRecommendation[];
  savingsPotential: number;
}) {
  const [reviewed, setReviewed] = useState<string[]>([]);

  const toggleReviewed = (item: OverviewRecommendation) => {
    const isReviewed = reviewed.includes(item.id);
    setReviewed((current) =>
      isReviewed ? current.filter((id) => id !== item.id) : [...current, item.id],
    );
    if (!isReviewed) {
      toast.success("Recommendation marked as reviewed", {
        description: `${item.title} — saved to your action log for this session.`,
      });
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-primary/20 bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border/70 bg-primary/[0.035] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 font-display text-[15px] font-semibold text-navy">
              AI recommendation centre
              <span className="rounded-full border border-border bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rule-based
              </span>
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Generated from the current sample records. Detected issues are
              separated from suggestions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-12 sm:pl-0">
          <div className="text-right">
            <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Potential saving
            </p>
            <p className="font-display text-[15px] font-semibold text-success-ink">
              {formatCurrency(savingsPotential)}
              <span className="ml-0.5 text-[9.5px] font-medium text-muted-foreground">
                / month
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
        {recommendations.map((item) => {
          const isReviewed = reviewed.includes(item.id);
          return (
            <article
              key={item.id}
              className={cn(
                "flex flex-col rounded-xl border p-4 transition-all",
                isReviewed
                  ? "border-success/30 bg-success/[0.03]"
                  : "border-border/80 bg-background/40 hover:border-primary/25",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    item.priority === "high"
                      ? "bg-danger/10 text-danger"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {item.priority} impact
                </span>
                <span className="truncate text-[9.5px] font-medium text-muted-foreground">
                  {item.module}
                </span>
              </div>

              <h3 className="mt-2.5 text-[12.5px] font-semibold leading-snug text-navy">
                {item.title}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                {item.problem}
              </p>

              <div className="mt-2 flex gap-1.5 rounded-lg bg-primary/[0.045] px-2 py-1.5">
                <ArrowRight className="mt-0.5 size-3 shrink-0 text-primary" />
                <p className="text-[10.5px] leading-relaxed text-navy/75">{item.action}</p>
              </div>

              <div className="mt-auto pt-3">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      Est. saving
                    </p>
                    <p className="text-[13px] font-semibold text-success-ink">
                      {formatCurrency(item.monthlySaving)}
                      <span className="text-[9px] font-medium text-muted-foreground">
                        {" "}
                        / month
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      Confidence
                    </p>
                    <p className="text-[11px] font-semibold text-navy">{item.confidence}%</p>
                  </div>
                </div>

                <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                  Basis: {item.basis}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleReviewed(item)}
                  className={cn(
                    "mt-2.5 h-7 w-full text-[10.5px]",
                    isReviewed &&
                      "border-success/30 bg-success/10 text-success-ink hover:bg-success/15 hover:text-success-ink",
                  )}
                >
                  {isReviewed ? (
                    <>
                      <Check className="size-3" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3" />
                      Mark as reviewed
                    </>
                  )}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-border/70 px-4 py-2.5 text-[10px] text-muted-foreground sm:px-5">
        <Info className="size-3 shrink-0" />
        Savings are estimates derived from the demo dataset and tariff assumptions,
        not guaranteed plant results.
      </div>
    </section>
  );
}

function EnergyWasteCard({ data }: { data: OverviewData }) {
  const totals = data.energyWaste.reduce(
    (acc, day) => ({ energy: acc.energy + day.energy, waste: acc.waste + day.waste }),
    { energy: 0, waste: 0 },
  );

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-navy">
            Energy & waste trend
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Electricity consumed against waste generated
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" /> Energy (kWh)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warning" /> Waste (kg)
          </span>
        </div>
      </div>

      <div className="mt-4 h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.energyWaste} margin={{ top: 6, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLORS.axis, fontSize: 10.5 }}
              interval={data.rangeDays === 7 ? 0 : 4}
              dy={6}
            />
            <YAxis
              yAxisId="energy"
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLORS.axis, fontSize: 10.5 }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(1)}k`}
              width={42}
            />
            <YAxis
              yAxisId="waste"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: COLORS.axis, fontSize: 10.5 }}
              width={38}
            />
            <Tooltip content={<ProductionTooltip />} cursor={{ fill: "rgba(49,133,216,0.06)" }} />
            <Bar
              yAxisId="energy"
              dataKey="energy"
              name="Energy"
              fill={COLORS.blue}
              fillOpacity={0.7}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              animationDuration={700}
            />
            <Line
              yAxisId="waste"
              type="monotone"
              dataKey="waste"
              name="Waste"
              stroke={COLORS.amber}
              strokeWidth={2}
              dot={false}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border/70 pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total energy
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-navy">
            {numberFormatter.format(totals.energy)} kWh
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total waste
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-navy">
            {numberFormatter.format(totals.waste)} kg
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Energy intensity
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-navy">
            {data.performance.benchmarks.energyPerLitre.toFixed(3)} kWh/L
          </p>
        </div>
      </div>
    </section>
  );
}

function SnapshotCard({ data }: { data: OverviewData }) {
  const { benchmarks } = data.performance;
  const hygieneRatio = Math.round(
    (benchmarks.hygieneChecksLogged / benchmarks.hygieneChecksPlanned) * 100,
  );

  const rows = [
    {
      icon: ThermometerSnowflake,
      label: "Cold storage average",
      value: `${benchmarks.coldStorageCelsius}°C`,
      note: `Configured ${benchmarks.coldStorageRange[0]}–${benchmarks.coldStorageRange[1]}°C`,
      status: "In range",
      good: true,
    },
    {
      icon: ShieldCheck,
      label: "Rejection rate",
      value: `${benchmarks.rejectionRate}%`,
      note: "Target below 1.0%",
      status: "On target",
      good: true,
    },
    {
      icon: Leaf,
      label: "Waste intensity",
      value: `${((data.energyWaste.reduce((s, d) => s + d.waste, 0) / data.production.reduce((s, d) => s + d.processed, 0)) * 100).toFixed(2)}%`,
      note: "Of milk processed",
      status: "Watch",
      good: false,
    },
  ];

  return (
    <section className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-navy">
            Operating snapshot
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Health of the plant right now
          </p>
        </div>
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gauge className="size-3.5" />
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-primary/80 shadow-sm">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-medium text-muted-foreground">
                  {row.label}
                </p>
                <p className="text-[12.5px] font-semibold text-navy">
                  {row.value}
                  <span className="ml-1.5 text-[9.5px] font-normal text-muted-foreground">
                    {row.note}
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  row.good ? "bg-success/10 text-success-ink" : "bg-warning/10 text-warning-ink",
                )}
              >
                {row.status}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[10.5px] font-medium text-muted-foreground">
            Hygiene checks logged
          </p>
          <p className="text-[11px] font-semibold text-navy">
            {benchmarks.hygieneChecksLogged}/{benchmarks.hygieneChecksPlanned}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${hygieneRatio}%` }}
          />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[9.5px] text-muted-foreground">
          <CircleAlert className="size-2.5 text-warning" />
          {benchmarks.hygieneChecksPlanned - benchmarks.hygieneChecksLogged} checks still
          pending this shift
        </p>
      </div>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[148px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[340px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
    </div>
  );
}

