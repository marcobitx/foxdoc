// convex/documents.ts
// CRUD operations for analysis_documents table
// Matches function names called by backend/app/convex_client.py
// Related: schema.ts, convex_client.py

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    analysis_id: v.string(),
    filename: v.string(),
    doc_type: v.string(),
    page_count: v.optional(v.number()),
    content_text: v.optional(v.string()),
    extraction_json: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
    if (!analysisDocId) {
      throw new Error(`Invalid analysis ID: ${args.analysis_id}`);
    }

    return await ctx.db.insert("analysis_documents", {
      analysis_id: analysisDocId,
      filename: args.filename,
      doc_type: args.doc_type,
      page_count: args.page_count,
      content_text: args.content_text,
      extraction_json: args.extraction_json,
    });
  },
});

export const listByAnalysis = query({
  args: { analysis_id: v.string() },
  handler: async (ctx, args) => {
    const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
    if (!analysisDocId) return [];

    const docs = await ctx.db
      .query("analysis_documents")
      .withIndex("by_analysis", (q) => q.eq("analysis_id", analysisDocId))
      .collect();

    return docs.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      analysis_id: doc.analysis_id.toString(),
    }));
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    filename: v.optional(v.string()),
    doc_type: v.optional(v.string()),
    page_count: v.optional(v.number()),
    content_text: v.optional(v.string()),
    extraction_json: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const docId = ctx.db.normalizeId("analysis_documents", id);
    if (!docId) throw new Error(`Invalid document ID: ${id}`);

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(docId, patch);
  },
});
