import { AppShell } from "@/components/dashboard/AppShell";
import { ChartTooltip, CHART } from "@/components/energy/ChartBits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  formatKg,
  formatLitres,
  formatMoneyCompact,
  formatPct,
  downloadProductionCsv,
  type ProductionData,
  type ProductionRange,
  type ProductionView,
} from "@/lib/production";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  Droplets,
  Factory,
  IndianRupee,
  Info,
  Layers,
  Milk,
  Percent,
  Printer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

const VIEWS: Array<{
  key: ProductionView;
  label: string;
  to: string;
  icon: typeof Milk;
}> = [
  { key: "production", label: "Milk & Production", to: "/dashboard/production", icon: Milk },
  { key: "profit", label: "Cost & Profit", to: "/dashboard/profit", icon: Wallet },
  { key: "reports", label: "Reports & Analytics", to: "/dashboard/reports", icon: BarChart3 },
];

const VIEW_COPY: Record<
  ProductionView,
  { eyebrow: string; title: string; subtitle: string; section: string }
> = {
  production: {
    eyebrow: "Plant module · Milk & Production",
    title: "Milk intake to finished product",
    subtitle:
      "Track tanker intake, milk processed, product output and yield — the foundation for every cost and profit number.",
    section: "Milk & Production",
  },
  profit: {
    eyebrow: "Plant module · Cost & Profit",
    title: "What the plant earns per litre",
    subtitle:
      "Raw milk, processing, packaging, energy and overheads reconciled to product revenue and net profit.",
    section: "Cost & Profit",
  },
  reports: {
    eyebrow: "Plant module · Reports & Analytics",
    title: "The full milk-to-profit report",
    subtitle:
      "Every daily P&L, product line, supplier intake and cost line in one exportable working report.",
    section: "Reports & Analytics",
  },
};

export function ProductionWorkspace({ view }: { view: ProductionView }) {
  const { user } = useAuth();
  const [days, setDays] = useState<ProductionRange>(30);
  const data = useQuery(api.production.overview, { days });
  const copy = VIEW_COPY[view];

  if (!data) {
    return (
      <AppShell
        plantName={user?.plantName}
        sectionLabel={copy.section}
        activeKey={view}
      >
        <WorkspaceSkeleton />
      </AppShell>
    );
  }

  const exportCsv = () => {
    downloadProductionCsv(data);
    toast.success("CSV report downloaded", {
      description: `${data.reports.period.days} days of milk, production, cost and profit data.`,
    });
  };

  return (
    <AppShell
      plantName={user?.plantName}
      sectionLabel={copy.section}
      activeKey={view}
    >
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
              {copy.eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-[25px] font-semibold tracking-tight text-navy sm:text-[30px]">
              {copy.title}
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
              {copy.subtitle}
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
            {view === "reports" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-[11.5px]"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" />
                  Print / Save PDF
                </Button>
                <Button type="button" size="sm" className="h-9 text-[11.5px]" onClick={exportCsv}>
                  <Download className="size-3.5" />
                  Export Excel-ready CSV
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card p-1 shadow-card">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            const active = item.key === view;
            return (
              <Link
                key={item.key}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-colors",
                  active
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-navy",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-warning/25 bg-warning/[0.055] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-[11.5px] leading-relaxed text-navy/75">
              <span className="font-semibold text-navy">Simulated plant model.</span>{" "}
              {data.note}
            </p>
          </div>
          <span className="ml-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning-ink sm:ml-0">
            {data.rangeDays} days · demo
          </span>
        </div>

        {view === "production" && <ProductionView data={data} />}
        {view === "profit" && <ProfitView data={data} />}
        {view === "reports" && <ReportsView data={data} onExport={exportCsv} />}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Production                                                          */
/* ------------------------------------------------------------------ */

function ProductionView({ data }: { data: ProductionData }) {
  return (
    <>
      <MilkFlowStrip data={data} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Milk received"
          value={formatLitres(data.kpis.milkReceived)}
          caption={`${data.kpis.averageFat}% fat · ${data.kpis.averageSnf}% SNF`}
          icon={Droplets}
          tone="blue"
          change={data.kpis.processedChangePct}
        />
        <KpiCard
          label="Milk processed"
          value={formatLitres(data.kpis.milkProcessed)}
          caption={`${formatLitres(data.kpis.rejectedLitres)} intake difference`}
          icon={Factory}
          tone="green"
          change={data.kpis.processedChangePct}
        />
        <KpiCard
          label="Products manufactured"
          value={formatKg(data.kpis.productKg)}
          caption={`${data.products.length} product lines`}
          icon={Layers}
          tone="amber"
        />
        <KpiCard
          label="Yield"
          value={`${data.kpis.yieldPct}%`}
          caption="Product kg per litre processed"
          icon={Percent}
          tone="navy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Milk balance"
          subtitle="Received versus processed, daily"
          className="lg:col-span-2"
          action={<ChartLegendInline items={[["Received", CHART.blue], ["Processed", CHART.green]]} />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.milk.daily}>
                <defs>
                  <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <Tooltip content={<ChartTooltip unit="L" />} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Received"
                  stroke={CHART.blue}
                  strokeWidth={2}
                  fill="url(#receivedFill)"
                />
                <Area
                  type="monotone"
                  dataKey="processed"
                  name="Processed"
                  stroke={CHART.green}
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Intake quality" subtitle="Weighted across the selected period">
          <div className="space-y-3">
            <QualityRow label="Average fat" value={`${data.kpis.averageFat}%`} target="4.1%" />
            <QualityRow label="Average SNF" value={`${data.kpis.averageSnf}%`} target="8.7%" />
            <QualityRow
              label="Average milk rate"
              value={`${formatCurrency(data.kpis.averageMilkRate)}/L`}
              target="₹42.40/L"
            />
            <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                Intake reconciliation
              </p>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] text-muted-foreground">Received − processed</span>
                <span className="font-display text-[17px] font-semibold text-navy">
                  {formatLitres(data.kpis.rejectedLitres)}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                Includes sampling, spillage, rejected intake and measurement difference.
                It is not automatically booked as waste.
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recoverable by-products
              </p>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] text-muted-foreground">Cream / whey credit</span>
                <span className="font-display text-[17px] font-semibold text-success-ink">
                  {formatKg(data.kpis.byproductKg)}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                Tracked separately from waste and credited in revenue at{" "}
                {formatCurrency(data.kpis.byproductRevenue)}.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Product output"
          subtitle="Volume and revenue by product line"
          className="lg:col-span-3"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.products} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={86}
                  tick={{ fontSize: 10.5, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip unit="kg" />} />
                <Bar dataKey="quantity" name="Quantity" radius={[0, 4, 4, 0]} barSize={15}>
                  {data.products.map((product) => (
                    <Cell key={product.id} fill={product.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue mix" subtitle="Share of product revenue" className="lg:col-span-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.products}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.products.map((product) => (
                    <Cell key={product.id} fill={product.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {data.products.map((product) => (
              <div key={product.id} className="flex items-center gap-1.5 text-[10.5px]">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: product.color }} />
                <span className="truncate text-muted-foreground">{product.name}</span>
                <span className="ml-auto font-semibold text-navy">{product.sharePct}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <ProductTable products={data.products} />
      <BatchTable batches={data.batches} />
      <SupplierTable data={data} />
    </>
  );
}

function MilkFlowStrip({ data }: { data: ProductionData }) {
  const steps = [
    { label: "Milk received", value: formatLitres(data.kpis.milkReceived), icon: Droplets },
    { label: "Milk processed", value: formatLitres(data.kpis.milkProcessed), icon: Factory },
    { label: "Products made", value: formatKg(data.kpis.productKg), icon: Layers },
    { label: "Net profit", value: formatMoneyCompact(data.kpis.netProfit), icon: IndianRupee },
  ];
  return (
    <div className="overflow-hidden rounded-xl bg-navy p-4 text-white shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="lg:w-[230px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Milk-to-profit chain
          </p>
          <p className="mt-1 font-display text-[15px] font-semibold">
            One reconciled flow
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">
            Intake, yield, cost and margin use the same plant model.
          </p>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="relative rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/50">
                  <Icon className="size-3.5 text-primary" />
                  {step.label}
                </div>
                <p className="mt-1.5 font-display text-[16px] font-semibold tracking-tight">
                  {step.value}
                </p>
                {index < steps.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-1/2 hidden size-3 -translate-y-1/2 text-white/25 xl:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profit                                                              */
/* ------------------------------------------------------------------ */

function ProfitView({ data }: { data: ProductionData }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={formatMoneyCompact(data.profit.revenue)}
          caption="Products plus by-product credit"
          icon={IndianRupee}
          tone="blue"
          change={data.kpis.revenueChangePct}
        />
        <KpiCard
          label="Total cost"
          value={formatMoneyCompact(data.profit.totalCost)}
          caption={`${formatCurrency(data.costs.perLitre)} per litre`}
          icon={Wallet}
          tone="amber"
          change={data.kpis.costChangePct}
          invertChange
        />
        <KpiCard
          label="Net profit"
          value={formatMoneyCompact(data.profit.netProfit)}
          caption={`${formatCurrency(data.profit.perLitre)} per litre`}
          icon={TrendingUp}
          tone="green"
          change={data.kpis.profitChangePct}
        />
        <KpiCard
          label="Net margin"
          value={`${data.profit.marginPct}%`}
          caption="After overhead and waste cost"
          icon={Percent}
          tone="navy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Profit bridge"
          subtitle="From product revenue to net profit"
          className="lg:col-span-3"
          action={
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success-ink">
              {data.profit.marginPct}% margin
            </span>
          }
        >
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.profit.bridge} margin={{ top: 8, right: 6, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-22}
                  textAnchor="end"
                  height={54}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(value) => formatMoneyCompact(Number(value))}
                />
                <Tooltip content={<ChartTooltip money />} />
                <Bar dataKey="value" name="Amount" radius={[3, 3, 0, 0]} maxBarSize={38}>
                  {data.profit.bridge.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.type === "positive"
                          ? CHART.green
                          : entry.type === "negative"
                            ? CHART.blueSoft
                            : CHART.navy
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Cost structure"
          subtitle={`${formatMoneyCompact(data.costs.total)} across the period`}
          className="lg:col-span-2"
        >
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.costs.breakdown}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={76}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.costs.breakdown.map((cost) => (
                    <Cell key={cost.key} fill={cost.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-1">
            {data.costs.breakdown.map((cost) => (
              <div key={cost.key} className="flex items-center gap-1.5 text-[10.5px]">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: cost.color }} />
                <span className="text-muted-foreground">{cost.label}</span>
                <span className="ml-auto font-semibold text-navy">{cost.sharePct}%</span>
                <span className="w-[74px] text-right text-muted-foreground">
                  {formatMoneyCompact(cost.value)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Revenue, cost and profit trend"
        subtitle="Daily movement across the selected range"
        action={
          <ChartLegendInline
            items={[
              ["Revenue", CHART.blue],
              ["Cost", CHART.amber],
              ["Net profit", CHART.green],
            ]}
          />
        }
      >
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.daily}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: CHART.axis }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: CHART.axis }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(value) => `${Math.round(Number(value) / 100_000)}L`}
              />
              <Tooltip content={<ChartTooltip money />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART.blue}
                fill={CHART.blue}
                fillOpacity={0.07}
                strokeWidth={1.8}
              />
              <Area
                type="monotone"
                dataKey="totalCost"
                name="Cost"
                stroke={CHART.amber}
                fill="transparent"
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Net profit"
                stroke={CHART.green}
                strokeWidth={2.2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UnitCard label="Cost per litre" value={formatCurrency(data.kpis.costPerLitre)} note="All in, including overhead" />
        <UnitCard label="Revenue per litre" value={formatCurrency(data.kpis.revenue / Math.max(1, data.kpis.milkProcessed))} note="Products and by-products" />
        <UnitCard label="Profit per litre" value={formatCurrency(data.kpis.profitPerLitre)} note="Net operating profit" tone="success" />
        <UnitCard label="By-product credit" value={formatMoneyCompact(data.kpis.byproductRevenue)} note={`${formatKg(data.kpis.byproductKg)} recovered`} tone="success" />
      </div>

      <ProductTable products={data.products} profitFocus />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

function ReportsView({ data, onExport }: { data: ProductionData; onExport: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-4 py-3 shadow-card print:hidden">
        <div>
          <p className="text-[12px] font-semibold text-navy">Production & profit report</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            {data.reports.period.from} → {data.reports.period.to} · {data.reports.period.days} days
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            PDF
          </Button>
          <Button type="button" size="sm" className="h-8 text-[11px]" onClick={onExport}>
            <Download className="size-3.5" />
            CSV / Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <ReportStat label="Milk received" value={formatLitres(data.reports.totals.received)} />
        <ReportStat label="Milk processed" value={formatLitres(data.reports.totals.processed)} />
        <ReportStat label="Product output" value={formatKg(data.reports.totals.productKg)} />
        <ReportStat label="Revenue" value={formatMoneyCompact(data.reports.totals.revenue)} />
        <ReportStat
          label="By-product credit"
          value={formatMoneyCompact(data.kpis.byproductRevenue)}
          note={formatKg(data.kpis.byproductKg)}
        />
        <ReportStat
          label="Net profit"
          value={formatMoneyCompact(data.reports.totals.netProfit)}
          note={`${data.reports.totals.marginPct}% margin`}
          tone="success"
        />
      </div>

      <SectionCard
        title="Daily profit & loss"
        subtitle="Milk, product, revenue, cost and profit for every day in the period"
        action={<span className="text-[10px] text-muted-foreground">{data.daily.length} rows</span>}
      >
        <div className="max-h-[480px] overflow-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border/70 text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Received L</th>
                <th className="px-3 py-2 text-right font-semibold">Processed L</th>
                <th className="px-3 py-2 text-right font-semibold">Products kg</th>
                <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                <th className="px-3 py-2 text-right font-semibold">Total cost</th>
                <th className="px-3 py-2 text-right font-semibold">Net profit</th>
                <th className="px-3 py-2 text-right font-semibold">Margin</th>
                <th className="px-3 py-2 text-right font-semibold">Cost/L</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((day) => (
                <tr key={day.date} className="border-b border-border/45 text-[11px] last:border-0">
                  <td className="px-3 py-2 font-medium text-navy">{day.date}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{numberFormatter.format(Math.round(day.received))}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{numberFormatter.format(Math.round(day.processed))}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{numberFormatter.format(Math.round(day.productKg))}</td>
                  <td className="px-3 py-2 text-right font-medium text-navy">{formatCurrency(day.revenue)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(day.totalCost)}</td>
                  <td className={cn("px-3 py-2 text-right font-semibold", day.netProfit >= 0 ? "text-success-ink" : "text-danger")}>
                    {formatCurrency(day.netProfit)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{day.marginPct}%</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(day.costPerLitre)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-background">
              <tr className="text-[11px] font-semibold text-navy">
                <td className="px-3 py-2.5">Total</td>
                <td className="px-3 py-2.5 text-right">{numberFormatter.format(Math.round(data.reports.totals.received))}</td>
                <td className="px-3 py-2.5 text-right">{numberFormatter.format(Math.round(data.reports.totals.processed))}</td>
                <td className="px-3 py-2.5 text-right">{numberFormatter.format(Math.round(data.reports.totals.productKg))}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(data.reports.totals.revenue)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(data.reports.totals.totalCost)}</td>
                <td className="px-3 py-2.5 text-right text-success-ink">{formatCurrency(data.reports.totals.netProfit)}</td>
                <td className="px-3 py-2.5 text-right">{data.reports.totals.marginPct}%</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(data.kpis.costPerLitre)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProductTable products={data.products} compact />
        <SectionCard title="Cost lines" subtitle="Selected-period totals and share">
          <div className="space-y-2">
            {data.costs.breakdown.map((cost) => (
              <div key={cost.key}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{cost.label}</span>
                  <span className="font-semibold text-navy">{formatCurrency(cost.value)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cost.sharePct}%`, backgroundColor: cost.color }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border/70 pt-2 text-[11.5px] font-semibold text-navy">
              <span>Total cost</span>
              <span>{formatCurrency(data.costs.total)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SupplierTable data={data} />

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-card print:break-inside-avoid">
        <h3 className="font-display text-[14px] font-semibold text-navy">Report basis</h3>
        <div className="mt-2 grid gap-2 text-[10.5px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <p>Milk rate: {formatCurrency(data.assumptions.milkRate)}/L</p>
          <p>Processing: {formatCurrency(data.assumptions.processingPerLitre)}/L</p>
          <p>Packaging: {formatCurrency(data.assumptions.packagingPerKg)}/kg</p>
          <p>Energy: {formatCurrency(data.assumptions.energyPerKwh)}/kWh</p>
          <p>Plant overhead: {formatCurrency(data.assumptions.overheadPerDay)}/day</p>
          <p>Distribution: {data.assumptions.distributionPctRevenue}% of revenue</p>
          <p>Finance &amp; other: {data.assumptions.financePctRevenue}% of revenue</p>
          <p>Data source: {data.dataSource.toUpperCase()}</p>
        </div>
        <p className="mt-2 border-t border-border/60 pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {data.assumptions.note} {data.note}
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const TONES = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/10 text-success-ink",
  amber: "bg-warning/10 text-warning-ink",
  navy: "bg-navy/10 text-navy",
} as const;

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  change,
  invertChange = false,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Milk;
  tone: keyof typeof TONES;
  change?: number;
  invertChange?: boolean;
}) {
  const good = change === undefined ? true : invertChange ? change <= 0 : change >= 0;
  return (
    <div className="group rounded-xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-3 font-display text-[24px] font-semibold leading-none tracking-tight text-navy">
        {value}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              good ? "bg-success/10 text-success-ink" : "bg-danger/10 text-danger",
            )}
          >
            {change >= 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {formatPct(change)}
          </span>
        )}
        <span className="text-[10px] leading-relaxed text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card p-4 shadow-card print:break-inside-avoid sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[14.5px] font-semibold text-navy">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChartLegendInline({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function QualityRow({ label, value, target }: { label: string; value: string; target: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <div>
        <p className="text-[11px] font-medium text-navy">{label}</p>
        <p className="text-[9.5px] text-muted-foreground">Target {target}</p>
      </div>
      <span className="font-display text-[16px] font-semibold text-navy">{value}</span>
    </div>
  );
}

function UnitCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-card">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display text-[19px] font-semibold tracking-tight",
          tone === "success" ? "text-success-ink" : "text-navy",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{note}</p>
    </div>
  );
}

function ReportStat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card px-3.5 py-3 shadow-card">
      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-[17px] font-semibold", tone === "success" ? "text-success-ink" : "text-navy")}>
        {value}
      </p>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function ProductTable({
  products,
  profitFocus = false,
  compact = false,
}: {
  products: ProductionData["products"];
  profitFocus?: boolean;
  compact?: boolean;
}) {
  return (
    <SectionCard
      title={profitFocus ? "Product profitability" : "Products manufactured"}
      subtitle={
        profitFocus
          ? "Allocated cost and net margin by product line"
          : "Output, price and revenue by product"
      }
      action={
        <span className="rounded-full border border-border px-2 py-0.5 text-[9.5px] text-muted-foreground">
          {products.length} lines
        </span>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 bg-background/60 text-[9.5px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 text-right font-semibold">Output</th>
              <th className="px-3 py-2 text-right font-semibold">Price/kg</th>
              <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              {profitFocus && <th className="px-3 py-2 text-right font-semibold">Cost/kg</th>}
              {profitFocus && <th className="px-3 py-2 text-right font-semibold">Profit</th>}
              {profitFocus && <th className="px-3 py-2 text-right font-semibold">Margin</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border/45 text-[11px] last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 font-medium text-navy">
                    <span className="size-2 rounded-full" style={{ backgroundColor: product.color }} />
                    {product.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{product.sku}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {compact ? numberFormatter.format(product.quantity) : formatKg(product.quantity)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(product.pricePerKg)}</td>
                <td className="px-3 py-2 text-right font-medium text-navy">{formatCurrency(product.revenue)}</td>
                {profitFocus && (
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(product.costPerKg)}</td>
                )}
                {profitFocus && (
                  <td className="px-3 py-2 text-right font-semibold text-success-ink">{formatCurrency(product.profit)}</td>
                )}
                {profitFocus && (
                  <td className="px-3 py-2 text-right text-muted-foreground">{product.marginPct}%</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function BatchTable({ batches }: { batches: ProductionData["batches"] }) {
  return (
    <SectionCard title="Recent production batches" subtitle="Batch-level revenue, cost and profit">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {batches.map((batch) => (
          <div key={batch.batchId} className="rounded-lg border border-border/70 bg-background/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11.5px] font-semibold text-navy">{batch.product}</p>
                <p className="text-[9.5px] text-muted-foreground">
                  {batch.batchId} · {batch.sku}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  batch.marginPct >= 20
                    ? "bg-success/10 text-success-ink"
                    : "bg-warning/10 text-warning-ink",
                )}
              >
                {batch.marginPct}%
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[9.5px]">
              <div>
                <p className="text-muted-foreground">Output</p>
                <p className="font-semibold text-navy">{formatKg(batch.quantityKg)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-semibold text-navy">{formatMoneyCompact(batch.revenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Profit</p>
                <p className="font-semibold text-success-ink">{formatMoneyCompact(batch.profit)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SupplierTable({ data }: { data: ProductionData }) {
  return (
    <SectionCard
      title="Milk procurement"
      subtitle="Supplier-wise intake, quality and amount for the selected period"
      action={<span className="text-[10px] text-muted-foreground">{formatLitres(data.kpis.milkReceived)}</span>}
    >
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 bg-background/60 text-[9.5px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Supplier / route</th>
              <th className="px-3 py-2 text-right font-semibold">Share</th>
              <th className="px-3 py-2 text-right font-semibold">Litres</th>
              <th className="px-3 py-2 text-right font-semibold">Fat</th>
              <th className="px-3 py-2 text-right font-semibold">SNF</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.milk.suppliers.map((supplier) => (
              <tr key={supplier.name} className="border-b border-border/45 text-[11px] last:border-0">
                <td className="px-3 py-2 font-medium text-navy">{supplier.name}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{supplier.sharePct}%</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{numberFormatter.format(supplier.litres)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{supplier.fat}%</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{supplier.snf}%</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(supplier.rate)}</td>
                <td className="px-3 py-2 text-right font-medium text-navy">{formatCurrency(supplier.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-background">
            <tr className="text-[11px] font-semibold text-navy">
              <td className="px-3 py-2.5" colSpan={2}>Total procurement</td>
              <td className="px-3 py-2.5 text-right">{numberFormatter.format(data.kpis.milkReceived)}</td>
              <td className="px-3 py-2.5 text-right">{data.kpis.averageFat}%</td>
              <td className="px-3 py-2.5 text-right">{data.kpis.averageSnf}%</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(data.kpis.averageMilkRate)}</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(data.costs.milk)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[330px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[330px] rounded-xl" />
      </div>
    </div>
  );
}
