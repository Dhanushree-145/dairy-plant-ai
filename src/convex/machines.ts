import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/**
 * Registered equipment. Machines are scoped to the signed-in plant account, so
 * a new account starts with an empty fleet and is taken through the one-time
 * registration wizard; once machines exist the wizard is skipped forever.
 */

const MAX_MACHINES = 40;

const machineInput = v.object({
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
});

type MachineDraft = {
  name: string;
  code: string;
  category: string;
  stage: string;
  capacityValue: number;
  capacityUnit: string;
  ratedKw: number;
  baselineKwhPerHour: number;
  specifications?: string;
  installedAt: string;
};

function clean(draft: MachineDraft) {
  const name = draft.name.trim();
  const code = draft.code.trim().toUpperCase();
  const category = draft.category.trim();
  const stage = draft.stage.trim();
  const capacityUnit = draft.capacityUnit.trim();
  const specifications = draft.specifications?.trim();

  if (!name || name.length > 60) {
    throw new ConvexError("Each machine needs a name under 60 characters.");
  }
  if (!code || code.length > 20) {
    throw new ConvexError("Each machine needs an ID under 20 characters.");
  }
  if (!category) throw new ConvexError("Choose a category for every machine.");
  if (!stage) throw new ConvexError("Assign every machine to a processing stage.");
  if (!capacityUnit) throw new ConvexError("Add a capacity unit for every machine.");
  if (!Number.isFinite(draft.capacityValue) || draft.capacityValue <= 0) {
    throw new ConvexError(`Enter a valid capacity for ${name}.`);
  }
  if (!Number.isFinite(draft.ratedKw) || draft.ratedKw <= 0 || draft.ratedKw > 5_000) {
    throw new ConvexError(`Enter a rated power between 1 and 5000 kW for ${name}.`);
  }
  if (
    !Number.isFinite(draft.baselineKwhPerHour) ||
    draft.baselineKwhPerHour <= 0 ||
    draft.baselineKwhPerHour > 5_000
  ) {
    throw new ConvexError(`Enter a valid baseline load for ${name}.`);
  }
  if (!draft.installedAt) throw new ConvexError(`Add an installation date for ${name}.`);

  return {
    name,
    code,
    category,
    stage,
    capacityValue: Math.round(draft.capacityValue * 100) / 100,
    capacityUnit,
    ratedKw: Math.round(draft.ratedKw * 100) / 100,
    baselineKwhPerHour: Math.round(draft.baselineKwhPerHour * 100) / 100,
    specifications: specifications ? specifications.slice(0, 400) : undefined,
    installedAt: draft.installedAt,
  };
}

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Sign in to manage your plant equipment.");
  }
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("machines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createBatch = mutation({
  args: { machines: v.array(machineInput) },
  handler: async (ctx, { machines }) => {
    const userId = await requireUserId(ctx);

    if (machines.length === 0) {
      throw new ConvexError("Select at least one machine to register.");
    }
    if (machines.length > MAX_MACHINES) {
      throw new ConvexError(`Register up to ${MAX_MACHINES} machines at a time.`);
    }

    const existing = await ctx.db
      .query("machines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.length + machines.length > MAX_MACHINES) {
      throw new ConvexError(`A plant can hold up to ${MAX_MACHINES} machines in this build.`);
    }

    const seen = new Set(existing.map((machine) => machine.code.trim().toUpperCase()));
    const cleaned: ReturnType<typeof clean>[] = [];

    for (const draft of machines) {
      const next = clean(draft);
      if (seen.has(next.code)) {
        throw new ConvexError(`Machine ID ${next.code} is already in use.`);
      }
      seen.add(next.code);
      cleaned.push(next);
    }

    const now = Date.now();
    const ids = [];
    for (const machine of cleaned) {
      ids.push(
        await ctx.db.insert("machines", {
          userId,
          ...machine,
          createdAt: now,
        }),
      );
    }
    return ids;
  },
});

export const update = mutation({
  args: {
    machineId: v.id("machines"),
    ...machineInput.fields,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const machine = await ctx.db.get(args.machineId);
    if (!machine || machine.userId !== userId) {
      throw new ConvexError("That machine was not found on your account.");
    }

    const next = clean(args);
    const clash = await ctx.db
      .query("machines")
      .withIndex("by_user_code", (q) => q.eq("userId", userId).eq("code", next.code))
      .first();
    if (clash && clash._id !== machine._id) {
      throw new ConvexError(`Machine ID ${next.code} is already in use.`);
    }

    await ctx.db.patch(machine._id, next);
    return machine._id;
  },
});

export const remove = mutation({
  args: { machineId: v.id("machines") },
  handler: async (ctx, { machineId }) => {
    const userId = await requireUserId(ctx);
    const machine = await ctx.db.get(machineId);
    if (!machine || machine.userId !== userId) {
      throw new ConvexError("That machine was not found on your account.");
    }

    await ctx.db.delete(machine._id);

    // Alert acknowledgement state is keyed by machine + issue type; clear the
    // orphaned rows so a re-registered machine starts clean.
    const states = await ctx.db
      .query("energyAlertStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const state of states) {
      if (state.alertKey.startsWith(`${machine._id}:`)) {
        await ctx.db.delete(state._id);
      }
    }

    return machine._id;
  },
});
