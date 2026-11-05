import { ChartTooltip, CHART } from "@/components/energy/ChartBits";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import type { EnergyData, EnergyRecommendation } from "@/lib/energy";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Lightbulb,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CATEGORY_LABELS: Record<EnergyRecommendation["category"], string> = {
  load_shift: "Load shifting",
  maintenance: "Maintenance",
  refrigeration: "Refrigeration",
  idle: "Idle stop",
  schedule: "Scheduling",
};

export function OptimizationTab({ data }: { data: EnergyData }) {
  const excessRanking = [...data.machines]
    .map((machine) => ({
      ...machine,
      excess:
        machine.periodKwh - machine.baselineKwhPerHour * 22 * data.rangeDays,
    }))
    .filter((machine) => machine.excess > 0)
    .sort((a, b) => b.excess - a.excess)
    .slice(0, 5);

  const maxExcess = excessRanking[0]?.excess ?? 1;
  const projections = [...data.machines]
    .sort((a, b) => b.periodKwh - a.periodKwh)
    .slice(0, 6)
    .map((machine) => {
      const daily = machine.periodKwh / data.rangeDays;
      return {
        ...machine,
        weekKwh: daily * 7,
        weekCost: daily * 7 * data.tariff,
      };
    });

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-border/70 bg-primary/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuit className="size-4" />
            </span>
            <div>
              <h2 className="flex flex-wrap items-center gap-2 font-display text-[15px] font-semibold text-navy">
                AI energy optimisation
                <span className="rounded-full border border-border bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Demo model
                </span>
              </h2>
              <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
                Projections and anomaly suggestions computed from the simulated
                machine dataset. No trained ML model or live meter feed is connected.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-4 pl-12 sm:pl-0">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Potential saving
              </p>
              <p className="font-display text-[18px] font-semibold leading-tight text-success-ink">
                {formatCurrency(data.potentialSavings)}
                <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
                  /mo
                </span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Predicted month cost
              </p>
              <p className="font-display text-[18px] font-semibold leading-tight text-navy">
                {formatCurrency(data.forecast.predictedMonthCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border/70 sm:grid-cols-4">
          {[
            {
              label: "Next 7 days",
              value: `${numberFormatter.format(Math.round(data.forecast.predictedWeekKwh))} kWh`,
              note: formatCurrency(data.forecast.predictedWeekCost),
            },
            {
              label: "Energy-wasting units",
              value: `${excessRanking.length}`,
              note: "above configured baseline",
            },
            {
              label: "Open anomalies",
              value: `${data.alertSummary.active}`,
              note: `${data.alertSummary.critical} critical`,
            },
            {
              label: "Optimisation ideas",
              value: `${data.recommendations.length}`,
              note: "ranked by saving",
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-navy">{item.value}</p>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.recommendations.map((item) => (
          <article
            key={item.id}
            className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-card transition-colors hover:border-primary/25"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider",
                  item.priority === "high"
                    ? "bg-danger/10 text-danger"
                    : item.priority === "medium"
                      ? "bg-warning/10 text-warning-ink"
                      : "bg-primary/10 text-primary",
                )}
              >
                {item.priority} priority
              </span>
              <span className="truncate text-[9px] font-medium text-muted-foreground">
                {CATEGORY_LABELS[item.category]}
              </span>
            </div>

            <h3 className="mt-2 text-[12.5px] font-semibold leading-snug text-navy">
              {item.title}
            </h3>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
              {item.problem}
            </p>

            <div className="mt-2 flex gap-1.5 rounded-lg bg-primary/[0.045] px-2 py-1.5">
              <Lightbulb className="mt-0.5 size-3 shrink-0 text-primary" />
              <p className="text-[10px] leading-relaxed text-navy/75">{item.action}</p>
            </div>

            <div className="mt-auto pt-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[8.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Est. saving
                  </p>
                  <p className="text-[13px] font-semibold text-success-ink">
                    {formatCurrency(item.monthlySaving)}
                    <span className="text-[9px] font-medium text-muted-foreground"> /mo</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Energy saved
                  </p>
                  <p className="text-[11px] font-semibold text-navy">
                    {numberFormatter.format(item.monthlyKwhSaving)} kWh
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${item.confidence}%` }}
                  />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground">
                  {item.confidence}% confidence
                </span>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                Basis: {item.basis}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Predicted plant consumption
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Next 7 days from the rolling average · {data.model.prediction}
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.06] px-2 py-0.5 text-[9.5px] font-semibold text-primary">
              <Sparkles className="size-2.5" />
              Forecast
            </span>
          </div>

          <div className="mt-3 h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.forecast.days}
                margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
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
                  dy={5}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                  width={42}
                />
                <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: "#CBD8E7" }} />
                <Area
                  type="monotone"
                  dataKey="kwh"
                  name="Predicted"
                  stroke={CHART.blue}
                  strokeWidth={2.2}
                  fill="url(#forecastFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[10px] text-muted-foreground">
            <p>{data.model.anomaly}</p>
            <p className="font-semibold text-navy">
              {formatCurrency(data.forecast.predictedWeekCost)} next 7 days
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <h2 className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-navy">
            <TrendingDown className="size-3.5 text-danger" />
            Energy-wasting equipment
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Units above their configured baseline in this period
          </p>

          {excessRanking.length === 0 ? (
            <p className="mt-4 rounded-lg border border-success/25 bg-success/[0.05] px-3 py-3 text-[11px] text-success-ink">
              No machine is above its configured baseline in the selected period.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {excessRanking.map((machine) => (
                <div key={machine.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-[10.5px] font-medium text-navy">
                      {machine.name}
                    </p>
                    <p className="shrink-0 text-[10px] font-semibold text-danger">
                      +{numberFormatter.format(Math.round(machine.excess))} kWh
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-danger/70"
                      style={{
                        width: `${Math.max(5, (machine.excess / maxExcess) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 border-t border-border/70 pt-2 text-[9px] leading-relaxed text-muted-foreground">
            Excess compares metered consumption with each machine's saved baseline load
            over {data.rangeDays} days.
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border/80 bg-card shadow-card">
          <div className="border-b border-border/70 px-4 py-3.5">
            <h2 className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-navy">
              <Zap className="size-3.5 text-primary" />
              Machine-wise 7-day projection
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Period average extended across the next week
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-border/70 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Machine</th>
                  <th className="px-3 py-2 text-right font-semibold">Projected kWh</th>
                  <th className="px-4 py-2 text-right font-semibold">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {projections.map((machine) => (
                  <tr key={machine.id}>
                    <td className="px-4 py-2">
                      <p className="text-[11px] font-semibold text-navy">{machine.name}</p>
                      <p className="text-[9px] text-muted-foreground">{machine.code}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-[10.5px] font-medium text-navy">
                      {numberFormatter.format(Math.round(machine.weekKwh))}
                    </td>
                    <td className="px-4 py-2 text-right text-[10.5px] font-semibold text-navy">
                      {formatCurrency(machine.weekCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border/70 px-4 py-2 text-[9px] text-muted-foreground">
            Simple period-average projection, not a trained forecast model.
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-card sm:p-5">
          <h2 className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-navy">
            <CalendarClock className="size-3.5 text-primary" />
            Suggested operating schedule
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            A lower-cost sequence for the simulated day
          </p>

          <div className="mt-3 space-y-2">
            {[
              {
                time: "06:00",
                title: "Reception chillers and pasteurizer on duty",
                note: "Start the first processing block with the pasteurizer at its efficient load band.",
              },
              {
                time: "13:00",
                title: "Cold-storage pull-down before peak",
                note: "Pre-cool finished product rooms ahead of the 14:00–18:00 tariff block.",
              },
              {
                time: "14:00–18:00",
                title: "Hold non-critical start-ups",
                note: "Avoid CIP and packaging line starts inside the peak window where the plan allows.",
              },
              {
                time: "22:00",
                title: "Run CIP and refrigeration recovery",
                note: "Move cleaning cycles and condenser recovery to the off-peak block.",
              },
            ].map((slot) => (
              <div
                key={slot.time}
                className="flex gap-2.5 rounded-lg border border-border/70 bg-background/50 px-2.5 py-2"
              >
                <span className="mt-0.5 w-16 shrink-0 text-[9.5px] font-semibold text-primary">
                  {slot.time}
                </span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold text-navy">{slot.title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">
                    {slot.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 flex items-start gap-1 border-t border-border/70 pt-2 text-[9px] leading-relaxed text-muted-foreground">
            <ArrowRight className="mt-0.5 size-2.5 shrink-0" />
            Suggested from simulated load patterns. Confirm food-safety and labour
            constraints before changing the production plan.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
          <BrainCircuit className="size-3.5 text-primary" />
          Model and data disclosure
        </h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Forecasting", value: data.model.prediction },
            { label: "Anomaly detection", value: data.model.anomaly },
            { label: "Input data", value: data.model.trainedOn },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border/70 bg-background/55 px-2.5 py-2">
              <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-[10.5px] font-medium leading-relaxed text-navy">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9.5px] leading-relaxed text-muted-foreground">
          {data.model.note} Savings are estimates, not guaranteed plant results.
        </p>
      </section>
    </div>
  );
}
