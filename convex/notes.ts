// convex/notes.ts
// CRUD + bulk operations for the notes table
// Matches function names called by backend/app/convex_client.py
// Related: schema.ts, convex_client.py

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    status: v.string(),
    priority: v.string(),
    tags: v.array(v.string()),
    color: v.optional(v.string()),
    pinned: v.boolean(),
    analysis_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertArgs: any = {
      title: args.title,
      content: args.content,
      status: args.status,
      priority: args.priority,
      tags: args.tags,
      color: args.color,
      pinned: args.pinned,
      updated_at: now,
    };

    if (args.analysis_id) {
      const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
      if (analysisDocId) {
        insertArgs.analysis_id = analysisDocId;
      }
    }

    const id = await ctx.db.insert("notes", insertArgs);
    return id.toString();
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    analysis_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const docId = ctx.db.normalizeId("notes", id);
    if (!docId) throw new Error(`Invalid note ID: ${id}`);

    const patch: Record<string, unknown> = { updated_at: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (key === "analysis_id") {
          // Normalize analysis ID or set to null for unlinking
          if (value === null) {
            patch.analysis_id = undefined;
          } else {
            const analysisDocId = ctx.db.normalizeId("analyses", value as string);
            if (analysisDocId) {
              patch.analysis_id = analysisDocId;
            }
          }
        } else {
          patch[key] = value;
        }
      }
    }

    await ctx.db.patch(docId, patch);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("notes", args.id);
    if (!docId) throw new Error(`Invalid note ID: ${args.id}`);
    await ctx.db.delete(docId);
  },
});

export const bulkRemove = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      const docId = ctx.db.normalizeId("notes", id);
      if (docId) {
        await ctx.db.delete(docId);
      }
    }
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      const docId = ctx.db.normalizeId("notes", id);
      if (docId) {
        await ctx.db.patch(docId, { status: args.status, updated_at: now });
      }
    }
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("notes", args.id);
    if (!docId) return null;
    const doc = await ctx.db.get(docId);
    if (!doc) return null;
    return {
      ...doc,
      _id: doc._id.toString(),
      analysis_id: doc.analysis_id?.toString() ?? null,
    };
  },
});

export const list = query({
  args: {
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notes")
      .order("desc")
      .collect();

    const page = all.slice(args.offset, args.offset + args.limit);
    return page.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      analysis_id: doc.analysis_id?.toString() ?? null,
    }));
  },
});

export const allTags = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("notes").collect();
    const tagCounts: Record<string, number> = {};
    for (const note of all) {
      for (const tag of note.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return tagCounts;
  },
});
