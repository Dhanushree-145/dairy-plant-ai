import { DemoDataBadge, WasteSection, WasteSourcePill } from "@/components/waste/WasteBits";
import { Button } from "@/components/ui/button";
import {
  downloadCsv,
  formatInr,
  formatKg,
  formatQuantity,
  formatWasteTime,
  type WasteDashboardData,
} from "@/lib/waste";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Scale,
  Sparkles,
} from "lucide-react";

export function WasteReports({ data }: { data: WasteDashboardData }) {
  const filenameBase = `dairysense-waste-${data.rangeDays}d-${new Date().toISOString().slice(0, 10)}`;

  const exportSummary = () => {
    downloadCsv(`${filenameBase}-summary.csv`, [
      ["DairySense Waste Management report"],
      ["Generated", formatWasteTime(data.generatedAt)],
      ["Period", `${data.rangeDays} days`],
      ["Data source", "SIMULATED demo analytics plus recorded plant actions"],
      [],
      ["KPI", "Value"],
      ["Total waste (kg eq.)", data.totals.currentKg],
      ["Waste today (kg eq.)", data.kpis.totalToday],
      ["Milk waste today (L)", data.kpis.milkToday],
      ["Wastewater today (L)", data.kpis.wastewaterToday],
      ["Packaging waste today (kg)", data.kpis.packagingToday],
      ["Rejected product today (kg)", data.kpis.rejectedToday],
      ["Reduction vs previous period (%)", data.kpis.reductionPct],
      ["Waste per litre processed (kg/L)", data.kpis.wastePerLitre],
      ["Litres processed", data.kpis.litresProcessed],
      ["Recycled / recovered (kg eq.)", data.kpis.recycled],
      ["Pending disposal (kg eq.)", data.kpis.pendingDisposalKg],
      ["Predicted next 7 days (kg eq.)", data.forecast.predictedWeekKg],
      ["Estimated period cost (INR)", data.costs.total],
      ["Avoidable cost estimate (INR)", data.costs.avoidable],
      [],
      ["Category", "Quantity", "Unit", "kg equivalent", "Share (%)"],
      ...data.totals.byCategory.map((item) => [item.category, item.quantity, item.unit, item.kgEquivalent, item.share]),
      [],
      ["Stage", "kg equivalent"],
      ...data.totals.byStage.map((item) => [item.stage, item.kgEquivalent]),
      [],
      ["Machine", "kg equivalent"],
      ...data.totals.byMachine.map((item) => [item.machineCode, item.kgEquivalent]),
      [],
      ["Batch", "Input L", "Output kg", "Recoverable kg", "Inventory change kg", "Recorded waste kg", "Gap kg", "Gap %", "Status"],
      ...data.batches.map((batch) => [batch.id, batch.inputLitres, batch.outputKg, batch.recoverableKg, batch.inventoryChangeKg, batch.recordedWasteKg, batch.gapKg, batch.gapPct, batch.status]),
      [],
      ["Forecast date", "Predicted kg eq.", "Predicted disposal cost (INR)"],
      ...data.forecast.days.map((day) => [day.label, day.total, day.cost]),
      [],
      ["Model note", data.model.note],
      ["Cost basis", data.costs.basis],
    ]);
  };

  const exportRecords = () => {
    downloadCsv(`${filenameBase}-records.csv`, [
      ["Recorded at", "Category", "Quantity", "Unit", "Source", "Stage", "Machine", "Batch", "Employee", "Reason", "Disposal status", "Recovery method", "Storage", "Verification"],
      ...data.records.map((record) => [
        formatWasteTime(record.recordedAt),
        record.category,
        record.quantity,
        record.unit,
        record.source.toUpperCase(),
        record.stage,
        record.machineCode ?? "",
        record.batchId ?? "",
        record.employee,
        record.reason,
        record.disposalStatus,
        record.recoveryMethod,
        record.storageLocation,
        record.verificationStatus,
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-card">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">Waste report</p>
          <h2 className="mt-1 font-display text-[19px] font-semibold text-navy">
            {data.rangeDays}-day waste, recovery and cost report
          </h2>
          <p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-muted-foreground">
            Generated {formatWasteTime(data.generatedAt)} · {data.periodRecords} recorded entries.
            Reports combine clearly labelled simulated demo evidence with the MANUAL and IOT records
            added for this plant.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 print:hidden">
          <Button variant="outline" size="sm" onClick={exportRecords}>
            <FileSpreadsheet className="size-3.5" /> Records CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportSummary}>
            <Download className="size-3.5" /> Summary CSV
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total waste", value: data.periodRecords > 0 ? formatKg(data.totals.currentKg) : "No readings", note: data.periodRecords > 0 ? `${data.kpis.reductionPct > 0 ? "+" : ""}${data.kpis.reductionPct}% vs previous period` : "No records in this period — not zero" },
          { label: "Recycled / recovered", value: formatKg(data.kpis.recycled), note: "Handled volume in the period" },
          { label: "Estimated cost", value: formatInr(data.costs.total), note: `₹${data.costs.perLitre}/L processed` },
          { label: "Predicted next 7 days", value: data.forecast.hasRecentData ? formatKg(data.forecast.predictedWeekKg) : "No readings", note: data.forecast.hasRecentData ? "Moving-average projection" : "No recent readings — no forecast" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border/80 bg-card p-3 shadow-card">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className="mt-1.5 font-display text-[18px] font-semibold text-navy">{item.value}</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WasteSection title="Waste by category" subtitle={`Period: last ${data.rangeDays} days`} action={<BarChart3 className="size-3.5 text-muted-foreground" />}>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-b border-border/70 bg-background/60 text-[8.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2.5 py-1.5 font-semibold">Category</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Quantity</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">kg eq.</th>
                  <th className="px-2.5 py-1.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.totals.byCategory.map((item) => (
                  <tr key={item.category} className="border-b border-border/45 last:border-0">
                    <td className="px-2.5 py-1.5 font-medium text-navy">{item.category}</td>
                    <td className="px-2.5 py-1.5 text-right text-muted-foreground">{formatQuantity(item.quantity, item.unit)}</td>
                    <td className="px-2.5 py-1.5 text-right text-navy">{item.kgEquivalent.toLocaleString("en-IN")}</td>
                    <td className="px-2.5 py-1.5 text-right text-muted-foreground">{item.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WasteSection>

        <WasteSection title="Mass balance by batch" subtitle="Gaps are for review, not automatic waste" action={<Scale className="size-3.5 text-muted-foreground" />}>
          <div className="space-y-1.5">
            {data.batches.slice(0, 7).map((batch) => (
              <div key={batch.id} className="rounded-lg border border-border/60 bg-background/40 p-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold text-navy">{batch.id} · {batch.product}</p>
                  <span className={
                    batch.status === "balanced"
                      ? "rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-semibold text-success-ink"
                      : batch.status === "review"
                        ? "rounded-full bg-warning/10 px-1.5 py-0.5 text-[8px] font-semibold text-warning-ink"
                        : "rounded-full bg-danger/10 px-1.5 py-0.5 text-[8px] font-semibold text-danger"
                  }>
                    {batch.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[8.5px] text-muted-foreground">
                  Input {batch.inputLitres.toLocaleString("en-IN")} L · output {batch.outputKg.toLocaleString("en-IN")} kg · recoverable {batch.recoverableKg.toLocaleString("en-IN")} kg · waste {batch.recordedWasteKg} kg eq.
                </p>
                <p className="mt-0.5 text-[8.5px] font-medium text-navy">
                  Gap {batch.gapKg} kg ({batch.gapPct}%) · inventory change {batch.inventoryChangeKg} kg
                </p>
              </div>
            ))}
          </div>
        </WasteSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WasteSection title="Cost breakdown" subtitle={data.costs.basis}>
          <div className="space-y-1.5 text-[10px]">
            {[
              ["Milk loss", data.costs.milk],
              ["Packaging", data.costs.packaging],
              ["Wastewater treatment", data.costs.wastewater],
              ["Disposal", data.costs.disposal],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-navy">{formatInr(Number(value))}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-navy">Total estimate</span>
              <span className="font-display text-[15px] font-semibold text-navy">{formatInr(data.costs.total)}</span>
            </div>
            <p className="pt-1 text-[8.5px] leading-relaxed text-muted-foreground">Avoidable estimate: {formatInr(data.costs.avoidable)}. Planning estimate only; not an invoice.</p>
          </div>
        </WasteSection>

        <WasteSection title="Forecast" subtitle="Transparent 7-day moving-average projection" action={<Sparkles className="size-3.5 text-muted-foreground" />}>
          <div className="space-y-1.5">
            {data.forecast.days.map((day) => (
              <div key={day.label} className="flex items-center justify-between border-b border-border/50 pb-1 text-[10px] last:border-0">
                <span className="text-muted-foreground">{day.label}</span>
                <span className="font-semibold text-navy">{day.total} kg eq.</span>
              </div>
            ))}
          </div>
          <p className="mt-2 rounded-md bg-warning/[0.06] p-2 text-[8.5px] leading-relaxed text-warning-ink">
            {data.model.note} Predictions require verification and are not a trained ML model.
          </p>
        </WasteSection>

        <WasteSection title="Data provenance" subtitle="Source labels in this report">
          <div className="space-y-2">
            {[
              ["manual", data.records.filter((record) => record.source === "manual").length],
              ["iot", data.records.filter((record) => record.source === "iot").length],
              ["simulated", data.records.filter((record) => record.source === "simulated").length],
            ].map(([source, count]) => (
              <div key={String(source)} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5">
                <WasteSourcePill source={String(source)} />
                <span className="text-[10px] font-semibold text-navy">{Number(count).toLocaleString("en-IN")} records</span>
              </div>
            ))}
            <DemoDataBadge />
            <p className="text-[8.5px] leading-relaxed text-muted-foreground">
              Missing readings are not included as zero. Wastewater is shown in litres and excluded
              from solid kg-equivalent totals.
            </p>
          </div>
        </WasteSection>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-[8.5px] text-muted-foreground">
        <span>DairySense · Waste Management · {data.rangeDays}-day report</span>
        <span>Generated {formatWasteTime(data.generatedAt)}</span>
      </div>
    </div>
  );
}
