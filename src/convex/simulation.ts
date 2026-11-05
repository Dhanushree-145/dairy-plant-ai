import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Read-only What-If Simulation Engine.
 *
 * This module never writes a record. It combines the demo plant baseline with
 * the operator's registered equipment and returns a deterministic planning
 * estimate for a hypothetical disruption.
 */

const DAILY_LITRES = 47_800;
const OPERATING_HOURS = 16;
const REVENUE_PER_LITRE = 124;
const BASELINE_COST_PER_LITRE = 78;
const OPERATING_COST_PER_DAY = DAILY_LITRES * BASELINE_COST_PER_LITRE;
const WASTE_KG_PER_LITRE = 0.0126;
const DISPOSAL_COST_PER_KG = 50;
const ENERGY_RATE = 8.3;

type ScenarioKey =
  | "cleaning_failure"
  | "temperature_excursion"
  | "waste_increase"
  | "maintenance_delay";

type RiskLevel = "low" | "moderate" | "high" | "critical";
type MetricTone = "danger" | "warning" | "primary" | "success" | "navy";

type Metric = {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: MetricTone;
};

type Recommendation = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  window: string;
  avoidedCost: number;
};

type SimulationResult = {
  scenario: ScenarioKey;
  scenarioLabel: string;
  inputSummary: string;
  headline: string;
  riskScore: number;
  riskLevel: RiskLevel;
  costImpact: number;
  metrics: Metric[];
  timeline: Array<{ label: string; baseline: number; scenario: number }>;
  recommendations: Recommendation[];
  assumptions: string[];
  baseline: {
    dailyLitres: number;
    operatingCost: number;
    revenue: number;
    wasteKg: number;
  };
  modelNote: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function litres(value: number) {
  return `${round(value).toLocaleString("en-IN")} L`;
}

function kilograms(value: number) {
  return `${round(value, 1).toLocaleString("en-IN")} kg`;
}

function rupees(value: number) {
  return `₹${round(value).toLocaleString("en-IN")}`;
}

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

function buildTimeline(totalImpact: number, activeDays: number) {
  const impactPerDay = totalImpact / Math.max(1, activeDays);
  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const applied = impactPerDay * Math.min(day, activeDays);
    return {
      label: `Day ${day}`,
      baseline: Math.round(OPERATING_COST_PER_DAY * day),
      scenario: Math.round(OPERATING_COST_PER_DAY * day + applied),
    };
  });
}

export const whatIf = query({
  args: {
    scenario: v.union(
      v.literal("cleaning_failure"),
      v.literal("temperature_excursion"),
      v.literal("waste_increase"),
      v.literal("maintenance_delay"),
    ),
    intensity: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args): Promise<SimulationResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to run simulations.");

    const machine = await ctx.db
      .query("machines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const baseline = {
      dailyLitres: DAILY_LITRES,
      operatingCost: OPERATING_COST_PER_DAY,
      revenue: DAILY_LITRES * REVENUE_PER_LITRE,
      wasteKg: round(DAILY_LITRES * WASTE_KG_PER_LITRE, 1),
    };
    const commonAssumptions = [
      `Baseline of ${DAILY_LITRES.toLocaleString("en-IN")} L/day across ${OPERATING_HOURS} operating hours.`,
      "Planning estimate derived from the demo plant model and configured equipment; not a measured plant result.",
      "No live sensors, ERP invoices or laboratory results are connected.",
      "Running this scenario is read-only and cannot create, edit or delete plant records.",
    ];
    const modelNote =
      "Deterministic scenario estimate. Treat it as a decision-support prompt, confirm the real readings and assign an accountable owner before acting.";

    if (args.scenario === "cleaning_failure") {
      const severity = clamp(args.intensity, 10, 100);
      const detectionDays = clamp(args.duration, 1, 5);
      const affectedLitres =
        DAILY_LITRES *
        (0.12 + (severity / 100) * 0.38) *
        Math.min(detectionDays, 3);
      const productAtRiskKg = affectedLitres * 0.86;
      const releaseDelayHours = 4 + detectionDays * 6 + severity * 0.08;
      const complianceDrop = Math.min(
        32,
        4 + severity * 0.18 + detectionDays * 2.2,
      );
      const reCleanCost = 18_000 + severity * 420;
      const wasteKg = affectedLitres * 0.025;
      const lostMargin = affectedLitres * 38 * (0.25 + severity / 200);
      const costImpact =
        reCleanCost + lostMargin + wasteKg * DISPOSAL_COST_PER_KG;
      const score = clamp(22 + severity * 0.48 + detectionDays * 7, 0, 100);
      const avoided = costImpact * 0.68;

      return {
        scenario: args.scenario,
        scenarioLabel: "Cleaning cycle failure",
        inputSummary: `CIP failure severity ${round(severity)}% · detected after ${round(detectionDays)} day${detectionDays === 1 ? "" : "s"}`,
        headline: `A failed cleaning release could put ${litres(affectedLitres)} of production on hold and delay QA release by ${round(releaseDelayHours)} hours.`,
        riskScore: round(score),
        riskLevel: riskLevel(score),
        costImpact: Math.round(costImpact),
        metrics: [
          {
            id: "production",
            label: "Production at risk",
            value: litres(affectedLitres),
            note: `${kilograms(productAtRiskKg)} of packed product equivalent`,
            tone: "danger",
          },
          {
            id: "release",
            label: "QA release delay",
            value: `${round(releaseDelayHours)} h`,
            note: "Product held until re-clean and verification",
            tone: "warning",
          },
          {
            id: "compliance",
            label: "Hygiene score drop",
            value: `−${round(complianceDrop)} pts`,
            note: "Estimated shift-level compliance impact",
            tone: "warning",
          },
          {
            id: "waste",
            label: "Potential rework waste",
            value: kilograms(wasteKg),
            note: "Material that may not return to saleable stock",
            tone: "primary",
          },
        ],
        timeline: buildTimeline(costImpact, Math.min(detectionDays, 3)),
        recommendations: [
          {
            id: "hold-release",
            title: "Hold release and re-verify the cleaning cycle",
            detail:
              "Quarantine the affected run, inspect the CIP record and repeat final-rinse conductivity, flow and temperature verification before QA release.",
            owner: "QA manager + sanitation supervisor",
            window: "Immediate",
            avoidedCost: Math.round(avoided * 0.62),
          },
          {
            id: "inspect-cip",
            title: "Inspect spray coverage and final-rinse conditions",
            detail:
              "Check spray-ball blockage, valve seat condition and final-rinse temperature. Log the corrective evidence against the asset.",
            owner: "Maintenance lead",
            window: "Before next CIP",
            avoidedCost: Math.round(avoided * 0.24),
          },
          {
            id: "increase-sampling",
            title: "Increase verification sampling for the next three releases",
            detail:
              "Add an independent ATP or lab check for the affected line and keep the batch on hold until the evidence is reviewed.",
            owner: "QA manager",
            window: "Next 3 releases",
            avoidedCost: Math.round(avoided * 0.14),
          },
        ],
        assumptions: commonAssumptions,
        baseline,
        modelNote,
      };
    }

    if (args.scenario === "temperature_excursion") {
      const rise = clamp(args.intensity, 1, 10);
      const hours = clamp(args.duration, 1, 24);
      const affectedLitres =
        22_000 * Math.min(1, hours / 10) * (0.85 + rise / 20);
      const spoilagePct = Math.min(
        40,
        1.5 + rise * 2.8 + hours * 0.65,
      );
      const lostLitres = affectedLitres * (spoilagePct / 100);
      const energyPenaltyKwh = affectedLitres * 0.014 * rise * (hours / 8);
      const releaseDelay = hours + 6;
      const complianceDrop = Math.min(35, 3 + rise * 2 + hours * 0.5);
      const costImpact =
        lostLitres * REVENUE_PER_LITRE +
        energyPenaltyKwh * ENERGY_RATE +
        12_000;
      const score = clamp(18 + rise * 4.2 + hours * 1.3, 0, 100);
      const avoided = costImpact * 0.72;

      return {
        scenario: args.scenario,
        scenarioLabel: "Cold-storage temperature excursion",
        inputSummary: `+${round(rise)}°C above limit · unresolved for ${round(hours)} hour${hours === 1 ? "" : "s"}`,
        headline: `A ${round(rise)}°C excursion held for ${round(hours)} hours could spoil ${litres(lostLitres)} of milk and trigger a quality hold.`,
        riskScore: round(score),
        riskLevel: riskLevel(score),
        costImpact: Math.round(costImpact),
        metrics: [
          {
            id: "production",
            label: "Milk exposed",
            value: litres(affectedLitres),
            note: "Estimated stored volume in the affected bay",
            tone: "danger",
          },
          {
            id: "spoilage",
            label: "Expected spoilage",
            value: `${round(spoilagePct)}%`,
            note: "Quality and shelf-life risk if not corrected",
            tone: "warning",
          },
          {
            id: "energy",
            label: "Emergency cooling",
            value: `${round(energyPenaltyKwh).toLocaleString("en-IN")} kWh`,
            note: "Additional compressor load to recover the setpoint",
            tone: "primary",
          },
          {
            id: "release",
            label: "Quality release hold",
            value: `${round(releaseDelay)} h`,
            note: `Testing and disposition · compliance −${round(complianceDrop)} pts`,
            tone: "warning",
          },
        ],
        timeline: buildTimeline(costImpact, Math.max(1, Math.ceil(hours / 24))),
        recommendations: [
          {
            id: "move-stock",
            title: "Move exposed stock to a verified cold room",
            detail:
              "Transfer the affected pallets, record the time and temperature history, and keep the batch segregated from unaffected stock.",
            owner: "Cold-store supervisor",
            window: "Immediate",
            avoidedCost: Math.round(avoided * 0.58),
          },
          {
            id: "inspect-refrigeration",
            title: "Inspect the compressor, condenser and door seals",
            detail:
              "Check the refrigeration alarm, condenser fouling and bay door discipline. Confirm the setpoint recovery before returning stock.",
            owner: "Maintenance lead",
            window: "Within 2 hours",
            avoidedCost: Math.round(avoided * 0.28),
          },
          {
            id: "qa-disposition",
            title: "Run a QA shelf-life and release assessment",
            detail:
              "Sample the exposed batch, review the time-temperature profile and record an authorized disposition before sale.",
            owner: "QA manager",
            window: "Before release",
            avoidedCost: Math.round(avoided * 0.14),
          },
        ],
        assumptions: commonAssumptions,
        baseline,
        modelNote,
      };
    }

    if (args.scenario === "waste_increase") {
      const increasePct = clamp(args.intensity, 5, 50);
      const sustainedDays = clamp(args.duration, 1, 14);
      const extraWasteKg =
        baseline.wasteKg * (increasePct / 100) * sustainedDays;
      const productionEquivalent = extraWasteKg / WASTE_KG_PER_LITRE;
      const extraCost = extraWasteKg * (DISPOSAL_COST_PER_KG + 36);
      const complianceDrop = Math.min(
        28,
        2 + increasePct * 0.22 + sustainedDays * 1.3,
      );
      const score = clamp(14 + increasePct * 1.1 + sustainedDays * 2, 0, 100);
      const avoided = extraCost * 0.62;

      return {
        scenario: args.scenario,
        scenarioLabel: "Production waste increase",
        inputSummary: `+${round(increasePct)}% waste · sustained for ${round(sustainedDays)} day${sustainedDays === 1 ? "" : "s"}`,
        headline: `A ${round(increasePct)}% waste increase for ${round(sustainedDays)} days adds ${kilograms(extraWasteKg)} of disposal burden and higher material loss.`,
        riskScore: round(score),
        riskLevel: riskLevel(score),
        costImpact: Math.round(extraCost),
        metrics: [
          {
            id: "waste",
            label: "Additional waste",
            value: kilograms(extraWasteKg),
            note: "Above the current daily baseline",
            tone: "danger",
          },
          {
            id: "cost",
            label: "Extra disposal cost",
            value: rupees(extraCost),
            note: "Material loss plus configured handling cost",
            tone: "warning",
          },
          {
            id: "production",
            label: "Production equivalent",
            value: litres(productionEquivalent),
            note: "Milk-equivalent material represented by the waste",
            tone: "primary",
          },
          {
            id: "compliance",
            label: "Compliance pressure",
            value: `−${round(complianceDrop)} pts`,
            note: "Estimated hygiene and waste-control impact",
            tone: "warning",
          },
        ],
        timeline: buildTimeline(extraCost, sustainedDays),
        recommendations: [
          {
            id: "isolate-stage",
            title: "Isolate the highest-loss stage and batch",
            detail:
              "Compare the increase against stage, machine and batch records. Verify the reading before changing the process.",
            owner: "Plant manager",
            window: "Next shift",
            avoidedCost: Math.round(avoided * 0.42),
          },
          {
            id: "check-filling",
            title: "Check filling, sealing and changeover losses",
            detail:
              "Inspect seal settings, film tension, filler start-up and product changeover. Record a corrective action for the affected batch.",
            owner: "Packaging supervisor",
            window: "Within 24 hours",
            avoidedCost: Math.round(avoided * 0.36),
          },
          {
            id: "verify-records",
            title: "Re-weigh and verify the waste records",
            detail:
              "Confirm that the increase is real and not a missing reading or duplicated entry. Do not treat an unrecorded value as zero.",
            owner: "Waste coordinator",
            window: "Before closing the shift",
            avoidedCost: Math.round(avoided * 0.22),
          },
        ],
        assumptions: commonAssumptions,
        baseline,
        modelNote,
      };
    }

    const delayDays = clamp(args.intensity, 1, 30);
    const repairHours = clamp(args.duration, 1, 24);
    const hourlyThroughput = DAILY_LITRES / OPERATING_HOURS;
    const failureProbability = Math.min(92, 5 + delayDays * 2.9);
    const expectedDowntime = repairHours * (failureProbability / 100);
    const productionAtRisk = hourlyThroughput * expectedDowntime;
    const ratedKw = machine?.ratedKw ?? 45;
    const extraEnergyKwh = ratedKw * 0.04 * delayDays * 8;
    const repairCost = 12_000 + delayDays * 1_100;
    const lostMargin = productionAtRisk * 46;
    const costImpact = repairCost + lostMargin + extraEnergyKwh * ENERGY_RATE;
    const score = clamp(12 + delayDays * 2.1 + repairHours * 1.1, 0, 100);
    const avoided = costImpact * 0.66;
    const machineName = machine?.name ?? "Pasteurizer PM-01";

    return {
      scenario: args.scenario,
      scenarioLabel: "Equipment maintenance delay",
      inputSummary: `${machineName} · service delayed ${round(delayDays)} day${delayDays === 1 ? "" : "s"} · ${round(repairHours)} h repair window`,
      headline: `Delaying ${machineName} service by ${round(delayDays)} days carries a ${round(failureProbability)}% failure risk and could remove ${litres(productionAtRisk)} of throughput.`,
      riskScore: round(score),
      riskLevel: riskLevel(score),
      costImpact: Math.round(costImpact),
      metrics: [
        {
          id: "probability",
          label: "Failure probability",
          value: `${round(failureProbability)}%`,
          note: "Illustrative risk from deferred service",
          tone: "danger",
        },
        {
          id: "downtime",
          label: "Expected downtime",
          value: `${round(expectedDowntime, 1)} h`,
          note: `Repair window ${round(repairHours)} h × failure risk`,
          tone: "warning",
        },
        {
          id: "production",
          label: "Throughput at risk",
          value: litres(productionAtRisk),
          note: "Milk equivalent over the expected outage",
          tone: "primary",
        },
        {
          id: "energy",
          label: "Energy penalty",
          value: `${round(extraEnergyKwh).toLocaleString("en-IN")} kWh`,
          note: "Inefficient running before service",
          tone: "warning",
        },
      ],
      timeline: buildTimeline(costImpact, Math.min(7, Math.max(1, delayDays))),
      recommendations: [
        {
          id: "book-service",
          title: `Book ${machineName} service inside the safe window`,
          detail:
            "Reserve the technician and critical spares, then schedule the service before the next high-load production run.",
          owner: "Maintenance lead",
          window: "This week",
          avoidedCost: Math.round(avoided * 0.52),
        },
        {
          id: "condition-check",
          title: "Run a condition check before the next run",
          detail:
            "Inspect vibration, seals, filters and temperature. Record the readings and escalate any abnormal trend before production starts.",
          owner: "Maintenance technician",
          window: "Before next shift",
          avoidedCost: Math.round(avoided * 0.3),
        },
        {
          id: "contingency",
          title: "Prepare a standby and transfer plan",
          detail:
            "Confirm the backup machine or transfer route and brief the shift team so a failure does not become an unplanned line stop.",
          owner: "Plant manager",
          window: "Immediate",
          avoidedCost: Math.round(avoided * 0.18),
        },
      ],
      assumptions: [
        ...commonAssumptions,
        `Maintenance scenario uses ${machineName} with an illustrative ${round(ratedKw)} kW rated load.`,
      ],
      baseline,
      modelNote,
    };
  },
});
