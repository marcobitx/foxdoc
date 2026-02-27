// convex/schema.ts
// Convex database schema for the procurement analyzer
// Defines tables: auth, analyses, documents, chat, settings, user prefs, activity, saved reports
// Related: backend/app/convex_client.py

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // ── Auth tables (users, sessions, accounts, tokens, etc.) ──
  ...authTables,

  // ── Analyses ──
  analyses: defineTable({
    status: v.string(), // pending, unpacking, parsing, extracting, aggregating, evaluating, completed, failed
    model: v.string(),
    user_id: v.optional(v.id("users")), // optional for backward compat
    report_json: v.optional(v.any()),
    qa_json: v.optional(v.any()),
    metrics_json: v.optional(v.any()),
    events_json: v.optional(v.array(v.any())),
    error: v.optional(v.string()),
    completed_at: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_user", ["user_id"]),

  // ── Analysis documents ──
  analysis_documents: defineTable({
    analysis_id: v.id("analyses"),
    filename: v.string(),
    doc_type: v.string(),
    page_count: v.optional(v.number()),
    content_text: v.optional(v.string()),
    extraction_json: v.optional(v.any()),
  }).index("by_analysis", ["analysis_id"]),

  // ── App settings (global key-value) ──
  app_settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // ── Chat messages ──
  chat_messages: defineTable({
    analysis_id: v.id("analyses"),
    role: v.string(),
    content: v.string(),
  }).index("by_analysis", ["analysis_id"]),

  // ── User activity log (login/logout, actions) ──
  user_activity_log: defineTable({
    user_id: v.id("users"),
    action: v.string(), // login, logout, analysis_started, analysis_completed, export, chat
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["user_id"])
    .index("by_action", ["action"]),

  // ── User settings (per-user preferences) ──
  user_settings: defineTable({
    user_id: v.id("users"),
    default_model: v.optional(v.string()),
    theme: v.optional(v.string()), // light, dark, system
    language: v.optional(v.string()), // default: lt
    notifications_enabled: v.optional(v.boolean()),
    items_per_page: v.optional(v.number()),
  }).index("by_user", ["user_id"]),

  // ── Saved reports (bookmarked analyses) ──
  saved_reports: defineTable({
    user_id: v.id("users"),
    analysis_id: v.id("analyses"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  })
    .index("by_user", ["user_id"])
    .index("by_analysis", ["analysis_id"]),

  // ── Notes (user notes/memos) ──
  notes: defineTable({
    user_id: v.optional(v.id("users")),
    title: v.string(),
    content: v.string(),
    status: v.string(),          // "idea" | "in_progress" | "done" | "archived"
    priority: v.string(),        // "low" | "medium" | "high"
    tags: v.array(v.string()),
    color: v.optional(v.string()),  // "default"|"amber"|"emerald"|"blue"|"red"|"purple"
    pinned: v.boolean(),
    analysis_id: v.optional(v.id("analyses")),
    user_id: v.optional(v.id("users")),  // optional for backward compat
    updated_at: v.number(),      // epoch ms
  })
    .index("by_status", ["status"])
    .index("by_user", ["user_id"]),

  // ── Auth relay codes (cross-domain session transfer) ──
  auth_relay_codes: defineTable({
    code: v.string(),
    user_id: v.id("users"),
    session_id: v.string(),
    jwt: v.string(),
    refresh_token: v.string(),
    expires_at: v.number(),
    used: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_expires_at", ["expires_at"]),

  // ── User credits (Free plan auto-assigned on registration) ──
  user_credits: defineTable({
    user_id: v.id("users"),
    plan: v.string(),           // "free" | "starter" | "pro" | "team"
    credits_total: v.number(),  // credits per month
    credits_used: v.number(),   // credits used this period
    period_start: v.number(),   // epoch ms — start of current billing period
    period_end: v.number(),     // epoch ms — end of current billing period
  })
    .index("by_user", ["user_id"]),
});
