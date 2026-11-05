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

      // DairyPulse plant-owner profile fields (set during password sign up).
      phone: v.optional(v.string()),
      plantName: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Registered dairy plant equipment, owned by a user account.
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
