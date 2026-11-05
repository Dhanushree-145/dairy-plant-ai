import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/**
 * Hygiene Management.
 *
 * Base assets, tankers, people, zones and sensors are deterministic demo
 * records. Per-plant cleaning, verification, inspection and acknowledgement
 * actions are persisted in the shared Convex database. Sensor readings are
 * clearly labelled simulated unless a manual/IoT reading has been ingested.
 */

type AssetCategory = "equipment" | "tankers" | "packaging" | "laboratory" | "environment";
type HygieneCategory = AssetCategory | "employees";
type HygieneStatus =
  | "clean"
  | "cleaning"
  | "verification_pending"
  | "overdue"
  | "failed"
  | "unknown";
type EmployeeStatus =
  | "cleared"
  | "inspection_pending"
  | "corrective_action"
  | "training_renewal";
type Severity = "critical" | "high" | "medium" | "low";

const HOUR = 3_600_000;
const DAY = 86_400_000;

const CATEGORY_META: Record<HygieneCategory, { label: string; short: string }> = {
  equipment: { label: "Equipment & CIP Hygiene", short: "Equipment" },
  tankers: { label: "Tanker Hygiene", short: "Tankers" },
  employees: { label: "Employee Hygiene", short: "Employees" },
  packaging: { label: "Packaging Hygiene", short: "Packaging" },
  laboratory: { label: "Laboratory & Quality Hygiene", short: "Laboratory" },
  environment: { label: "Plant & Environmental Hygiene", short: "Plant" },
};

type DemoAsset = {
  key: string;
  category: AssetCategory;
  name: string;
  code: string;
  subtype: string;
  stage: string;
  zone: string;
  operator: string;
  sop: string;
  intervalHours: number;
  seedStatus: HygieneStatus;
  cleanedAgoHours: number;
  packagesProcessed?: number;
  packagesApproved?: number;
  details: Record<string, string>;
};

const DEMO_ASSETS: DemoAsset[] = [
  {
    key: "EQ-CIP-01",
    category: "equipment",
    name: "CIP skid 1",
    code: "CIP-01",
    subtype: "CIP system",
    stage: "Cleaning & CIP",
    zone: "Processing hall",
    operator: "R. Kulkarni",
    sop: "CIP SOP-04 · pre-rinse, 1.5% caustic at 75°C for 20 min, intermediate rinse, 1.0% acid, final rinse below 0.10 mS/cm.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 3,
    details: { loop: "Process line A", lastCycle: "CIP-1842", chemicals: "Caustic + nitric acid" },
  },
  {
    key: "EQ-PM-01",
    category: "equipment",
    name: "Pasteurizer 1",
    code: "PM-01",
    subtype: "Pasteurizer",
    stage: "Pasteurization",
    zone: "Processing hall",
    operator: "S. Patil",
    sop: "HTST SOP-02 · forward-flow verified, holding tube 72–75°C for 15 s, CIP after every run.",
    intervalHours: 16,
    seedStatus: "clean",
    cleanedAgoHours: 7,
    details: { capacity: "5,000 L/h", holdingTube: "15 s", lastBatch: "B-2405" },
  },
  {
    key: "EQ-PM-02",
    category: "equipment",
    name: "Pasteurizer 2",
    code: "PM-02",
    subtype: "Pasteurizer",
    stage: "Pasteurization",
    zone: "Processing hall",
    operator: "S. Patil",
    sop: "HTST SOP-02 · CIP verification required before the next production run.",
    intervalHours: 16,
    seedStatus: "verification_pending",
    cleanedAgoHours: 2,
    details: { capacity: "4,000 L/h", holdingTube: "15 s", lastBatch: "B-2406" },
  },
  {
    key: "EQ-HG-01",
    category: "equipment",
    name: "Homogenizer 1",
    code: "HG-01",
    subtype: "Homogenizer",
    stage: "Homogenization",
    zone: "Processing hall",
    operator: "A. Fernandes",
    sop: "HMG SOP-01 · flush with potable water, CIP at 180–220 bar bypass, inspect seals.",
    intervalHours: 16,
    seedStatus: "clean",
    cleanedAgoHours: 6,
    details: { pressure: "180–220 bar", capacity: "5,000 L/h" },
  },
  {
    key: "EQ-SP-01",
    category: "equipment",
    name: "Separator 1",
    code: "SP-01",
    subtype: "Separator",
    stage: "Standardization",
    zone: "Processing hall",
    operator: "A. Fernandes",
    sop: "SEP SOP-03 · bowl rinse, caustic circulation, bowl inspection every 500 h.",
    intervalHours: 24,
    seedStatus: "overdue",
    cleanedAgoHours: 31,
    details: { capacity: "6,000 L/h", bowlHours: "488 h" },
  },
  {
    key: "EQ-ST-01",
    category: "equipment",
    name: "Milk storage tank 1",
    code: "ST-01",
    subtype: "Storage tank",
    stage: "Chilling & storage",
    zone: "Reception bay",
    operator: "M. Joshi",
    sop: "TANK SOP-05 · rinse, caustic wash, sanitizer, drain and verify swab before filling.",
    intervalHours: 24,
    seedStatus: "clean",
    cleanedAgoHours: 9,
    details: { capacity: "10,000 L", agitator: "Running", lastSwab: "B-2398" },
  },
  {
    key: "EQ-ST-02",
    category: "equipment",
    name: "Milk storage tank 2",
    code: "ST-02",
    subtype: "Storage tank",
    stage: "Chilling & storage",
    zone: "Reception bay",
    operator: "M. Joshi",
    sop: "TANK SOP-05 · automated CIP in progress.",
    intervalHours: 24,
    seedStatus: "cleaning",
    cleanedAgoHours: 0.5,
    details: { capacity: "10,000 L", agitator: "Stopped", cycle: "CIP-1846" },
  },
  {
    key: "EQ-PU-01",
    category: "equipment",
    name: "Transfer pump 1",
    code: "PU-01",
    subtype: "Pump",
    stage: "Milk transfer",
    zone: "Reception bay",
    operator: "V. Rao",
    sop: "PUMP SOP-01 · back-flush, caustic recirculation, seal inspection after CIP.",
    intervalHours: 24,
    seedStatus: "clean",
    cleanedAgoHours: 11,
    details: { capacity: "400 L/min", seals: "Inspected" },
  },
  {
    key: "EQ-PL-01",
    category: "equipment",
    name: "Process pipeline A",
    code: "PL-01",
    subtype: "Pipeline",
    stage: "Milk transfer",
    zone: "Processing hall",
    operator: "R. Kulkarni",
    sop: "LINE SOP-02 · CIP loop with flow above 180 L/min and final conductivity below 0.10 mS/cm.",
    intervalHours: 12,
    seedStatus: "failed",
    cleanedAgoHours: 14,
    details: { length: "42 m", lastCycle: "CIP-1841", deviation: "Final rinse conductivity high" },
  },
  {
    key: "EQ-VV-01",
    category: "equipment",
    name: "Mix-proof valve bank",
    code: "VV-01",
    subtype: "Valves",
    stage: "Milk transfer",
    zone: "Processing hall",
    operator: "V. Rao",
    sop: "VALVE SOP-07 · seat lift check, CIP circulation and leak test after maintenance.",
    intervalHours: 24,
    seedStatus: "verification_pending",
    cleanedAgoHours: 4,
    details: { valves: "14", lastLeakTest: "Pending QA" },
  },
  {
    key: "EQ-FL-01",
    category: "equipment",
    name: "Filtration unit 1",
    code: "FL-01",
    subtype: "Filter",
    stage: "Filtration",
    zone: "Reception bay",
    operator: "M. Joshi",
    sop: "FILTER SOP-01 · housing rinse, filter change verification and swab before use.",
    intervalHours: 12,
    seedStatus: "unknown",
    cleanedAgoHours: 0,
    details: { housing: "Duplex", filterChange: "Overdue check" },
  },
  {
    key: "EQ-HX-01",
    category: "equipment",
    name: "Plate heat exchanger",
    code: "HX-01",
    subtype: "Heat exchanger",
    stage: "Pasteurization",
    zone: "Processing hall",
    operator: "S. Patil",
    sop: "HX SOP-02 · CIP both sides, inspect plate pack and record pressure drop.",
    intervalHours: 16,
    seedStatus: "clean",
    cleanedAgoHours: 8,
    details: { plates: "84", pressureDrop: "0.8 bar" },
  },
  {
    key: "EQ-CIP-02",
    category: "equipment",
    name: "Post-maintenance CIP skid",
    code: "CIP-02",
    subtype: "CIP system",
    stage: "Cleaning & CIP",
    zone: "Maintenance bay",
    operator: "R. Kulkarni",
    sop: "MAINT SOP-01 · full CIP after intrusive maintenance and QA release before production.",
    intervalHours: 8,
    seedStatus: "cleaning",
    cleanedAgoHours: 0.2,
    details: { loop: "Maintenance bay", lastWorkOrder: "WO-884" },
  },

  // Tankers -------------------------------------------------------------
  {
    key: "TK-MH12AB4521",
    category: "tankers",
    name: "Tanker MH-12-AB-4521",
    code: "MH-12-AB-4521",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "D. Shinde",
    sop: "TANKER SOP-01 · external wash, internal CIP, seal check, QA inspection before unloading.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 3,
    details: {
      registration: "MH-12-AB-4521",
      previousProduct: "Raw milk",
      procedure: "CIP caustic + sanitizer",
      inspection: "Passed",
      qaApproval: "Approved · 06:20",
    },
  },
  {
    key: "TK-MH14CD7782",
    category: "tankers",
    name: "Tanker MH-14-CD-7782",
    code: "MH-14-CD-7782",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "D. Shinde",
    sop: "TANKER SOP-01 · cleaning is overdue before the next raw milk load.",
    intervalHours: 12,
    seedStatus: "overdue",
    cleanedAgoHours: 17,
    details: {
      registration: "MH-14-CD-7782",
      previousProduct: "Standardized milk",
      procedure: "CIP overdue",
      inspection: "Pending",
      qaApproval: "Hold",
    },
  },
  {
    key: "TK-GJ05EF1903",
    category: "tankers",
    name: "Tanker GJ-05-EF-1903",
    code: "GJ-05-EF-1903",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "K. Pawar",
    sop: "TANKER SOP-01 · CIP in progress after cream delivery.",
    intervalHours: 12,
    seedStatus: "cleaning",
    cleanedAgoHours: 0.4,
    details: {
      registration: "GJ-05-EF-1903",
      previousProduct: "Cream",
      procedure: "CIP in progress",
      inspection: "Pending",
      qaApproval: "Hold",
    },
  },
  {
    key: "TK-MH20GH3344",
    category: "tankers",
    name: "Tanker MH-20-GH-3344",
    code: "MH-20-GH-3344",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "K. Pawar",
    sop: "TANKER SOP-01 · cleaning completed, QA swab verification pending.",
    intervalHours: 12,
    seedStatus: "verification_pending",
    cleanedAgoHours: 1.5,
    details: {
      registration: "MH-20-GH-3344",
      previousProduct: "Raw milk",
      procedure: "Caustic CIP + sanitizer",
      inspection: "Visual passed",
      qaApproval: "Awaiting swab review",
    },
  },
  {
    key: "TK-KA01IJ9087",
    category: "tankers",
    name: "Tanker KA-01-IJ-9087",
    code: "KA-01-IJ-9087",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "D. Shinde",
    sop: "TANKER SOP-01 · failed internal inspection, not cleared for food contact.",
    intervalHours: 12,
    seedStatus: "failed",
    cleanedAgoHours: 9,
    details: {
      registration: "KA-01-IJ-9087",
      previousProduct: "Curd culture",
      procedure: "Manual wash",
      inspection: "Failed · lid seal residue",
      qaApproval: "Rejected",
    },
  },
  {
    key: "TK-MH12KL5520",
    category: "tankers",
    name: "Tanker MH-12-KL-5520",
    code: "MH-12-KL-5520",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "V. Rao",
    sop: "TANKER SOP-01 · CIP and QA approved.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 5,
    details: {
      registration: "MH-12-KL-5520",
      previousProduct: "Raw milk",
      procedure: "CIP caustic + acid",
      inspection: "Passed",
      qaApproval: "Approved · 05:10",
    },
  },
  {
    key: "TK-GJ18MN4410",
    category: "tankers",
    name: "Tanker GJ-18-MN-4410",
    code: "GJ-18-MN-4410",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "V. Rao",
    sop: "TANKER SOP-01 · CIP and QA approved.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 7,
    details: {
      registration: "GJ-18-MN-4410",
      previousProduct: "Buttermilk",
      procedure: "CIP caustic + sanitizer",
      inspection: "Passed",
      qaApproval: "Approved · 04:55",
    },
  },
  {
    key: "TK-MH22OP6632",
    category: "tankers",
    name: "Tanker MH-22-OP-6632",
    code: "MH-22-OP-6632",
    subtype: "Road tanker",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "M. Joshi",
    sop: "TANKER SOP-01 · cleaning due before the evening intake.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 10,
    details: {
      registration: "MH-22-OP-6632",
      previousProduct: "Raw milk",
      procedure: "CIP caustic + sanitizer",
      inspection: "Passed",
      qaApproval: "Approved · 02:40",
    },
  },

  // Packaging -----------------------------------------------------------
  {
    key: "PK-POUCH-01",
    category: "packaging",
    name: "Pouch packaging machine 1",
    code: "PK-POUCH-01",
    subtype: "Pouch packaging machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "PACK SOP-02 · food-contact surfaces cleaned and swabbed every shift.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 2,
    packagesProcessed: 42_800,
    packagesApproved: 41_900,
    details: { batches: "B-2405, B-2406", surfaceInspection: "Passed", film: "500 ml" },
  },
  {
    key: "PK-POUCH-02",
    category: "packaging",
    name: "Pouch packaging machine 2",
    code: "PK-POUCH-02",
    subtype: "Pouch packaging machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "PACK SOP-02 · failed seal-area swab, corrective cleaning required.",
    intervalHours: 8,
    seedStatus: "failed",
    cleanedAgoHours: 12,
    packagesProcessed: 38_450,
    packagesApproved: 0,
    details: { batches: "B-2404", surfaceInspection: "Failed · seal residue", film: "200 ml" },
  },
  {
    key: "PK-BOTTLE-01",
    category: "packaging",
    name: "Bottle filling line 1",
    code: "PK-BOTTLE-01",
    subtype: "Bottle filling machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "N. Shaikh",
    sop: "PACK SOP-03 · filler nozzles cleaned, rinsed and verified before start-up.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 3,
    packagesProcessed: 12_400,
    packagesApproved: 12_100,
    details: { batches: "B-2403", surfaceInspection: "Passed", format: "1 L bottle" },
  },
  {
    key: "PK-WASH-01",
    category: "packaging",
    name: "Bottle washing machine",
    code: "PK-WASH-01",
    subtype: "Bottle washing machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "N. Shaikh",
    sop: "WASH SOP-01 · caustic wash at 60°C, rinse and sanitizer verification.",
    intervalHours: 8,
    seedStatus: "cleaning",
    cleanedAgoHours: 0.3,
    packagesProcessed: 9_800,
    packagesApproved: 0,
    details: { batches: "B-2402", surfaceInspection: "Pending", format: "1 L bottle" },
  },
  {
    key: "PK-SEAL-01",
    category: "packaging",
    name: "Sealing machine 1",
    code: "PK-SEAL-01",
    subtype: "Sealing machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "PACK SOP-04 · jaw cleaning and seal integrity check before production.",
    intervalHours: 8,
    seedStatus: "verification_pending",
    cleanedAgoHours: 1,
    packagesProcessed: 19_800,
    packagesApproved: 0,
    details: { batches: "B-2401", surfaceInspection: "Passed", sealCheck: "Awaiting QA" },
  },
  {
    key: "PK-CAP-01",
    category: "packaging",
    name: "Capping machine 1",
    code: "PK-CAP-01",
    subtype: "Capping machine",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "N. Shaikh",
    sop: "PACK SOP-05 · cap chute cleaned and inspected every shift.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 2.5,
    packagesProcessed: 18_900,
    packagesApproved: 18_500,
    details: { batches: "B-2400", surfaceInspection: "Passed" },
  },
  {
    key: "PK-CONV-01",
    category: "packaging",
    name: "Packaging conveyor A",
    code: "PK-CONV-01",
    subtype: "Conveyor",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "PACK SOP-06 · belt and guide rails cleaned and sanitized after every shift.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 4,
    packagesProcessed: 65_000,
    packagesApproved: 63_000,
    details: { batches: "B-2398 to B-2406", surfaceInspection: "Passed" },
  },
  {
    key: "PK-MAT-01",
    category: "packaging",
    name: "Packaging film store",
    code: "PK-MAT-01",
    subtype: "Packaging material",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "S. Patil",
    sop: "MAT SOP-01 · film kept sealed on pallets, 15 cm off the floor, first-in-first-out.",
    intervalHours: 24,
    seedStatus: "overdue",
    cleanedAgoHours: 27,
    details: { batches: "B-2404, B-2406", surfaceInspection: "Due" },
  },
  {
    key: "PK-SURF-01",
    category: "packaging",
    name: "Pouch filler contact surfaces",
    code: "PK-SURF-01",
    subtype: "Product-contact surface",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "SURF SOP-01 · ATP swab below 150 RLU before production start.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 2,
    details: { batches: "B-2405", surfaceInspection: "ATP 42 RLU" },
  },

  // Laboratory ---------------------------------------------------------
  {
    key: "LB-ATP-01",
    category: "laboratory",
    name: "ATP luminometer",
    code: "LB-ATP-01",
    subtype: "Testing equipment",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "Dr. A. Deshpande",
    sop: "LAB SOP-01 · calibrate daily, swab food-contact surfaces before production.",
    intervalHours: 48,
    seedStatus: "clean",
    cleanedAgoHours: 15,
    details: { calibrationDue: "12 days", serial: "ATP-2231", method: "ATP swab" },
  },
  {
    key: "LB-INC-01",
    category: "laboratory",
    name: "Laboratory incubator 1",
    code: "LB-INC-01",
    subtype: "Incubator",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "T. Menon",
    sop: "LAB SOP-02 · daily temperature check, internal cleaning and calibration log.",
    intervalHours: 48,
    seedStatus: "verification_pending",
    cleanedAgoHours: 3,
    details: { calibrationDue: "4 days", temperature: "36.2°C", sensor: "SEN-INC-TEMP" },
  },
  {
    key: "LB-REF-01",
    category: "laboratory",
    name: "Laboratory refrigerator",
    code: "LB-REF-01",
    subtype: "Refrigerator",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "T. Menon",
    sop: "LAB SOP-03 · 2–8°C, daily temperature review and monthly deep clean.",
    intervalHours: 72,
    seedStatus: "clean",
    cleanedAgoHours: 18,
    details: { temperature: "4.1°C", samples: "12", calibrationDue: "19 days" },
  },
  {
    key: "LB-AUT-01",
    category: "laboratory",
    name: "Autoclave 1",
    code: "LB-AUT-01",
    subtype: "Autoclave",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "Dr. A. Deshpande",
    sop: "LAB SOP-04 · weekly chamber cleaning and autoclave validation every 90 days.",
    intervalHours: 168,
    seedStatus: "overdue",
    cleanedAgoHours: 190,
    details: { calibrationDue: "Overdue by 2 days", cycles: "6" },
  },
  {
    key: "LB-MIC-01",
    category: "laboratory",
    name: "Microscope station",
    code: "LB-MIC-01",
    subtype: "Testing equipment",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "T. Menon",
    sop: "LAB SOP-05 · lens and stage cleaning after every sample set.",
    intervalHours: 72,
    seedStatus: "clean",
    cleanedAgoHours: 20,
    details: { calibrationDue: "27 days" },
  },
  {
    key: "LB-GLS-01",
    category: "laboratory",
    name: "Glassware washer",
    code: "LB-GLS-01",
    subtype: "Glassware cleaning",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "T. Menon",
    sop: "LAB SOP-06 · validated wash cycle, final rinse conductivity below 0.10 mS/cm.",
    intervalHours: 24,
    seedStatus: "failed",
    cleanedAgoHours: 11,
    details: { calibrationDue: "21 days", deviation: "Final rinse alarm" },
  },
  {
    key: "LB-SAMP-01",
    category: "laboratory",
    name: "Sample storage cabinet",
    code: "LB-SAMP-01",
    subtype: "Sample storage",
    stage: "Quality laboratory",
    zone: "Quality laboratory",
    operator: "Dr. A. Deshpande",
    sop: "LAB SOP-07 · samples segregated by batch, retained for 72 h at 2–8°C.",
    intervalHours: 48,
    seedStatus: "clean",
    cleanedAgoHours: 14,
    details: { samples: "18", calibrationDue: "Not applicable" },
  },
  {
    key: "LB-WAT-01",
    category: "laboratory",
    name: "Water testing bench",
    code: "LB-WAT-01",
    subtype: "Water quality",
    stage: "Water testing",
    zone: "Quality laboratory",
    operator: "Dr. A. Deshpande",
    sop: "WATER SOP-01 · pH, turbidity and residual chlorine checked every shift.",
    intervalHours: 24,
    seedStatus: "clean",
    cleanedAgoHours: 6,
    details: { calibrationDue: "8 days", lastWaterSample: "W-1182" },
  },

  // Plant & environmental zones ----------------------------------------
  {
    key: "ZN-RECV",
    category: "environment",
    name: "Raw milk receiving area",
    code: "Z-RECV",
    subtype: "Production zone",
    stage: "Raw milk reception",
    zone: "Reception bay",
    operator: "D. Shinde",
    sop: "ZONE SOP-01 · floor wash and drain flush after every intake window.",
    intervalHours: 12,
    seedStatus: "clean",
    cleanedAgoHours: 4,
    details: {
      supervisor: "D. Shinde",
      schedule: "Every intake window",
      checklist: "Floors, drains, hose points, tanker bay",
      water: "Potable · verified",
      pest: "No activity",
      deviations: "0",
    },
  },
  {
    key: "ZN-PROC",
    category: "environment",
    name: "Processing hall",
    code: "Z-PROC",
    subtype: "Production zone",
    stage: "Processing",
    zone: "Processing hall",
    operator: "R. Kulkarni",
    sop: "ZONE SOP-02 · wet-clean floors, sanitize contact surfaces and check drains.",
    intervalHours: 8,
    seedStatus: "verification_pending",
    cleanedAgoHours: 2,
    details: {
      supervisor: "R. Kulkarni",
      schedule: "Every 8 hours",
      checklist: "Floors, walls, drains, CIP station, overheads",
      water: "Potable · verified",
      pest: "No activity",
      deviations: "1 open",
    },
  },
  {
    key: "ZN-PACK",
    category: "environment",
    name: "Packaging hall",
    code: "Z-PACK",
    subtype: "Production zone",
    stage: "Packaging",
    zone: "Packaging hall",
    operator: "P. Naik",
    sop: "ZONE SOP-03 · dry-clean conveyors, sanitize workstations, control air quality.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 3,
    details: {
      supervisor: "P. Naik",
      schedule: "Every 8 hours",
      checklist: "Conveyors, workstations, air handling, waste bins",
      water: "Not applicable",
      pest: "No activity",
      deviations: "0",
    },
  },
  {
    key: "ZN-FIN",
    category: "environment",
    name: "Finished-product storage",
    code: "Z-FIN",
    subtype: "Storage zone",
    stage: "Finished storage",
    zone: "Finished goods",
    operator: "S. Patil",
    sop: "ZONE SOP-04 · pallet spacing, floor cleaning and first-expiry-first-out checks.",
    intervalHours: 24,
    seedStatus: "clean",
    cleanedAgoHours: 8,
    details: {
      supervisor: "S. Patil",
      schedule: "Daily",
      checklist: "Floors, pallets, racking, pest monitors",
      water: "Not applicable",
      pest: "No activity",
      deviations: "0",
    },
  },
  {
    key: "ZN-COLD",
    category: "environment",
    name: "Cold storage",
    code: "Z-COLD",
    subtype: "Cold chain",
    stage: "Cold storage",
    zone: "Cold storage",
    operator: "M. Joshi",
    sop: "ZONE SOP-05 · 2–4°C, door seals, condensate drain and evaporator cleaning.",
    intervalHours: 12,
    seedStatus: "failed",
    cleanedAgoHours: 13,
    details: {
      supervisor: "M. Joshi",
      schedule: "Every 12 hours",
      checklist: "Temperature, seals, drains, evaporator, product spacing",
      water: "Not applicable",
      pest: "No activity",
      deviations: "1 critical",
    },
  },
  {
    key: "ZN-FLOOR",
    category: "environment",
    name: "Floors and drainage",
    code: "Z-FLOOR",
    subtype: "Infrastructure",
    stage: "Plant environment",
    zone: "Whole plant",
    operator: "K. Pawar",
    sop: "ZONE SOP-06 · floor wash, drain flush and grease-trap inspection every shift.",
    intervalHours: 8,
    seedStatus: "overdue",
    cleanedAgoHours: 11,
    details: {
      supervisor: "K. Pawar",
      schedule: "Every shift",
      checklist: "Floors, drains, traps, slopes, standing water",
      water: "Not applicable",
      pest: "Monitor 1 due",
      deviations: "2 open",
    },
  },
  {
    key: "ZN-WASTE",
    category: "environment",
    name: "Waste handling area",
    code: "Z-WASTE",
    subtype: "Waste area",
    stage: "Waste handling",
    zone: "Waste yard",
    operator: "D. Shinde",
    sop: "ZONE SOP-07 · segregated bins, washdown, pest control and collection confirmation.",
    intervalHours: 8,
    seedStatus: "overdue",
    cleanedAgoHours: 12,
    details: {
      supervisor: "D. Shinde",
      schedule: "Every 8 hours",
      checklist: "Bins, covers, floor wash, leachate, collection log",
      water: "Not applicable",
      pest: "Activity suspected",
      deviations: "3 open",
    },
  },
  {
    key: "ZN-WATER",
    category: "environment",
    name: "Water storage & distribution",
    code: "Z-WATER",
    subtype: "Utilities",
    stage: "Water supply",
    zone: "Utilities",
    operator: "V. Rao",
    sop: "WATER SOP-02 · tank inspection, chlorine residual and distribution line flush.",
    intervalHours: 24,
    seedStatus: "verification_pending",
    cleanedAgoHours: 5,
    details: {
      supervisor: "V. Rao",
      schedule: "Daily",
      checklist: "Tank, pump, lines, chlorine residual, backflow",
      water: "pH 6.8 · turbidity 1.2 NTU · chlorine pending",
      pest: "No activity",
      deviations: "1 open",
    },
  },
  {
    key: "ZN-PEST",
    category: "environment",
    name: "Pest-control stations",
    code: "Z-PEST",
    subtype: "Pest control",
    stage: "Plant environment",
    zone: "Whole plant",
    operator: "K. Pawar",
    sop: "PEST SOP-01 · monthly station inspection and trend review by a licensed contractor.",
    intervalHours: 168,
    seedStatus: "clean",
    cleanedAgoHours: 20,
    details: {
      supervisor: "K. Pawar",
      schedule: "Monthly contractor visit",
      checklist: "Bait stations, fly catchers, entry points, activity log",
      water: "Not applicable",
      pest: "No activity",
      deviations: "0",
    },
  },
  {
    key: "ZN-CHANGE",
    category: "environment",
    name: "Employee changing rooms",
    code: "Z-CHANGE",
    subtype: "Personnel area",
    stage: "Personnel hygiene",
    zone: "Amenities",
    operator: "A. Fernandes",
    sop: "ZONE SOP-08 · locker room, hand-wash and PPE storage cleaning every shift.",
    intervalHours: 8,
    seedStatus: "clean",
    cleanedAgoHours: 2,
    details: {
      supervisor: "A. Fernandes",
      schedule: "Every shift",
      checklist: "Lockers, washbasins, PPE hooks, footwear stations",
      water: "Potable · verified",
      pest: "No activity",
      deviations: "0",
    },
  },
];

type EmployeeCheck = {
  protectiveClothing: boolean;
  hairCovering: boolean;
  footwear: boolean;
  jewellery: boolean;
  handHygiene: boolean;
};

type DemoEmployee = {
  key: string;
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  zone: string;
  seedStatus: EmployeeStatus;
  lastInspectionHoursAgo: number;
  trainingDueDays: number;
  checks: EmployeeCheck;
};

const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    key: "EMP-101",
    name: "Rohit Kulkarni",
    employeeId: "EMP-101",
    designation: "CIP operator",
    department: "Processing",
    zone: "Processing hall",
    seedStatus: "cleared",
    lastInspectionHoursAgo: 3,
    trainingDueDays: 42,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-102",
    name: "Sneha Patil",
    employeeId: "EMP-102",
    designation: "Shift supervisor",
    department: "Processing",
    zone: "Processing hall",
    seedStatus: "cleared",
    lastInspectionHoursAgo: 4,
    trainingDueDays: 67,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-103",
    name: "Amit Fernandes",
    employeeId: "EMP-103",
    designation: "Homogenizer operator",
    department: "Processing",
    zone: "Processing hall",
    seedStatus: "inspection_pending",
    lastInspectionHoursAgo: 14,
    trainingDueDays: 31,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: true, handHygiene: true },
  },
  {
    key: "EMP-104",
    name: "Minal Joshi",
    employeeId: "EMP-104",
    designation: "Tank farm operator",
    department: "Reception",
    zone: "Reception bay",
    seedStatus: "corrective_action",
    lastInspectionHoursAgo: 6,
    trainingDueDays: 22,
    checks: { protectiveClothing: false, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-105",
    name: "Vivek Rao",
    employeeId: "EMP-105",
    designation: "Maintenance technician",
    department: "Engineering",
    zone: "Maintenance bay",
    seedStatus: "cleared",
    lastInspectionHoursAgo: 2,
    trainingDueDays: 88,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-106",
    name: "Priya Naik",
    employeeId: "EMP-106",
    designation: "Packaging operator",
    department: "Packaging",
    zone: "Packaging hall",
    seedStatus: "corrective_action",
    lastInspectionHoursAgo: 5,
    trainingDueDays: 15,
    checks: { protectiveClothing: true, hairCovering: false, footwear: true, jewellery: true, handHygiene: true },
  },
  {
    key: "EMP-107",
    name: "Nadeem Shaikh",
    employeeId: "EMP-107",
    designation: "Bottle line operator",
    department: "Packaging",
    zone: "Packaging hall",
    seedStatus: "cleared",
    lastInspectionHoursAgo: 3,
    trainingDueDays: 59,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-108",
    name: "Tanvi Menon",
    employeeId: "EMP-108",
    designation: "Laboratory analyst",
    department: "Quality",
    zone: "Quality laboratory",
    seedStatus: "inspection_pending",
    lastInspectionHoursAgo: 16,
    trainingDueDays: 9,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: true, handHygiene: true },
  },
  {
    key: "EMP-109",
    name: "Dr. Arjun Deshpande",
    employeeId: "EMP-109",
    designation: "QA manager",
    department: "Quality",
    zone: "Quality laboratory",
    seedStatus: "cleared",
    lastInspectionHoursAgo: 1,
    trainingDueDays: 104,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
  {
    key: "EMP-110",
    name: "Kavita Pawar",
    employeeId: "EMP-110",
    designation: "Sanitation supervisor",
    department: "Sanitation",
    zone: "Whole plant",
    seedStatus: "training_renewal",
    lastInspectionHoursAgo: 4,
    trainingDueDays: -3,
    checks: { protectiveClothing: true, hairCovering: true, footwear: true, jewellery: false, handHygiene: true },
  },
];

type DemoLabSample = {
  key: string;
  sampleId: string;
  location: string;
  testType: "ATP" | "Surface swab" | "Microbiological" | "Residual chemical" | "Water quality";
  parameter: string;
  unit: string;
  reading: number;
  limit: number;
  interpretation: string;
  status: "satisfactory" | "unsatisfactory" | "pending_review" | "pending_sample";
  collectedAgoHours: number;
  reportName: string;
  analyst: string;
};

const DEMO_SAMPLES: DemoLabSample[] = [
  {
    key: "SMP-1181",
    sampleId: "ATP-1181",
    location: "Pouch filler contact surface",
    testType: "ATP",
    parameter: "ATP bioluminescence",
    unit: "RLU",
    reading: 42,
    limit: 150,
    interpretation: "Within action limit",
    status: "satisfactory",
    collectedAgoHours: 3,
    reportName: "ATP-1181-report.pdf",
    analyst: "T. Menon",
  },
  {
    key: "SMP-1182",
    sampleId: "SWAB-1182",
    location: "Pasteurizer 2 outlet valve",
    testType: "Surface swab",
    parameter: "Total colony count",
    unit: "CFU/cm²",
    reading: 18,
    limit: 25,
    interpretation: "QA reviewed · acceptable",
    status: "satisfactory",
    collectedAgoHours: 5,
    reportName: "SWAB-1182-report.pdf",
    analyst: "T. Menon",
  },
  {
    key: "SMP-1183",
    sampleId: "MIC-1183",
    location: "Cold storage condensate tray",
    testType: "Microbiological",
    parameter: "Listeria spp.",
    unit: "presence",
    reading: 1,
    limit: 0,
    interpretation: "Unsatisfactory · corrective action raised",
    status: "unsatisfactory",
    collectedAgoHours: 9,
    reportName: "MIC-1183-report.pdf",
    analyst: "Dr. A. Deshpande",
  },
  {
    key: "SMP-1184",
    sampleId: "RES-1184",
    location: "Final CIP rinse · line A",
    testType: "Residual chemical",
    parameter: "Caustic residue",
    unit: "ppm",
    reading: 32,
    limit: 50,
    interpretation: "Report uploaded · QA review pending",
    status: "pending_review",
    collectedAgoHours: 2,
    reportName: "RES-1184-report.pdf",
    analyst: "T. Menon",
  },
  {
    key: "SMP-1185",
    sampleId: "WAT-1185",
    location: "Water distribution sample point",
    testType: "Water quality",
    parameter: "Turbidity",
    unit: "NTU",
    reading: 1.2,
    limit: 5,
    interpretation: "QA reviewed · acceptable",
    status: "satisfactory",
    collectedAgoHours: 7,
    reportName: "WAT-1185-report.pdf",
    analyst: "Dr. A. Deshpande",
  },
  {
    key: "SMP-1186",
    sampleId: "MIC-1186",
    location: "Bottle washer final rinse",
    testType: "Microbiological",
    parameter: "Coliform count",
    unit: "CFU/100 ml",
    reading: 0,
    limit: 0,
    interpretation: "Report uploaded · QA review pending",
    status: "pending_review",
    collectedAgoHours: 4,
    reportName: "MIC-1186-report.pdf",
    analyst: "T. Menon",
  },
  {
    key: "SMP-1187",
    sampleId: "SWAB-1187",
    location: "Capping machine chute",
    testType: "Surface swab",
    parameter: "Total colony count",
    unit: "CFU/cm²",
    reading: 9,
    limit: 25,
    interpretation: "Pending sample collection",
    status: "pending_sample",
    collectedAgoHours: 1,
    reportName: "Awaiting collection",
    analyst: "T. Menon",
  },
  {
    key: "SMP-1188",
    sampleId: "ATP-1188",
    location: "Tanker 5 outlet",
    testType: "ATP",
    parameter: "ATP bioluminescence",
    unit: "RLU",
    reading: 210,
    limit: 150,
    interpretation: "Unsatisfactory · tanker held",
    status: "unsatisfactory",
    collectedAgoHours: 6,
    reportName: "ATP-1188-report.pdf",
    analyst: "Dr. A. Deshpande",
  },
];

type DemoSensor = {
  key: string;
  label: string;
  type: string;
  assetKey: string;
  unit: string;
  min: number;
  max: number;
  offline?: boolean;
  demoValue?: number;
};

const DEMO_SENSORS: DemoSensor[] = [
  { key: "SEN-CIP-TEMP", label: "CIP caustic temperature", type: "temperature", assetKey: "EQ-CIP-01", unit: "°C", min: 70, max: 80 },
  { key: "SEN-CIP-FLOW", label: "CIP circulation flow", type: "flow", assetKey: "EQ-CIP-01", unit: "L/min", min: 180, max: 240 },
  { key: "SEN-CIP-COND", label: "CIP caustic conductivity", type: "conductivity", assetKey: "EQ-CIP-01", unit: "mS/cm", min: 1.2, max: 1.8, demoValue: 2.1 },
  { key: "SEN-PM-TEMP", label: "Pasteurizer outlet temperature", type: "temperature", assetKey: "EQ-PM-01", unit: "°C", min: 72, max: 75 },
  { key: "SEN-HG-PRESS", label: "Homogenizer pressure", type: "pressure", assetKey: "EQ-HG-01", unit: "bar", min: 160, max: 220 },
  { key: "SEN-ST-LEVEL", label: "Storage tank 1 level", type: "tank_level", assetKey: "EQ-ST-01", unit: "%", min: 20, max: 90 },
  { key: "SEN-COLD-TEMP", label: "Cold room temperature", type: "temperature", assetKey: "ZN-COLD", unit: "°C", min: 2, max: 4, demoValue: 5.8 },
  { key: "SEN-COLD-HUM", label: "Cold room humidity", type: "environmental", assetKey: "ZN-COLD", unit: "%", min: 75, max: 92 },
  { key: "SEN-LAB-FRIDGE", label: "Laboratory fridge temperature", type: "temperature", assetKey: "LB-REF-01", unit: "°C", min: 2, max: 8 },
  { key: "SEN-INC-TEMP", label: "Incubator temperature", type: "temperature", assetKey: "LB-INC-01", unit: "°C", min: 35, max: 39, offline: true },
  { key: "SEN-WATER-PH", label: "Water distribution pH", type: "pH", assetKey: "ZN-WATER", unit: "pH", min: 6.5, max: 8.5 },
  { key: "SEN-WATER-TURB", label: "Water turbidity", type: "turbidity", assetKey: "ZN-WATER", unit: "NTU", min: 0, max: 5 },
  { key: "SEN-WATER-LEVEL", label: "Water tank level", type: "tank_level", assetKey: "ZN-WATER", unit: "%", min: 25, max: 95 },
  { key: "SEN-WASTE-PH", label: "Wastewater pH", type: "pH", assetKey: "ZN-WASTE", unit: "pH", min: 6.5, max: 9 },
  { key: "SEN-PACK-HUM", label: "Packaging hall humidity", type: "environmental", assetKey: "ZN-PACK", unit: "%", min: 45, max: 65 },
  { key: "SEN-TANKER-COND", label: "Tanker final rinse conductivity", type: "conductivity", assetKey: "TK-GJ05EF1903", unit: "mS/cm", min: 0.5, max: 1.5 },
];

const STATUS_LABELS: Record<HygieneStatus, string> = {
  clean: "Clean & verified",
  cleaning: "Cleaning in progress",
  verification_pending: "Verification pending",
  overdue: "Cleaning overdue",
  failed: "Cleaning failure",
  unknown: "Unknown / no evidence",
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AssetState = Doc<"hygieneAssetStates">;
type EmployeeState = Doc<"hygieneEmployeeStates">;
type AlertState = Doc<"hygieneAlertStates">;
type SampleState = Doc<"hygieneSampleStates">;

function assetStatus(
  demo: DemoAsset,
  now: number,
  state?: AssetState,
): HygieneStatus {
  const last = state?.lastCleanedAt ?? (demo.seedStatus === "unknown" ? null : now - demo.cleanedAgoHours * HOUR);
  const next = state?.nextCleaningAt ?? (last ? last + demo.intervalHours * HOUR : null);
  let status: HygieneStatus = (state?.status as HygieneStatus | undefined) ?? demo.seedStatus;

  if (status === "clean" && next !== null && next < now - HOUR) {
    status = "overdue";
  }
  if (status === "overdue" && next !== null && next > now) {
    status = "clean";
  }

  return status;
}

function buildAsset(demo: DemoAsset, now: number, state?: AssetState) {
  const status = assetStatus(demo, now, state);
  const lastCleanedAt =
    state?.lastCleanedAt ??
    (demo.seedStatus === "unknown" ? null : now - demo.cleanedAgoHours * HOUR);
  const nextCleaningAt =
    state?.nextCleaningAt ??
    (lastCleanedAt ? lastCleanedAt + demo.intervalHours * HOUR : null);
  const verificationStatus =
    state?.verificationStatus ??
    (status === "clean"
      ? "approved"
      : status === "verification_pending"
        ? "pending"
        : status === "failed"
          ? "rejected"
          : status === "unknown"
            ? "unknown"
            : "not_required");

  return {
    ...demo,
    status,
    statusLabel: STATUS_LABELS[status],
    lastCleanedAt,
    nextCleaningAt,
    verificationStatus,
    verifiedAt: state?.verifiedAt ?? (status === "clean" && lastCleanedAt ? lastCleanedAt + HOUR : null),
    verifiedBy: state?.verifiedBy ?? (status === "clean" ? "Dr. A. Deshpande (QA)" : null),
    stateNotes: state?.notes ?? null,
    updatedAt: state?.updatedAt ?? null,
  };
}
type EffectiveAsset = ReturnType<typeof buildAsset>;

function employeeStatus(demo: DemoEmployee, state?: EmployeeState): EmployeeStatus {
  return (state?.status as EmployeeStatus | undefined) ?? demo.seedStatus;
}

function buildEmployee(demo: DemoEmployee, now: number, state?: EmployeeState) {
  const status = employeeStatus(demo, state);
  const trainingDueAt = state?.trainingDueAt ?? now + demo.trainingDueDays * DAY;
  const lastInspectionAt = state?.lastInspectionAt ?? now - demo.lastInspectionHoursAgo * HOUR;
  const effectiveStatus: EmployeeStatus =
    status === "training_renewal" && trainingDueAt > now ? "cleared" : status;
  return {
    ...demo,
    status: effectiveStatus,
    lastInspectionAt,
    trainingDueAt,
    stateNotes: state?.notes ?? null,
  };
}
type EffectiveEmployee = ReturnType<typeof buildEmployee>;

type SensorRead = {
  value: number;
  recordedAt: number;
  source: "iot" | "manual" | "simulated";
};

function buildSensors(
  now: number,
  stored: Doc<"hygieneSensorReadings">[],
  assets: EffectiveAsset[],
) {
  const latest = new Map<string, SensorRead>();
  for (const reading of stored) {
    const existing = latest.get(reading.sensorKey);
    if (!existing || reading.recordedAt > existing.recordedAt) {
      latest.set(reading.sensorKey, {
        value: reading.value,
        recordedAt: reading.recordedAt,
        source: reading.source,
      });
    }
  }

  return DEMO_SENSORS.map((sensor) => {
    const asset = assets.find((item) => item.key === sensor.assetKey);
    const seed = hashString(sensor.key);
    const bucket = Math.floor(now / (20 * 60_000));
    const span = sensor.max - sensor.min;
    const simulated = sensor.demoValue ?? sensor.min + noise(seed + bucket * 2.71) * span;
    const storedRead = latest.get(sensor.key);
    const value = storedRead?.value ?? round(simulated, 2);
    const outOfRange = value < sensor.min || value > sensor.max;
    const stale = sensor.offline === true;
    const lastSeen = storedRead?.recordedAt ??
      (stale ? now - (150 + Math.round(noise(seed + 9) * 90)) * 60_000 : now - Math.round(noise(seed + bucket) * 3) * 60_000);
    const history = Array.from({ length: 24 }, (_, index) => {
      const age = 23 - index;
      return {
        label: hourLabel(now - age * HOUR),
        value: round(
          sensor.demoValue ??
            sensor.min + noise(seed + (bucket - age) * 2.71) * span,
          2,
        ),
      };
    });
    if (history.length > 0) history[history.length - 1].value = value;

    return {
      ...sensor,
      assetName: asset?.name ?? "Unassigned asset",
      assetCode: asset?.code ?? "—",
      value,
      lastSeen,
      status: stale ? ("offline" as const) : outOfRange ? ("out_of_range" as const) : ("online" as const),
      outOfRange,
      source: storedRead?.source ?? ("simulated" as const),
      requirement: `${sensor.min}–${sensor.max} ${sensor.unit}`,
      history,
    };
  });
}
type EffectiveSensor = ReturnType<typeof buildSensors>[number];

type AlertDraft = {
  key: string;
  category: HygieneCategory;
  assetKey: string;
  assetName: string;
  assetCode: string;
  issueType: string;
  title: string;
  evidence: string;
  requirement: string;
  severity: Severity;
  detectedAt: number;
  responsible: string;
  recommendation: string;
};

function alertStatus(alert: AlertDraft, states: Map<string, AlertState>) {
  const state = states.get(alert.key);
  return {
    ...alert,
    status: (state?.status ?? "active") as "active" | "acknowledged" | "resolved",
    statusUpdatedAt: state?.updatedAt ?? null,
  };
}

function severityRank(severity: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

function sortAlerts<T extends { severity: Severity; status: string; detectedAt: number }>(alerts: T[]) {
  return [...alerts].sort((a, b) => {
    const resolved = (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0);
    if (resolved !== 0) return resolved;
    return severityRank(a.severity) - severityRank(b.severity) || b.detectedAt - a.detectedAt;
  });
}

function detection(now: number, minutes: number): number {
  return Math.floor(now / HOUR) * HOUR - minutes * 60_000;
}

function buildAlerts(
  assets: EffectiveAsset[],
  employees: EffectiveEmployee[],
  sensors: EffectiveSensor[],
  samples: Array<DemoLabSample & { reviewStatus: string; interpretation: string }>,
  now: number,
): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const base = (asset: EffectiveAsset) => ({
    category: asset.category as HygieneCategory,
    assetKey: asset.key,
    assetName: asset.name,
    assetCode: asset.code,
  });

  for (const asset of assets) {
    if (asset.status === "failed") {
      alerts.push({
        ...base(asset),
        key: `${asset.key}:cleaning_failure`,
        issueType: "cleaning_failure",
        title:
          asset.category === "tankers"
            ? "Tanker not clean — QA hold"
            : asset.category === "packaging"
              ? "Packaging machine hygiene failure"
              : asset.category === "environment"
                ? "Zone hygiene failure"
                : "Cleaning verification failed",
        evidence: asset.details.deviation ?? "QA verification rejected after the cleaning cycle.",
        requirement: "Clean, verified and QA-released before food contact.",
        severity: "critical",
        detectedAt: detection(now, 26),
        responsible: asset.operator,
        recommendation:
          "Keep the asset on hold, re-clean to SOP, submit verification evidence and obtain QA release before use.",
      });
    } else if (asset.status === "overdue") {
      alerts.push({
        ...base(asset),
        key: `${asset.key}:cleaning_overdue`,
        issueType: "cleaning_overdue",
        title: "Cleaning overdue",
        evidence: asset.nextCleaningAt
          ? `Next cleaning was due ${timeLabel(asset.nextCleaningAt)}.`
          : "No upcoming cleaning window is recorded.",
        requirement: `Clean within ${asset.intervalHours} h and verify before use.`,
        severity: "high",
        detectedAt: detection(now, 74),
        responsible: asset.operator,
        recommendation:
          "Schedule cleaning now, record the procedure and submit the verification evidence for QA review.",
      });
    } else if (asset.status === "verification_pending") {
      alerts.push({
        ...base(asset),
        key: `${asset.key}:verification_pending`,
        issueType: "verification_pending",
        title: "Verification pending",
        evidence: `Cleaning recorded ${asset.lastCleanedAt ? timeLabel(asset.lastCleanedAt) : "recently"}; QA evidence is not released.`,
        requirement: "Verification evidence must be approved before the asset is marked clean.",
        severity: "medium",
        detectedAt: detection(now, 118),
        responsible: "Dr. A. Deshpande (QA)",
        recommendation:
          "Review the cleaning evidence, swab/ATP result and operator record. Approve or reject with a reason.",
      });
    } else if (asset.status === "unknown") {
      alerts.push({
        ...base(asset),
        key: `${asset.key}:unknown_status`,
        issueType: "missing_evidence",
        title: "Hygiene status unknown",
        evidence: "No cleaning record or verified inspection is available for this asset.",
        requirement: "Every food-contact asset needs recorded cleaning and verification evidence.",
        severity: "high",
        detectedAt: detection(now, 205),
        responsible: asset.operator,
        recommendation:
          "Do not treat the asset as clean. Inspect it, record the cleaning history and submit evidence for QA.",
      });
    }

    if (asset.category === "environment") {
      const water = asset.details.water?.toLowerCase() ?? "";
      if (water.includes("pending")) {
        alerts.push({
          ...base(asset),
          key: `${asset.key}:water_quality`,
          issueType: "water_quality",
          title: "Water-quality verification pending",
          evidence: asset.details.water ?? "Chlorine residual not confirmed.",
          requirement: "Potable-water checks must be verified for every distribution zone.",
          severity: "high",
          detectedAt: detection(now, 161),
          responsible: asset.operator,
          recommendation:
            "Complete the chlorine residual test and review the sample before releasing water for food contact.",
        });
      }
      const pest = asset.details.pest?.toLowerCase() ?? "";
      if (pest.includes("activity") || pest.includes("due")) {
        alerts.push({
          ...base(asset),
          key: `${asset.key}:pest_control`,
          issueType: "pest_control",
          title: "Pest-control follow-up required",
          evidence: asset.details.pest ?? "Inspection evidence is incomplete.",
          requirement: "No pest activity in food-handling areas; monthly station check.",
          severity: "medium",
          detectedAt: detection(now, 342),
          responsible: asset.operator,
          recommendation:
            "Inspect entry points and bait stations, raise a work order and re-inspect before closing the deviation.",
        });
      }
    }

    if (asset.category === "laboratory" && asset.details.calibrationDue?.toLowerCase().includes("overdue")) {
      alerts.push({
        ...base(asset),
        key: `${asset.key}:calibration_due`,
        issueType: "calibration_due",
        title: "Calibration overdue",
        evidence: asset.details.calibrationDue,
        requirement: "Calibration must be current before results are used for release decisions.",
        severity: "high",
        detectedAt: detection(now, 289),
        responsible: "Dr. A. Deshpande (QA)",
        recommendation:
          "Withdraw the instrument from release testing until calibration is completed and recorded.",
      });
    }
  }

  for (const employee of employees) {
    if (employee.status === "corrective_action") {
      const failed = Object.entries(employee.checks)
        .filter(([, value]) => !value)
        .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());
      alerts.push({
        key: `${employee.key}:inspection_failure`,
        category: "employees",
        assetKey: employee.key,
        assetName: employee.name,
        assetCode: employee.employeeId,
        issueType: "employee_inspection",
        title: "Employee hygiene corrective action",
        evidence: `Pre-shift inspection failed: ${failed.join(", ") || "PPE requirement"}.`,
        requirement: "All PPE, hair covering, footwear, jewellery and hand-hygiene checks must pass.",
        severity: "high",
        detectedAt: detection(now, 58),
        responsible: "A. Fernandes (Sanitation supervisor)",
        recommendation:
          "Remove the employee from the production zone, complete corrective coaching and record a re-inspection.",
      });
    } else if (employee.status === "inspection_pending") {
      alerts.push({
        key: `${employee.key}:inspection_pending`,
        category: "employees",
        assetKey: employee.key,
        assetName: employee.name,
        assetCode: employee.employeeId,
        issueType: "employee_inspection",
        title: "Pre-shift inspection pending",
        evidence: `Last inspection ${timeLabel(employee.lastInspectionAt)}; current shift not cleared.`,
        requirement: "Authorized human inspection before zone entry.",
        severity: "medium",
        detectedAt: detection(now, 93),
        responsible: "A. Fernandes (Sanitation supervisor)",
        recommendation:
          "Complete the visual pre-shift inspection. Do not use facial recognition or store medical information.",
      });
    } else if (employee.status === "training_renewal") {
      alerts.push({
        key: `${employee.key}:training_renewal`,
        category: "employees",
        assetKey: employee.key,
        assetName: employee.name,
        assetCode: employee.employeeId,
        issueType: "training_renewal",
        title: "Hygiene training renewal due",
        evidence: `Training renewal ${timeLabel(employee.trainingDueAt)}.`,
        requirement: "Food-handler hygiene training must remain current.",
        severity: "medium",
        detectedAt: detection(now, 377),
        responsible: "HQ / Plant manager",
        recommendation:
          "Schedule the refresher training and record the completion date against the employee profile.",
      });
    }
  }

  for (const sensor of sensors) {
    if (sensor.status === "offline") {
      alerts.push({
        key: `${sensor.key}:offline`,
        category: sensor.assetKey.startsWith("ZN-")
          ? "environment"
          : sensor.assetKey.startsWith("TK-")
            ? "tankers"
            : sensor.assetKey.startsWith("LB-")
              ? "laboratory"
              : sensor.assetKey.startsWith("PK-")
                ? "packaging"
                : "equipment",
        assetKey: sensor.assetKey,
        assetName: sensor.assetName,
        assetCode: sensor.assetCode,
        issueType: "sensor_offline",
        title: "Sensor offline",
        evidence: `Last communication ${timeLabel(sensor.lastSeen)}. No current reading is available.`,
        requirement: "Communication within the last 30 minutes.",
        severity: "medium",
        detectedAt: sensor.lastSeen,
        responsible: "Maintenance / instrumentation",
        recommendation:
          "Check the device power, gateway and MQTT topic. Do not treat the missing value as normal.",
      });
    } else if (sensor.outOfRange) {
      alerts.push({
        key: `${sensor.key}:out_of_range`,
        category: sensor.assetKey.startsWith("ZN-")
          ? "environment"
          : sensor.assetKey.startsWith("TK-")
            ? "tankers"
            : sensor.assetKey.startsWith("LB-")
              ? "laboratory"
              : sensor.assetKey.startsWith("PK-")
                ? "packaging"
                : "equipment",
        assetKey: sensor.assetKey,
        assetName: sensor.assetName,
        assetCode: sensor.assetCode,
        issueType: "sensor_out_of_range",
        title: `${sensor.label} outside configured range`,
        evidence: `${sensor.value} ${sensor.unit} at ${timeLabel(sensor.lastSeen)}.`,
        requirement: sensor.requirement,
        severity: "high",
        detectedAt: sensor.lastSeen,
        responsible: "Shift supervisor",
        recommendation:
          "Verify the reading against a second measurement, inspect the process and record a corrective action. Sensor evidence alone does not prove microbiological safety.",
      });
    }
  }

  for (const sample of samples) {
    if (sample.reviewStatus === "unsatisfactory") {
      alerts.push({
        key: `${sample.key}:unsatisfactory`,
        category: "laboratory",
        assetKey: sample.key,
        assetName: sample.sampleId,
        assetCode: sample.sampleId,
        issueType: "lab_result",
        title: "Unsatisfactory laboratory result",
        evidence: `${sample.parameter} ${sample.reading} ${sample.unit} against limit ${sample.limit} ${sample.unit}.`,
        requirement: sample.interpretation,
        severity: "high",
        detectedAt: detection(now, 209),
        responsible: "Dr. A. Deshpande (QA)",
        recommendation:
          "Review the batch disposition, hold affected product where required and approve a corrective action.",
      });
    } else if (sample.reviewStatus === "pending_review") {
      alerts.push({
        key: `${sample.key}:review_pending`,
        category: "laboratory",
        assetKey: sample.key,
        assetName: sample.sampleId,
        assetCode: sample.sampleId,
        issueType: "verification_pending",
        title: "Laboratory result awaiting QA review",
        evidence: `${sample.reportName} is attached; ${sample.parameter} ${sample.reading} ${sample.unit}.`,
        requirement: "An uploaded report is evidence only — it is not automatically satisfactory.",
        severity: "medium",
        detectedAt: detection(now, 144),
        responsible: "Dr. A. Deshpande (QA)",
        recommendation:
          "Review the report against the limit and record the QA interpretation before release.",
      });
    }
  }

  return alerts;
}

function statsFor(
  assets: EffectiveAsset[],
  employees: EffectiveEmployee[],
  alerts: Array<AlertDraft & { status: string }>,
  keys: string[],
) {
  const active = alerts.filter((alert) => alert.status !== "resolved" && keys.includes(alert.assetKey));
  const clean =
    assets.filter((asset) => asset.status === "clean").length +
    employees.filter((employee) => employee.status === "cleared").length;
  const unclean =
    assets.filter((asset) => asset.status === "failed" || asset.status === "overdue").length +
    employees.filter(
      (employee) =>
        employee.status === "corrective_action" || employee.status === "training_renewal",
    ).length;
  const pending =
    assets.filter(
      (asset) => asset.status === "verification_pending" || asset.status === "cleaning",
    ).length + employees.filter((employee) => employee.status === "inspection_pending").length;
  const unknown = assets.filter((asset) => asset.status === "unknown").length;
  return {
    total: assets.length + employees.length,
    clean,
    unclean,
    pending,
    unknown,
    overdue: assets.filter((asset) => asset.status === "overdue").length,
    verificationPending: assets.filter((asset) => asset.status === "verification_pending").length,
    alerts: active.length,
  };
}

function trendFor(seedKey: string, base: number, now: number, length = 7) {
  const seed = hashString(seedKey);
  return Array.from({ length }, (_, index) => {
    const timestamp = now - (length - 1 - index) * DAY;
    return {
      label: dayLabel(timestamp),
      value: Math.max(0, Math.round(base + (noise(seed + index * 1.91) - 0.5) * 3)),
    };
  });
}

function complianceTrend(now: number, clean: number, dirty: number) {
  const seed = hashString("hygiene-compliance");
  return Array.from({ length: 14 }, (_, index) => {
    const timestamp = now - (13 - index) * DAY;
    return {
      label: dayLabel(timestamp),
      clean: Math.max(0, Math.round(clean + (noise(seed + index * 2.13) - 0.5) * 3)),
      attention: Math.max(0, Math.round(dirty + (noise(seed + index * 3.17) - 0.5) * 2)),
    };
  });
}

async function loadBase(ctx: QueryCtx, userId: Id<"users">, now: number) {
  const [assetStates, employeeStates, alertStates, sampleStates, storedReadings] =
    await Promise.all([
      ctx.db
        .query("hygieneAssetStates")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("hygieneEmployeeStates")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("hygieneAlertStates")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("hygieneSampleStates")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("hygieneSensorReadings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

  const assetStateMap = new Map(assetStates.map((state) => [state.assetKey, state]));
  const employeeStateMap = new Map(employeeStates.map((state) => [state.employeeKey, state]));
  const alertStateMap = new Map(alertStates.map((state) => [state.alertKey, state]));
  const sampleStateMap = new Map(sampleStates.map((state) => [state.sampleKey, state]));

  const assets = DEMO_ASSETS.map((asset) =>
    buildAsset(asset, now, assetStateMap.get(asset.key)),
  );
  const employees = DEMO_EMPLOYEES.map((employee) =>
    buildEmployee(employee, now, employeeStateMap.get(employee.key)),
  );
  const sensors = buildSensors(now, storedReadings, assets);
  const samples = DEMO_SAMPLES.map((sample) => {
    const state = sampleStateMap.get(sample.key);
    return {
      ...sample,
      reviewStatus: state?.reviewStatus ?? sample.status,
      interpretation: state?.interpretation ?? sample.interpretation,
    };
  });
  const alertDrafts = buildAlerts(assets, employees, sensors, samples, now);
  const alerts = sortAlerts(alertDrafts.map((alert) => alertStatus(alert, alertStateMap)));

  return { assets, employees, sensors, samples, alerts, assetStates, employeeStates, sampleStates };
}

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to view hygiene records.");
  return userId;
}

export const dashboard = query({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const userId = await requireUser(ctx);
    const { assets, employees, sensors, alerts } = await loadBase(ctx, userId, now);
    const activeAlerts = alerts.filter((alert) => alert.status !== "resolved");
    const stats = statsFor(assets, employees, alerts, [
      ...assets.map((asset) => asset.key),
      ...employees.map((employee) => employee.key),
    ]);

    const keys = (category: HygieneCategory) => {
      const assetKeys = assets
        .filter((asset) => asset.category === category)
        .map((asset) => asset.key);
      const employeeKeys = category === "employees" ? employees.map((employee) => employee.key) : [];
      return [...assetKeys, ...employeeKeys];
    };

    const categories = (
      ["equipment", "tankers", "employees", "packaging", "laboratory", "environment"] as HygieneCategory[]
    ).map((category) => {
      const categoryAssets = assets.filter((asset) => asset.category === category);
      const categoryEmployees = category === "employees" ? employees : [];
      const categoryStats = statsFor(categoryAssets, categoryEmployees, alerts, keys(category));
      return {
        key: category,
        label: CATEGORY_META[category].label,
        short: CATEGORY_META[category].short,
        ...categoryStats,
        critical: activeAlerts.filter(
          (alert) => alert.category === category && alert.severity === "critical",
        ).length,
        trend: trendFor(category, categoryStats.clean, now),
      };
    });

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      disclaimer:
        "Assets and sensor telemetry are deterministic demo data. Cleaning and QA actions are stored against your plant.",
      summary: {
        equipment: assets.filter((asset) => asset.category === "equipment").length,
        tankers: assets.filter((asset) => asset.category === "tankers").length,
        employees: employees.length,
        packaging: assets.filter((asset) => asset.category === "packaging").length,
        laboratory: assets.filter((asset) => asset.category === "laboratory").length,
        sensors: sensors.length,
        ...stats,
        criticalAlerts: activeAlerts.filter((alert) => alert.severity === "critical").length,
        onlineSensors: sensors.filter((sensor) => sensor.status !== "offline").length,
        offlineSensors: sensors.filter((sensor) => sensor.status === "offline").length,
      },
      categories,
      alerts: activeAlerts.slice(0, 8),
      alertSummary: {
        active: activeAlerts.length,
        critical: activeAlerts.filter((alert) => alert.severity === "critical").length,
        high: activeAlerts.filter((alert) => alert.severity === "high").length,
        medium: activeAlerts.filter((alert) => alert.severity === "medium").length,
        resolved: alerts.filter((alert) => alert.status === "resolved").length,
      },
      complianceTrend: complianceTrend(now, stats.clean, stats.unclean + stats.pending),
      sensors: sensors.slice(0, 4),
    };
  },
});

export const category = query({
  args: { category: v.string(), now: v.number() },
  handler: async (ctx, { category: rawCategory, now }) => {
    const userId = await requireUser(ctx);
    if (!(rawCategory in CATEGORY_META)) throw new ConvexError("Unknown hygiene category.");
    const category = rawCategory as HygieneCategory;
    const { assets, employees, sensors, samples, alerts } = await loadBase(ctx, userId, now);
    const categoryAssets = assets.filter((asset) => asset.category === category);
    const categoryEmployees = category === "employees" ? employees : [];
    const categoryAlerts = alerts.filter((alert) => alert.category === category);
    const assetKeys = new Set(categoryAssets.map((asset) => asset.key));
    const categorySensors = sensors.filter(
      (sensor) => assetKeys.has(sensor.assetKey) || (category === "employees" && sensor.assetKey === "ZN-CHANGE"),
    );
    const stats = statsFor(
      categoryAssets,
      categoryEmployees,
      alerts,
      [...categoryAssets.map((asset) => asset.key), ...categoryEmployees.map((employee) => employee.key)],
    );
    const active = categoryAlerts.filter((alert) => alert.status !== "resolved");
    const cleanCount = stats.clean;

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      category,
      meta: CATEGORY_META[category],
      assets: categoryAssets,
      employees: categoryEmployees,
      sensors: categorySensors,
      samples: category === "laboratory" ? samples : [],
      alerts: categoryAlerts,
      summary: {
        ...stats,
        critical: active.filter((alert) => alert.severity === "critical").length,
        activeAlerts: active.length,
        packagesProcessed: categoryAssets.reduce(
          (total, asset) => total + (asset.packagesProcessed ?? 0),
          0,
        ),
        packagesApproved: categoryAssets.reduce(
          (total, asset) =>
            total + (asset.status === "clean" ? (asset.packagesProcessed ?? 0) : 0),
          0,
        ),
        waterWarnings: categoryAssets.filter(
          (asset) => asset.details.water?.toLowerCase().includes("pending"),
        ).length,
      },
      trend: trendFor(category, cleanCount, now),
      inspectionTrend: Array.from({ length: 7 }, (_, index) => {
        const timestamp = now - (6 - index) * DAY;
        return {
          label: dayLabel(timestamp),
          passed: Math.max(0, Math.round(cleanCount + (noise(hashString(category) + index) - 0.5) * 2)),
          attention: Math.max(0, Math.round(stats.unclean + (noise(hashString(category) + index * 2) - 0.5) * 2)),
        };
      }),
    };
  },
});

export const asset = query({
  args: { assetKey: v.string(), now: v.number() },
  handler: async (ctx, { assetKey, now }) => {
    const userId = await requireUser(ctx);
    const demo = DEMO_ASSETS.find((item) => item.key === assetKey);
    if (!demo) return null;
    const { assets, sensors, alerts } = await loadBase(ctx, userId, now);
    const current = assets.find((item) => item.key === assetKey);
    if (!current) return null;
    const cleanings = await ctx.db
      .query("hygieneCleanings")
      .withIndex("by_user_asset", (q) =>
        q.eq("userId", userId).eq("assetKey", assetKey),
      )
      .collect();
    const sortedCleanings = [...cleanings].sort((a, b) => b.cleanedAt - a.cleanedAt);
    const seededHistory = Array.from({ length: 3 }, (_, index) => {
      const at = (current.lastCleanedAt ?? now - HOUR) - (index + 1) * demo.intervalHours * HOUR * 2;
      return {
        id: `${demo.key}-seeded-${index}`,
        cleanedAt: at,
        operator: demo.operator,
        procedure: demo.sop.split("·")[0]?.trim() ?? demo.sop,
        outcome: index === 0 && current.status === "failed" ? "Rejected by QA" : "Approved",
        notes: index === 0 ? current.details.deviation ?? null : null,
        source: "seeded" as const,
      };
    });
    const history = [
      ...sortedCleanings.map((entry) => ({
        id: entry._id,
        cleanedAt: entry.cleanedAt,
        operator: entry.operator,
        procedure: entry.procedure,
        outcome: "Verification pending",
        notes: entry.notes ?? null,
        source: "recorded" as const,
      })),
      ...seededHistory,
    ];
    const linkedSensors = sensors.filter((sensor) => sensor.assetKey === assetKey);
    const assetAlerts = alerts.filter(
      (alert) => alert.assetKey === assetKey || linkedSensors.some((sensor) => alert.key.startsWith(`${sensor.key}:`)),
    );
    const cipStages = [
      {
        stage: "Pre-rinse",
        status: current.status === "cleaning" ? "in_progress" : "completed",
        reading: "4 min",
        requirement: "Until run-off is clear",
      },
      {
        stage: "Caustic wash",
        status:
          current.status === "failed"
            ? "failed"
            : current.status === "cleaning"
              ? "in_progress"
              : "completed",
        reading: current.details.lastCycle ?? "75.4°C · 1.6% · 12 min",
        requirement: "70–80°C · 1.2–1.8% · ≥10 min",
      },
      {
        stage: "Intermediate rinse",
        status: current.status === "cleaning" ? "pending" : "completed",
        reading: "6 min",
        requirement: "Until conductivity falls",
      },
      {
        stage: "Acid wash",
        status: current.status === "cleaning" ? "pending" : "completed",
        reading: "68°C · 0.9%",
        requirement: "60–70°C · 0.8–1.2%",
      },
      {
        stage: "Final rinse",
        status:
          current.status === "failed"
            ? "failed"
            : current.status === "verification_pending"
              ? "completed"
              : current.status === "cleaning"
                ? "pending"
                : "completed",
        reading: current.details.deviation ?? "0.06 mS/cm",
        requirement: "Conductivity below 0.10 mS/cm",
      },
    ] as const;

    return {
      dataSource: "simulated" as const,
      generatedAt: now,
      asset: current,
      sensors: linkedSensors,
      alerts: assetAlerts,
      history,
      cipStages,
    };
  },
});

export const employees = query({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const userId = await requireUser(ctx);
    const { employees, alerts } = await loadBase(ctx, userId, now);
    return {
      generatedAt: now,
      employees,
      alerts: alerts.filter((alert) => alert.category === "employees"),
    };
  },
});

export const employee = query({
  args: { employeeKey: v.string(), now: v.number() },
  handler: async (ctx, { employeeKey, now }) => {
    const userId = await requireUser(ctx);
    const demo = DEMO_EMPLOYEES.find((item) => item.key === employeeKey);
    if (!demo) return null;
    const { employees, alerts } = await loadBase(ctx, userId, now);
    const current = employees.find((item) => item.key === employeeKey);
    if (!current) return null;
    return {
      generatedAt: now,
      employee: current,
      alerts: alerts.filter((alert) => alert.assetKey === employeeKey),
      trainingHistory: Array.from({ length: 3 }, (_, index) => ({
        id: `${employeeKey}-training-${index}`,
        title: index === 0 ? "Food-handler hygiene refresher" : index === 1 ? "CIP chemical safety" : "Allergen and PPE awareness",
        completedAt: now - (40 + index * 120) * DAY,
        validUntil: now + (demo.trainingDueDays - index * 120) * DAY,
        trainer: index === 0 ? "Dr. A. Deshpande" : "External food-safety trainer",
      })),
    };
  },
});

export const setAlertState = mutation({
  args: {
    alertKey: v.string(),
    status: v.union(v.literal("active"), v.literal("acknowledged"), v.literal("resolved")),
  },
  handler: async (ctx, { alertKey, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to manage hygiene alerts.");
    const existing = await ctx.db
      .query("hygieneAlertStates")
      .withIndex("by_user_alert", (q) =>
        q.eq("userId", userId).eq("alertKey", alertKey),
      )
      .unique();
    if (status === "active") {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { status, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("hygieneAlertStates", {
      userId,
      alertKey,
      status,
      updatedAt: Date.now(),
    });
  },
});

async function upsertAssetState(
  ctx: MutationCtx,
  userId: Id<"users">,
  assetKey: string,
  patch: Omit<Partial<AssetState>, "_id" | "_creationTime" | "userId" | "assetKey">,
) {
  const existing = await ctx.db
    .query("hygieneAssetStates")
    .withIndex("by_user_asset", (q) =>
      q.eq("userId", userId).eq("assetKey", assetKey),
    )
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { ...patch, updatedAt: Date.now() });
    return existing._id;
  }
  return await ctx.db.insert("hygieneAssetStates", {
    userId: userId,
    assetKey,
    updatedAt: Date.now(),
    ...patch,
  });
}

export const recordCleaning = mutation({
  args: {
    assetKey: v.string(),
    operator: v.string(),
    procedure: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { assetKey, operator, procedure, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to record cleaning.");
    const demo = DEMO_ASSETS.find((item) => item.key === assetKey);
    if (!demo) throw new ConvexError("That hygiene asset was not found.");
    if (procedure.trim().length < 3) throw new ConvexError("Record the cleaning procedure used.");
    const now = Date.now();
    const next = now + demo.intervalHours * HOUR;
    await upsertAssetState(ctx, userId, assetKey, {
      status: "verification_pending",
      lastCleanedAt: now,
      nextCleaningAt: next,
      verificationStatus: "pending",
      notes: notes?.trim() || undefined,
    });
    await ctx.db.insert("hygieneCleanings", {
      userId,
      assetKey,
      cleanedAt: now,
      operator: operator.trim() || demo.operator,
      procedure: procedure.trim(),
      notes: notes?.trim() || undefined,
      createdAt: now,
    });
    return { assetKey, status: "verification_pending" as const };
  },
});

export const verifyAsset = mutation({
  args: {
    assetKey: v.string(),
    approved: v.boolean(),
    reviewer: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { assetKey, approved, reviewer, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to verify hygiene records.");
    const demo = DEMO_ASSETS.find((item) => item.key === assetKey);
    if (!demo) throw new ConvexError("That hygiene asset was not found.");
    const current = await ctx.db
      .query("hygieneAssetStates")
      .withIndex("by_user_asset", (q) =>
        q.eq("userId", userId).eq("assetKey", assetKey),
      )
      .unique();
    const now = Date.now();
    const next = current?.nextCleaningAt ?? now + demo.intervalHours * HOUR;
    await upsertAssetState(ctx, userId, assetKey, {
      status: approved ? "clean" : "failed",
      lastCleanedAt: current?.lastCleanedAt ?? now,
      nextCleaningAt: approved && next < now ? now + demo.intervalHours * HOUR : next,
      verificationStatus: approved ? "approved" : "rejected",
      verifiedAt: now,
      verifiedBy: reviewer.trim() || "QA reviewer",
      notes: notes?.trim() || undefined,
    });
    return { assetKey, status: approved ? ("clean" as const) : ("failed" as const) };
  },
});

export const recordEmployeeInspection = mutation({
  args: {
    employeeKey: v.string(),
    result: v.union(v.literal("cleared"), v.literal("corrective_action")),
    notes: v.optional(v.string()),
    trainingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { employeeKey, result, notes, trainingCompleted }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to record inspections.");
    const demo = DEMO_EMPLOYEES.find((item) => item.key === employeeKey);
    if (!demo) throw new ConvexError("That employee was not found.");
    const now = Date.now();
    const existing = await ctx.db
      .query("hygieneEmployeeStates")
      .withIndex("by_user_employee", (q) =>
        q.eq("userId", userId).eq("employeeKey", employeeKey),
      )
      .unique();
    const patch = {
      status: result,
      lastInspectionAt: now,
      trainingDueAt: trainingCompleted ? now + 180 * DAY : undefined,
      notes: notes?.trim() || undefined,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("hygieneEmployeeStates", {
        userId,
        employeeKey,
        status: result,
        lastInspectionAt: now,
        ...(trainingCompleted ? { trainingDueAt: now + 180 * DAY } : {}),
        notes: notes?.trim() || undefined,
        updatedAt: now,
      });
    }
    return { employeeKey, status: result };
  },
});

export const recordSensorReading = mutation({
  args: {
    sensorKey: v.string(),
    value: v.number(),
    source: v.union(v.literal("iot"), v.literal("manual"), v.literal("simulated")),
  },
  handler: async (ctx, { sensorKey, value, source }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to ingest readings.");
    const sensor = DEMO_SENSORS.find((item) => item.key === sensorKey);
    if (!sensor) throw new ConvexError("Unknown sensor.");
    if (!Number.isFinite(value)) throw new ConvexError("Reading must be a number.");
    const now = Date.now();
    await ctx.db.insert("hygieneSensorReadings", {
      userId,
      sensorKey,
      value,
      source,
      recordedAt: now,
    });
    return { sensorKey, value, recordedAt: now };
  },
});

export const reviewSample = mutation({
  args: {
    sampleKey: v.string(),
    reviewStatus: v.union(
      v.literal("satisfactory"),
      v.literal("unsatisfactory"),
      v.literal("pending_review"),
    ),
    interpretation: v.string(),
    reviewer: v.string(),
  },
  handler: async (ctx, { sampleKey, reviewStatus, interpretation, reviewer }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to review samples.");
    const demo = DEMO_SAMPLES.find((item) => item.key === sampleKey);
    if (!demo) throw new ConvexError("Unknown laboratory sample.");
    if (interpretation.trim().length < 3) throw new ConvexError("Record the QA interpretation.");
    const now = Date.now();
    const existing = await ctx.db
      .query("hygieneSampleStates")
      .withIndex("by_user_sample", (q) =>
        q.eq("userId", userId).eq("sampleKey", sampleKey),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        reviewStatus,
        interpretation: interpretation.trim(),
        reviewer,
        reviewedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("hygieneSampleStates", {
      userId,
      sampleKey,
      reviewStatus,
      interpretation: interpretation.trim(),
      reviewer,
      reviewedAt: now,
    });
  },
});
