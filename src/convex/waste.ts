import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/**
 * Waste Tracking & Management.
 *
 * Configuration and records are stored per plant account in the shared Convex
 * database. New plants are seeded with clearly labelled SIMULATED records so
 * every dashboard, chart and alert can be explored without IoT hardware.
 * Manual records and the ingestion mutation stay labelled MANUAL / IOT.
 */

type WasteCategory =
  | "Milk waste"
  | "Wastewater"
  | "Packaging waste"
  | "Rejected product"
  | "Filtration residue"
  | "Chemical waste";

const DAY = 86_400_000;
const LITRES_PER_DAY = 47_800;
const DEFAULT_CATEGORIES: WasteCategory[] = [
  "Milk waste",
  "Wastewater",
  "Packaging waste",
  "Rejected product",
  "Filtration residue",
  "Chemical waste",
];
const DEFAULT_STAGES = [
  "Raw milk reception",
  "Milk sampling & testing",
  "Chilling & storage",
  "Filtration",
  "Standardization",
  "Pasteurization",
  "Homogenization",
  "Packaging",
  "Cold storage",
  "Cleaning & CIP",
  "Wastewater treatment",
];
const DEMO_BATCHES = [
  { id: "B-2405", product: "Toned milk 500 ml", inputLitres: 52_000, outputKg: 49_800, recoverableKg: 860, inventoryChangeKg: 120 },
  { id: "B-2404", product: "Full cream 1 L", inputLitres: 38_500, outputKg: 36_600, recoverableKg: 710, inventoryChangeKg: -90 },
  { id: "B-2403", product: "Curd 400 g", inputLitres: 18_400, outputKg: 17_250, recoverableKg: 320, inventoryChangeKg: 40 },
  { id: "B-2402", product: "Paneer", inputLitres: 22_800, outputKg: 4_900, recoverableKg: 18_050, inventoryChangeKg: 30 },
  { id: "B-2401", product: "Buttermilk 200 ml", inputLitres: 14_600, outputKg: 13_920, recoverableKg: 260, inventoryChangeKg: -20 },
  { id: "B-2400", product: "Toned milk 200 ml", inputLitres: 31_200, outputKg: 29_780, recoverableKg: 520, inventoryChangeKg: 60 },
  { id: "B-2399", product: "Cheese", inputLitres: 16_900, outputKg: 1_850, recoverableKg: 14_650, inventoryChangeKg: 20 },
  { id: "B-2398", product: "Full cream 500 ml", inputLitres: 41_700, outputKg: 39_950, recoverableKg: 740, inventoryChangeKg: 80 },
];

const configFields = {
  categories: v.array(v.string()),
  collectionPoints: v.array(v.string()),
  stages: v.array(v.string()),
  units: v.array(v.string()),
  thresholds: v.object({
    milkLitres: v.number(),
    wastewaterLitres: v.number(),
    packagingKg: v.number(),
    rejectedKg: v.number(),
  }),
  reductionTargetPct: v.number(),
  segregation: v.array(v.string()),
  recoveryMethods: v.array(v.string()),
  disposalMethods: v.array(v.string()),
  responsible: v.array(v.string()),
  collectionSchedule: v.string(),
  storageLocations: v.array(
    v.object({
      name: v.string(),
      capacity: v.number(),
      unit: v.string(),
    }),
  ),
  notificationEmail: v.optional(v.string()),
  costs: v.object({
    milkPerLitre: v.number(),
    packagingPerKg: v.number(),
    disposalPerKg: v.number(),
    wastewaterPerLitre: v.number(),
  }),
};

type ConfigShape = {
  categories: string[];
  stages: string[];
  thresholds: {
    milkLitres: number;
    wastewaterLitres: number;
    packagingKg: number;
    rejectedKg: number;
  };
  responsible: string[];
  storageLocations: Array<{ name: string; capacity: number; unit: string }>;
  disposalMethods: string[];
  recoveryMethods: string[];
  costs: {
    milkPerLitre: number;
    packagingPerKg: number;
    disposalPerKg: number;
    wastewaterPerLitre: number;
  };
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function monthLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kgEquivalent(category: string, quantity: number): number {
  if (category === "Wastewater") return 0;
  return quantity;
}

function slotForStorage(config: ConfigShape, category: string): string {
  const locations = config.storageLocations;
  const find = (needle: string) =>
    locations.find((location) => location.name.toLowerCase().includes(needle))?.name;
  if (category === "Milk waste") return find("milk") ?? locations[0]?.name ?? "Milk waste sump";
  if (category === "Wastewater") return find("water") ?? locations[1]?.name ?? "Wastewater buffer";
  if (category === "Chemical waste") return find("chemical") ?? locations[2]?.name ?? "Chemical store";
  return find("dry") ?? find("solid") ?? locations[2]?.name ?? "Dry waste bay";
}

function serializeRecord(record: Doc<"wasteRecords">) {
  return {
    id: record._id,
    category: record.category,
    quantity: record.quantity,
    unit: record.unit,
    source: record.source,
    stage: record.stage,
    machineCode: record.machineCode ?? null,
    batchId: record.batchId ?? null,
    employee: record.employee,
    recordedAt: record.recordedAt,
    reason: record.reason,
    disposalStatus: record.disposalStatus,
    recoveryMethod: record.recoveryMethod,
    storageLocation: record.storageLocation,
    verificationStatus: record.verificationStatus,
    notes: record.notes ?? null,
    evidenceName: record.evidenceName ?? null,
    cleaningCycleId: record.cleaningCycleId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
type SerializedRecord = ReturnType<typeof serializeRecord>;

type WasteAlertDraft = {
  key: string;
  category: string;
  stage: string;
  machineCode: string | null;
  batchId: string | null;
  issueType: string;
  title: string;
  evidence: string;
  expected: string;
  detectedAt: number;
  severity: "critical" | "high" | "medium" | "low";
  responsible: string;
  recommendation: string;
};

type AlertState = Doc<"wasteAlertStates">;

function applyAlertStates(alerts: WasteAlertDraft[], states: Map<string, AlertState>) {
  return alerts.map((alert) => {
    const state = states.get(alert.key);
    return {
      ...alert,
      status: (state?.status ?? "active") as "active" | "acknowledged" | "resolved",
      statusUpdatedAt: state?.updatedAt ?? null,
    };
  });
}

function severityRank(severity: WasteAlertDraft["severity"]): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

function sortWasteAlerts<T extends { severity: WasteAlertDraft["severity"]; status: string; detectedAt: number }>(alerts: T[]) {
  return [...alerts].sort((a, b) => {
    const resolved = (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0);
    if (resolved !== 0) return resolved;
    return severityRank(a.severity) - severityRank(b.severity) || b.detectedAt - a.detectedAt;
  });
}

function buildAlerts(
  config: ConfigShape,
  records: SerializedRecord[],
  batches: Array<{ id: string; product: string; gapPct: number; gapKg: number }>,
  now: number,
): WasteAlertDraft[] {
  const alerts: WasteAlertDraft[] = [];
  const today = dayKey(now);
  const todayRecords = records.filter((record) => dayKey(record.recordedAt) === today);
  const recentRecords = records.filter((record) => record.recordedAt >= now - 8 * DAY);
  const pending = records.filter(
    (record) =>
      record.disposalStatus === "Pending disposal" && record.recordedAt < now - 3 * DAY,
  );

  const categoryToday = (category: string) =>
    todayRecords
      .filter((record) => record.category === category)
      .reduce((total, record) => total + record.quantity, 0);

  const checks: Array<{
    category: WasteCategory;
    quantity: number;
    threshold: number;
    unit: string;
    stage: string;
    responsible: string;
    recommendation: string;
  }> = [
    {
      category: "Milk waste",
      quantity: categoryToday("Milk waste"),
      threshold: config.thresholds.milkLitres,
      unit: "L",
      stage: "Reception & processing",
      responsible: config.responsible[0] ?? "Plant manager",
      recommendation:
        "Trace the loss to a stage and batch, inspect transfer joints and verify the measuring method before changing the process.",
    },
    {
      category: "Wastewater",
      quantity: categoryToday("Wastewater"),
      threshold: config.thresholds.wastewaterLitres,
      unit: "L",
      stage: "Cleaning & CIP",
      responsible: config.responsible[1] ?? "Sanitation supervisor",
      recommendation:
        "Compare the volume with the CIP cycle duration and flow-meter total, then check for leaks, open valves or over-rinsing.",
    },
    {
      category: "Packaging waste",
      quantity: categoryToday("Packaging waste"),
      threshold: config.thresholds.packagingKg,
      unit: "kg",
      stage: "Packaging",
      responsible: config.responsible[2] ?? "Packaging supervisor",
      recommendation:
        "Review seal and fill settings, film tension and machine rejects for the affected batch.",
    },
    {
      category: "Rejected product",
      quantity: categoryToday("Rejected product"),
      threshold: config.thresholds.rejectedKg,
      unit: "kg",
      stage: "Quality & cold storage",
      responsible: config.responsible[3] ?? "QA manager",
      recommendation:
        "Review the rejection reason and batch disposition, then verify cold-chain and packaging parameters before returning the line to production.",
    },
  ];

  for (const check of checks) {
    if (check.quantity > check.threshold) {
      alerts.push({
        key: `waste:${check.category}:${today}`,
        category: check.category,
        stage: check.stage,
        machineCode: null,
        batchId: null,
        issueType: "threshold_exceeded",
        title: `${check.category} above today's threshold`,
        evidence: `${round(check.quantity)} ${check.unit} recorded today.`,
        expected: `Configured threshold ${check.threshold} ${check.unit}/day.`,
        detectedAt: now - 18 * 60_000,
        severity: check.quantity > check.threshold * 1.5 ? "critical" : "high",
        responsible: check.responsible,
        recommendation: check.recommendation,
      });
    }
  }

  const missingCategories: Array<{ category: WasteCategory; unit: string; responsible: string }> = [
    { category: "Milk waste", unit: "L", responsible: config.responsible[0] ?? "Plant manager" },
    { category: "Wastewater", unit: "L", responsible: config.responsible[1] ?? "Sanitation supervisor" },
    { category: "Packaging waste", unit: "kg", responsible: config.responsible[2] ?? "Packaging supervisor" },
  ];
  for (const missing of missingCategories) {
    if (config.categories.includes(missing.category) && categoryToday(missing.category) === 0) {
      alerts.push({
        key: `waste:missing:${missing.category}:${today}`,
        category: missing.category,
        stage: "Plant",
        machineCode: null,
        batchId: null,
        issueType: "missing_record",
        title: `${missing.category} record missing today`,
        evidence: `No ${missing.category.toLowerCase()} record has been entered for ${today}.`,
        expected: "At least one validated record per operating day.",
        detectedAt: now - 33 * 60_000,
        severity: "medium",
        responsible: missing.responsible,
        recommendation:
          "Do not treat the missing value as zero waste. Record the manual reading or verify the connected meter before closing the shift.",
      });
    }
  }

  for (const location of config.storageLocations) {
    const inLocation = records
      .filter(
        (record) =>
          record.storageLocation === location.name &&
          record.disposalStatus === "Pending disposal",
      )
      .reduce((total, record) => total + kgEquivalent(record.category, record.quantity), 0);
    if (location.capacity > 0 && inLocation / location.capacity > 0.8) {
      alerts.push({
        key: `waste:storage:${location.name}`,
        category: "Waste segregation",
        stage: "Waste storage",
        machineCode: null,
        batchId: null,
        issueType: "storage_capacity",
        title: `${location.name} nearing capacity`,
        evidence: `${round(inLocation)} ${location.unit} pending against ${location.capacity} ${location.unit} capacity.`,
        expected: "Below 80% of configured storage capacity.",
        detectedAt: now - 64 * 60_000,
        severity: inLocation > location.capacity ? "critical" : "high",
        responsible: config.responsible[0] ?? "Plant manager",
        recommendation:
          "Schedule collection, confirm the disposal manifest and move compatible waste to a free location.",
      });
    }
  }

  if (pending.length > 0) {
    const oldest = pending[pending.length - 1];
    const categories = [...new Set(pending.map((record) => record.category))].join(", ");
    alerts.push({
      key: `waste:collection:${dayKey(oldest.recordedAt)}`,
      category: categories,
      stage: "Collection & disposal",
      machineCode: null,
      batchId: null,
      issueType: "collection_overdue",
      title: "Waste collection overdue",
      evidence: `${pending.length} records older than three days are still awaiting disposal (${round(
        pending.reduce((total, record) => total + kgEquivalent(record.category, record.quantity), 0),
      )} kg-equivalent).`,
      expected: config.collectionSchedule || "Scheduled collection completed and confirmed.",
      detectedAt: now - 2 * 3_600_000,
      severity: "high",
      responsible: config.responsible[0] ?? "Plant manager",
      recommendation:
        "Confirm the collection schedule, update the disposal record with the manifest and assign an accountable employee.",
    });
  }

  const totalToday = todayRecords.reduce(
    (total, record) => total + kgEquivalent(record.category, record.quantity),
    0,
  );
  const priorDays = [...new Set(recentRecords.map((record) => dayKey(record.recordedAt)))]
    .filter((key) => key !== today)
    .slice(0, 7);
  const baseline =
    priorDays.length > 0
      ? priorDays.reduce(
          (sum, key) =>
            sum +
            recentRecords
              .filter((record) => dayKey(record.recordedAt) === key)
              .reduce((total, record) => total + kgEquivalent(record.category, record.quantity), 0),
          0,
        ) / priorDays.length
      : 0;
  if (baseline > 0 && totalToday > baseline * 1.25) {
    alerts.push({
      key: `waste:anomaly:${today}`,
      category: "All waste",
      stage: "Plant",
      machineCode: null,
      batchId: null,
      issueType: "abnormal_increase",
      title: "Abnormal waste increase detected",
      evidence: `${round(totalToday)} kg-equivalent today versus a ${round(baseline)} kg-equivalent 7-day baseline.`,
      expected: "Within 25% of the recent daily baseline.",
      detectedAt: now - 41 * 60_000,
      severity: totalToday > baseline * 1.6 ? "critical" : "high",
      responsible: config.responsible[0] ?? "Plant manager",
      recommendation:
        "Review the stage and machine breakdown for the latest shift, verify unusual records and inspect the affected process before the next batch.",
    });
  }

  for (const batch of batches) {
    if (Math.abs(batch.gapPct) > 2) {
      alerts.push({
        key: `waste:reconciliation:${batch.id}`,
        category: "Mass balance",
        stage: "Batch reconciliation",
        machineCode: null,
        batchId: batch.id,
        issueType: "reconciliation_gap",
        title: `Batch ${batch.id} mass-balance gap`,
        evidence: `${batch.product}: ${round(batch.gapKg)} kg unexplained difference after recorded losses and recoverable material.`,
        expected: "Within ±2% measurement tolerance.",
        detectedAt: now - 97 * 60_000,
        severity: Math.abs(batch.gapPct) > 5 ? "high" : "medium",
        responsible: "Plant manager / QA",
        recommendation:
          "Do not automatically book the difference as waste. Investigate measurement uncertainty, inventory change and unrecorded recovery, then review with QA.",
      });
    }
  }

  return alerts;
}

function buildBatches(records: SerializedRecord[]) {
  return DEMO_BATCHES.map((batch) => {
    const batchRecords = records.filter((record) => record.batchId === batch.id);
    const recordedWasteKg = batchRecords.reduce(
      (total, record) => total + kgEquivalent(record.category, record.quantity),
      0,
    );
    const gapKg = round(
      batch.inputLitres -
        batch.outputKg -
        batch.recoverableKg -
        recordedWasteKg -
        batch.inventoryChangeKg,
      1,
    );
    const gapPct = round((gapKg / batch.inputLitres) * 100, 2);
    return {
      ...batch,
      recordedWasteKg: round(recordedWasteKg, 1),
      gapKg,
      gapPct,
      recordCount: batchRecords.length,
      status:
        Math.abs(gapPct) > 5
          ? "investigate"
          : Math.abs(gapPct) > 2
            ? "review"
            : "balanced",
    };
  });
}

function buildInsights(
  config: ConfigShape,
  records: SerializedRecord[],
  batches: ReturnType<typeof buildBatches>,
  now: number,
) {
  const period = records.filter((record) => record.recordedAt >= now - 7 * DAY);
  const byCategory = new Map<string, number>();
  const byMachine = new Map<string, number>();
  const byStage = new Map<string, number>();
  for (const record of period) {
    const kg = kgEquivalent(record.category, record.quantity);
    byCategory.set(record.category, (byCategory.get(record.category) ?? 0) + kg);
    byStage.set(record.stage, (byStage.get(record.stage) ?? 0) + kg);
    if (record.machineCode) {
      byMachine.set(record.machineCode, (byMachine.get(record.machineCode) ?? 0) + kg);
    }
  }

  const today = dayKey(now);
  const todayByCategory = new Map<string, number>();
  for (const record of records.filter((record) => dayKey(record.recordedAt) === today)) {
    todayByCategory.set(
      record.category,
      (todayByCategory.get(record.category) ?? 0) + kgEquivalent(record.category, record.quantity),
    );
  }

  const insights = [];
  const costForCategory = (category: string, quantity: number) => {
    if (category === "Milk waste") return quantity * config.costs.milkPerLitre;
    if (category === "Wastewater") return quantity * config.costs.wastewaterPerLitre;
    if (category === "Packaging waste") return quantity * config.costs.packagingPerKg;
    return quantity * config.costs.milkPerLitre * 0.6;
  };

  for (const category of ["Milk waste", "Packaging waste", "Rejected product"] as const) {
    const average =
      [...byCategory.entries()].find(([name]) => name === category)?.[1] ?? 0;
    const dailyAverage = average / 7;
    const current = todayByCategory.get(category) ?? 0;
    if (dailyAverage > 0 && current > dailyAverage * 1.12) {
      insights.push({
        id: `${category}:spike`,
        category,
        title:
          category === "Milk waste"
            ? "Milk losses are above the recent baseline"
            : category === "Packaging waste"
              ? "Packaging rejects have increased"
              : "Rejected product volume is elevated",
        observation: `Today recorded ${round(current)} against a ${round(dailyAverage)} daily average for the last seven days.`,
        possibleCauses:
          category === "Milk waste"
            ? ["Pipeline or valve leakage", "Incomplete transfer", "Measurement or recording error"]
            : category === "Packaging waste"
              ? ["Seal or fill drift", "Film tension or material batch", "Machine handling fault"]
              : ["Cold-chain deviation", "Packaging damage", "Quality inspection change"],
        action:
          "Verify the reading first, inspect the affected machine and batch, then record the corrective action before the next production run.",
        confidence: 82,
        estimatedMonthlyCost: Math.round(
          costForCategory(category, Math.max(0, current - dailyAverage)) * 30,
        ),
        evidence: `${round(current)} today vs ${round(dailyAverage)} baseline`,
        severity: current > dailyAverage * 1.4 ? "high" : "medium",
      });
    }
  }

  const topMachine = [...byMachine.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topMachine) {
    insights.push({
      id: `machine:${topMachine[0]}`,
      category: "Machine hotspot",
      title: `Recurring waste at ${topMachine[0]}`,
      observation: `${topMachine[0]} accounts for ${round(topMachine[1])} kg-equivalent of recorded waste this week.`,
      possibleCauses: [
        "Machine setup or wear",
        "Operator method on a specific shift",
        "A batch-specific material problem",
      ],
      action:
        "Compare waste across shifts and inspect the machine together with its energy trend in Energy & Machines.",
      confidence: 78,
      estimatedMonthlyCost: Math.round(topMachine[1] * config.costs.disposalPerKg * 4),
      evidence: `Top recorded machine this week`,
      severity: "medium",
    });
  }

  const topStage = [...byStage.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topStage) {
    insights.push({
      id: `stage:${topStage[0]}`,
      category: "Stage hotspot",
      title: `${topStage[0]} is the highest-loss stage`,
      observation: `${round(topStage[1])} kg-equivalent was recorded here in the last seven days.`,
      possibleCauses: [
        "Process settings or changeover practice",
        "Cleaning and product changeover overlap",
        "Recording practice differs by shift",
      ],
      action:
        "Review the stage with the shift supervisor and verify a sample of records against the physical waste log.",
      confidence: 74,
      estimatedMonthlyCost: Math.round(topStage[1] * config.costs.disposalPerKg * 4),
      evidence: `Highest-loss stage in the period`,
      severity: "low",
    });
  }

  const worstBatch = [...batches].sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct))[0];
  if (worstBatch && Math.abs(worstBatch.gapPct) > 2) {
    insights.push({
      id: `batch:${worstBatch.id}`,
      category: "Mass balance",
      title: `Batch ${worstBatch.id} needs reconciliation review`,
      observation: `${round(worstBatch.gapKg)} kg difference remains after output, recoverable material and recorded waste.`,
      possibleCauses: [
        "Measurement uncertainty on intake or output",
        "Unrecorded recoverable cream or product",
        "Inventory movement not captured in the batch record",
      ],
      action:
        "Flag for authorized review. Do not classify the gap as waste until measurement and recovery records are checked.",
      confidence: 69,
      estimatedMonthlyCost: Math.round(Math.abs(worstBatch.gapKg) * config.costs.milkPerLitre),
      evidence: `${worstBatch.gapPct}% of input`,
      severity: "low",
    });
  }

  return insights.slice(0, 5);
}

async function writeAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  entity: string,
  detail: string,
) {
  await ctx.db.insert("wasteAuditLogs", {
    userId,
    action,
    entity,
    detail,
    createdAt: Date.now(),
  });
}

function validateConfig(input: ConfigShape) {
  if (input.categories.length === 0) throw new ConvexError("Select at least one waste category.");
  if (input.stages.length === 0) throw new ConvexError("Select at least one processing stage.");
  if (input.responsible.length === 0) throw new ConvexError("Assign at least one responsible employee.");
  if (input.storageLocations.length === 0) throw new ConvexError("Add a waste storage location.");
  for (const value of Object.values(input.thresholds)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new ConvexError("Configured waste thresholds must be greater than zero.");
    }
  }
  for (const location of input.storageLocations) {
    if (!location.name.trim() || !Number.isFinite(location.capacity) || location.capacity <= 0) {
      throw new ConvexError("Every storage location needs a valid name and capacity.");
    }
  }
}

async function generateDemoRecords(
  ctx: MutationCtx,
  userId: Id<"users">,
  config: ConfigShape,
  days = 30,
) {
  const now = Date.now();
  const reasons: Record<string, string[]> = {
    "Milk waste": ["Transfer line flush loss", "Rejected intake sample", "Filler start-up loss", "Tank heel loss"],
    Wastewater: ["CIP final rinse", "Equipment washdown", "Floor cleaning", "Tank cleaning"],
    "Packaging waste": ["Seal failure", "Film misalignment", "Damaged pouch", "Label reject"],
    "Rejected product": ["Quality inspection rejection", "Cold-chain deviation", "Damaged carton", "Expired stock"],
    "Filtration residue": ["Filter change residue", "Clarifier sludge", "Settling tank residue"],
    "Chemical waste": ["Spent caustic solution", "Cleaning chemical residue", "Empty chemical container rinse"],
  };
  const stages: Record<string, string> = {
    "Milk waste": "Pasteurization",
    Wastewater: "Cleaning & CIP",
    "Packaging waste": "Packaging",
    "Rejected product": "Cold storage",
    "Filtration residue": "Filtration",
    "Chemical waste": "Cleaning & CIP",
  };
  const machines: Record<string, string> = {
    "Milk waste": "PM-01",
    Wastewater: "CIP-01",
    "Packaging waste": "PK-POUCH-01",
    "Rejected product": "CS-01",
    "Filtration residue": "FL-01",
    "Chemical waste": "CIP-01",
  };
  const method: Record<string, string> = {
    "Milk waste": "Recovered for biogas",
    Wastewater: "Treated on site",
    "Packaging waste": "Recycled",
    "Rejected product": "Composted",
    "Filtration residue": "Composted",
    "Chemical waste": "Authorized chemical disposal",
  };

  let inserted = 0;
  for (let day = 0; day < days; day += 1) {
    const timestamp = now - day * DAY;
    const batch = DEMO_BATCHES[day % DEMO_BATCHES.length];
    const spike = noise(seed(day) + 11) > 0.83 ? 1.55 : 1;
    const baseHour = 9 + (day % 8);

    for (const category of config.categories) {
      if (category === "Filtration residue" && day % 2 !== 0) continue;
      if (category === "Chemical waste" && day % 4 !== 0) continue;
      if (!(category in reasons)) continue;

      let quantity: number;
      let unit: string;
      if (category === "Milk waste") {
        quantity = round((22 + noise(seed(day) + 3) * 34) * spike, 1);
        unit = "L";
      } else if (category === "Wastewater") {
        quantity = round((820 + noise(seed(day) + 7) * 760) * spike, 0);
        unit = "L";
      } else if (category === "Packaging waste") {
        quantity = round((7 + noise(seed(day) + 13) * 18) * spike, 1);
        unit = "kg";
      } else if (category === "Rejected product") {
        quantity = round((6 + noise(seed(day) + 19) * 30) * spike, 1);
        unit = "kg";
      } else if (category === "Filtration residue") {
        quantity = round(3 + noise(seed(day) + 23) * 9, 1);
        unit = "kg";
      } else {
        quantity = round(5 + noise(seed(day) + 29) * 13, 1);
        unit = "L";
      }

      const old = day > 2;
      const disposalStatus =
        category === "Wastewater" ? "Treated" : old ? (category === "Packaging waste" ? "Recycled" : "Disposed") : "Pending disposal";
      const recordedAt = timestamp - (23 - baseHour) * 3_600_000 + day * 60_000;
      await ctx.db.insert("wasteRecords", {
        userId,
        category,
        quantity,
        unit,
        source: "simulated",
        stage: stages[category] ?? config.stages[0] ?? "Processing",
        machineCode: machines[category],
        batchId: category === "Chemical waste" || category === "Filtration residue" ? undefined : batch.id,
        employee: config.responsible[day % config.responsible.length] ?? "Plant operator",
        recordedAt,
        reason: reasons[category][day % reasons[category].length],
        disposalStatus,
        recoveryMethod: method[category] ?? "Disposed",
        storageLocation: slotForStorage(config, category),
        verificationStatus: old ? "QA reviewed" : "Pending review",
        notes: day === 0 ? "SIMULATED demonstration record." : undefined,
        cleaningCycleId: category === "Wastewater" ? `CIP-${1_840 - day}` : undefined,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }
  }
  return inserted;
}

function seed(value: number): number {
  return value * 12.9898 + 4.1414;
}

export const config = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("wasteConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const configure = mutation({
  args: {
    ...configFields,
    seedDemo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to configure waste management.");
    const input: ConfigShape = {
      categories: args.categories,
      stages: args.stages,
      thresholds: args.thresholds,
      responsible: args.responsible,
      storageLocations: args.storageLocations,
      disposalMethods: args.disposalMethods,
      recoveryMethods: args.recoveryMethods,
      costs: args.costs,
    };
    validateConfig(input);

    const existingConfig = await ctx.db
      .query("wasteConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const existingRecords = await ctx.db
      .query("wasteRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1);

    const payload = {
      userId,
      categories: args.categories,
      collectionPoints: args.collectionPoints,
      stages: args.stages,
      units: args.units,
      thresholds: args.thresholds,
      reductionTargetPct: args.reductionTargetPct,
      segregation: args.segregation,
      recoveryMethods: args.recoveryMethods,
      disposalMethods: args.disposalMethods,
      responsible: args.responsible,
      collectionSchedule: args.collectionSchedule,
      storageLocations: args.storageLocations,
      notificationEmail: args.notificationEmail?.trim() || undefined,
      costs: args.costs,
      completedAt: existingConfig?.completedAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, payload);
    } else {
      await ctx.db.insert("wasteConfigs", payload);
    }

    const shouldSeed = args.seedDemo === true || existingRecords.length === 0;
    const seeded = shouldSeed ? await generateDemoRecords(ctx, userId, input) : 0;
    await writeAudit(
      ctx,
      userId,
      existingConfig ? "config.updated" : "config.created",
      "wasteConfig",
      `${args.categories.length} categories, ${args.stages.length} stages, ${args.storageLocations.length} storage locations.`,
    );
    if (seeded > 0) {
      await writeAudit(ctx, userId, "demo.generated", "wasteRecords", `${seeded} simulated records.`);
    }
    return { configured: true, seeded };
  },
});

export const dashboard = query({
  args: {
    now: v.number(),
    days: v.union(v.literal(7), v.literal(30), v.literal(90)),
  },
  handler: async (ctx, { now, days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view waste analytics.");
    const configDoc = await ctx.db
      .query("wasteConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!configDoc) return null;

    const allRecords = await ctx.db
      .query("wasteRecords")
      .withIndex("by_user_recorded", (q) => q.eq("userId", userId))
      .order("desc")
      .take(800);
    const states = await ctx.db
      .query("wasteAlertStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const stateMap = new Map(states.map((state) => [state.alertKey, state]));
    const disposals = await ctx.db
      .query("wasteDisposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);
    const records = allRecords.map(serializeRecord);
    const since = now - days * DAY;
    const periodRecords = records.filter((record) => record.recordedAt >= since);
    const previousRecords = records.filter(
      (record) => record.recordedAt >= since - days * DAY && record.recordedAt < since,
    );
    const today = dayKey(now);
    const todayRecords = records.filter((record) => dayKey(record.recordedAt) === today);

    const sum = (list: SerializedRecord[], category?: string) =>
      list
        .filter((record) => !category || record.category === category)
        .reduce((total, record) => total + record.quantity, 0);
    const sumKg = (list: SerializedRecord[]) =>
      list.reduce((total, record) => total + kgEquivalent(record.category, record.quantity), 0);

    const categoryTotals = new Map<string, { quantity: number; unit: string; kg: number }>();
    for (const record of periodRecords) {
      const current = categoryTotals.get(record.category) ?? {
        quantity: 0,
        unit: record.unit,
        kg: 0,
      };
      current.quantity += record.quantity;
      current.kg += kgEquivalent(record.category, record.quantity);
      categoryTotals.set(record.category, current);
    }

    const byCategory = [...categoryTotals.entries()]
      .map(([category, value]) => ({
        category,
        quantity: round(value.quantity, 1),
        unit: value.unit,
        kgEquivalent: round(value.kg, 1),
        share: round((value.kg / Math.max(1, sumKg(periodRecords))) * 100, 1),
      }))
      .sort((a, b) => b.kgEquivalent - a.kgEquivalent);

    const stageMap = new Map<string, number>();
    const machineMap = new Map<string, number>();
    const batchMap = new Map<string, number>();
    for (const record of periodRecords) {
      stageMap.set(record.stage, (stageMap.get(record.stage) ?? 0) + kgEquivalent(record.category, record.quantity));
      if (record.machineCode) {
        machineMap.set(record.machineCode, (machineMap.get(record.machineCode) ?? 0) + kgEquivalent(record.category, record.quantity));
      }
      if (record.batchId) {
        batchMap.set(record.batchId, (batchMap.get(record.batchId) ?? 0) + kgEquivalent(record.category, record.quantity));
      }
    }
    const byStage = [...stageMap.entries()]
      .map(([stage, kg]) => ({ stage, kgEquivalent: round(kg, 1) }))
      .sort((a, b) => b.kgEquivalent - a.kgEquivalent);
    const byMachine = [...machineMap.entries()]
      .map(([machineCode, kg]) => ({ machineCode, kgEquivalent: round(kg, 1) }))
      .sort((a, b) => b.kgEquivalent - a.kgEquivalent);
    const byBatch = [...batchMap.entries()]
      .map(([batchId, kg]) => ({ batchId, kgEquivalent: round(kg, 1) }))
      .sort((a, b) => b.kgEquivalent - a.kgEquivalent);

    const dateSeries = new Map<string, {
      label: string;
      total: number;
      milk: number;
      wastewater: number;
      packaging: number;
      rejected: number;
    }>();
    for (let index = days - 1; index >= 0; index -= 1) {
      const timestamp = now - index * DAY;
      const key = dayKey(timestamp);
      const dayRecords = records.filter((record) => dayKey(record.recordedAt) === key);
      dateSeries.set(key, {
        label: dayLabel(timestamp),
        total: round(sumKg(dayRecords), 1),
        milk: round(sum(dayRecords, "Milk waste"), 1),
        wastewater: round(sum(dayRecords, "Wastewater"), 0),
        packaging: round(sum(dayRecords, "Packaging waste"), 1),
        rejected: round(sum(dayRecords, "Rejected product"), 1),
      });
    }
    const daily = [...dateSeries.values()];

    const weekly = Array.from({ length: 12 }, (_, index) => {
      const end = now - (11 - index) * 7 * DAY;
      const start = end - 7 * DAY;
      const total = records
        .filter((record) => record.recordedAt >= start && record.recordedAt <= end)
        .reduce((sum, record) => sum + kgEquivalent(record.category, record.quantity), 0);
      return { label: dayLabel(start), total: round(total, 1) };
    });
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const end = now - (5 - index) * 30 * DAY;
      const start = end - 30 * DAY;
      const total = records
        .filter((record) => record.recordedAt >= start && record.recordedAt <= end)
        .reduce((sum, record) => sum + kgEquivalent(record.category, record.quantity), 0);
      return { label: monthLabel(start), total: round(total, 1) };
    });

    const currentTotal = sumKg(periodRecords);
    const previousTotal = sumKg(previousRecords);
    const recycled = periodRecords
      .filter((record) => ["Recycled", "Recovered", "Disposed", "Treated"].includes(record.disposalStatus))
      .reduce((total, record) => total + kgEquivalent(record.category, record.quantity), 0);
    const pendingDisposal = periodRecords.filter(
      (record) => record.disposalStatus === "Pending disposal",
    );
    const batches = buildBatches(periodRecords);
    const alertDrafts = buildAlerts(
      configDoc,
      records.filter((record) => record.recordedAt >= now - 90 * DAY),
      batches,
      now,
    );
    const alerts = sortWasteAlerts(applyAlertStates(alertDrafts, stateMap));
    const activeAlerts = alerts.filter((alert) => alert.status !== "resolved");
    const insights = buildInsights(configDoc, periodRecords, batches, now);

    const lastSevenAverage =
      daily.slice(-7).reduce((total, day) => total + day.total, 0) / Math.max(1, daily.slice(-7).length);
    const forecast = Array.from({ length: 7 }, (_, index) => {
      const timestamp = now + (index + 1) * DAY;
      const factor = 1 + (noise(Math.floor(timestamp / DAY) + 301) - 0.5) * 0.12;
      return {
        label: dayLabel(timestamp),
        total: round(lastSevenAverage * factor, 1),
        cost: Math.round(lastSevenAverage * factor * configDoc.costs.disposalPerKg),
      };
    });
    const predictedWeek = round(forecast.reduce((total, day) => total + day.total, 0), 1);

    const milkCost = sum(periodRecords, "Milk waste") * configDoc.costs.milkPerLitre;
    const packagingCost = sum(periodRecords, "Packaging waste") * configDoc.costs.packagingPerKg;
    const wastewaterCost = sum(periodRecords, "Wastewater") * configDoc.costs.wastewaterPerLitre;
    const disposalCost =
      periodRecords
        .filter((record) => record.category !== "Wastewater")
        .reduce((total, record) => total + record.quantity, 0) * configDoc.costs.disposalPerKg;
    const estimatedCost = milkCost + packagingCost + wastewaterCost + disposalCost;
    const avoidableCost = insights.reduce((total, insight) => total + insight.estimatedMonthlyCost, 0);

    const cycleGroups = new Map<string, { cycleId: string; quantity: number; records: number; asset: string }>();
    for (const record of periodRecords) {
      if (!record.cleaningCycleId) continue;
      const entry = cycleGroups.get(record.cleaningCycleId) ?? {
        cycleId: record.cleaningCycleId,
        quantity: 0,
        records: 0,
        asset: record.machineCode ?? "CIP-01",
      };
      entry.quantity += record.quantity;
      entry.records += 1;
      cycleGroups.set(record.cleaningCycleId, entry);
    }

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      rangeDays: days,
      config: configDoc,
      records: records.slice(0, 500),
      periodRecords: periodRecords.length,
      disposals: disposals.map((disposal) => ({
        id: disposal._id,
        method: disposal.method,
        destination: disposal.destination,
        collectedAt: disposal.collectedAt,
        collectedBy: disposal.collectedBy,
        confirmed: disposal.confirmed,
        notes: disposal.notes ?? null,
        recordCount: disposal.recordIds.length,
      })),
      kpis: {
        totalToday: round(sumKg(todayRecords), 1),
        milkToday: round(sum(todayRecords, "Milk waste"), 1),
        wastewaterToday: round(sum(todayRecords, "Wastewater"), 0),
        packagingToday: round(sum(todayRecords, "Packaging waste"), 1),
        rejectedToday: round(sum(todayRecords, "Rejected product"), 1),
        recycled: round(recycled, 1),
        pendingDisposal: pendingDisposal.length,
        pendingDisposalKg: round(
          pendingDisposal.reduce(
            (total, record) => total + kgEquivalent(record.category, record.quantity),
            0,
          ),
          1,
        ),
        reductionPct:
          previousTotal > 0
            ? round(((currentTotal - previousTotal) / previousTotal) * 100, 1)
            : 0,
        wastePerLitre: round(currentTotal / Math.max(1, LITRES_PER_DAY * days), 4),
        activeAlerts: activeAlerts.length,
        litresProcessed: LITRES_PER_DAY * days,
      },
      totals: {
        currentKg: round(currentTotal, 1),
        previousKg: round(previousTotal, 1),
        byCategory,
        byStage,
        byMachine,
        byBatch,
        daily,
        weekly,
        monthly,
      },
      costs: {
        milk: Math.round(milkCost),
        packaging: Math.round(packagingCost),
        wastewater: Math.round(wastewaterCost),
        disposal: Math.round(disposalCost),
        total: Math.round(estimatedCost),
        perLitre: round(estimatedCost / Math.max(1, LITRES_PER_DAY * days), 3),
        avoidable: Math.round(avoidableCost),
        basis:
          "Estimated using configured material, treatment and disposal rates. Not an invoice or audited cost.",
      },
      alerts,
      alertSummary: {
        active: activeAlerts.length,
        critical: activeAlerts.filter((alert) => alert.severity === "critical").length,
        high: activeAlerts.filter((alert) => alert.severity === "high").length,
        resolved: alerts.filter((alert) => alert.status === "resolved").length,
      },
      insights,
      batches,
      forecast: {
        days: forecast,
        predictedWeekKg: predictedWeek,
        predictedWeekCost: Math.round(
          predictedWeek * configDoc.costs.disposalPerKg,
        ),
      },
      integration: {
        cleaningCycles: [...cycleGroups.values()]
          .sort((a, b) => b.records - a.records)
          .slice(0, 4),
        linkedMachineCodes: [...new Set(periodRecords.map((record) => record.machineCode).filter(Boolean))],
        hygienePath: "/dashboard/hygiene",
        energyPath: "/dashboard/energy",
      },
      model: {
        prediction: "7-day moving-average projection",
        anomaly: "Threshold and rolling-baseline comparison",
        note: "Transparent demo analytics. No trained ML model is connected; outputs are suggestions that require verification.",
      },
    };
  },
});

export const addRecord = mutation({
  args: {
    category: v.string(),
    quantity: v.number(),
    unit: v.string(),
    source: v.union(v.literal("manual"), v.literal("iot"), v.literal("simulated")),
    stage: v.string(),
    machineCode: v.optional(v.string()),
    batchId: v.optional(v.string()),
    employee: v.string(),
    recordedAt: v.optional(v.number()),
    reason: v.string(),
    disposalStatus: v.optional(v.string()),
    recoveryMethod: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    notes: v.optional(v.string()),
    evidenceName: v.optional(v.string()),
    cleaningCycleId: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to add waste records.");
    const configDoc = await ctx.db
      .query("wasteConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!configDoc) throw new ConvexError("Configure waste management first.");
    if (!configDoc.categories.includes(args.category)) {
      throw new ConvexError("Choose a configured waste category.");
    }
    if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
      throw new ConvexError("Waste quantity must be greater than zero.");
    }
    if (!args.unit.trim()) throw new ConvexError("Choose a measurement unit.");
    if (!args.stage.trim()) throw new ConvexError("Choose the processing stage.");
    if (args.reason.trim().length < 3) throw new ConvexError("Record a reason for the waste.");
    if (args.employee.trim().length < 2) throw new ConvexError("Record the responsible employee.");
    const now = Date.now();
    const recordedAt = args.recordedAt ?? now;
    if (recordedAt > now + 5 * 60_000 || recordedAt < now - 730 * DAY) {
      throw new ConvexError("Recorded time must be recent and not in the future.");
    }

    if (args.sourceRef) {
      const duplicate = await ctx.db
        .query("wasteRecords")
        .withIndex("by_user_source_ref", (q) =>
          q.eq("userId", userId).eq("sourceRef", args.sourceRef),
        )
        .first();
      if (duplicate) throw new ConvexError("That IoT reading has already been imported.");
    } else if (args.source === "manual") {
      const recent = await ctx.db
        .query("wasteRecords")
        .withIndex("by_user_recorded", (q) => q.eq("userId", userId))
        .order("desc")
        .take(30);
      const duplicate = recent.find(
        (record) =>
          record.category === args.category &&
          record.stage === args.stage &&
          Math.abs(record.quantity - args.quantity) < 0.001 &&
          (record.machineCode ?? "") === (args.machineCode ?? "") &&
          (record.batchId ?? "") === (args.batchId ?? "") &&
          Math.abs(record.recordedAt - recordedAt) < 15 * 60_000,
      );
      if (duplicate) {
        throw new ConvexError("A matching waste record already exists within 15 minutes.");
      }
    }

    const storageLocation =
      args.storageLocation || slotForStorage(configDoc, args.category);
    const recordId = await ctx.db.insert("wasteRecords", {
      userId,
      category: args.category,
      quantity: round(args.quantity, 2),
      unit: args.unit.trim(),
      source: args.source,
      stage: args.stage.trim(),
      machineCode: args.machineCode?.trim() || undefined,
      batchId: args.batchId?.trim() || undefined,
      employee: args.employee.trim(),
      recordedAt,
      reason: args.reason.trim(),
      disposalStatus: args.disposalStatus ?? "Pending disposal",
      recoveryMethod: args.recoveryMethod ?? "Not assigned",
      storageLocation,
      verificationStatus: "Pending review",
      notes: args.notes?.trim() || undefined,
      evidenceName: args.evidenceName?.trim() || undefined,
      cleaningCycleId: args.cleaningCycleId?.trim() || undefined,
      sourceRef: args.sourceRef?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(
      ctx,
      userId,
      "record.created",
      recordId,
      `${args.category} · ${args.quantity} ${args.unit} · ${args.source}`,
    );
    return recordId;
  },
});

export const updateRecord = mutation({
  args: {
    recordId: v.id("wasteRecords"),
    quantity: v.number(),
    reason: v.string(),
    disposalStatus: v.string(),
    recoveryMethod: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to edit waste records.");
    const record = await ctx.db.get(args.recordId);
    if (!record || record.userId !== userId) throw new ConvexError("Waste record not found.");
    if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
      throw new ConvexError("Waste quantity must be greater than zero.");
    }
    if (args.reason.trim().length < 3) throw new ConvexError("Record a reason for the change.");
    const previous = `${record.category} · ${record.quantity} ${record.unit} · ${record.disposalStatus}`;
    await ctx.db.patch(record._id, {
      quantity: round(args.quantity, 2),
      reason: args.reason.trim(),
      disposalStatus: args.disposalStatus,
      recoveryMethod: args.recoveryMethod,
      notes: args.notes?.trim() || undefined,
      verificationStatus: "Pending review",
      updatedAt: Date.now(),
    });
    await writeAudit(
      ctx,
      userId,
      "record.updated",
      record._id,
      `${previous} → ${record.category} · ${args.quantity} ${record.unit} · ${args.disposalStatus}`,
    );
    return record._id;
  },
});

export const addDisposal = mutation({
  args: {
    recordIds: v.array(v.id("wasteRecords")),
    method: v.string(),
    destination: v.string(),
    collectedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { recordIds, method, destination, collectedBy, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to confirm disposal.");
    if (recordIds.length === 0) throw new ConvexError("Select at least one waste record.");
    if (method.trim().length < 2) throw new ConvexError("Choose a disposal or recovery method.");
    if (destination.trim().length < 2) throw new ConvexError("Record the disposal destination.");
    const records = await Promise.all(recordIds.map((id) => ctx.db.get(id)));
    for (const record of records) {
      if (!record || record.userId !== userId) {
        throw new ConvexError("One of the selected records is not available.");
      }
    }
    const now = Date.now();
    for (const record of records) {
      if (record) {
        await ctx.db.patch(record._id, {
          disposalStatus: method.toLowerCase().includes("recycl") ? "Recycled" : "Disposed",
          recoveryMethod: method,
          updatedAt: now,
        });
      }
    }
    const disposalId = await ctx.db.insert("wasteDisposals", {
      userId,
      recordIds,
      method: method.trim(),
      destination: destination.trim(),
      collectedAt: now,
      collectedBy: collectedBy.trim() || "Plant manager",
      confirmed: true,
      notes: notes?.trim() || undefined,
      createdAt: now,
    });
    await writeAudit(
      ctx,
      userId,
      "disposal.confirmed",
      disposalId,
      `${recordIds.length} records · ${method} · ${destination}`,
    );
    return disposalId;
  },
});

export const setAlertState = mutation({
  args: {
    alertKey: v.string(),
    status: v.union(v.literal("active"), v.literal("acknowledged"), v.literal("resolved")),
  },
  handler: async (ctx, { alertKey, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to manage waste alerts.");
    const existing = await ctx.db
      .query("wasteAlertStates")
      .withIndex("by_user_alert", (q) => q.eq("userId", userId).eq("alertKey", alertKey))
      .unique();
    if (status === "active") {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("wasteAlertStates", {
      userId,
      alertKey,
      status,
      updatedAt: Date.now(),
    });
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to add demo records.");
    const configDoc = await ctx.db
      .query("wasteConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!configDoc) throw new ConvexError("Configure waste management first.");
    const count = await generateDemoRecords(ctx, userId, configDoc, 3);
    await writeAudit(ctx, userId, "demo.generated", "wasteRecords", `${count} simulated records.`);
    return { inserted: count };
  },
});
