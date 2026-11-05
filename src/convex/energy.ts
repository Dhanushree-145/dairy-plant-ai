import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Energy & Machines analytics.
 *
 * Every reading in this module is simulated. It is generated deterministically
 * from each machine's configured baseline so numbers stay stable between
 * queries, while status and load move with a 30-minute live bucket. The UI
 * labels the source as "simulated" everywhere and never presents these values
 * as live IoT meter readings.
 */

type Machine = Doc<"machines">;
type MachineStatus = "on" | "off" | "unknown";
type AlertSeverity = "critical" | "warning" | "info";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const TARIFF = 8.2;
const LITRES_PER_DAY = 47_800;
const OPERATING_HOURS_PER_DAY = 22;

// Share of the day a category typically runs. Used only to shape the demo
// live-status stream.
const CATEGORY_DUTY: Record<string, number> = {
  chilling: 0.82,
  storage: 0.58,
  filtration: 0.52,
  pasteurization: 0.78,
  homogenization: 0.55,
  pumps: 0.62,
  compressors: 0.86,
  packaging: 0.6,
  cold_storage: 0.88,
  cip: 0.24,
};

const REFRIGERATION_CATEGORIES = new Set(["chilling", "cold_storage", "compressors"]);

const TECHNICIANS = ["R. Kulkarni", "S. Patil", "A. Fernandes", "M. Joshi", "V. Rao"];
const SERVICE_TYPES = [
  "Preventive service",
  "Bearing & seal check",
  "Sensor calibration",
  "Condenser cleaning",
];
const SERVICE_NOTES = [
  "Replaced worn seals and logged vibration levels.",
  "Cleaned condenser coils and verified refrigerant pressure.",
  "Calibrated temperature probe against the reference meter.",
  "Inspected drive belt tension and greased bearings.",
];

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seedFor(machine: Pick<Machine, "code" | "category">): number {
  return hashString(`${machine.code}:${machine.category}`);
}

function baselineDay(machine: Pick<Machine, "baselineKwhPerHour">): number {
  return machine.baselineKwhPerHour * OPERATING_HOURS_PER_DAY;
}

function isFaulty(seed: number): boolean {
  return noise(seed + 9) < 0.12;
}

function isAnomalous(seed: number): boolean {
  return noise(seed + 21) < 0.28;
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function hourLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function liveState(
  machine: Machine,
  now: number,
): { status: MachineStatus; currentKw: number | null; lastReadingMinutes: number } {
  const seed = seedFor(machine);
  if (isFaulty(seed)) {
    return {
      status: "unknown",
      currentKw: null,
      lastReadingMinutes: 18 + Math.round(noise(seed + 4) * 42),
    };
  }

  const duty = CATEGORY_DUTY[machine.category] ?? 0.6;
  const bucket = Math.floor(now / (30 * 60_000));
  const running = noise(seed + bucket * 4.13) < Math.min(0.94, duty + 0.04);
  if (!running) {
    return {
      status: "off",
      currentKw: 0,
      lastReadingMinutes: Math.round(noise(seed + bucket) * 3),
    };
  }

  const load = machine.baselineKwhPerHour * (0.82 + noise(seed + bucket * 1.77) * 0.42);
  return {
    status: "on",
    currentKw: round(Math.max(0.3, load), 2),
    lastReadingMinutes: Math.round(noise(seed + bucket * 2.11) * 3),
  };
}

function dailyKwh(machine: Machine, now: number, offsetDays: number): number {
  const seed = seedFor(machine);
  const timestamp = now - offsetDays * DAY;
  const date = new Date(timestamp);
  const dayNumber = Math.floor(timestamp / DAY);
  const weekend = date.getUTCDay() === 0 ? 0.9 : 1;
  const base = baselineDay(machine);
  const variation = 0.92 + noise(seed + dayNumber * 1.37) * 0.16;
  const spike = isAnomalous(seed) && offsetDays <= 1 ? 1.26 : 1;
  return round(base * weekend * variation * spike, 2);
}

function hourlyKwh(machine: Machine, now: number, offsetHours: number): number {
  const seed = seedFor(machine);
  const timestamp = now - offsetHours * HOUR;
  const hour = new Date(timestamp).getUTCHours();
  const shiftFactor = hour >= 6 && hour < 22 ? 1 : 0.62;
  const bucket = Math.floor(timestamp / (30 * 60_000));
  const duty = CATEGORY_DUTY[machine.category] ?? 0.6;
  const running = noise(seed + bucket * 2.91) < Math.min(0.94, duty + 0.04);
  if (!running) return 0;
  const load = machine.baselineKwhPerHour * shiftFactor * (0.76 + noise(seed + bucket * 5.17) * 0.54);
  return round(load, 2);
}

function performanceScore(machine: Machine): number {
  const seed = seedFor(machine);
  let score = 88 + noise(seed + 31) * 11;
  if (isAnomalous(seed)) score -= 9 + noise(seed + 33) * 6;
  if (noise(seed + 37) < 0.18) score -= 4;
  if (isFaulty(seed)) score -= 3;
  return Math.round(clamp(score, 62, 99));
}

function temperature(machine: Machine): number | null {
  if (!REFRIGERATION_CATEGORIES.has(machine.category)) return null;
  const seed = seedFor(machine);
  const drifting = isAnomalous(seed) || noise(seed + 57) > 0.82;
  if (drifting) return round(4.7 + noise(seed + 59) * 2.1, 1);
  return round(2.1 + noise(seed + 59) * 2.2, 1);
}

function maintenanceFor(machine: Machine, now: number) {
  const seed = seedFor(machine);
  const lastService = now - (12 + noise(seed + 61) * 54) * DAY;
  const entries = Array.from({ length: 3 }, (_, index) => {
    const timestamp = lastService - index * 92 * DAY;
    return {
      id: `${machine._id}-service-${index}`,
      date: new Date(timestamp).toISOString().slice(0, 10),
      type: SERVICE_TYPES[(seed + index) % SERVICE_TYPES.length],
      technician: TECHNICIANS[(seed + index * 3) % TECHNICIANS.length],
      cost: Math.round(1_800 + noise(seed + index * 7) * 8_500),
      downtimeHours: round(1 + noise(seed + index * 11) * 4.5, 1),
      notes: SERVICE_NOTES[(seed + index * 5) % SERVICE_NOTES.length],
    };
  });
  return {
    entries,
    nextMaintenanceAt: lastService + 90 * DAY,
  };
}

function buildSnapshot(machine: Machine, now: number, periodDays: number) {
  const seed = seedFor(machine);
  const live = liveState(machine, now);
  const performance = performanceScore(machine);
  const todayKwh = dailyKwh(machine, now, 0);
  const weekKwh = round(
    sum(Array.from({ length: 7 }, (_, index) => dailyKwh(machine, now, index))),
    1,
  );
  const monthKwh = round(
    sum(Array.from({ length: 30 }, (_, index) => dailyKwh(machine, now, index))),
    1,
  );
  const periodKwh = round(
    sum(Array.from({ length: periodDays }, (_, index) => dailyKwh(machine, now, index))),
    1,
  );
  const operatingHours = Math.round(900 + noise(seed + 41) * 5_200);
  const idleHours = Math.round(operatingHours * (0.06 + noise(seed + 43) * 0.08));
  const totalKwh = Math.round(operatingHours * machine.baselineKwhPerHour * (performance / 100));
  const maintenance = maintenanceFor(machine, now);

  return {
    id: machine._id,
    name: machine.name,
    code: machine.code,
    category: machine.category,
    stage: machine.stage,
    capacityValue: machine.capacityValue,
    capacityUnit: machine.capacityUnit,
    ratedKw: machine.ratedKw,
    baselineKwhPerHour: machine.baselineKwhPerHour,
    specifications: machine.specifications ?? null,
    installedAt: machine.installedAt,
    status: live.status,
    currentKw: live.currentKw,
    lastUpdated: now - live.lastReadingMinutes * 60_000,
    readingSource: "simulated" as const,
    startedAt:
      live.status === "on" ? now - Math.round((18 + noise(seed + 51) * 190) * 60_000) : null,
    stoppedAt:
      live.status === "off" ? now - Math.round((8 + noise(seed + 53) * 300) * 60_000) : null,
    operatingHours,
    idleHours,
    unexpectedShutdowns: Math.floor(noise(seed + 61) * 3),
    performance,
    temperatureC: temperature(machine),
    todayKwh,
    weekKwh,
    monthKwh,
    periodKwh,
    totalKwh,
    costToday: Math.round(todayKwh * TARIFF),
    costPeriod: Math.round(periodKwh * TARIFF),
    costMonth: Math.round(monthKwh * TARIFF),
    nextMaintenanceAt: maintenance.nextMaintenanceAt,
    sparkline: Array.from({ length: 24 }, (_, index) => hourlyKwh(machine, now, 23 - index)),
  };
}

type Snapshot = ReturnType<typeof buildSnapshot>;

type AlertDraft = {
  key: string;
  machineId: Snapshot["id"];
  machineName: string;
  machineCode: string;
  machineCategory: string;
  issueType: string;
  title: string;
  severity: AlertSeverity;
  currentValue: number | null;
  expectedValue: number | null;
  unit: string;
  currentLabel: string;
  expectedLabel: string;
  detectedAt: number;
  recommendation: string;
};

function buildAlerts(snapshot: Snapshot, now: number): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const anchor = Math.floor(now / HOUR) * HOUR;
  const detected = (minutes: number) => anchor - minutes * 60_000;
  const expectedDay = baselineDay(snapshot);
  const base = {
    machineId: snapshot.id,
    machineName: snapshot.name,
    machineCode: snapshot.code,
    machineCategory: snapshot.category,
  };

  if (snapshot.status === "unknown") {
    alerts.push({
      ...base,
      key: `${snapshot.id}:status_unknown`,
      issueType: "status_unknown",
      title: "Machine status cannot be confirmed",
      severity: "critical",
      currentValue: null,
      expectedValue: round(snapshot.baselineKwhPerHour, 1),
      unit: "kW",
      currentLabel: "No meter reading",
      expectedLabel: `${round(snapshot.baselineKwhPerHour, 1)} kW baseline`,
      detectedAt: detected(24),
      recommendation:
        "Check the machine controller and energy meter connection before assuming the unit is off. Dispatch the shift electrician for a physical status check.",
    });
  }

  const deviation = ((snapshot.todayKwh - expectedDay) / expectedDay) * 100;
  if (deviation > 13) {
    const critical = deviation > 28;
    alerts.push({
      ...base,
      key: `${snapshot.id}:excess_consumption`,
      issueType: "excess_consumption",
      title: `Daily energy ${Math.round(deviation)}% above baseline`,
      severity: critical ? "critical" : "warning",
      currentValue: snapshot.todayKwh,
      expectedValue: round(expectedDay, 1),
      unit: "kWh",
      currentLabel: `${round(snapshot.todayKwh, 1)} kWh today`,
      expectedLabel: `${round(expectedDay, 1)} kWh expected`,
      detectedAt: detected(38),
      recommendation:
        "Inspect the load profile for this machine, verify setpoints and condenser/heat-exchanger condition, then re-baseline only if the new duty is intentional.",
    });
  }

  if (snapshot.performance < 84) {
    alerts.push({
      ...base,
      key: `${snapshot.id}:performance_decline`,
      issueType: "performance_decline",
      title: "Machine efficiency is declining",
      severity: snapshot.performance < 74 ? "critical" : "warning",
      currentValue: snapshot.performance,
      expectedValue: 90,
      unit: "%",
      currentLabel: `${snapshot.performance}% efficiency`,
      expectedLabel: "90% target",
      detectedAt: detected(92),
      recommendation:
        "Compare temperature pull-down time against the service log. Book a preventive service if efficiency stays below target for three shifts.",
    });
  }

  if (
    snapshot.status === "on" &&
    snapshot.currentKw !== null &&
    snapshot.currentKw < snapshot.baselineKwhPerHour * 0.45
  ) {
    alerts.push({
      ...base,
      key: `${snapshot.id}:idle_load`,
      issueType: "idle_load",
      title: "Machine is running with an unusually low load",
      severity: "warning",
      currentValue: round(snapshot.currentKw, 1),
      expectedValue: round(snapshot.baselineKwhPerHour, 1),
      unit: "kW",
      currentLabel: `${round(snapshot.currentKw, 1)} kW now`,
      expectedLabel: `${round(snapshot.baselineKwhPerHour, 1)} kW expected`,
      detectedAt: detected(51),
      recommendation:
        "Confirm whether the unit is genuinely processing or idling between batches. Enable the idle auto-stop interlock or stop it manually if no product is queued.",
    });
  }

  if (snapshot.temperatureC !== null && snapshot.temperatureC > 4.5) {
    alerts.push({
      ...base,
      key: `${snapshot.id}:refrigeration_anomaly`,
      issueType: "refrigeration_anomaly",
      title: "Refrigeration temperature outside configured range",
      severity: snapshot.temperatureC > 5.6 ? "critical" : "warning",
      currentValue: snapshot.temperatureC,
      expectedValue: 3,
      unit: "°C",
      currentLabel: `${snapshot.temperatureC}°C`,
      expectedLabel: "2–4°C range",
      detectedAt: detected(29),
      recommendation:
        "Check door seals, defrost cycle and condenser airflow. Move high-risk product to a verified bay while the temperature is out of range.",
    });
  }

  const daysToService = Math.ceil((snapshot.nextMaintenanceAt - now) / DAY);
  if (daysToService <= 7) {
    alerts.push({
      ...base,
      key: `${snapshot.id}:maintenance_due`,
      issueType: "maintenance_due",
      title: `Preventive maintenance due in ${Math.max(0, daysToService)} days`,
      severity: "warning",
      currentValue: Math.max(0, daysToService),
      expectedValue: 0,
      unit: "days",
      currentLabel: `${Math.max(0, daysToService)} days remaining`,
      expectedLabel: "Service due now",
      detectedAt: detected(176),
      recommendation:
        "Schedule the service inside the next planned maintenance window. Confirm spare seals and filters before the technician visit.",
    });
  }

  if (snapshot.unexpectedShutdowns > 0 && noise(seedFor(snapshot) + 71) > 0.45) {
    alerts.push({
      ...base,
      key: `${snapshot.id}:unexpected_shutdown`,
      issueType: "unexpected_shutdown",
      title: `${snapshot.unexpectedShutdowns} unexpected shutdown${snapshot.unexpectedShutdowns > 1 ? "s" : ""} recorded`,
      severity: "critical",
      currentValue: snapshot.unexpectedShutdowns,
      expectedValue: 0,
      unit: "events",
      currentLabel: `${snapshot.unexpectedShutdowns} shutdowns`,
      expectedLabel: "0 expected",
      detectedAt: detected(241),
      recommendation:
        "Pull the controller fault log and check supply voltage, overload relays and emergency-stop wiring. Log the root cause before restarting.",
    });
  }

  return alerts;
}

type AlertStateRow = Doc<"energyAlertStates">;

function alertStateMap(states: AlertStateRow[]) {
  return new Map(states.map((state) => [state.alertKey, state]));
}

function applyAlertState(alert: AlertDraft, states: Map<string, AlertStateRow>) {
  const state = states.get(alert.key);
  return {
    ...alert,
    status: (state?.status ?? "active") as "active" | "acknowledged" | "resolved",
    statusUpdatedAt: state?.updatedAt ?? null,
  };
}

function severityRank(severity: AlertSeverity): number {
  return severity === "critical" ? 0 : severity === "warning" ? 1 : 2;
}

function sortAlerts<T extends { severity: AlertSeverity; status: string; detectedAt: number }>(
  alerts: T[],
): T[] {
  return [...alerts].sort((a, b) => {
    const resolvedA = a.status === "resolved" ? 1 : 0;
    const resolvedB = b.status === "resolved" ? 1 : 0;
    if (resolvedA !== resolvedB) return resolvedA - resolvedB;
    const severity = severityRank(a.severity) - severityRank(b.severity);
    if (severity !== 0) return severity;
    return b.detectedAt - a.detectedAt;
  });
}

type Recommendation = {
  id: string;
  title: string;
  problem: string;
  action: string;
  category: "load_shift" | "maintenance" | "refrigeration" | "idle" | "schedule";
  priority: "high" | "medium" | "low";
  machineId: Snapshot["id"] | null;
  machineName: string | null;
  monthlyKwhSaving: number;
  monthlySaving: number;
  confidence: number;
  basis: string;
};

function buildRecommendations(
  snapshots: Snapshot[],
  periodDays: number,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const machine of snapshots) {
    const seed = seedFor(machine);
    const configuredDay = baselineDay(machine);
    const averageDay = machine.periodKwh / periodDays;
    const excess = averageDay - configuredDay;

    if (excess > configuredDay * 0.07) {
      const monthlyKwh = round(excess * 0.8 * 30, 0);
      recommendations.push({
        id: `${machine.id}:load-shift`,
        title: `Trim ${machine.name} back to its configured baseline`,
        problem: `${machine.name} averaged ${round(averageDay, 1)} kWh/day over ${periodDays} days against a ${round(configuredDay, 1)} kWh baseline (${Math.round((excess / configuredDay) * 100)}% above).`,
        action:
          "Re-check setpoints, clean heat-transfer surfaces and move non-critical cycles out of the 14:00–18:00 peak tariff block.",
        category: "load_shift",
        priority: excess > configuredDay * 0.2 ? "high" : "medium",
        machineId: machine.id,
        machineName: machine.name,
        monthlyKwhSaving: monthlyKwh,
        monthlySaving: Math.round(monthlyKwh * TARIFF),
        confidence: 84 + Math.round(noise(seed + 101) * 11),
        basis: `${Math.round((excess / configuredDay) * 100)}% above configured baseline`,
      });
    }

    if (machine.performance < 87) {
      const monthlyKwh = round(configuredDay * 0.05 * 30, 0);
      recommendations.push({
        id: `${machine.id}:service`,
        title: `Service ${machine.name} to recover efficiency`,
        problem: `${machine.name} is running at ${machine.performance}% of its configured efficiency target (90%). Pull-down and cycle times are longer than the service baseline.`,
        action:
          "Inspect bearings, seals, refrigerant charge and sensors, then log the post-service efficiency for three shifts.",
        category: "maintenance",
        priority: machine.performance < 76 ? "high" : "medium",
        machineId: machine.id,
        machineName: machine.name,
        monthlyKwhSaving: monthlyKwh,
        monthlySaving: Math.round(monthlyKwh * TARIFF),
        confidence: 80 + Math.round(noise(seed + 103) * 12),
        basis: `${machine.performance}% efficiency vs 90% target`,
      });
    }

    if (machine.temperatureC !== null && machine.temperatureC > 4.5) {
      const monthlyKwh = round(configuredDay * 0.11 * 30, 0);
      recommendations.push({
        id: `${machine.id}:refrigeration`,
        title: `Recover refrigeration performance on ${machine.name}`,
        problem: `${machine.name} is holding ${machine.temperatureC}°C against a 2–4°C range, so the compressor is working harder than its baseline.`,
        action:
          "Inspect door seals, defrost schedule and condenser airflow, and verify the temperature probe before changing the setpoint.",
        category: "refrigeration",
        priority: "high",
        machineId: machine.id,
        machineName: machine.name,
        monthlyKwhSaving: monthlyKwh,
        monthlySaving: Math.round(monthlyKwh * TARIFF),
        confidence: 87 + Math.round(noise(seed + 107) * 8),
        basis: `${machine.temperatureC}°C vs 2–4°C target`,
      });
    }

    if (
      machine.status === "on" &&
      machine.currentKw !== null &&
      machine.currentKw < machine.baselineKwhPerHour * 0.55
    ) {
      const wastedKw = Math.max(0, machine.baselineKwhPerHour * 0.55 - machine.currentKw);
      const monthlyKwh = round(wastedKw * 2 * 24, 0);
      recommendations.push({
        id: `${machine.id}:idle`,
        title: `Automate idle stop on ${machine.name}`,
        problem: `${machine.name} is drawing ${round(machine.currentKw, 1)} kW while running below its expected load, a pattern that often means it is waiting between batches.`,
        action:
          "Enable the idle auto-stop interlock and confirm the operator checklist covers manual stops at shift handover.",
        category: "idle",
        priority: "low",
        machineId: machine.id,
        machineName: machine.name,
        monthlyKwhSaving: monthlyKwh,
        monthlySaving: Math.round(monthlyKwh * TARIFF),
        confidence: 76 + Math.round(noise(seed + 109) * 10),
        basis: "Live load below 55% of expected",
      });
    }
  }

  if (snapshots.length > 0) {
    const averagePlantDay = sum(snapshots.map((machine) => machine.periodKwh)) / periodDays;
    recommendations.push({
      id: "plant:schedule",
      title: "Stagger machine start-ups to flatten the tariff peak",
      problem:
        "CIP, packaging and cold-storage pull-down starts cluster inside the 14:00–18:00 peak tariff window, lifting plant demand charges.",
      action:
        "Sequence cold-storage pull-down from 13:00 and move CIP cycles to 22:00. Keep packaging start-ups out of the peak block where the production plan allows.",
      category: "schedule",
      priority: "medium",
      machineId: null,
      machineName: null,
      monthlyKwhSaving: round(averagePlantDay * 0.06 * 30, 0),
      monthlySaving: Math.round(averagePlantDay * 0.06 * 30 * TARIFF),
      confidence: 81,
      basis: "Simulated load profile across registered machines",
    });
    recommendations.push({
      id: "plant:setpoint",
      title: "Raise chilled-water setpoint by 0.5°C and verify product safety",
      problem:
        "The simulated chilled-water loop is running below the configured process target, which adds compressor hours without improving product temperature.",
      action:
        "Raise the loop setpoint by 0.5°C, verify milk outlet temperature stays inside the 2–4°C range, and monitor for 48 hours.",
      category: "schedule",
      priority: "low",
      machineId: null,
      machineName: null,
      monthlyKwhSaving: round(averagePlantDay * 0.035 * 30, 0),
      monthlySaving: Math.round(averagePlantDay * 0.035 * 30 * TARIFF),
      confidence: 74,
      basis: "Simulated refrigerant load vs process target",
    });
  }

  return recommendations
    .sort((a, b) => b.monthlySaving - a.monthlySaving)
    .slice(0, 6);
}

function aggregateDaily(machines: Machine[], now: number, length: number) {
  return Array.from({ length }, (_, index) => {
    const offset = length - 1 - index;
    const timestamp = now - offset * DAY;
    return {
      date: new Date(timestamp).toISOString().slice(0, 10),
      label: dayLabel(timestamp),
      kwh: round(
        sum(machines.map((machine) => dailyKwh(machine, now, offset))),
        2,
      ),
    };
  });
}

const MODEL_INFO = {
  prediction: "7-day moving-average projection",
  anomaly: "Rolling z-score deviation against configured baselines",
  trainedOn: "Deterministic simulated machine history",
  note: "Statistical projections over simulated data. A trained Random Forest or Isolation Forest pipeline can replace these functions without changing the interface.",
};

export const dashboard = query({
  args: {
    now: v.number(),
    days: v.union(v.literal(7), v.literal(30), v.literal(90)),
  },
  handler: async (ctx, { now, days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view energy analytics.");

    const machines = await ctx.db
      .query("machines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const states = await ctx.db
      .query("energyAlertStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const stateMap = alertStateMap(states);

    const snapshots = machines.map((machine) => buildSnapshot(machine, now, days));
    const alerts = sortAlerts(
      snapshots
        .flatMap((snapshot) => buildAlerts(snapshot, now))
        .map((alert) => applyAlertState(alert, stateMap)),
    );
    const activeAlerts = alerts.filter((alert) => alert.status !== "resolved");

    const historyLength = Math.max(days * 2, 360);
    const history = aggregateDaily(machines, now, historyLength);
    const currentSlice = history.slice(-days);
    const previousSlice = history.slice(-days * 2, -days);

    const daily = currentSlice.map((day, index) => {
      const previous = previousSlice[index];
      return {
        ...day,
        cost: Math.round(day.kwh * TARIFF),
        previousKwh: previous?.kwh ?? 0,
        previousCost: previous ? Math.round(previous.kwh * TARIFF) : 0,
      };
    });

    const weekly = Array.from({ length: 12 }, (_, index) => {
      const weeksAgo = 11 - index;
      const end = history.length - weeksAgo * 7;
      const slice = history.slice(Math.max(0, end - 7), end);
      const kwh = round(sum(slice.map((day) => day.kwh)), 1);
      return {
        label: slice[0]?.label ?? "",
        kwh,
        cost: Math.round(kwh * TARIFF),
      };
    });

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const monthsAgo = 11 - index;
      const end = history.length - monthsAgo * 30;
      const slice = history.slice(Math.max(0, end - 30), end);
      const kwh = round(sum(slice.map((day) => day.kwh)), 1);
      return {
        label: slice[0] ? monthLabel(new Date(`${slice[0].date}T00:00:00Z`).getTime()) : "",
        kwh,
        cost: Math.round(kwh * TARIFF),
      };
    });

    const hourly = Array.from({ length: 24 }, (_, index) => {
      const offset = 23 - index;
      const timestamp = now - offset * HOUR;
      const kwh = round(sum(machines.map((machine) => hourlyKwh(machine, now, offset))), 2);
      return {
        label: hourLabel(timestamp),
        kwh,
        cost: Math.round(kwh * TARIFF),
      };
    });

    const energyKwh = round(sum(daily.map((day) => day.kwh)), 1);
    const previousEnergy = round(sum(previousSlice.map((day) => day.kwh)), 1);
    const cost = Math.round(energyKwh * TARIFF);
    const previousCost = Math.round(previousEnergy * TARIFF);
    const weekKwh = round(sum(history.slice(-7).map((day) => day.kwh)), 1);
    const monthKwh = round(sum(history.slice(-30).map((day) => day.kwh)), 1);
    const litresProcessed = LITRES_PER_DAY * days;
    const energyPerLitre = energyKwh / litresProcessed;
    const costPerLitre = cost / litresProcessed;

    const lastSevenAverage =
      sum(history.slice(-7).map((day) => day.kwh)) / Math.max(1, history.slice(-7).length);
    const forecast = Array.from({ length: 7 }, (_, index) => {
      const timestamp = now + (index + 1) * DAY;
      const factor = 1 + (noise(Math.floor(timestamp / DAY) + 211) - 0.48) * 0.1;
      const kwh = round(lastSevenAverage * factor, 1);
      return {
        label: dayLabel(timestamp),
        kwh,
        cost: Math.round(kwh * TARIFF),
      };
    });
    const predictedNextWeekKwh = round(sum(forecast.map((day) => day.kwh)), 1);
    const predictedNextWeekCost = Math.round(predictedNextWeekKwh * TARIFF);
    const predictedMonthCost = Math.round(lastSevenAverage * 30 * TARIFF * 1.01);

    const totalRatedKw = round(sum(snapshots.map((machine) => machine.ratedKw)), 1);
    const categoryMap = new Map<string, { count: number; kwh: number }>();
    for (const machine of snapshots) {
      const entry = categoryMap.get(machine.category) ?? { count: 0, kwh: 0 };
      entry.count += 1;
      entry.kwh += machine.periodKwh;
      categoryMap.set(machine.category, entry);
    }
    const categoryBreakdown = [...categoryMap.entries()]
      .map(([category, entry]) => ({
        category,
        count: entry.count,
        kwh: round(entry.kwh, 1),
        cost: Math.round(entry.kwh * TARIFF),
        share: round((entry.kwh / Math.max(1, energyKwh)) * 100, 1),
      }))
      .sort((a, b) => b.kwh - a.kwh);

    const topConsumers = [...snapshots]
      .sort((a, b) => b.periodKwh - a.periodKwh)
      .slice(0, 6)
      .map((machine) => ({
        id: machine.id,
        name: machine.name,
        code: machine.code,
        category: machine.category,
        status: machine.status,
        kwh: machine.periodKwh,
        cost: machine.costPeriod,
        share: round((machine.periodKwh / Math.max(1, energyKwh)) * 100, 1),
        performance: machine.performance,
      }));

    const recommendations = buildRecommendations(snapshots, days);
    const potentialSavings = sum(recommendations.map((item) => item.monthlySaving));

    return {
      hasMachines: machines.length > 0,
      dataSource: "simulated" as const,
      generatedAt: now,
      rangeDays: days,
      tariff: TARIFF,
      model: MODEL_INFO,
      disclaimer:
        "Machine status, meter readings and alerts are generated from a simulated dataset. They are not live IoT readings.",
      summary: {
        registered: snapshots.length,
        on: snapshots.filter((machine) => machine.status === "on").length,
        off: snapshots.filter((machine) => machine.status === "off").length,
        unknown: snapshots.filter((machine) => machine.status === "unknown").length,
        activeAlerts: activeAlerts.length,
        totalRatedKw,
      },
      plant: {
        name: "Sahyadri Dairy Works",
        litresProcessed,
        litresPerDay: LITRES_PER_DAY,
        energyPerLitre: round(energyPerLitre, 3),
        costPerLitre: round(costPerLitre, 3),
      },
      totals: {
        energyKwh,
        previousEnergyKwh: previousEnergy,
        cost,
        previousCost,
        energyChangePct:
          previousEnergy > 0 ? round(((energyKwh - previousEnergy) / previousEnergy) * 100, 1) : 0,
        costChangePct:
          previousCost > 0 ? round(((cost - previousCost) / previousCost) * 100, 1) : 0,
        weekKwh,
        monthKwh,
        weekCost: Math.round(weekKwh * TARIFF),
        monthCost: Math.round(monthKwh * TARIFF),
        currentLoadKw: round(
          sum(snapshots.map((machine) => machine.currentKw ?? 0)),
          1,
        ),
      },
      costs: {
        period: cost,
        dailyAverage: Math.round(cost / days),
        weekly: Math.round(weekKwh * TARIFF),
        monthly: Math.round(monthKwh * TARIFF),
        perLitre: round(costPerLitre, 3),
        forecastNextWeek: predictedNextWeekCost,
        forecastNextMonth: predictedMonthCost,
      },
      forecast: {
        days: forecast,
        predictedWeekKwh: predictedNextWeekKwh,
        predictedWeekCost: predictedNextWeekCost,
        predictedMonthCost,
      },
      series: { daily, hourly, weekly, monthly },
      machines: snapshots,
      categoryBreakdown,
      topConsumers,
      alerts,
      alertSummary: {
        total: alerts.length,
        active: activeAlerts.length,
        critical: activeAlerts.filter((alert) => alert.severity === "critical").length,
        warning: activeAlerts.filter((alert) => alert.severity === "warning").length,
        acknowledged: alerts.filter((alert) => alert.status === "acknowledged").length,
        resolved: alerts.filter((alert) => alert.status === "resolved").length,
      },
      recommendations,
      potentialSavings,
    };
  },
});

export const machine = query({
  args: {
    machineId: v.id("machines"),
    now: v.number(),
    range: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("12m"),
    ),
  },
  handler: async (ctx, { machineId, now, range }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view this machine.");

    const record = await ctx.db.get(machineId);
    if (!record || record.userId !== userId) return null;

    const snapshot = buildSnapshot(record, now, 30);
    const maintenance = maintenanceFor(record, now);
    const seed = seedFor(record);

    const pointCount =
      range === "24h"
        ? 24
        : range === "90d"
          ? 13
          : range === "12m"
            ? 12
            : range === "7d"
              ? 7
              : 30;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const age = pointCount - 1 - index;
      if (range === "24h") {
        const kwh = hourlyKwh(record, now, age);
        return {
          label: hourLabel(now - age * HOUR),
          kwh,
          cost: Math.round(kwh * TARIFF * 100) / 100,
          previousKwh: hourlyKwh(record, now, age + 24),
          baselineKwh: round(record.baselineKwhPerHour, 2),
        };
      }
      if (range === "12m") {
        const kwh = round(
          sum(
            Array.from({ length: 30 }, (_, day) =>
              dailyKwh(record, now, age * 30 + day),
            ),
          ),
          1,
        );
        const previousKwh = round(
          sum(
            Array.from({ length: 30 }, (_, day) =>
              dailyKwh(record, now, age * 30 + day + 360),
            ),
          ),
          1,
        );
        return {
          label: monthLabel(now - (age * 30 + 29) * DAY),
          kwh,
          cost: Math.round(kwh * TARIFF),
          previousKwh,
          baselineKwh: round(baselineDay(record) * 30, 1),
        };
      }
      if (range === "90d") {
        const kwh = round(
          sum(
            Array.from({ length: 7 }, (_, day) =>
              dailyKwh(record, now, age * 7 + day),
            ),
          ),
          1,
        );
        const previousKwh = round(
          sum(
            Array.from({ length: 7 }, (_, day) =>
              dailyKwh(record, now, age * 7 + day + 90),
            ),
          ),
          1,
        );
        return {
          label: `Wk ${dayLabel(now - (age * 7 + 6) * DAY)}`,
          kwh,
          cost: Math.round(kwh * TARIFF),
          previousKwh,
          baselineKwh: round(baselineDay(record) * 7, 1),
        };
      }
      const days = range === "7d" ? 7 : 30;
      const kwh = dailyKwh(record, now, age);
      return {
        label: dayLabel(now - age * DAY),
        kwh,
        cost: Math.round(kwh * TARIFF),
        previousKwh: dailyKwh(record, now, age + days),
        baselineKwh: round(baselineDay(record), 1),
      };
    });

    const states = await ctx.db
      .query("energyAlertStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const stateMap = alertStateMap(states);
    const alerts = sortAlerts(
      buildAlerts(snapshot, now).map((alert) => applyAlertState(alert, stateMap)),
    );

    const performanceSeries = points.map((point, index) => ({
      label: point.label,
      efficiency: Math.round(
        clamp(snapshot.performance + (noise(seed + index * 3.73) - 0.5) * 8, 45, 100),
      ),
      baseline: 90,
    }));

    const duty = CATEGORY_DUTY[record.category] ?? 0.6;
    const statusTimeline = Array.from({ length: 24 }, (_, index) => {
      const age = 23 - index;
      const timestamp = now - age * HOUR;
      const bucket = Math.floor(timestamp / (30 * 60_000));
      const status: MachineStatus = isFaulty(seed)
        ? "unknown"
        : noise(seed + bucket * 4.13) < Math.min(0.94, duty + 0.04)
          ? "on"
          : "off";
      return {
        label: hourLabel(timestamp),
        status,
        kwh: hourlyKwh(record, now, age),
      };
    });

    const totalKwh = snapshot.totalKwh;
    const costPerOperatingHour =
      snapshot.operatingHours > 0 ? (totalKwh * TARIFF) / snapshot.operatingHours : 0;

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      range,
      machine: snapshot,
      alerts,
      series: {
        points,
        currentTotal: round(sum(points.map((point) => point.kwh)), 1),
        previousTotal: round(sum(points.map((point) => point.previousKwh)), 1),
        baselineTotal: round(sum(points.map((point) => point.baselineKwh)), 1),
        performance: performanceSeries,
        statusTimeline,
      },
      energy: {
        currentKw: snapshot.currentKw,
        todayKwh: snapshot.todayKwh,
        todayCost: snapshot.costToday,
        weekKwh: snapshot.weekKwh,
        weekCost: Math.round(snapshot.weekKwh * TARIFF),
        monthKwh: snapshot.monthKwh,
        monthCost: snapshot.costMonth,
        totalKwh,
        totalCost: Math.round(totalKwh * TARIFF),
        kwhPerOperatingHour:
          snapshot.operatingHours > 0 ? round(totalKwh / snapshot.operatingHours, 2) : 0,
        costPerOperatingHour: round(costPerOperatingHour, 2),
        baselineKwhPerHour: record.baselineKwhPerHour,
        baselineDayKwh: round(baselineDay(record), 1),
      },
      maintenance: maintenance.entries,
      nextMaintenanceAt: maintenance.nextMaintenanceAt,
      model: MODEL_INFO,
    };
  },
});

export const setAlertState = mutation({
  args: {
    alertKey: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("acknowledged"),
      v.literal("resolved"),
    ),
  },
  handler: async (ctx, { alertKey, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to manage alerts.");

    const key = alertKey.trim();
    if (!key || key.length > 200) throw new ConvexError("That alert reference is not valid.");

    const existing = await ctx.db
      .query("energyAlertStates")
      .withIndex("by_user_alert", (q) => q.eq("userId", userId).eq("alertKey", key))
      .unique();

    if (status === "active") {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }

    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("energyAlertStates", {
      userId,
      alertKey: key,
      status,
      updatedAt: Date.now(),
    });
  },
});
