// convex/analyses.ts
// CRUD + event operations for the analyses table
// Matches function names called by backend/app/convex_client.py
// Related: schema.ts, convex_client.py

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    model: v.string(),
    status: v.string(),
    user_id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyses", {
      model: args.model,
      status: args.status,
      user_id: args.user_id,
      events_json: [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    status: v.optional(v.string()),
    model: v.optional(v.string()),
    report_json: v.optional(v.any()),
    qa_json: v.optional(v.any()),
    metrics_json: v.optional(v.any()),
    error: v.optional(v.string()),
    completed_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const docId = ctx.db.normalizeId("analyses", id);
    if (!docId) throw new Error(`Invalid analysis ID: ${id}`);

    // Only patch defined fields
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(docId, patch);
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("analyses", args.id);
    if (!docId) return null;
    const doc = await ctx.db.get(docId);
    if (!doc) return null;
    return { ...doc, _id: doc._id.toString() };
  },
});

export const list = query({
  args: {
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("analyses")
      .order("desc")
      .collect();

    const page = all.slice(args.offset, args.offset + args.limit);
    return page.map((doc) => ({ ...doc, _id: doc._id.toString() }));
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("analyses", args.id);
    if (!docId) throw new Error(`Invalid analysis ID: ${args.id}`);

    // Cascade: delete documents
    const docs = await ctx.db
      .query("analysis_documents")
      .withIndex("by_analysis", (q) => q.eq("analysis_id", docId))
      .collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    // Cascade: delete chat messages
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_analysis", (q) => q.eq("analysis_id", docId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete the analysis itself
    await ctx.db.delete(docId);
  },
});

export const appendEvent = mutation({
  args: {
    id: v.string(),
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("analyses", args.id);
    if (!docId) throw new Error(`Invalid analysis ID: ${args.id}`);

    const doc = await ctx.db.get(docId);
    if (!doc) throw new Error(`Analysis ${args.id} not found`);

    const events = doc.events_json ?? [];
    events.push(args.event);
    await ctx.db.patch(docId, { events_json: events });
  },
});

export const getEvents = query({
  args: {
    id: v.string(),
    sinceIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("analyses", args.id);
    if (!docId) return [];

    const doc = await ctx.db.get(docId);
    if (!doc) return [];

    const events = doc.events_json ?? [];
    return events.slice(args.sinceIndex);
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
      .query("analyses")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    const page = all.slice(args.offset, args.offset + args.limit);
    return page.map((doc) => ({ ...doc, _id: doc._id.toString() }));
  },
});
