import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { platformValidator } from "./lib/validators";

const userDocValidator = v.object({
  _id: v.id("botUsers"),
  _creationTime: v.number(),
  botId: v.id("bots"),
  platform: platformValidator,
  platformUserId: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  username: v.optional(v.string()),
  languageCode: v.optional(v.string()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  startCount: v.number(),
  lastSection: v.optional(v.string()),
  isBlocked: v.boolean(),
});

export const listByBot = query({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    paginationOpts: paginationOptsValidator,
    platform: v.optional(platformValidator),
    search: v.optional(v.string()),
  },
  returns: v.object({
    page: v.array(userDocValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    let result = await ctx.db
      .query("botUsers")
      .withIndex("by_bot_last_seen", (q) => q.eq("botId", args.botId))
      .order("desc")
      .paginate(args.paginationOpts);

    if (args.platform) {
      result = {
        ...result,
        page: result.page.filter((u) => u.platform === args.platform),
      };
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      result = {
        ...result,
        page: result.page.filter(
          (u) =>
            u.firstName?.toLowerCase().includes(search) ||
            u.username?.toLowerCase().includes(search) ||
            u.platformUserId.includes(search),
        ),
      };
    }

    return result;
  },
});

export const get = query({
  args: { token: v.string(), userId: v.id("botUsers") },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.db.get(args.userId);
  },
});

export const getStats = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.object({
    total: v.number(),
    telegram: v.number(),
    max: v.number(),
    blocked: v.number(),
    today: v.number(),
    week: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const users = await ctx.db
      .query("botUsers")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      total: users.length,
      telegram: users.filter((u) => u.platform === "telegram").length,
      max: users.filter((u) => u.platform === "max").length,
      blocked: users.filter((u) => u.isBlocked).length,
      today: users.filter((u) => u.lastSeenAt >= dayAgo).length,
      week: users.filter((u) => u.lastSeenAt >= weekAgo).length,
    };
  },
});

export const exportUsers = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.array(
    v.object({
      platform: platformValidator,
      platformUserId: v.string(),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      username: v.optional(v.string()),
      languageCode: v.optional(v.string()),
      firstSeenAt: v.number(),
      lastSeenAt: v.number(),
      startCount: v.number(),
      lastSection: v.optional(v.string()),
      isBlocked: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const users = await ctx.db
      .query("botUsers")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    return users.map((u) => ({
      platform: u.platform,
      platformUserId: u.platformUserId,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      languageCode: u.languageCode,
      firstSeenAt: u.firstSeenAt,
      lastSeenAt: u.lastSeenAt,
      startCount: u.startCount,
      lastSection: u.lastSection,
      isBlocked: u.isBlocked,
    }));
  },
});

export const toggleBlocked = mutation({
  args: { token: v.string(), userId: v.id("botUsers") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const isBlocked = !user.isBlocked;
    await ctx.db.patch(args.userId, { isBlocked });
    return isBlocked;
  },
});

export const remove = mutation({
  args: { token: v.string(), userId: v.id("botUsers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    await ctx.db.delete(args.userId);
    return null;
  },
});
