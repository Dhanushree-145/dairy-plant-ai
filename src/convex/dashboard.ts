import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Version 1 of DairySense ships the Overview dashboard only. Until plant
 * hardware is connected, the overview is computed from a deterministic
 * simulated dataset that is clearly labelled as such in the UI. Replacing this
 * module with readings tables (or an ingestion action) is the only change the
 * UI needs to show real plant data.
 */

type RangeDays = 7 | 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 30;
const CAPACITY_LITRES = 60_000;

// Deterministic pseudo-random noise so the same day always reports the same
// numbers (no flicker between queries, and ranges overlap consistently).
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function weekdayFactor(date: Date): number {
  // Intake dips on Sunday, peaks mid-week.
  const factors = [0.9, 1.02, 1.04, 1.01, 1.03, 0.99, 0.93];
  return factors[date.getUTCDay()];
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const PRODUCTS = [
  { name: "Pouch milk", category: "Milk", kilosPerDay: 27_100, color: "#3185D8" },
  { name: "Curd", category: "Fermented", kilosPerDay: 5_200, color: "#16A078" },
  { name: "Buttermilk", category: "Fermented", kilosPerDay: 3_900, color: "#7EA6D8" },
  { name: "Butter", category: "Fat", kilosPerDay: 1_850, color: "#F59E0B" },
  { name: "Cheese", category: "Speciality", kilosPerDay: 1_420, color: "#1E3A5F" },
  { name: "Paneer", category: "Speciality", kilosPerDay: 1_260, color: "#A8C6E8" },
] as const;

const ALERTS = [
  {
    id: "a-1",
    title: "Chiller CH-02 drawing above its rated load",
    detail:
      "3.4 kW above baseline for the last 41 minutes during peak tariff. Energy module suspects a fouled condenser.",
    module: "Energy & Machines",
    severity: "critical" as const,
    minutesAgo: 22,
    metric: "13.9 kW",
  },
  {
    id: "a-2",
    title: "Cold storage bay 3 outside temperature range",
    detail:
      "Bay 3 is holding 6.8°C against a configured 2–4°C range. Product quality risk on 4 pallets of paneer.",
    module: "Hygiene & Quality",
    severity: "critical" as const,
    minutesAgo: 61,
    metric: "6.8°C",
  },
  {
    id: "a-4",
    title: "CIP cycle pending on cheese vat CV-04",
    detail:
      "Scheduled cleaning window closed 3 hours ago. Hygiene compliance for the shift drops to 82% until it is logged.",
    module: "Hygiene & Quality",
    severity: "warning" as const,
    minutesAgo: 305,
    metric: "Overdue",
  },
  {
    id: "a-5",
    title: "Wastewater load 18% above 7-day average",
    detail:
      "Effluent COD is elevated after the paneer wash cycle. Review rinse volumes on line 2.",
    module: "Waste Management",
    severity: "warning" as const,
    minutesAgo: 470,
    metric: "+18%",
  },
  {
    id: "a-6",
    title: "Batch B-2291 rejected at final quality check",
    detail:
      "Curd batch failed the firmness check. 260 kg quarantined, root cause recorded against culture lot C-88.",
    module: "Hygiene & Quality",
    severity: "critical" as const,
    minutesAgo: 1_140,
    metric: "260 kg",
  },
  {
    id: "a-8",
    title: "Homogenizer HG-01 finished a batch but kept running",
    detail:
      "The unit idled for 48 minutes after its batch completed, consuming an estimated 21 kWh.",
    module: "Energy & Machines",
    severity: "warning" as const,
    minutesAgo: 1_620,
    metric: "21 kWh",
  },
];

const RECOMMENDATIONS = [
  {
    id: "r-1",
    title: "Move chiller CH-02 cleaning into the off-peak window",
    problem:
      "CH-02 consumed 3.4 kW above its baseline for 41 minutes during the 14:00–18:00 peak tariff block.",
    action:
      "Shift the condenser cleaning cycle to 22:00–23:00 and re-test the load curve for three days.",
    module: "Energy & Machines",
    priority: "high" as const,
    monthlySaving: 7_400,
    confidence: 92,
    effort: "Low effort · 1 shift",
    basis: "41 min above baseline, 18 working days",
  },
  {
    id: "r-2",
    title: "Auto-stop the homogenizer after batch completion",
    problem:
      "HG-01 idled for 48 minutes after its batch ended today, and 2.6 hours per day on average this week.",
    action:
      "Enable the idle auto-stop interlock and review the operator checklist for the evening shift.",
    module: "Energy & Machines",
    priority: "high" as const,
    monthlySaving: 4_150,
    confidence: 88,
    effort: "Low effort · control setting",
    basis: "2.6 idle h/day, 0.5 kW standby",
  },
  {
    id: "r-3",
    title: "Recover paneer whey losses on vat PV-02",
    problem:
      "Paneer yield is 2.4% below the 30-day benchmark, with the shortfall concentrated in the second wash step.",
    action:
      "Standardise the second wash to 82°C and log whey volume to verify a 38 kg/day recovery.",
    module: "Milk & Production",
    priority: "medium" as const,
    monthlySaving: 6_200,
    confidence: 79,
    effort: "Medium effort · SOP update",
    basis: "38 kg/day yield gap vs benchmark",
  },
  {
    id: "r-4",
    title: "Pre-cool intake milk before storage",
    problem:
      "Storage bay 3 needed 34 extra compressor minutes because evening intake arrived 2°C warmer than morning intake.",
    action:
      "Run the plate chiller for 20 minutes on evening tankers before routing milk to storage bay 3.",
    module: "Energy & Machines",
    priority: "medium" as const,
    monthlySaving: 3_800,
    confidence: 74,
    effort: "Low effort · scheduling",
    basis: "+2°C intake delta, 34 min compressor",
  },
];

function buildSeries(rangeDays: RangeDays) {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const series = Array.from({ length: MAX_DAYS }, (_, index) => {
    const date = new Date(end - (MAX_DAYS - 1 - index) * DAY_MS);
    const factor = weekdayFactor(date) + (noise(index + 11) - 0.5) * 0.04;
    const processed = Math.round(47_800 * factor);
    const received = Math.round(processed * (1.045 + (noise(index + 23) - 0.5) * 0.02));
    const energy = Math.round(processed * 0.0665 * (0.94 + noise(index + 31) * 0.13));
    const waste = Math.round(processed * 0.0126 * (0.85 + noise(index + 47) * 0.4) + 42);

    return {
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
      received,
      processed,
      target: 46_000,
      energy,
      waste,
      energyPerLitre: round(energy / processed, 3),
    };
  });

  return series.slice(-rangeDays);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const overview = query({
  args: { days: v.union(v.literal(7), v.literal(30)) },
  handler: async (_ctx, { days }) => {
    const series = buildSeries(days);
    const processed = sum(series.map((day) => day.processed));
    const received = sum(series.map((day) => day.received));
    const energy = sum(series.map((day) => day.energy));
    const waste = sum(series.map((day) => day.waste));

    const scale = processed / (47_800 * days);
    const products = PRODUCTS.map((product) => {
      const quantity = Math.round(product.kilosPerDay * days * scale);
      return { ...product, quantity, unit: "kg" };
    });
    const productTotal = sum(products.map((product) => product.quantity));
    const productMix = products
      .map((product) => ({
        ...product,
        share: round((product.quantity / productTotal) * 100, 1),
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const energyPerLitre = round(energy / processed, 3);
    const pillars = [
      {
        id: "production",
        label: "Production efficiency",
        score: 91,
        target: 90,
        note: "Yield against intake",
      },
      {
        id: "energy",
        label: "Energy efficiency",
        score: 76,
        target: 80,
        note: `${energyPerLitre.toFixed(3)} kWh per litre`,
      },
      {
        id: "hygiene",
        label: "Hygiene compliance",
        score: 94,
        target: 95,
        note: "3 of 48 checks pending",
      },
      {
        id: "waste",
        label: "Waste control",
        score: 68,
        target: 75,
        note: "1.3% of intake lost",
      },
    ];
    const overallScore = Math.round(
      pillars.reduce((total, pillar, index) => {
        const weights = [0.3, 0.25, 0.2, 0.25];
        return total + pillar.score * weights[index];
      }, 0),
    );

    const kpis = [
      {
        id: "milk",
        label: "Milk processed",
        value: processed,
        unit: "L",
        delta: 4.2,
        deltaGood: true,
        caption: `${round(received / days).toLocaleString("en-IN")} L received per day`,
        spark: series.map((day) => day.processed),
      },
      {
        id: "products",
        label: "Products manufactured",
        value: productTotal,
        unit: "kg",
        delta: 2.8,
        deltaGood: true,
        caption: `${productMix.length} product lines running`,
        spark: series.map((day) => Math.round(day.processed * 0.851)),
      },
      {
        id: "energy",
        label: "Energy consumed",
        value: energy,
        unit: "kWh",
        delta: -3.1,
        deltaGood: true,
        caption: `${energyPerLitre.toFixed(3)} kWh per litre processed`,
        spark: series.map((day) => day.energy),
      },
      {
        id: "waste",
        label: "Waste generated",
        value: waste,
        unit: "kg",
        delta: -6.4,
        deltaGood: true,
        caption: `${round((waste / processed) * 100, 2)}% of intake volume`,
        spark: series.map((day) => day.waste),
      },
    ];

    return {
      dataSource: "simulated" as const,
      disclaimer:
        "Demo dataset for the hackathon build. Figures are simulated plant records, not live sensor readings.",
      generatedAt: Date.now(),
      rangeDays: days,
      plant: {
        name: "Sahyadri Dairy Works",
        location: "Pune, Maharashtra",
        capacityLitresPerDay: CAPACITY_LITRES,
        utilisation: round((processed / days / CAPACITY_LITRES) * 100, 1),
        shift: "Shift A · 06:00–14:00",
      },
      kpis,
      performance: {
        overallScore,
        grade:
          overallScore >= 85 ? "Excellent" : overallScore >= 75 ? "Good" : "Needs attention",
        pillars,
        benchmarks: {
          energyPerLitre,
          coldStorageCelsius: 3.4,
          coldStorageRange: [2, 4] as [number, number],
          rejectionRate: 0.8,
          hygieneChecksLogged: 45,
          hygieneChecksPlanned: 48,
        },
      },
      production: series.map((day) => ({
        date: day.date,
        label: day.label,
        received: day.received,
        processed: day.processed,
        target: day.target,
      })),
      energyWaste: series.map((day) => ({
        date: day.date,
        label: day.label,
        energy: day.energy,
        waste: day.waste,
        energyPerLitre: day.energyPerLitre,
      })),
      productMix,
      alerts: ALERTS,
      alertSummary: {
        total: ALERTS.length,
        critical: ALERTS.filter((alert) => alert.severity === "critical").length,
        warning: ALERTS.filter((alert) => alert.severity === "warning").length,
      },
      recommendations: RECOMMENDATIONS,
      savingsPotential: sum(RECOMMENDATIONS.map((item) => item.monthlySaving)),
    };
  },
});
