import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";

export const getDashboard = query({
  args: { token: v.string(), botId: v.optional(v.id("bots")) },
  returns: v.object({
    totalBots: v.number(),
    enabledBots: v.number(),
    totalUsers: v.number(),
    totalEvents: v.number(),
    eventsToday: v.number(),
    eventsWeek: v.number(),
    funnel: v.object({
      starts: v.number(),
      aboutViews: v.number(),
      demoViews: v.number(),
      tryViews: v.number(),
      implViews: v.number(),
    }),
    platformBreakdown: v.object({
      telegram: v.number(),
      max: v.number(),
    }),
    recentActivity: v.array(
      v.object({
        eventType: v.string(),
        payload: v.optional(v.string()),
        platform: v.string(),
        createdAt: v.number(),
      }),
    ),
    dailyStats: v.array(
      v.object({
        date: v.string(),
        starts: v.number(),
        callbacks: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const bots = await ctx.db.query("bots").collect();
    const enabledBots = bots.filter((b) => b.enabled);

    const targetBotIds = args.botId
      ? [args.botId]
      : bots.map((b) => b._id);

    let totalUsers = 0;
    let totalEvents = 0;
    let eventsToday = 0;
    let eventsWeek = 0;
    let telegramUsers = 0;
    let maxUsers = 0;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const funnel = {
      starts: 0,
      aboutViews: 0,
      demoViews: 0,
      tryViews: 0,
      implViews: 0,
    };

    const recentActivity: Array<{
      eventType: string;
      payload?: string;
      platform: string;
      createdAt: number;
    }> = [];

    const dailyMap = new Map<string, { starts: number; callbacks: number }>();

    for (const botId of targetBotIds) {
      const users = await ctx.db
        .query("botUsers")
        .withIndex("by_bot", (q) => q.eq("botId", botId))
        .collect();

      totalUsers += users.length;
      telegramUsers += users.filter((u) => u.platform === "telegram").length;
      maxUsers += users.filter((u) => u.platform === "max").length;

      const events = await ctx.db
        .query("events")
        .withIndex("by_bot_created", (q) => q.eq("botId", botId))
        .order("desc")
        .take(500);

      totalEvents += events.length;
      eventsToday += events.filter((e) => e.createdAt >= dayAgo).length;
      eventsWeek += events.filter((e) => e.createdAt >= weekAgo).length;

      for (const event of events.slice(0, 10)) {
        recentActivity.push({
          eventType: event.eventType,
          payload: event.payload,
          platform: event.platform,
          createdAt: event.createdAt,
        });
      }

      for (const event of events) {
        if (event.eventType === "start") funnel.starts++;
        if (event.payload === "about_more" || event.payload?.startsWith("about_")) {
          funnel.aboutViews++;
        }
        if (event.payload === "demo") funnel.demoViews++;
        if (event.payload === "try") funnel.tryViews++;
        if (event.payload === "impl") funnel.implViews++;

        if (event.createdAt >= weekAgo) {
          const date = new Date(event.createdAt).toISOString().slice(0, 10);
          const entry = dailyMap.get(date) ?? { starts: 0, callbacks: 0 };
          if (event.eventType === "start") entry.starts++;
          if (event.eventType === "callback") entry.callbacks++;
          dailyMap.set(date, entry);
        }
      }
    }

    recentActivity.sort((a, b) => b.createdAt - a.createdAt);

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalBots: bots.length,
      enabledBots: enabledBots.length,
      totalUsers,
      totalEvents,
      eventsToday,
      eventsWeek,
      funnel,
      platformBreakdown: {
        telegram: telegramUsers,
        max: maxUsers,
      },
      recentActivity: recentActivity.slice(0, 20),
      dailyStats,
    };
  },
});

export const getCallbackHeatmap = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.array(
    v.object({
      payload: v.string(),
      count: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const events = await ctx.db
      .query("events")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.eventType === "callback" && event.payload) {
        counts.set(event.payload, (counts.get(event.payload) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([payload, count]) => ({ payload, count }))
      .sort((a, b) => b.count - a.count);
  },
});
