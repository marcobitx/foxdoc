// convex/userSettings.ts
// CRUD operations for user_settings table
// Per-user preferences: theme, language, default model, pagination
// Related: schema.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    if (existing) {
      return { ...existing, _id: existing._id.toString() };
    }

    // Return defaults when no settings record exists yet
    return {
      _id: null,
      user_id: args.user_id,
      default_model: null,
      theme: "system",
      language: "lt",
      notifications_enabled: true,
      items_per_page: 10,
    };
  },
});

export const update = mutation({
  args: {
    user_id: v.id("users"),
    default_model: v.optional(v.string()),
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    notifications_enabled: v.optional(v.boolean()),
    items_per_page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user_id, ...fields } = args;

    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .first();

    // Build patch with only defined fields
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("user_settings", {
        user_id,
        ...patch,
      });
    }
  },
});

export const reset = mutation({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
