import { AppShell } from "@/components/dashboard/AppShell";
import {
  DemoDataBadge,
  EmptyWaste,
  ReliabilityNote,
  WasteKpi,
  WasteSection,
  WasteSourcePill,
} from "@/components/waste/WasteBits";
import { WasteDisposal } from "@/components/waste/WasteDisposal";
import { WasteRecords } from "@/components/waste/WasteRecords";
import { WasteReports } from "@/components/waste/WasteReports";
import { WasteSettings } from "@/components/waste/WasteSettings";
import { WasteSetup } from "@/components/waste/WasteSetup";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useLiveNow } from "@/hooks/use-live-now";
import {
  formatInr,
  formatKg,
  formatQuantity,
  type WasteDashboardData,
  wasteCategoryMeta,
} from "@/lib/waste";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Droplets,
  FileText,
  Gauge,
  Leaf,
  PackageCheck,
  Plus,
  Recycle,
  Scale,
  Settings2,
  Sparkles,
  Truck,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
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
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TABS = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "records", label: "Records", icon: ClipboardList },
  { key: "disposal", label: "Segregation & disposal", icon: Recycle },
  { key: "analysis", label: "Analysis & forecast", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Waste() {
  const { user } = useAuth();
  const now = useLiveNow();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [tab, setTab] = useState<TabKey>("overview");
  const config = useQuery(api.waste.config);
  const data = useQuery(api.waste.dashboard, config ? { now, days } : "skip");

  if (config === undefined) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Waste Management" activeKey="waste">
        <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (config === null) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Waste Management" activeKey="waste">
        <WasteSetup />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Waste Management" activeKey="waste">
        <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell plantName={user?.plantName} sectionLabel="Waste Management" activeKey="waste">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] font-semibold tracking-tight text-navy">Waste Management</h1>
              <DemoDataBadge />
            </div>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
              Track six waste streams from generation to recovery or disposal, reconcile batch mass
              balance and estimate cost. Simulation is labelled everywhere; missing readings stay
              missing.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Scale className="size-3" /> {config.categories.length} streams</span>
              <span className="inline-flex items-center gap-1"><Truck className="size-3" /> {config.collectionSchedule}</span>
              <span className="inline-flex items-center gap-1"><Leaf className="size-3" /> Target {config.reductionTargetPct}% reduction</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as 7 | 30 | 90)}>
              <SelectTrigger className="h-8 w-36 text-[10.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-[10.5px]" onClick={() => setTab("records")}>
              <Plus className="size-3.5" /> Add waste record
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border/80 pb-0">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-[10.5px] font-semibold transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-navy",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {tab === "overview" && <WasteOverview data={data} setTab={setTab} />}
          {tab === "records" && <WasteRecords data={data} config={config} />}
          {tab === "disposal" && <WasteDisposal data={data} config={config} />}
          {tab === "analysis" && <WasteAnalysis data={data} />}
          {tab === "reports" && <WasteReports data={data} />}
          {tab === "settings" && <WasteSettings config={config} />}
        </div>
      </div>
    </AppShell>
  );
}

function WasteOverview({
  data,
  setTab,
}: {
  data: WasteDashboardData;
  setTab: (tab: TabKey) => void;
}) {
  const latestDay = data.totals.daily[data.totals.daily.length - 1];
  const todayRecorded = latestDay?.recorded ?? false;
  const hasPeriodData = data.periodRecords > 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WasteKpi
          label={`Total waste · ${data.rangeDays}d`}
          value={hasPeriodData ? formatKg(data.totals.currentKg) : "No readings"}
          note={hasPeriodData ? `${data.kpis.reductionPct > 0 ? "Up" : "Down"} ${Math.abs(data.kpis.reductionPct)}% vs previous period` : "No records in this period — not zero"}
          icon={Scale}
          tone={data.kpis.reductionPct > 0 ? "danger" : "success"}
        />
        <WasteKpi
          label="Waste today"
          value={todayRecorded ? formatKg(data.kpis.totalToday) : "No readings"}
          note={todayRecorded ? `Milk ${data.kpis.milkToday} L · packaging ${data.kpis.packagingToday} kg` : "No record for today — not zero"}
          icon={TrendingDown}
          tone="primary"
        />
        <WasteKpi
          label="Pending disposal"
          value={data.kpis.pendingDisposal.toLocaleString("en-IN")}
          note={`${data.kpis.pendingDisposalKg.toLocaleString("en-IN")} kg eq. waiting`}
          icon={PackageCheck}
          tone="warning"
        />
        <WasteKpi
          label={`Estimated cost · ${data.rangeDays}d`}
          value={formatInr(data.costs.total)}
          note={`${formatInr(data.costs.avoidable)} potentially avoidable`}
          icon={CircleDollarSign}
          tone="navy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <WasteSection
          title="Daily waste trend"
          subtitle="kg-equivalent solids. Wastewater volume is tracked separately."
          className="lg:col-span-3"
          action={<span className="text-[9px] text-muted-foreground">Last {data.rangeDays} days</span>}
        >
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.totals.daily.map((day) => ({ ...day, total: day.recorded ? day.total : null }))}>
                <defs>
                  <linearGradient id="wasteArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#146C60" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#146C60" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7EEF7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#8296AD" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fontSize: 8, fill: "#8296AD" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="total" name="kg eq." stroke="#146C60" strokeWidth={1.8} fill="url(#wasteArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              ["Milk today", `${data.kpis.milkToday} L`],
              ["Wastewater today", `${data.kpis.wastewaterToday.toLocaleString("en-IN")} L`],
              ["Packaging today", `${data.kpis.packagingToday} kg`],
              ["Rejected today", `${data.kpis.rejectedToday} kg`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-background/60 px-2 py-1">
                <p className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-[10px] font-semibold text-navy">{value}</p>
              </div>
            ))}
          </div>
        </WasteSection>

        <WasteSection
          title="Six waste streams"
          subtitle="Recoverable cream and saleable by-products are not auto-classified as waste."
          className="lg:col-span-2"
          action={<Boxes className="size-3.5 text-muted-foreground" />}
        >
          <div className="space-y-2">
            {data.totals.byCategory.length === 0 ? (
              <EmptyWaste text="No waste recorded in this period." />
            ) : (
              data.totals.byCategory.map((item) => {
                const meta = wasteCategoryMeta(item.category);
                const max = Math.max(...data.totals.byCategory.map((entry) => entry.kgEquivalent), 1);
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between gap-2 text-[9.5px]">
                      <span className="font-medium text-navy">{item.category}</span>
                      <span className="text-muted-foreground">
                        {formatQuantity(item.quantity, item.unit)}
                        {item.category !== "Wastewater" && ` · ${item.kgEquivalent} kg eq.`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.category === "Wastewater" ? 100 : Math.max(3, (item.kgEquivalent / max) * 100)}%`,
                          backgroundColor: meta.bar,
                          opacity: item.category === "Wastewater" ? 0.28 : 1,
                        }}
                      />
                    </div>
                    {item.category === "Wastewater" && (
                      <p className="mt-0.5 text-[8px] text-muted-foreground">Volume · not included in solid kg-equivalent totals</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </WasteSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WasteSection title="Highest-loss stages" subtitle="kg-equivalent in the selected period" action={<BarChart3 className="size-3.5 text-muted-foreground" />}>
          <MiniBarList entries={data.totals.byStage.slice(0, 6).map((item) => ({ label: item.stage, value: item.kgEquivalent }))} color="#3185D8" />
        </WasteSection>
        <WasteSection title="Machine hotspots" subtitle="Linked by shared machine codes" action={<Gauge className="size-3.5 text-muted-foreground" />}>
          <MiniBarList entries={data.totals.byMachine.slice(0, 6).map((item) => ({ label: item.machineCode, value: item.kgEquivalent }))} color="#D99A24" />
        </WasteSection>
        <WasteSection title="Batch tracking" subtitle="Mass balance gap is not booked as waste" action={<Scale className="size-3.5 text-muted-foreground" />}>
          <div className="space-y-1.5">
            {data.batches.slice(0, 5).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-navy">{batch.id}</p>
                  <p className="text-[8.5px] text-muted-foreground">Waste {batch.recordedWasteKg} kg eq. · gap {batch.gapKg} kg</p>
                </div>
                <BatchStatus status={batch.status} />
              </div>
            ))}
          </div>
        </WasteSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <WasteSection
          title="Mass balance by batch"
          subtitle="Input, output, recoverable material, inventory movement and recorded losses are reconciled; gaps require review."
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[700px] border-collapse text-left text-[9.5px]">
              <thead>
                <tr className="border-b border-border/70 bg-background/60 text-[8px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-1.5 font-semibold">Batch</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Input L</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Output kg</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Recoverable</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Waste kg eq.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Gap</th>
                  <th className="px-2 py-1.5 font-semibold">Review</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border/45 last:border-0">
                    <td className="px-2 py-1.5 font-medium text-navy">{batch.id}<span className="block text-[8px] font-normal text-muted-foreground">{batch.product}</span></td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.inputLitres.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.outputKg.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.recoverableKg.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-1.5 text-right text-navy">{batch.recordedWasteKg}</td>
                    <td className={cn("px-2 py-1.5 text-right font-semibold", Math.abs(batch.gapPct) > 2 ? "text-warning-ink" : "text-success-ink")}>
                      {batch.gapKg} kg · {batch.gapPct}%
                    </td>
                    <td className="px-2 py-1.5"><BatchStatus status={batch.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[8.5px] leading-relaxed text-muted-foreground">
            A gap inside tolerance is not zero waste; it means the recorded balance is inconclusive.
            Do not classify cream or recoverable by-products as waste without authorized review.
          </p>
        </WasteSection>

        <div className="space-y-4 lg:col-span-2">
          <WasteSection title="7-day forecast" subtitle="Transparent moving-average projection, not a trained ML model" action={<Sparkles className="size-3.5 text-muted-foreground" />}>
            <div className="h-[132px]">
              <ForecastChart data={data} />
            </div>
            <div className="mt-1 flex items-center justify-between rounded-md bg-background/60 px-2.5 py-1.5 text-[9px]">
              <span className="text-muted-foreground">Predicted week</span>
              <span className="font-semibold text-navy">
                {data.forecast.hasRecentData
                  ? `${formatKg(data.forecast.predictedWeekKg)} · ${formatInr(data.forecast.predictedWeekCost)}`
                  : "No recent readings"}
              </span>
            </div>
            <p className="mt-1.5 text-[8.5px] leading-relaxed text-muted-foreground">{data.model.note}</p>
          </WasteSection>

          <WasteSection title="Data source mix" subtitle="Every record carries a permanent source label">
            <div className="space-y-1.5">
              {[
                ["manual", "MANUAL"],
                ["iot", "IOT"],
                ["simulated", "SIMULATED"],
              ].map(([source, label]) => {
                const count = data.records.filter((record) => record.source === source).length;
                return (
                  <div key={source} className="flex items-center justify-between gap-2 text-[9.5px]">
                    <span className="inline-flex items-center gap-1.5"><WasteSourcePill source={source} /> <span className="text-muted-foreground">{label === "SIMULATED" ? "generated demo records" : label === "IOT" ? "connected readings" : "human entries"}</span></span>
                    <span className="font-semibold text-navy">{count}</span>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setTab("analysis")} className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-primary">
              Open detailed analysis <ArrowRight className="size-3" />
            </button>
          </WasteSection>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WasteSection title="Cost analysis" subtitle="Planning estimates using configured rates" className="lg:col-span-2" action={<CircleDollarSign className="size-3.5 text-muted-foreground" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              {[
                ["Milk loss", data.costs.milk, "#3185D8"],
                ["Packaging", data.costs.packaging, "#D99A24"],
                ["Wastewater", data.costs.wastewater, "#1789A8"],
                ["Disposal", data.costs.disposal, "#DC4545"],
              ].map(([label, value, color]) => {
                const numeric = Number(value);
                const max = Math.max(data.costs.total, 1);
                return (
                  <div key={String(label)}>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-navy">{formatInr(numeric)}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, (numeric / max) * 100)}%`, backgroundColor: String(color) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col justify-between rounded-lg bg-background/60 p-3">
              <div>
                <p className="text-[8.5px] uppercase tracking-wider text-muted-foreground">Total estimate</p>
                <p className="mt-0.5 font-display text-[22px] font-semibold text-navy">{formatInr(data.costs.total)}</p>
                <p className="text-[9px] text-muted-foreground">₹{data.costs.perLitre}/L processed</p>
              </div>
              <div className="mt-2 border-t border-border/60 pt-2">
                <p className="text-[8.5px] uppercase tracking-wider text-muted-foreground">Potentially avoidable</p>
                <p className="text-[14px] font-semibold text-warning-ink">{formatInr(data.costs.avoidable)}</p>
              </div>
              <p className="mt-1 text-[8px] leading-relaxed text-muted-foreground">Planning estimate, not an invoice.</p>
            </div>
          </div>
        </WasteSection>

        <WasteSection title="Suggestions · verify first" subtitle="Generated from recorded trends; no automatic classification" action={<Sparkles className="size-3.5 text-muted-foreground" />}>
          {data.insights.length === 0 ? (
            <EmptyWaste text="No waste anomalies in this period." />
          ) : (
            <div className="space-y-2">
              {data.insights.slice(0, 2).map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-[10px] font-semibold text-navy">{insight.title}</p>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary">{insight.confidence}%</span>
                  </div>
                  <p className="mt-0.5 text-[8.5px] leading-relaxed text-muted-foreground">{insight.observation}</p>
                  <p className="mt-1 text-[8.5px] font-medium text-navy">Action: {insight.action}</p>
                </div>
              ))}
              <button type="button" onClick={() => setTab("analysis")} className="inline-flex items-center gap-1 text-[9px] font-semibold text-primary">
                See all suggestions <ArrowRight className="size-3" />
              </button>
            </div>
          )}
        </WasteSection>
      </div>

      <ReliabilityNote>
        <span className="font-semibold text-navy">Data reliability:</span> simulated values are
        generated demo evidence and labelled SIMULATED. Missing readings are excluded rather than
        converted to zero. Wastewater is measured in litres and excluded from solid kg-equivalent
        totals. Mass-balance gaps stay review items until authorized reconciliation.
      </ReliabilityNote>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-[9.5px] text-muted-foreground shadow-card">
        <Link to="/dashboard/hygiene" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <Droplets className="size-3" /> Hygiene evidence and CIP cycles
        </Link>
        <span className="text-border">|</span>
        <Link to="/dashboard/energy" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <Gauge className="size-3" /> Energy & machines
        </Link>
      </div>
    </div>
  );
}

function WasteAnalysis({ data }: { data: WasteDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WasteKpi label="Period waste" value={data.periodRecords > 0 ? formatKg(data.totals.currentKg) : "No readings"} note={data.periodRecords > 0 ? `Previous ${formatKg(data.totals.previousKg)}` : "No records in this period — not zero"} icon={Scale} tone="navy" />
        <WasteKpi label="Reduction" value={`${data.kpis.reductionPct > 0 ? "+" : ""}${data.kpis.reductionPct}%`} note={`Target ${data.totals.byCategory.length ? data.config.reductionTargetPct : 0}%`} icon={TrendingDown} tone={data.kpis.reductionPct > 0 ? "danger" : "success"} />
        <WasteKpi label="Waste per litre" value={`${data.kpis.wastePerLitre} kg`} note={`${data.kpis.litresProcessed.toLocaleString("en-IN")} L processed`} icon={Droplets} tone="primary" />
        <WasteKpi label="Recycled / recovered" value={formatKg(data.kpis.recycled)} note="Handled volume in period" icon={Recycle} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WasteSection title="Daily totals" subtitle="kg-equivalent across the selected period" action={<BarChart3 className="size-3.5 text-muted-foreground" />}>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.totals.daily.map((day) => ({ ...day, total: day.recorded ? day.total : null }))}>
                <CartesianGrid stroke="#E7EEF7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#8296AD" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fontSize: 8, fill: "#8296AD" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="total" name="kg eq." fill="#146C60" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WasteSection>

        <WasteSection title="Forecast vs recorded" subtitle="Past recorded kg eq. and next 7 predicted days" action={<Sparkles className="size-3.5 text-muted-foreground" />}>
          <div className="h-[190px]">
            <ForecastChart data={data} height="100%" />
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-1 text-[9px]">
            <span className="text-muted-foreground">Predicted week <span className="font-semibold text-navy">{formatKg(data.forecast.predictedWeekKg)}</span></span>
            <span className="text-muted-foreground">Predicted disposal cost <span className="font-semibold text-navy">{formatInr(data.forecast.predictedWeekCost)}</span></span>
          </div>
        </WasteSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WasteSection title="Weekly and monthly totals" subtitle="kg-equivalent trend">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Weekly · 12 weeks</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.totals.weekly.map((week) => ({ ...week, total: week.recorded ? week.total : null }))}>
                    <CartesianGrid stroke="#E7EEF7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="total" stroke="#3185D8" strokeWidth={1.7} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly · 6 months</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.totals.monthly.map((month) => ({ ...month, total: month.recorded ? month.total : null }))}>
                    <CartesianGrid stroke="#E7EEF7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Bar dataKey="total" name="kg eq." fill="#1789A8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </WasteSection>

        <WasteSection title="Category share" subtitle="Wastewater shown separately; percentages apply to solid kg-equivalent only">
          <div className="space-y-2">
            {data.totals.byCategory.map((item) => {
              const meta = wasteCategoryMeta(item.category);
              return (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-2 text-[9px]">
                    <span className="font-medium text-navy">{item.category}</span>
                    <span className="text-muted-foreground">
                      {formatQuantity(item.quantity, item.unit)}
                      {item.category !== "Wastewater" ? ` · ${item.share}%` : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.category === "Wastewater" ? 100 : Math.max(2, item.share)}%`,
                        backgroundColor: meta.bar,
                        opacity: item.category === "Wastewater" ? 0.28 : 1,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </WasteSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WasteSection title="By stage" subtitle="Top kg-equivalent contributors">
          <MiniBarList entries={data.totals.byStage.map((item) => ({ label: item.stage, value: item.kgEquivalent }))} color="#3185D8" limit={10} />
        </WasteSection>
        <WasteSection title="By machine" subtitle="Use shared machine codes with Energy">
          <MiniBarList entries={data.totals.byMachine.map((item) => ({ label: item.machineCode, value: item.kgEquivalent }))} color="#D99A24" limit={10} />
        </WasteSection>
        <WasteSection title="By batch" subtitle="Recorded kg-equivalent linked to batch">
          <MiniBarList entries={data.totals.byBatch.map((item) => ({ label: item.batchId, value: item.kgEquivalent }))} color="#16A078" limit={10} />
        </WasteSection>
      </div>

      <WasteSection title="Mass balance and reconciliation" subtitle="A gap is never automatically treated as waste">
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[840px] border-collapse text-left text-[9.5px]">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 text-[8px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold">Batch</th>
                <th className="px-2 py-1.5 text-right font-semibold">Input L</th>
                <th className="px-2 py-1.5 text-right font-semibold">Output kg</th>
                <th className="px-2 py-1.5 text-right font-semibold">Recoverable kg</th>
                <th className="px-2 py-1.5 text-right font-semibold">Inventory Δ</th>
                <th className="px-2 py-1.5 text-right font-semibold">Recorded waste</th>
                <th className="px-2 py-1.5 text-right font-semibold">Gap</th>
                <th className="px-2 py-1.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.batches.map((batch) => (
                <tr key={batch.id} className="border-b border-border/45 last:border-0">
                  <td className="px-2 py-1.5 font-medium text-navy">{batch.id}<span className="block text-[8px] font-normal text-muted-foreground">{batch.product}</span></td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.inputLitres.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.outputKg.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.recoverableKg.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{batch.inventoryChangeKg}</td>
                  <td className="px-2 py-1.5 text-right text-navy">{batch.recordedWasteKg}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-navy">{batch.gapKg} kg ({batch.gapPct}%)</td>
                  <td className="px-2 py-1.5"><BatchStatus status={batch.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WasteSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <WasteSection title="Suggestions requiring verification" subtitle="Rules-based, transparent outputs; no automatic classification" action={<Sparkles className="size-3.5 text-muted-foreground" />}>
          <div className="space-y-2">
            {data.insights.length === 0 ? (
              <EmptyWaste text="No generated suggestions for this period." />
            ) : (
              data.insights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-1.5">
                    <p className="text-[10.5px] font-semibold text-navy">{insight.title}</p>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary">{insight.confidence}% confidence</span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{insight.observation}</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground"><span className="font-semibold text-navy">Possible causes:</span> {insight.possibleCauses.join(" · ")}</p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-navy"><span className="font-semibold">Action:</span> {insight.action}</p>
                  <p className="mt-0.5 text-[8.5px] text-muted-foreground">Estimated monthly opportunity: {formatInr(insight.estimatedMonthlyCost)} · {insight.evidence}</p>
                </div>
              ))
            )}
          </div>
        </WasteSection>

        <WasteSection title="Cost analysis" subtitle={data.costs.basis}>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: "Milk", value: data.costs.milk },
                  { label: "Packaging", value: data.costs.packaging },
                  { label: "Wastewater", value: data.costs.wastewater },
                  { label: "Disposal", value: data.costs.disposal },
                ]}
                layout="vertical"
                margin={{ left: 8, right: 22 }}
              >
                <CartesianGrid stroke="#E7EEF7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: "#8296AD" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatInr(Number(value))} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#334A63" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip contentStyle={{ fontSize: 10 }} formatter={(value) => formatInr(Number(value))} />
                <Bar dataKey="value" name="Estimated cost" radius={[0, 3, 3, 0]}>
                  {["#3185D8", "#D99A24", "#1789A8", "#DC4545"].map((color) => <Cell key={color} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5 text-[9.5px]">
            <div className="rounded-md bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Total estimate</p>
              <p className="font-semibold text-navy">{formatInr(data.costs.total)}</p>
            </div>
            <div className="rounded-md bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Potentially avoidable</p>
              <p className="font-semibold text-warning-ink">{formatInr(data.costs.avoidable)}</p>
            </div>
          </div>
        </WasteSection>
      </div>

      <ReliabilityNote>
        <span className="font-semibold text-navy">Forecast and suggestions:</span>{" "}
        {data.model.prediction}; {data.model.anomaly}. {data.model.note} Simulation is labelled and
        not presented as a plant measurement.
      </ReliabilityNote>
    </div>
  );
}

function MiniBarList({
  entries,
  color,
  limit = 6,
}: {
  entries: Array<{ label: string; value: number }>;
  color: string;
  limit?: number;
}) {
  const shown = entries.slice(0, limit);
  const max = Math.max(...shown.map((entry) => entry.value), 1);
  if (shown.length === 0) return <EmptyWaste text="No data recorded for this grouping." />;
  return (
    <div className="space-y-1.5">
      {shown.map((entry) => (
        <div key={entry.label}>
          <div className="flex items-center justify-between gap-2 text-[9px]">
            <span className="truncate text-muted-foreground">{entry.label}</span>
            <span className="shrink-0 font-semibold text-navy">{entry.value.toLocaleString("en-IN")} kg eq.</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (entry.value / max) * 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ForecastChart({ data, height = 132 }: { data: WasteDashboardData; height?: number | string }) {
  if (!data.forecast.hasRecentData) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background/40">
        <p className="px-3 text-center text-[9.5px] text-muted-foreground">
          No recent readings — a forecast is not generated. Missing data is not treated as zero.
        </p>
      </div>
    );
  }
  const past = data.totals.daily.slice(-14).map((day) => ({
    label: day.label,
    recorded: day.recorded ? day.total : null as number | null,
    forecast: null as number | null,
  }));
  const future = data.forecast.days.map((day) => ({
    label: day.label,
    recorded: null as number | null,
    forecast: day.total,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={[...past, ...future]}>
        <CartesianGrid stroke="#E7EEF7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={25} />
        <Tooltip contentStyle={{ fontSize: 10 }} />
        <Area type="monotone" dataKey="recorded" name="Recorded kg eq." stroke="#146C60" fill="#146C60" fillOpacity={0.1} strokeWidth={1.7} connectNulls={false} />
        <Line type="monotone" dataKey="forecast" name="Predicted kg eq." stroke="#D99A24" strokeWidth={1.8} strokeDasharray="4 3" dot={false} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function BatchStatus({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold capitalize",
      status === "balanced"
        ? "bg-success/10 text-success-ink"
        : status === "review"
          ? "bg-warning/10 text-warning-ink"
          : "bg-danger/10 text-danger",
    )}>
      {status}
    </span>
  );
}
