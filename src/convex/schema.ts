import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // DairySense plant-owner profile fields (set after email OTP sign up).
      phone: v.optional(v.string()),
      plantName: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Registered dairy plant equipment, owned by a user account.
    // Shared machine codes link the Energy, Hygiene and Waste modules.
    machines: defineTable({
      userId: v.id("users"),
      name: v.string(),
      code: v.string(),
      category: v.string(),
      stage: v.string(),
      capacityValue: v.number(),
      capacityUnit: v.string(),
      ratedKw: v.number(),
      baselineKwhPerHour: v.number(),
      specifications: v.optional(v.string()),
      installedAt: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_code", ["userId", "code"]),

    // Manager acknowledgement / resolution state for generated machine alerts.
    energyAlertStates: defineTable({
      userId: v.id("users"),
      alertKey: v.string(),
      status: v.union(v.literal("acknowledged"), v.literal("resolved")),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_alert", ["userId", "alertKey"]),

    // ----------------------------------------------------------------
    // Hygiene Management
    // ----------------------------------------------------------------

    // Per-plant overrides for the deterministic hygiene demo fleet. Base asset
    // definitions live in code; cleaning/verification/QA actions land here.
    hygieneAssetStates: defineTable({
      userId: v.id("users"),
      assetKey: v.string(),
      status: v.optional(v.string()),
      lastCleanedAt: v.optional(v.number()),
      nextCleaningAt: v.optional(v.number()),
      verificationStatus: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      verifiedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_asset", ["userId", "assetKey"]),

    hygieneCleanings: defineTable({
      userId: v.id("users"),
      assetKey: v.string(),
      cleanedAt: v.number(),
      operator: v.string(),
      procedure: v.string(),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_asset", ["userId", "assetKey"]),

    hygieneAlertStates: defineTable({
      userId: v.id("users"),
      alertKey: v.string(),
      status: v.union(v.literal("acknowledged"), v.literal("resolved")),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_alert", ["userId", "alertKey"]),

    // Readings pushed by the local MQTT bridge, manual checks or the demo
    // simulator. Device identity is preserved for duplicate control.
    hygieneSensorReadings: defineTable({
      userId: v.id("users"),
      sensorKey: v.string(),
      value: v.number(),
      source: v.union(
        v.literal("iot"),
        v.literal("manual"),
        v.literal("simulated"),
      ),
      recordedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_sensor", ["userId", "sensorKey"]),

    hygieneEmployeeStates: defineTable({
      userId: v.id("users"),
      employeeKey: v.string(),
      status: v.string(),
      lastInspectionAt: v.optional(v.number()),
      trainingDueAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_employee", ["userId", "employeeKey"]),

    hygieneSampleStates: defineTable({
      userId: v.id("users"),
      sampleKey: v.string(),
      reviewStatus: v.string(),
      interpretation: v.string(),
      reviewer: v.string(),
      reviewedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_sample", ["userId", "sampleKey"]),

    // ----------------------------------------------------------------
    // Waste Tracking & Management
    // ----------------------------------------------------------------

    wasteConfigs: defineTable({
      userId: v.id("users"),
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
      completedAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    wasteRecords: defineTable({
      userId: v.id("users"),
      category: v.string(),
      quantity: v.number(),
      unit: v.string(),
      source: v.union(
        v.literal("manual"),
        v.literal("iot"),
        v.literal("simulated"),
      ),
      stage: v.string(),
      machineCode: v.optional(v.string()),
      batchId: v.optional(v.string()),
      employee: v.string(),
      recordedAt: v.number(),
      reason: v.string(),
      disposalStatus: v.string(),
      recoveryMethod: v.string(),
      storageLocation: v.string(),
      verificationStatus: v.string(),
      notes: v.optional(v.string()),
      evidenceName: v.optional(v.string()),
      cleaningCycleId: v.optional(v.string()),
      sourceRef: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_recorded", ["userId", "recordedAt"])
      .index("by_user_source_ref", ["userId", "sourceRef"]),

    wasteDisposals: defineTable({
      userId: v.id("users"),
      recordIds: v.array(v.id("wasteRecords")),
      method: v.string(),
      destination: v.string(),
      collectedAt: v.number(),
      collectedBy: v.string(),
      confirmed: v.boolean(),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    wasteAlertStates: defineTable({
      userId: v.id("users"),
      alertKey: v.string(),
      status: v.union(v.literal("acknowledged"), v.literal("resolved")),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_alert", ["userId", "alertKey"]),

    wasteAuditLogs: defineTable({
      userId: v.id("users"),
      action: v.string(),
      entity: v.string(),
      detail: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
