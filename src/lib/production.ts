import { api } from "@/convex/_generated/api";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import type { FunctionReturnType } from "convex/server";

export type ProductionData = NonNullable<
  FunctionReturnType<typeof api.production.overview>
>;
export type ProductionRange = 7 | 30 | 90;
export type ProductionView = "production" | "profit" | "reports";

export function formatLitres(value: number): string {
  return `${numberFormatter.format(Math.round(value))} L`;
}

export function formatKg(value: number): string {
  return `${numberFormatter.format(Math.round(value))} kg`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatMoneyCompact(value: number): string {
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return formatCurrency(value);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildProductionCsv(data: ProductionData): string {
  const rows: Array<Array<string | number>> = [];
  rows.push(["DairySense production and profit report"]);
  rows.push(["Data source", data.dataSource]);
  rows.push(["Period", `${data.reports.period.from} to ${data.reports.period.to}`]);
  rows.push(["Generated", new Date(data.generatedAt).toISOString()]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Milk received (L)", data.kpis.milkReceived]);
  rows.push(["Milk processed (L)", data.kpis.milkProcessed]);
  rows.push(["Products manufactured (kg)", data.kpis.productKg]);
  rows.push(["Yield (%)", data.kpis.yieldPct]);
  rows.push(["Revenue (INR)", data.kpis.revenue]);
  rows.push(["Total cost (INR)", data.kpis.totalCost]);
  rows.push(["Net profit (INR)", data.kpis.netProfit]);
  rows.push(["Margin (%)", data.kpis.marginPct]);
  rows.push([]);
  rows.push([
    "Date",
    "Milk received (L)",
    "Milk processed (L)",
    "Products (kg)",
    "Revenue (INR)",
    "Total cost (INR)",
    "Net profit (INR)",
    "Margin (%)",
    "Cost per litre (INR)",
    "Profit per litre (INR)",
  ]);
  for (const day of data.daily) {
    rows.push([
      day.date,
      day.received,
      day.processed,
      day.productKg,
      day.revenue,
      day.totalCost,
      day.netProfit,
      day.marginPct,
      day.costPerLitre,
      day.profitPerLitre,
    ]);
  }
  rows.push([]);
  rows.push([
    "Product",
    "SKU",
    "Quantity (kg)",
    "Price (INR/kg)",
    "Revenue (INR)",
    "Allocated cost (INR)",
    "Profit (INR)",
    "Margin (%)",
  ]);
  for (const product of data.products) {
    rows.push([
      product.name,
      product.sku,
      product.quantity,
      product.pricePerKg,
      product.revenue,
      product.allocatedCost,
      product.profit,
      product.marginPct,
    ]);
  }
  rows.push([]);
  rows.push(["Supplier", "Litres", "Fat (%)", "SNF (%)", "Rate (INR/L)", "Amount (INR)"]);
  for (const supplier of data.milk.suppliers) {
    rows.push([
      supplier.name,
      supplier.litres,
      supplier.fat,
      supplier.snf,
      supplier.rate,
      supplier.amount,
    ]);
  }
  rows.push([]);
  rows.push(["Cost line", "Amount (INR)", "Share (%)"]);
  for (const cost of data.costs.breakdown) {
    rows.push([cost.label, cost.value, cost.sharePct]);
  }
  rows.push(["Total cost", data.costs.total, 100]);
  rows.push([]);
  rows.push(["Note", data.note]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadProductionCsv(data: ProductionData) {
  const blob = new Blob([`\uFEFF${buildProductionCsv(data)}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `dairysense-production-profit-${data.reports.period.from}-to-${data.reports.period.to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
