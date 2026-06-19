import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  createSessionExpiry,
  generateToken,
  requireAdminSession,
} from "./lib/auth";

export const login = mutation({
  args: { password: v.string() },
  returns: v.object({
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      throw new Error("ADMIN_PASSWORD is not configured on the server");
    }
    if (args.password !== expected) {
      throw new Error("Invalid password");
    }

    const token = generateToken();
    const expiresAt = createSessionExpiry();

    await ctx.db.insert("adminSessions", {
      token,
      createdAt: Date.now(),
      expiresAt,
    });

    return { token, expiresAt };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return null;
  },
});

export const validateSession = query({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    return session !== null && session.expiresAt > Date.now();
  },
});

export const requireAuth = query({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return true;
  },
});
