import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import {
  BadgeX,
  Droplets,
  Filter,
  FlaskConical,
  Milk,
  Package,
  type LucideIcon,
} from "lucide-react";

export type WasteDashboardData = NonNullable<
  FunctionReturnType<typeof api.waste.dashboard>
>;
export type WasteConfig = NonNullable<FunctionReturnType<typeof api.waste.config>>;
export type WasteRecord = WasteDashboardData["records"][number];

export const WASTE_CATEGORIES = [
  "Milk waste",
  "Wastewater",
  "Packaging waste",
  "Rejected product",
  "Filtration residue",
  "Chemical waste",
] as const;

export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

export const WASTE_CATEGORY_META: Record<
  string,
  { unit: string; description: string; icon: LucideIcon; accent: string; bar: string }
> = {
  "Milk waste": {
    unit: "L",
    description: "Product and milk solids lost from process, transfer or filling.",
    icon: Milk,
    accent: "border-primary/20 bg-primary/[0.055] text-primary",
    bar: "#3185D8",
  },
  Wastewater: {
    unit: "L",
    description: "CIP rinse, washdown and treatment loads. Tracked separately from solid kg.",
    icon: Droplets,
    accent: "border-[#1789A8]/20 bg-[#1789A8]/[0.06] text-[#1789A8]",
    bar: "#1789A8",
  },
  "Packaging waste": {
    unit: "kg",
    description: "Film, pouches, labels and cartons rejected during packing.",
    icon: Package,
    accent: "border-warning/25 bg-warning/[0.07] text-warning-ink",
    bar: "#D99A24",
  },
  "Rejected product": {
    unit: "kg",
    description: "Finished product rejected for quality, cold-chain or damage.",
    icon: BadgeX,
    accent: "border-danger/20 bg-danger/[0.055] text-danger",
    bar: "#DC4545",
  },
  "Filtration residue": {
    unit: "kg",
    description: "Filter aid, clarifier sludge and settlement residue.",
    icon: Filter,
    accent: "border-success/20 bg-success/[0.055] text-success-ink",
    bar: "#16A078",
  },
  "Chemical waste": {
    unit: "L",
    description: "Spent cleaning chemicals and authorized chemical disposal.",
    icon: FlaskConical,
    accent: "border-[#6D5BB5]/20 bg-[#6D5BB5]/[0.055] text-[#6D5BB5]",
    bar: "#6D5BB5",
  },
};

export function wasteCategoryMeta(category: string) {
  return (
    WASTE_CATEGORY_META[category] ?? {
      unit: "kg",
      description: "Configured waste category.",
      icon: Package,
      accent: "border-border bg-muted/70 text-muted-foreground",
      bar: "#8296AD",
    }
  );
}

export function wasteSource(source: string) {
  if (source === "iot") {
    return {
      label: "IOT",
      className: "border-primary/25 bg-primary/10 text-primary",
      description: "Connected device reading",
    };
  }
  if (source === "manual") {
    return {
      label: "MANUAL",
      className: "border-success/25 bg-success/10 text-success-ink",
      description: "Human-entered record",
    };
  }
  return {
    label: "SIMULATED",
    className: "border-warning/30 bg-warning/10 text-warning-ink",
    description: "Generated demo data",
  };
}

export function disposalStatusMeta(status: string) {
  const key = status.toLowerCase();
  if (key === "recycled" || key === "recovered") {
    return { className: "bg-success/10 text-success-ink", label: status };
  }
  if (key === "treated" || key === "disposed") {
    return { className: "bg-primary/10 text-primary", label: status };
  }
  return { className: "bg-warning/10 text-warning-ink", label: status };
}

export function formatQuantity(quantity: number, unit: string): string {
  const digits = unit === "L" && quantity >= 100 ? 0 : 1;
  return `${quantity.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} ${unit}`;
}

export function formatKg(value: number): string {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg eq.`;
}

export function formatInr(value: number): string {
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatWasteTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "Not recorded";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWasteDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "Not recorded";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const DEFAULT_WASTE_CATEGORIES = [...WASTE_CATEGORIES];
export const DEFAULT_STAGES = [
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
export const DEFAULT_COLLECTION_POINTS = [
  "Reception bay",
  "Processing hall",
  "Filling and packing",
  "Cold storage",
  "CIP return",
  "Effluent treatment",
  "Chemical store",
];
export const DEFAULT_SEGREGATION = [
  "Milk / dairy by-product",
  "Wastewater",
  "Dry recyclables",
  "Rejected product",
  "Organic residue",
  "Chemical waste",
];
export const DEFAULT_RECOVERY_METHODS = [
  "Recovered for biogas",
  "Recovered for animal feed",
  "Cream / by-product recovery",
  "Recycled",
  "Composted",
];
export const DEFAULT_DISPOSAL_METHODS = [
  "Authorized chemical disposal",
  "Authorized landfill",
  "Treated on site",
  "Incinerated by authorized vendor",
];
export const DEFAULT_STORAGE = [
  { name: "Milk waste sump", capacity: 12000, unit: "L" },
  { name: "Wastewater buffer tank", capacity: 30000, unit: "L" },
  { name: "Dry waste bay", capacity: 5000, unit: "kg" },
  { name: "Chemical store", capacity: 2000, unit: "L" },
];
export const DEFAULT_COSTS = {
  milkPerLitre: 42.4,
  packagingPerKg: 180,
  disposalPerKg: 14,
  wastewaterPerLitre: 0.18,
};
export const DEFAULT_THRESHOLDS = {
  milkLitres: 60,
  wastewaterLitres: 1500,
  packagingKg: 20,
  rejectedKg: 25,
};

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
