import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type HygieneDashboardData = NonNullable<
  FunctionReturnType<typeof api.hygiene.dashboard>
>;
export type HygieneCategoryData = NonNullable<
  FunctionReturnType<typeof api.hygiene.category>
>;
export type HygieneAssetData = NonNullable<FunctionReturnType<typeof api.hygiene.asset>>;
export type HygieneEmployeeData = NonNullable<
  FunctionReturnType<typeof api.hygiene.employee>
>;
export type HygieneCategoryKey =
  | "equipment"
  | "tankers"
  | "employees"
  | "packaging"
  | "laboratory"
  | "environment";

export const HYGIENE_CATEGORIES: Array<{
  key: HygieneCategoryKey;
  label: string;
  short: string;
  description: string;
}> = [
  {
    key: "equipment",
    label: "Equipment & CIP Hygiene",
    short: "Equipment & CIP",
    description: "Process machines, tanks, pipelines, valves and CIP verification.",
  },
  {
    key: "tankers",
    label: "Tanker Hygiene",
    short: "Tankers",
    description: "Tanker cleaning, previous load, CIP readings and QA release.",
  },
  {
    key: "employees",
    label: "Employee Hygiene",
    short: "Employees",
    description: "Pre-shift inspections, protective clothing and training renewal.",
  },
  {
    key: "packaging",
    label: "Packaging Hygiene",
    short: "Packaging",
    description: "Fillers, sealing, conveyors and food-contact surface inspection.",
  },
  {
    key: "laboratory",
    label: "Laboratory & Quality Hygiene",
    short: "Laboratory",
    description: "Lab cleanliness, calibration, samples and water-quality checks.",
  },
  {
    key: "environment",
    label: "Plant & Environmental Hygiene",
    short: "Plant & environment",
    description: "Zones, floors, drains, water, pest control and changing areas.",
  },
];

const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string; tone: string }
> = {
  clean: {
    label: "Clean & verified",
    className: "border-success/25 bg-success/10 text-success-ink",
    dot: "bg-success",
    tone: "success",
  },
  failed: {
    label: "Cleaning failure",
    className: "border-danger/25 bg-danger/10 text-danger",
    dot: "bg-danger",
    tone: "danger",
  },
  overdue: {
    label: "Cleaning overdue",
    className: "border-warning/30 bg-warning/10 text-warning-ink",
    dot: "bg-warning",
    tone: "warning",
  },
  verification_pending: {
    label: "Verification pending",
    className: "border-yellow-400/35 bg-yellow-50 text-yellow-800",
    dot: "bg-yellow-400",
    tone: "yellow",
  },
  cleaning: {
    label: "Cleaning in progress",
    className: "border-primary/25 bg-primary/10 text-primary",
    dot: "bg-primary",
    tone: "blue",
  },
  unknown: {
    label: "Unknown / no evidence",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    tone: "grey",
  },
};

export function hygieneStatus(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status.replace(/_/g, " "),
      className: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/50",
      tone: "grey",
    }
  );
}

const EMPLOYEE_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  cleared: {
    label: "Cleared for duty",
    className: "border-success/25 bg-success/10 text-success-ink",
    dot: "bg-success",
  },
  inspection_pending: {
    label: "Inspection pending",
    className: "border-yellow-400/35 bg-yellow-50 text-yellow-800",
    dot: "bg-yellow-400",
  },
  corrective_action: {
    label: "Corrective action",
    className: "border-danger/25 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  training_renewal: {
    label: "Training renewal due",
    className: "border-warning/30 bg-warning/10 text-warning-ink",
    dot: "bg-warning",
  },
};

export function employeeStatus(status: string) {
  return (
    EMPLOYEE_META[status] ?? {
      label: status.replace(/_/g, " "),
      className: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/50",
    }
  );
}

export function categoryLabel(key: string): string {
  return HYGIENE_CATEGORIES.find((item) => item.key === key)?.label ?? key;
}

export function formatHygieneTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "No evidence";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHygieneDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "Not scheduled";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function relativeHygieneTime(timestamp: number | null | undefined, now: number): string {
  if (!timestamp) return "No evidence";
  const delta = timestamp - now;
  const minutes = Math.round(Math.abs(delta) / 60_000);
  if (minutes < 60) return delta >= 0 ? `in ${minutes} min` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return delta >= 0 ? `in ${hours} hr` : `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return delta >= 0 ? `in ${days} days` : `${days} days ago`;
}

export function sensorStatus(status: string) {
  if (status === "offline")
    return {
      label: "Sensor offline",
      className: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/50",
    };
  if (status === "out_of_range")
    return {
      label: "Out of range",
      className: "border-danger/25 bg-danger/10 text-danger",
      dot: "bg-danger",
    };
  return {
    label: "Online",
    className: "border-success/25 bg-success/10 text-success-ink",
    dot: "bg-success",
  };
}

export function sourceLabel(source: string): string {
  if (source === "iot") return "IOT";
  if (source === "manual") return "MANUAL";
  return "SIMULATED";
}

export function shortNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}
