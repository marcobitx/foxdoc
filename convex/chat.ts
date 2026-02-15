// convex/chat.ts
// CRUD operations for chat_messages table
// Matches function names called by backend/app/convex_client.py
// Related: schema.ts, convex_client.py

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    analysis_id: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
    if (!analysisDocId) {
      throw new Error(`Invalid analysis ID: ${args.analysis_id}`);
    }

    return await ctx.db.insert("chat_messages", {
      analysis_id: analysisDocId,
      role: args.role,
      content: args.content,
    });
  },
});

export const listByAnalysis = query({
  args: {
    analysis_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
    if (!analysisDocId) return [];

    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_analysis", (q) => q.eq("analysis_id", analysisDocId))
      .collect();

    const limit = args.limit ?? 50;
    const sliced = messages.slice(-limit);

    return sliced.map((msg) => ({
      ...msg,
      _id: msg._id.toString(),
      analysis_id: msg.analysis_id.toString(),
    }));
  },
});
