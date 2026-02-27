// convex/userCredits.ts
// Manages user credit balances and auto-assigns Free plan on first login
// New users automatically get Free plan with 3 credits/month
// Related: schema.ts, authRelay.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const FREE_PLAN_CREDITS = 3;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const getMyCredits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const credits = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    return credits;
  },
});

export const initializeFreePlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (existing) return existing;

    const now = Date.now();
    const id = await ctx.db.insert("user_credits", {
      user_id: userId,
      plan: "free",
      credits_total: FREE_PLAN_CREDITS,
      credits_used: 0,
      period_start: now,
      period_end: now + MONTH_MS,
    });

    return await ctx.db.get(id);
  },
});

export const useCredit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const credits = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!credits) throw new Error("No plan found");

    const now = Date.now();
    if (now > credits.period_end) {
      await ctx.db.patch(credits._id, {
        credits_used: 0,
        period_start: now,
        period_end: now + MONTH_MS,
      });
      if (credits.credits_total <= 0) return false;
      await ctx.db.patch(credits._id, { credits_used: 1 });
      return true;
    }

    if (credits.credits_used >= credits.credits_total) {
      return false;
    }

    await ctx.db.patch(credits._id, {
      credits_used: credits.credits_used + 1,
    });

    return true;
  },
});
