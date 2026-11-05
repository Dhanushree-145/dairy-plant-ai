import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import {
  Cog,
  Database,
  Fan,
  Filter,
  Package,
  Snowflake,
  SprayCan,
  Thermometer,
  Warehouse,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type EnergyData = FunctionReturnType<typeof api.energy.dashboard>;
export type MachineSnapshot = EnergyData["machines"][number];
export type EnergyAlert = EnergyData["alerts"][number];
export type EnergyRecommendation = EnergyData["recommendations"][number];
export type MachineDetailData = NonNullable<FunctionReturnType<typeof api.energy.machine>>;
export type MachineRecord = FunctionReturnType<typeof api.machines.list>[number];
export type EnergyRange = "24h" | "7d" | "30d" | "90d" | "12m";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export type MachineCategory = {
  id: string;
  label: string;
  shortLabel: string;
  codePrefix: string;
  description: string;
  defaultStage: string;
  capacityUnit: string;
  defaultCapacity: number;
  defaultRatedKw: number;
  dutyFactor: number;
  icon: LucideIcon;
};

export const PROCESSING_STAGES = [
  "Reception",
  "Storage",
  "Processing",
  "Packaging",
  "Cold storage",
  "Cleaning",
  "Distribution",
] as const;

export const MACHINE_CATEGORIES: MachineCategory[] = [
  {
    id: "chilling",
    label: "Milk chilling & refrigeration",
    shortLabel: "Chilling system",
    codePrefix: "CH",
    description: "Bulk milk chillers, plate coolers and refrigeration racks.",
    defaultStage: "Reception",
    capacityUnit: "L/h",
    defaultCapacity: 5_000,
    defaultRatedKw: 22,
    dutyFactor: 0.82,
    icon: Snowflake,
  },
  {
    id: "storage",
    label: "Milk storage tanks",
    shortLabel: "Storage tank",
    codePrefix: "ST",
    description: "Insulated silos and agitated storage tanks with pump-over.",
    defaultStage: "Storage",
    capacityUnit: "L",
    defaultCapacity: 10_000,
    defaultRatedKw: 7.5,
    dutyFactor: 0.58,
    icon: Database,
  },
  {
    id: "filtration",
    label: "Filtration & clarification",
    shortLabel: "Filtration unit",
    codePrefix: "FL",
    description: "Milk filters, clarifiers and separators ahead of processing.",
    defaultStage: "Processing",
    capacityUnit: "L/h",
    defaultCapacity: 5_000,
    defaultRatedKw: 7.5,
    dutyFactor: 0.52,
    icon: Filter,
  },
  {
    id: "pasteurization",
    label: "Pasteurization machines",
    shortLabel: "Pasteurizer",
    codePrefix: "PM",
    description: "HTST pasteurizers with regeneration and holding tubes.",
    defaultStage: "Processing",
    capacityUnit: "L/h",
    defaultCapacity: 5_000,
    defaultRatedKw: 30,
    dutyFactor: 0.78,
    icon: Thermometer,
  },
  {
    id: "homogenization",
    label: "Homogenization machines",
    shortLabel: "Homogenizer",
    codePrefix: "HG",
    description: "High-pressure homogenizers for milk and fermented products.",
    defaultStage: "Processing",
    capacityUnit: "L/h",
    defaultCapacity: 5_000,
    defaultRatedKw: 18.5,
    dutyFactor: 0.55,
    icon: Waves,
  },
  {
    id: "pumps",
    label: "Pumps & motors",
    shortLabel: "Transfer pump",
    codePrefix: "PU",
    description: "Centrifugal, positive-displacement and CIP return pumps.",
    defaultStage: "Processing",
    capacityUnit: "L/min",
    defaultCapacity: 400,
    defaultRatedKw: 4,
    dutyFactor: 0.62,
    icon: Cog,
  },
  {
    id: "compressors",
    label: "Compressors",
    shortLabel: "Compressor",
    codePrefix: "CP",
    description: "Refrigeration compressors serving chillers and cold rooms.",
    defaultStage: "Processing",
    capacityUnit: "CFM",
    defaultCapacity: 250,
    defaultRatedKw: 45,
    dutyFactor: 0.86,
    icon: Fan,
  },
  {
    id: "packaging",
    label: "Packaging machines",
    shortLabel: "Packaging line",
    codePrefix: "PK",
    description: "Filling, sealing and cartoning lines for finished products.",
    defaultStage: "Packaging",
    capacityUnit: "packs/h",
    defaultCapacity: 6_000,
    defaultRatedKw: 12,
    dutyFactor: 0.6,
    icon: Package,
  },
  {
    id: "cold_storage",
    label: "Cold storage equipment",
    shortLabel: "Cold room",
    codePrefix: "CS",
    description: "Finished-product cold rooms, blast chillers and evaporators.",
    defaultStage: "Cold storage",
    capacityUnit: "m³",
    defaultCapacity: 120,
    defaultRatedKw: 26,
    dutyFactor: 0.88,
    icon: Warehouse,
  },
  {
    id: "cip",
    label: "CIP cleaning equipment",
    shortLabel: "CIP unit",
    codePrefix: "CIP",
    description: "Clean-in-place skids, caustic tanks and circulation heaters.",
    defaultStage: "Cleaning",
    capacityUnit: "L/batch",
    defaultCapacity: 1_500,
    defaultRatedKw: 15,
    dutyFactor: 0.24,
    icon: SprayCan,
  },
];

export const DEFAULT_CATEGORY_COUNTS: Record<string, number> = {
  chilling: 2,
  storage: 1,
  pasteurization: 1,
  homogenization: 1,
  pumps: 2,
  packaging: 1,
  cold_storage: 1,
};

export function categoryMeta(id: string): MachineCategory {
  return MACHINE_CATEGORIES.find((category) => category.id === id) ?? MACHINE_CATEGORIES[0];
}

export function stageOptions(categoryId: string): string[] {
  const category = categoryMeta(categoryId);
  const extras = PROCESSING_STAGES.filter((stage) => stage !== category.defaultStage);
  return [category.defaultStage, ...extras];
}

export type MachineDraft = {
  name: string;
  code: string;
  category: string;
  stage: string;
  capacityValue: number;
  capacityUnit: string;
  ratedKw: number;
  baselineKwhPerHour: number;
  specifications: string;
  installedAt: string;
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildDraft(categoryId: string, index: number): MachineDraft {
  const category = categoryMeta(categoryId);
  const number = String(index + 1).padStart(2, "0");
  return {
    name: `${category.shortLabel} ${index + 1}`,
    code: `${category.codePrefix}-${number}`,
    category: category.id,
    stage: category.defaultStage,
    capacityValue: category.defaultCapacity,
    capacityUnit: category.capacityUnit,
    ratedKw: category.defaultRatedKw,
    baselineKwhPerHour: Math.round(category.defaultRatedKw * category.dutyFactor * 10) / 10,
    specifications: "",
    installedAt: todayIso(),
  };
}

export function draftFromRecord(record: MachineRecord): MachineDraft {
  return {
    name: record.name,
    code: record.code,
    category: record.category,
    stage: record.stage,
    capacityValue: record.capacityValue,
    capacityUnit: record.capacityUnit,
    ratedKw: record.ratedKw,
    baselineKwhPerHour: record.baselineKwhPerHour,
    specifications: record.specifications ?? "",
    installedAt: record.installedAt,
  };
}

export const STATUS_META = {
  on: {
    label: "ON",
    description: "Operating",
    chip: "border-success/30 bg-success/10 text-success-ink",
    dot: "bg-success",
  },
  off: {
    label: "OFF",
    description: "Switched off",
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  unknown: {
    label: "FAULT / UNKNOWN",
    description: "Status unconfirmed",
    chip: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
} as const;

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    chip: "border-danger/25 bg-danger/10 text-danger",
    iconClass: "text-danger",
  },
  warning: {
    label: "Warning",
    chip: "border-warning/30 bg-warning/10 text-warning-ink",
    iconClass: "text-warning",
  },
  info: {
    label: "Info",
    chip: "border-primary/20 bg-primary/10 text-primary",
    iconClass: "text-primary",
  },
} as const;

export const ALERT_TYPE_LABELS: Record<string, string> = {
  status_unknown: "Status unconfirmed",
  excess_consumption: "Excess consumption",
  performance_decline: "Performance decline",
  idle_load: "Idle / low-load draw",
  refrigeration_anomaly: "Refrigeration anomaly",
  maintenance_due: "Maintenance due",
  unexpected_shutdown: "Unexpected shutdown",
};

export const ALERT_STATUS_META: Record<
  AlertStatus,
  { label: string; chip: string }
> = {
  active: { label: "Active", chip: "border-danger/25 bg-danger/10 text-danger" },
  acknowledged: {
    label: "Acknowledged",
    chip: "border-warning/30 bg-warning/10 text-warning-ink",
  },
  resolved: {
    label: "Resolved",
    chip: "border-success/30 bg-success/10 text-success-ink",
  },
};

export function performanceMeta(score: number): {
  label: string;
  tone: string;
  bar: string;
} {
  if (score >= 90) {
    return { label: "Healthy", tone: "text-success-ink", bar: "bg-success" };
  }
  if (score >= 80) {
    return { label: "Watch", tone: "text-warning-ink", bar: "bg-warning" };
  }
  return { label: "Needs attention", tone: "text-danger", bar: "bg-danger" };
}

export function relativeFrom(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateIso(iso: string): string {
  const timestamp = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(timestamp)) return iso;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function compactKwh(value: number): string {
  if (value >= 1_000_000) return `${formatDecimal(value / 1_000_000, 2)}M kWh`;
  if (value >= 1_000) return `${formatDecimal(value / 1_000, 1)}k kWh`;
  return `${Math.round(value)} kWh`;
}

export function rangeLabel(range: EnergyRange): string {
  switch (range) {
    case "24h":
      return "Last 24 hours";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 13 weeks";
    case "12m":
      return "Last 12 months";
  }
}

export function specSummary(value: number, unit: string): string {
  return `${new Intl.NumberFormat("en-IN").format(value)} ${unit}`;
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/ConvexError:\s*(.+)$/);
    return (match?.[1] ?? error.message).replace(/\s+/g, " ").trim();
  }
  return "Something went wrong. Please try again.";
}

export function nextAvailableCode(categoryId: string, codes: string[]): string {
  const category = categoryMeta(categoryId);
  const taken = new Set(codes.map((code) => code.toUpperCase()));
  let index = 1;
  while (taken.has(`${category.codePrefix}-${String(index).padStart(2, "0")}`)) {
    index += 1;
  }
  return `${category.codePrefix}-${String(index).padStart(2, "0")}`;
}
