import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "QA Test Owner",
      email: `qa-${Date.now()}@example.com`,
      phone: "+91 90000 00000",
      plantName: "QA Test Dairy",
      role: "admin",
    });
    return userId;
  },
});

export const cleanupUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
    return true;
  },
});
