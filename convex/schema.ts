// convex/schema.ts
// Convex database schema for the procurement analyzer
// Defines tables: analyses, analysis_documents, app_settings, chat_messages
// Related: backend/app/convex_client.py

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  analyses: defineTable({
    status: v.string(), // pending, unpacking, parsing, extracting, aggregating, evaluating, completed, failed
    model: v.string(),
    report_json: v.optional(v.any()),
    qa_json: v.optional(v.any()),
    metrics_json: v.optional(v.any()),
    events_json: v.optional(v.array(v.any())),
    error: v.optional(v.string()),
  }).index("by_creation", ["_creationTime"]),

  analysis_documents: defineTable({
    analysis_id: v.id("analyses"),
    filename: v.string(),
    doc_type: v.string(),
    page_count: v.optional(v.number()),
    content_text: v.optional(v.string()),
    extraction_json: v.optional(v.any()),
  }).index("by_analysis", ["analysis_id"]),

  app_settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  chat_messages: defineTable({
    analysis_id: v.id("analyses"),
    role: v.string(),
    content: v.string(),
  }).index("by_analysis", ["analysis_id"]),
});
