// convex/savedReports.ts
// CRUD operations for saved_reports table (bookmarked analyses)
// Allows users to bookmark, label, and annotate analyses for quick access
// Related: schema.ts, analyses.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const save = mutation({
  args: {
    user_id: v.id("users"),
    analysis_id: v.id("analyses"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already saved
    const existing = await ctx.db
      .query("saved_reports")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const alreadySaved = existing.find(
      (r) => r.analysis_id === args.analysis_id
    );
    if (alreadySaved) {
      return alreadySaved._id.toString();
    }

    const id = await ctx.db.insert("saved_reports", {
      user_id: args.user_id,
      analysis_id: args.analysis_id,
      title: args.title,
      notes: args.notes,
      pinned: false,
    });
    return id.toString();
  },
});

export const unsave = mutation({
  args: {
    user_id: v.id("users"),
    analysis_id: v.id("analyses"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("saved_reports")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const match = all.find((r) => r.analysis_id === args.analysis_id);
    if (match) {
      await ctx.db.delete(match._id);
    }
  },
});

export const listByUser = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("saved_reports")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    return reports.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      analysis_id: doc.analysis_id.toString(),
    }));
  },
});

export const isSaved = query({
  args: {
    user_id: v.id("users"),
    analysis_id: v.id("analyses"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("saved_reports")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    return all.some((r) => r.analysis_id === args.analysis_id);
  },
});

export const updateNotes = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("saved_reports", args.id);
    if (!docId) throw new Error(`Invalid saved report ID: ${args.id}`);

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.pinned !== undefined) patch.pinned = args.pinned;

    await ctx.db.patch(docId, patch);
  },
});
