import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type OverviewData = FunctionReturnType<typeof api.dashboard.overview>;
export type DashboardRange = 7 | 30;
export type OverviewAlert = OverviewData["alerts"][number];
export type OverviewRecommendation = OverviewData["recommendations"][number];

export const numberFormatter = new Intl.NumberFormat("en-IN");
export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(2)} L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return numberFormatter.format(value);
}

export function formatRelativeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function timeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name?: string | null): string {
  if (!name) return "DP";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
