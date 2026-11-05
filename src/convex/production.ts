import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Milk & Production → Cost & Profit.
 *
 * A single deterministic plant model feeds the production, profit and reporting
 * screens so every number reconciles across modules. It is clearly labelled as
 * simulated; no live milk meters or ERP invoices are connected.
 */

type RangeDays = 7 | 30 | 90;
const DAY = 86_400_000;

const PRODUCTS = [
  {
    id: "pouch-milk",
    name: "Pouch milk",
    category: "Milk",
    sku: "500 ml",
    dailyKg: 27_100,
    pricePerKg: 98,
    color: "#3185D8",
  },
  {
    id: "curd",
    name: "Curd",
    category: "Fermented",
    sku: "400 g",
    dailyKg: 5_200,
    pricePerKg: 122,
    color: "#16A078",
  },
  {
    id: "buttermilk",
    name: "Buttermilk",
    category: "Fermented",
    sku: "200 ml",
    dailyKg: 3_900,
    pricePerKg: 96,
    color: "#7EA6D8",
  },
  {
    id: "butter",
    name: "Butter",
    category: "Fat",
    sku: "100 g",
    dailyKg: 1_850,
    pricePerKg: 520,
    color: "#F59E0B",
  },
  {
    id: "cheese",
    name: "Cheese",
    category: "Speciality",
    sku: "200 g",
    dailyKg: 1_420,
    pricePerKg: 490,
    color: "#1E3A5F",
  },
  {
    id: "paneer",
    name: "Paneer",
    category: "Speciality",
    sku: "200 g",
    dailyKg: 1_260,
    pricePerKg: 430,
    color: "#A8C6E8",
  },
] as const;

const SUPPLIERS = [
  { name: "Sahyadri collection route", share: 0.32, fat: 4.2, snf: 8.7, rate: 42.6 },
  { name: "Koyna milk union", share: 0.24, fat: 4.0, snf: 8.6, rate: 41.9 },
  { name: "Panchganga chilling centre", share: 0.18, fat: 4.4, snf: 8.8, rate: 43.2 },
  { name: "Local dairy cooperative", share: 0.13, fat: 3.9, snf: 8.5, rate: 41.4 },
  { name: "Warana bulk supplier", share: 0.08, fat: 4.1, snf: 8.7, rate: 42.2 },
  { name: "Contracted tanker intake", share: 0.05, fat: 4.3, snf: 8.8, rate: 43.5 },
] as const;

const COSTS = {
  defaultMilkRate: 42.4,
  processingPerLitre: 3.2,
  packagingPerKg: 8.8,
  energyPerKwh: 8.3,
  energyKwhPerLitre: 0.0665,
  wastePerKg: 36,
  overheadPerDay: 165_000,
  distributionPctRevenue: 0.12,
  financePctRevenue: 0.04,
  byproductValuePerKg: 18,
  byproductKgPerLitre: 0.055,
};

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function weekdayFactor(date: Date): number {
  const factors = [0.9, 1.02, 1.04, 1.01, 1.03, 0.99, 0.93];
  return factors[date.getUTCDay()];
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function buildDay(timestamp: number, index: number) {
  const date = new Date(timestamp);
  const factor = weekdayFactor(date) + (noise(index + 17) - 0.5) * 0.035;
  const processed = 47_800 * factor;
  const received = processed * (1.018 + (noise(index + 29) - 0.5) * 0.008);
  const rejected = received - processed;
  const fat = 4.08 + (noise(index + 41) - 0.5) * 0.16;
  const snf = 8.67 + (noise(index + 53) - 0.5) * 0.12;

  const productRows = PRODUCTS.map((product, productIndex) => {
    const quantity =
      product.dailyKg *
      factor *
      (0.965 + noise(index * 7 + productIndex + 67) * 0.07);
    const revenue = quantity * product.pricePerKg;
    return { ...product, quantity: round(quantity, 1), revenue: round(revenue) };
  });
  const productKg = productRows.reduce((sum, product) => sum + product.quantity, 0);
  const productRevenue = productRows.reduce((sum, product) => sum + product.revenue, 0);
  const byproductKg = processed * COSTS.byproductKgPerLitre;
  const byproductRevenue = byproductKg * COSTS.byproductValuePerKg;

  const milkCost = received * COSTS.defaultMilkRate;
  const processingCost = processed * COSTS.processingPerLitre;
  const packagingCost = productKg * COSTS.packagingPerKg;
  const energyKwh = processed * COSTS.energyKwhPerLitre;
  const energyCost = energyKwh * COSTS.energyPerKwh;
  const wasteKg = processed * 0.0126;
  const wasteCost = wasteKg * COSTS.wastePerKg;
  const overheadCost = COSTS.overheadPerDay * (0.97 + noise(index + 83) * 0.06);
  const revenue = productRevenue + byproductRevenue;
  const distributionCost = revenue * COSTS.distributionPctRevenue;
  const financeCost = revenue * COSTS.financePctRevenue;
  const totalCost =
    milkCost +
    processingCost +
    packagingCost +
    energyCost +
    wasteCost +
    overheadCost +
    distributionCost +
    financeCost;
  const netProfit = revenue - totalCost;

  return {
    timestamp,
    date: date.toISOString().slice(0, 10),
    label: dayLabel(timestamp),
    received: round(received),
    processed: round(processed),
    rejectedLitres: round(rejected),
    fat: round(fat, 2),
    snf: round(snf, 2),
    productKg: round(productKg),
    byproductKg: round(byproductKg),
    productRevenue: round(productRevenue),
    byproductRevenue: round(byproductRevenue),
    revenue: round(revenue),
    milkCost: round(milkCost),
    processingCost: round(processingCost),
    packagingCost: round(packagingCost),
    energyKwh: round(energyKwh),
    energyCost: round(energyCost),
    wasteKg: round(wasteKg, 1),
    wasteCost: round(wasteCost),
    overheadCost: round(overheadCost),
    distributionCost: round(distributionCost),
    financeCost: round(financeCost),
    totalCost: round(totalCost),
    netProfit: round(netProfit),
    marginPct: round((netProfit / Math.max(1, revenue)) * 100, 1),
    costPerLitre: round(totalCost / processed, 2),
    revenuePerLitre: round(revenue / processed, 2),
    profitPerLitre: round(netProfit / processed, 2),
    products: productRows,
  };
}

function buildDays(now: number, days: number) {
  const end = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
  return Array.from({ length: days }, (_, index) => {
    const offset = days - 1 - index;
    const timestamp = end - offset * DAY;
    return buildDay(timestamp, Math.floor(timestamp / DAY));
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const overview = query({
  args: { days: v.union(v.literal(7), v.literal(30), v.literal(90)) },
  handler: async (_ctx, { days }) => {
    const now = Date.now();
    const rangeDays: RangeDays = days;
    const current = buildDays(now, rangeDays);
    const previous = buildDays(now - rangeDays * DAY, rangeDays);

    const currentProducts = PRODUCTS.map((product) => {
      const rows = current.map((day) => day.products.find((item) => item.id === product.id)!);
      const quantity = sum(rows.map((row) => row.quantity));
      const revenue = sum(rows.map((row) => row.revenue));
      const totalProductKg = sum(current.map((day) => day.productKg));
      const totalCost = sum(current.map((day) => day.totalCost));
      const allocatedCost = (quantity / Math.max(1, totalProductKg)) * totalCost;
      const profit = revenue - allocatedCost;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        sku: product.sku,
        color: product.color,
        quantity: round(quantity),
        revenue: round(revenue),
        allocatedCost: round(allocatedCost),
        profit: round(profit),
        marginPct: round((profit / Math.max(1, revenue)) * 100, 1),
        pricePerKg: product.pricePerKg,
        costPerKg: round(allocatedCost / Math.max(1, quantity), 2),
        sharePct: round((revenue / Math.max(1, sum(current.map((day) => day.productRevenue)))) * 100, 1),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalReceived = sum(current.map((day) => day.received));
    const totalProcessed = sum(current.map((day) => day.processed));
    const totalProductKg = sum(current.map((day) => day.productKg));
    const totalRevenue = sum(current.map((day) => day.revenue));
    const totalCost = sum(current.map((day) => day.totalCost));
    const totalProfit = sum(current.map((day) => day.netProfit));
    const previousRevenue = sum(previous.map((day) => day.revenue));
    const previousCost = sum(previous.map((day) => day.totalCost));
    const previousProfit = sum(previous.map((day) => day.netProfit));
    const previousProcessed = sum(previous.map((day) => day.processed));

    const costBreakdown = [
      { key: "milk", label: "Raw milk", value: sum(current.map((day) => day.milkCost)), color: "#3185D8" },
      { key: "processing", label: "Processing", value: sum(current.map((day) => day.processingCost)), color: "#16A078" },
      { key: "packaging", label: "Packaging", value: sum(current.map((day) => day.packagingCost)), color: "#F59E0B" },
      { key: "energy", label: "Energy", value: sum(current.map((day) => day.energyCost)), color: "#7EA6D8" },
      { key: "waste", label: "Waste & disposal", value: sum(current.map((day) => day.wasteCost)), color: "#DC4545" },
      { key: "overhead", label: "Plant overhead", value: sum(current.map((day) => day.overheadCost)), color: "#1E3A5F" },
      { key: "distribution", label: "Distribution & selling", value: sum(current.map((day) => day.distributionCost)), color: "#A8C6E8" },
      { key: "finance", label: "Finance & other", value: sum(current.map((day) => day.financeCost)), color: "#8296AD" },
    ];

    const suppliers = SUPPLIERS.map((supplier, index) => {
      const litres = totalReceived * supplier.share;
      const rate = supplier.rate + (noise(index + 101) - 0.5) * 0.3;
      return {
        name: supplier.name,
        litres: round(litres),
        sharePct: round(supplier.share * 100, 1),
        fat: supplier.fat,
        snf: supplier.snf,
        rate: round(rate, 2),
        amount: round(litres * rate),
      };
    });

    const batches = PRODUCTS.flatMap((product, productIndex) => {
      const latest = current[current.length - 1].products[productIndex];
      const previousBatch = current[current.length - 2]?.products[productIndex];
      const batchKg = latest.quantity * 0.52;
      const batchRevenue = batchKg * product.pricePerKg;
      const costShare =
        (batchKg / Math.max(1, sum(current[current.length - 1].products.map((item) => item.quantity)))) *
        current[current.length - 1].totalCost;
      const profit = batchRevenue - costShare;
      return {
        batchId: `B-${2410 - productIndex}`,
        product: product.name,
        sku: product.sku,
        quantityKg: round(batchKg),
        revenue: round(batchRevenue),
        cost: round(costShare),
        profit: round(profit),
        marginPct: round((profit / Math.max(1, batchRevenue)) * 100, 1),
        changePct: round(
          ((latest.quantity - (previousBatch?.quantity ?? latest.quantity)) /
            Math.max(1, previousBatch?.quantity ?? latest.quantity)) *
            100,
          1,
        ),
      };
    }).sort((a, b) => b.profit - a.profit);

    const daily = current.map((day) => ({
      date: day.date,
      label: day.label,
      received: day.received,
      processed: day.processed,
      productKg: day.productKg,
      revenue: day.revenue,
      totalCost: day.totalCost,
      netProfit: day.netProfit,
      marginPct: day.marginPct,
      costPerLitre: day.costPerLitre,
      revenuePerLitre: day.revenuePerLitre,
      profitPerLitre: day.profitPerLitre,
      milkCost: day.milkCost,
      processingCost: day.processingCost,
      packagingCost: day.packagingCost,
      energyCost: day.energyCost,
      wasteCost: day.wasteCost,
      overheadCost: day.overheadCost,
      distributionCost: day.distributionCost,
      financeCost: day.financeCost,
    }));

    const pctChange = (currentValue: number, previousValue: number) =>
      previousValue === 0 ? 0 : round(((currentValue - previousValue) / previousValue) * 100, 1);

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      rangeDays,
      note: "Simulated production, procurement and cost model. Figures are illustrative and are not live meter readings, invoices or audited accounts.",
      kpis: {
        milkReceived: round(totalReceived),
        milkProcessed: round(totalProcessed),
        rejectedLitres: round(totalReceived - totalProcessed),
        productKg: round(totalProductKg),
        yieldPct: round((totalProductKg / Math.max(1, totalProcessed)) * 100, 1),
        revenue: round(totalRevenue),
        totalCost: round(totalCost),
        netProfit: round(totalProfit),
        marginPct: round((totalProfit / Math.max(1, totalRevenue)) * 100, 1),
        costPerLitre: round(totalCost / Math.max(1, totalProcessed), 2),
        profitPerLitre: round(totalProfit / Math.max(1, totalProcessed), 2),
        revenueChangePct: pctChange(totalRevenue, previousRevenue),
        costChangePct: pctChange(totalCost, previousCost),
        profitChangePct: pctChange(totalProfit, previousProfit),
        processedChangePct: pctChange(totalProcessed, previousProcessed),
        averageFat: round(totalReceived > 0 ? sum(current.map((day) => day.fat * day.received)) / totalReceived : 0, 2),
        averageSnf: round(totalReceived > 0 ? sum(current.map((day) => day.snf * day.received)) / totalReceived : 0, 2),
        averageMilkRate: round(sum(current.map((day) => day.milkCost)) / Math.max(1, totalReceived), 2),
        byproductKg: round(sum(current.map((day) => day.byproductKg))),
        byproductRevenue: round(sum(current.map((day) => day.byproductRevenue))),
      },
      milk: {
        suppliers,
        daily: current.map((day) => ({
          date: day.date,
          label: day.label,
          received: day.received,
          processed: day.processed,
          rejected: day.rejectedLitres,
          fat: day.fat,
          snf: day.snf,
          procurement: day.milkCost,
        })),
      },
      products: currentProducts,
      batches,
      costs: {
        breakdown: costBreakdown.map((entry) => ({
          ...entry,
          value: round(entry.value),
          sharePct: round((entry.value / Math.max(1, totalCost)) * 100, 1),
        })),
        milk: round(sum(current.map((day) => day.milkCost))),
        processing: round(sum(current.map((day) => day.processingCost))),
        packaging: round(sum(current.map((day) => day.packagingCost))),
        energy: round(sum(current.map((day) => day.energyCost))),
        waste: round(sum(current.map((day) => day.wasteCost))),
        overhead: round(sum(current.map((day) => day.overheadCost))),
        distribution: round(sum(current.map((day) => day.distributionCost))),
        finance: round(sum(current.map((day) => day.financeCost))),
        total: round(totalCost),
        perLitre: round(totalCost / Math.max(1, totalProcessed), 2),
        energyKwh: round(sum(current.map((day) => day.energyKwh))),
      },
      profit: {
        revenue: round(totalRevenue),
        productRevenue: round(sum(current.map((day) => day.productRevenue))),
        byproductRevenue: round(sum(current.map((day) => day.byproductRevenue))),
        totalCost: round(totalCost),
        netProfit: round(totalProfit),
        marginPct: round((totalProfit / Math.max(1, totalRevenue)) * 100, 1),
        perLitre: round(totalProfit / Math.max(1, totalProcessed), 2),
        bridge: [
          { label: "Product revenue", value: round(sum(current.map((day) => day.productRevenue))), type: "positive" as const },
          { label: "By-product credit", value: round(sum(current.map((day) => day.byproductRevenue))), type: "positive" as const },
          { label: "Raw milk", value: -round(sum(current.map((day) => day.milkCost))), type: "negative" as const },
          { label: "Processing", value: -round(sum(current.map((day) => day.processingCost))), type: "negative" as const },
          { label: "Packaging", value: -round(sum(current.map((day) => day.packagingCost))), type: "negative" as const },
          { label: "Energy", value: -round(sum(current.map((day) => day.energyCost))), type: "negative" as const },
          { label: "Waste", value: -round(sum(current.map((day) => day.wasteCost))), type: "negative" as const },
          { label: "Overhead", value: -round(sum(current.map((day) => day.overheadCost))), type: "negative" as const },
          { label: "Distribution", value: -round(sum(current.map((day) => day.distributionCost))), type: "negative" as const },
          { label: "Finance", value: -round(sum(current.map((day) => day.financeCost))), type: "negative" as const },
          { label: "Net profit", value: round(totalProfit), type: "total" as const },
        ],
      },
      daily,
      reports: {
        daily,
        period: {
          from: daily[0]?.date ?? "",
          to: daily[daily.length - 1]?.date ?? "",
          days: rangeDays,
        },
        totals: {
          received: round(totalReceived),
          processed: round(totalProcessed),
          productKg: round(totalProductKg),
          revenue: round(totalRevenue),
          totalCost: round(totalCost),
          netProfit: round(totalProfit),
          marginPct: round((totalProfit / Math.max(1, totalRevenue)) * 100, 1),
        },
      },
      assumptions: {
        milkRate: COSTS.defaultMilkRate,
        processingPerLitre: COSTS.processingPerLitre,
        packagingPerKg: COSTS.packagingPerKg,
        energyPerKwh: COSTS.energyPerKwh,
        overheadPerDay: COSTS.overheadPerDay,
        distributionPctRevenue: COSTS.distributionPctRevenue * 100,
        financePctRevenue: COSTS.financePctRevenue * 100,
        note: "Rates are fixed demo assumptions. Change them in a later release to model your own plant.",
      },
    };
  },
});
