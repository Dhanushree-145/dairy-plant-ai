import { ChartLegend, ChartTooltip, CHART } from "@/components/energy/ChartBits";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import {
  categoryMeta,
  performanceMeta,
  type EnergyData,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, IndianRupee, Wallet } from "lucide-react";
import { Link } from "react-router";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CostTab({ data }: { data: EnergyData }) {
  const change = data.totals.costChangePct;
  const changeGood = change <= 0;
  const largest = data.topConsumers[0];
  const largestMeta = largest ? categoryMeta(largest.category) : null;

  const kpis = [
    {
      label: "Period spend",
      value: formatCurrency(data.costs.period),
      caption: `${data.rangeDays} days at ₹${data.tariff.toFixed(2)}/kWh`,
    },
    {
      label: "Daily average",
      value: formatCurrency(data.costs.dailyAverage),
      caption: "Across the selected period",
    },
    {
      label: "This month",
      value: formatCurrency(data.costs.monthly),
      caption: "Rolling 30-day electricity spend",
    },
    {
      label: "Projected next month",
      value: formatCurrency(data.costs.forecastNextMonth),
      caption: "From the 7-day moving average",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1.5 font-display text-[24px] font-semibold leading-none text-navy">
              {kpi.value}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              {kpi.caption}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-navy">
                Electricity cost history
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Monthly spend against monthly consumption, last 12 months
              </p>
            </div>
            <ChartLegend
              items={[
                { label: "Cost (₹)", color: CHART.blue },
                { label: "Energy (kWh)", color: CHART.amber },
              ]}
            />
          </div>

          <div className="mt-4 h-[248px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data.series.monthly}
                margin={{ top: 6, right: 0, left: -4, bottom: 0 }}
              >
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  dy={6}
                />
                <YAxis
                  yAxisId="cost"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                  width={42}
                />
                <YAxis
                  yAxisId="energy"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                  width={38}
                />
                <Tooltip
                  content={<ChartTooltip moneyKeys={["cost"]} />}
                  cursor={{ fill: "rgba(49,133,216,0.05)" }}
                />
                <Bar
                  yAxisId="cost"
                  dataKey="cost"
                  name="Cost (₹)"
                  fill={CHART.blue}
                  fillOpacity={0.78}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={30}
                  animationDuration={650}
                />
                <Line
                  yAxisId="energy"
                  type="monotone"
                  dataKey="kwh"
                  name="Energy (kWh)"
                  stroke={CHART.amber}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={650}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 sm:grid-cols-4">
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                This week
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-navy">
                {formatCurrency(data.costs.weekly)}
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-navy">
                {formatCurrency(data.costs.monthly)}
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Cost / litre
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-navy">
                ₹{data.costs.perLitre.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                vs previous period
              </p>
              <p
                className={cn(
                  "mt-0.5 flex items-center gap-0.5 text-[12.5px] font-semibold",
                  changeGood ? "text-success-ink" : "text-danger",
                )}
              >
                {change <= 0 ? (
                  <ArrowDownRight className="size-3" />
                ) : (
                  <ArrowUpRight className="size-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">
                  Cost per litre
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Electricity in every litre processed
                </p>
              </div>
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IndianRupee className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 font-display text-[28px] font-semibold leading-none text-navy">
              ₹{data.costs.perLitre.toFixed(3)}
              <span className="ml-1 text-[10.5px] font-medium text-muted-foreground">per L</span>
            </p>
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">
              {formatCurrency(data.costs.period)} over{" "}
              {numberFormatter.format(data.plant.litresProcessed)} L processed
            </p>

            <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tariff assumption
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-navy">
                ₹{data.tariff.toFixed(2)} per kWh
              </p>
              <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">
                Flat demo tariff. Peak/off-peak slabs and demand charges are not
                modelled.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
              <Wallet className="size-3.5 text-primary" />
              Largest cost driver
            </h2>
            {largest && largestMeta ? (
              <Link
                to={`/dashboard/energy/machines/${largest.id}`}
                className="mt-2.5 block rounded-lg border border-border/70 bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/30"
              >
                <p className="text-[12px] font-semibold text-navy">
                  {largest.name}
                  <span className="ml-1 text-[9.5px] font-medium text-muted-foreground">
                    {largest.code}
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {largestMeta.shortLabel} · {largest.share}% of period energy
                </p>
                <p className="mt-1.5 text-[15px] font-semibold text-navy">
                  {formatCurrency(largest.cost)}
                  <span className="ml-1 text-[9.5px] font-medium text-muted-foreground">
                    this period
                  </span>
                </p>
              </Link>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Register machines to see cost drivers.
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-xl border border-border/80 bg-card shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-navy">
              Machine-wise electricity costs
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Consumption, share and estimated spend for the selected {data.rangeDays} days
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            ₹{data.tariff.toFixed(2)}/kWh
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-border/70 text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-semibold sm:px-5">Machine</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 text-right font-semibold">Energy</th>
                <th className="px-3 py-2 text-right font-semibold">Share</th>
                <th className="px-3 py-2 text-right font-semibold">Cost</th>
                <th className="px-3 py-2 font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[...data.machines]
                .sort((a, b) => b.periodKwh - a.periodKwh)
                .map((machine) => {
                  const meta = categoryMeta(machine.category);
                  const performance = performanceMeta(machine.performance);
                  const share = (machine.periodKwh / Math.max(1, data.totals.energyKwh)) * 100;
                  return (
                    <tr key={machine.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5 sm:px-5">
                        <Link
                          to={`/dashboard/energy/machines/${machine.id}`}
                          className="block"
                        >
                          <p className="text-[11.5px] font-semibold text-navy">{machine.name}</p>
                          <p className="text-[9.5px] text-muted-foreground">{machine.code}</p>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[10.5px] text-muted-foreground">
                        {meta.shortLabel}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] font-medium text-navy">
                        {numberFormatter.format(Math.round(machine.periodKwh))} kWh
                      </td>
                      <td className="px-3 py-2.5 text-right text-[10.5px] text-muted-foreground">
                        {share.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-navy">
                        {formatCurrency(machine.costPeriod)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", performance.bar)}
                              style={{ width: `${machine.performance}%` }}
                            />
                          </div>
                          <span className={cn("text-[10px] font-semibold", performance.tone)}>
                            {machine.performance}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-[10px] text-muted-foreground sm:px-5">
          <p>
            {data.summary.registered} machines ·{" "}
            {numberFormatter.format(Math.round(data.totals.energyKwh))} kWh in the period
          </p>
          <p>Costs are estimates at a flat tariff, not utility invoices.</p>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-navy">
              Forecast electricity expense
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Next seven days at the current tariff
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Next 7 days
              </p>
              <p className="text-[13px] font-semibold text-navy">
                {formatCurrency(data.forecast.predictedWeekCost)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Next month
              </p>
              <p className="text-[13px] font-semibold text-navy">
                {formatCurrency(data.forecast.predictedMonthCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.forecast.days}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
            >
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
                tick={{ fill: CHART.axis, fontSize: 9.5 }}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                width={40}
              />
              <Tooltip content={<ChartTooltip money />} cursor={{ fill: "rgba(49,133,216,0.05)" }} />
              <Bar
                dataKey="cost"
                name="Forecast cost"
                fill={CHART.blueSoft}
                fillOpacity={0.8}
                radius={[3, 3, 0, 0]}
                maxBarSize={38}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
