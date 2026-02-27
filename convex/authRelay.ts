// convex/authRelay.ts
// One-time code relay for cross-domain auth (foxdoc.io → app.foxdoc.io)
// Creates and exchanges short-lived codes to transfer auth sessions safely
// Related: auth.ts, schema.ts, http.ts

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const CODE_TTL_MS = 60_000; // 60 seconds

function generateCode(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createRelayCode = mutation({
  args: {
    jwt: v.string(),
    refresh_token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const code = generateCode();
    const now = Date.now();

    await ctx.db.insert("auth_relay_codes", {
      code,
      user_id: userId,
      session_id: "",
      jwt: args.jwt,
      refresh_token: args.refresh_token,
      expires_at: now + CODE_TTL_MS,
      used: false,
    });

    return { code };
  },
});

export const exchangeRelayCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const relayCode = await ctx.db
      .query("auth_relay_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!relayCode) {
      throw new Error("Invalid or expired code");
    }

    if (relayCode.used) {
      throw new Error("Code already used");
    }

    if (Date.now() > relayCode.expires_at) {
      await ctx.db.delete(relayCode._id);
      throw new Error("Code expired");
    }

    await ctx.db.patch(relayCode._id, { used: true });

    return {
      jwt: relayCode.jwt,
      refresh_token: relayCode.refresh_token,
    };
  },
});

export const cleanupExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("auth_relay_codes")
      .withIndex("by_expires_at")
      .filter((q) => q.lt(q.field("expires_at"), now))
      .collect();

    for (const code of expired) {
      await ctx.db.delete(code._id);
    }

    return { deleted: expired.length };
  },
});
