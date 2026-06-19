import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { platformValidator } from "./lib/validators";

const eventDocValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  botId: v.id("bots"),
  userId: v.optional(v.id("botUsers")),
  eventType: v.union(
    v.literal("start"),
    v.literal("callback"),
    v.literal("section_view"),
  ),
  payload: v.optional(v.string()),
  sectionSlug: v.optional(v.string()),
  platform: platformValidator,
  createdAt: v.number(),
});

export const listByBot = query({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    paginationOpts: paginationOptsValidator,
    eventType: v.optional(
      v.union(
        v.literal("start"),
        v.literal("callback"),
        v.literal("section_view"),
      ),
    ),
  },
  returns: v.object({
    page: v.array(eventDocValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const result = await ctx.db
      .query("events")
      .withIndex("by_bot_created", (q) => q.eq("botId", args.botId))
      .order("desc")
      .paginate(args.paginationOpts);

    if (args.eventType) {
      return {
        ...result,
        page: result.page.filter((e) => e.eventType === args.eventType),
      };
    }

    return result;
  },
});

export const listByUser = query({
  args: {
    token: v.string(),
    userId: v.id("botUsers"),
    limit: v.optional(v.number()),
  },
  returns: v.array(eventDocValidator),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const limit = args.limit ?? 50;

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return events;
  },
});
