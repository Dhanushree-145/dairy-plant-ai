import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Saves the plant-owner profile collected during passwordless sign-up.
 * Runs after the email code has been verified, so the account already exists.
 */
export const saveProfile = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    plantName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Verify your email code before saving the profile.");
    const name = args.name.trim();
    const phone = args.phone.trim();
    const plantName = args.plantName.trim();
    if (name.length < 2) throw new ConvexError("Enter your full name.");
    if (!/^[+]?[\d][\d\s-]{7,16}$/.test(phone)) {
      throw new ConvexError("Enter a valid phone number.");
    }
    if (plantName.length < 2) throw new ConvexError("Enter your dairy plant name.");
    await ctx.db.patch(userId, { name, phone, plantName });
    return { saved: true };
  },
});
