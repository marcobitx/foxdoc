// convex/userLookup.ts
// Resolves a user by their Convex user ID string
// Called by backend to validate JWT subject claim
// Related: users.ts, auth.ts

import { query } from "./_generated/server";
import { v } from "convex/values";

export const byId = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("users", args.user_id);
    if (!docId) return null;
    const user = await ctx.db.get(docId);
    if (!user) return null;
    return { _id: user._id.toString(), name: user.name, email: user.email };
  },
});
