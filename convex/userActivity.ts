// convex/userActivity.ts
// CRUD operations for user_activity_log table
// Tracks login/logout events and user actions for analytics
// Related: schema.ts, auth.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    user_id: v.id("users"),
    action: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("user_activity_log", {
      user_id: args.user_id,
      action: args.action,
      metadata: args.metadata,
    });
  },
});

export const listByUser = query({
  args: {
    user_id: v.id("users"),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("user_activity_log")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    const page = all.slice(args.offset, args.offset + args.limit);
    return page.map((doc) => ({ ...doc, _id: doc._id.toString() }));
  },
});

export const getStats = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("user_activity_log")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const logins = all.filter((a) => a.action === "login").length;
    const analyses = all.filter(
      (a) => a.action === "analysis_started"
    ).length;
    const exports = all.filter((a) => a.action === "export").length;

    const sorted = all.sort(
      (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)
    );
    const lastActive = sorted.length > 0 ? sorted[0]._creationTime : null;

    return {
      total_logins: logins,
      total_analyses: analyses,
      total_exports: exports,
      last_active: lastActive,
    };
  },
});
