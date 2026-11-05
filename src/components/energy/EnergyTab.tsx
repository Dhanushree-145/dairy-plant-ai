import { ChartLegend, ChartTooltip, CHART } from "@/components/energy/ChartBits";
import { Button } from "@/components/ui/button";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import { categoryMeta, type EnergyData } from "@/lib/energy";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Gauge, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Mode = "daily" | "weekly" | "monthly";

export function EnergyTab({
  data,
  onOpenFleet,
  onOpenOptimization,
}: {
  data: EnergyData;
  onOpenFleet: () => void;
  onOpenOptimization: () => void;
}) {
  const [mode, setMode] = useState<Mode>("daily");
  const [showPrevious, setShowPrevious] = useState(true);

  const series = data.series[mode];
  const total = series.reduce((sum, point) => sum + point.kwh, 0);
  const average = series.length > 0 ? total / series.length : 0;
  const peak = series.reduce(
    (best, point) => (point.kwh > best.kwh ? point : best),
    series[0] ?? { label: "—", kwh: 0, cost: 0 },
  );
  const maxShare = data.topConsumers[0]?.share ?? 1;
  const change = data.totals.energyChangePct;
  const changeGood = change <= 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Plant energy consumption
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {mode === "daily"
                  ? `Daily totals for the selected ${data.rangeDays}-day window`
                  : mode === "weekly"
                    ? "Weekly totals for the last 12 weeks"
                    : "Monthly totals for the last 12 months"}
              </p>
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
              {(
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                    mode === value
                      ? "bg-white text-navy shadow-sm"
                      : "text-muted-foreground hover:text-navy",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <ChartLegend
              items={
                mode === "daily"
                  ? [
                      { label: "Actual", color: CHART.blue },
                      ...(showPrevious
                        ? [{ label: "Previous period", color: CHART.blueSoft, dashed: true }]
                        : []),
                    ]
                  : [{ label: "Consumption", color: CHART.blue }]
              }
            />
            {mode === "daily" && (
              <button
                type="button"
                onClick={() => setShowPrevious((current) => !current)}
                aria-pressed={showPrevious}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold transition-colors",
                  showPrevious
                    ? "border-primary/30 bg-primary/[0.07] text-primary"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                Compare previous
              </button>
            )}
          </div>

          <div className="mt-3 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 6, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="plantEnergyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  interval={mode === "daily" ? (series.length > 14 ? 5 : 0) : 1}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`
                  }
                  width={44}
                />
                <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: "#CBD8E7" }} />
                {mode === "daily" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="kwh"
                      name="Actual"
                      stroke={CHART.blue}
                      strokeWidth={2.2}
                      fill="url(#plantEnergyFill)"
                      animationDuration={650}
                    />
                    {showPrevious && (
                      <Line
                        type="monotone"
                        dataKey="previousKwh"
                        name="Previous period"
                        stroke={CHART.blueSoft}
                        strokeWidth={1.6}
                        strokeDasharray="5 4"
                        dot={false}
                        animationDuration={650}
                      />
                    )}
                  </>
                ) : (
                  <Bar
                    dataKey="kwh"
                    name="Consumption"
                    fill={CHART.blue}
                    fillOpacity={0.78}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={34}
                    animationDuration={650}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-border/70 pt-3">
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Period total
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-navy">
                {numberFormatter.format(Math.round(total))} kWh
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Average
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-navy">
                {numberFormatter.format(Math.round(average))} kWh
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Peak {mode === "daily" ? "day" : mode === "weekly" ? "week" : "month"}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-navy">
                {peak.label}
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  {numberFormatter.format(Math.round(peak.kwh))} kWh
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Energy intensity
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Electricity per litre of milk processed
              </p>
            </div>
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gauge className="size-3.5" />
            </span>
          </div>

          <div className="mt-4">
            <p className="font-display text-[32px] font-semibold leading-none tracking-tight text-navy">
              {data.plant.energyPerLitre.toFixed(3)}
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">kWh/L</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  changeGood ? "bg-success/10 text-success-ink" : "bg-danger/10 text-danger",
                )}
              >
                {change <= 0 ? (
                  <ArrowDownRight className="size-3" />
                ) : (
                  <ArrowUpRight className="size-3" />
                )}
                {Math.abs(change).toFixed(1)}% energy
              </span>
              <span className="text-[10px] text-muted-foreground">vs previous period</span>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-border/70 pt-3 text-[11.5px]">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Milk processed</dt>
              <dd className="font-semibold text-navy">
                {numberFormatter.format(data.plant.litresProcessed)} L
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Cost per litre</dt>
              <dd className="font-semibold text-navy">
                ₹{data.plant.costPerLitre.toFixed(3)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Current plant load</dt>
              <dd className="font-semibold text-navy">
                {data.totals.currentLoadKw.toFixed(1)} kW
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-3">
            <div className="rounded-lg border border-warning/20 bg-warning/[0.055] px-2.5 py-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-warning-ink">
                Simulated intake
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-navy/70">
                Litres come from the demo plant dataset, not a live milk-reception
                meter. Cost uses the ₹8.20/kWh tariff assumption.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Highest energy consumers
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Machine-wise consumption for the selected {data.rangeDays} days
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenFleet}
              className="h-7 gap-1 px-2 text-[10.5px] text-primary"
            >
              All machines
              <ArrowRight className="size-3" />
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {data.topConsumers.map((machine, index) => (
              <Link
                key={machine.id}
                to={`/dashboard/energy/machines/${machine.id}`}
                className="group flex items-center gap-2.5 rounded-lg border border-transparent px-1.5 py-1.5 transition-colors hover:border-border hover:bg-background/60"
              >
                <span className="w-4 shrink-0 text-center text-[10px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[11.5px] font-semibold text-navy">
                      {machine.name}
                      <span className="ml-1 text-[9.5px] font-medium text-muted-foreground">
                        {machine.code}
                      </span>
                    </p>
                    <p className="shrink-0 text-[11px] font-semibold text-navy">
                      {numberFormatter.format(Math.round(machine.kwh))} kWh
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80 transition-all duration-700"
                        style={{ width: `${Math.max(4, (machine.share / maxShare) * 100)}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[9.5px] text-muted-foreground">
                      {machine.share}%
                    </span>
                    <span className="w-16 shrink-0 text-right text-[9.5px] font-medium text-muted-foreground">
                      {formatCurrency(machine.cost)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Consumption by type
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Where the electricity is going
              </p>
            </div>
            <span className="flex size-7 items-center justify-center rounded-lg bg-warning/10 text-warning-ink">
              <Zap className="size-3.5" />
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {data.categoryBreakdown.map((entry) => {
              const meta = categoryMeta(entry.category);
              const Icon = meta.icon;
              return (
                <div key={entry.category}>
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-navy/85">
                      {meta.shortLabel}
                    </span>
                    <span className="text-[10px] font-semibold text-navy">
                      {numberFormatter.format(Math.round(entry.kwh))} kWh
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-navy/60"
                        style={{ width: `${Math.max(3, entry.share)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[9px] text-muted-foreground">
                      {entry.share}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Next 7 days — forecast consumption
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                <span className="font-semibold text-navy">
                  {numberFormatter.format(Math.round(data.forecast.predictedWeekKwh))} kWh
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-navy">
                  {formatCurrency(data.forecast.predictedWeekCost)}
                </span>{" "}
                estimated. Projected from the last seven simulated days.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenOptimization}
            className="h-7 shrink-0 gap-1 text-[10.5px]"
          >
            Open AI insights
            <ArrowRight className="size-3" />
          </Button>
        </div>

        <div className="mt-3 h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.forecast.days}
              margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART.axis, fontSize: 9.5 }}
                dy={5}
              />
              <YAxis hide />
              <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ fill: "rgba(49,133,216,0.05)" }} />
              <Bar
                dataKey="kwh"
                name="Forecast"
                fill={CHART.blueSoft}
                fillOpacity={0.8}
                radius={[3, 3, 0, 0]}
                maxBarSize={34}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
