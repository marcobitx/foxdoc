// convex/migrations.ts
// One-time data migration — assigns orphaned analyses and notes to a user
// Run via: npx convex run migrations:assignOrphanedData '{"user_id": "<ID>"}'
// Related: schema.ts, analyses.ts, notes.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const assignOrphanedData = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    let analysesUpdated = 0;
    let notesUpdated = 0;

    const analyses = await ctx.db.query("analyses").collect();
    for (const a of analyses) {
      if (!a.user_id) {
        await ctx.db.patch(a._id, { user_id: args.user_id });
        analysesUpdated++;
      }
    }

    const notes = await ctx.db.query("notes").collect();
    for (const n of notes) {
      if (!n.user_id) {
        await ctx.db.patch(n._id, { user_id: args.user_id });
        notesUpdated++;
      }
    }

    return { analysesUpdated, notesUpdated };
  },
});
