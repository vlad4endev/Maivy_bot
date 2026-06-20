import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { botSettingsValidator, platformValidator } from "./lib/validators";

const botDocValidator = v.object({
  _id: v.id("bots"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  platforms: v.array(platformValidator),
  telegramToken: v.optional(v.string()),
  maxToken: v.optional(v.string()),
  maxWebhookUrl: v.optional(v.string()),
  maxWebhookSecret: v.optional(v.string()),
  maxWebhookPath: v.optional(v.string()),
  webhookPort: v.optional(v.number()),
  maxBotUsername: v.optional(v.string()),
  enabled: v.boolean(),
  settings: botSettingsValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: { token: v.string() },
  returns: v.array(botDocValidator),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.db.query("bots").order("desc").collect();
  },
});

export const get = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.union(botDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.db.get(args.botId);
  },
});

export const getBySlug = query({
  args: { token: v.string(), slug: v.string() },
  returns: v.union(botDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    platforms: v.array(platformValidator),
    telegramToken: v.optional(v.string()),
    maxToken: v.optional(v.string()),
    maxWebhookUrl: v.optional(v.string()),
    maxWebhookSecret: v.optional(v.string()),
    maxWebhookPath: v.optional(v.string()),
    webhookPort: v.optional(v.number()),
    maxBotUsername: v.optional(v.string()),
    enabled: v.boolean(),
    settings: botSettingsValidator,
  },
  returns: v.id("bots"),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const existing = await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Bot with slug "${args.slug}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert("bots", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      platforms: args.platforms,
      telegramToken: args.telegramToken,
      maxToken: args.maxToken,
      maxWebhookUrl: args.maxWebhookUrl,
      maxWebhookSecret: args.maxWebhookSecret,
      maxWebhookPath: args.maxWebhookPath,
      webhookPort: args.webhookPort,
      maxBotUsername: args.maxBotUsername,
      enabled: args.enabled,
      settings: args.settings,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    platforms: v.optional(v.array(platformValidator)),
    telegramToken: v.optional(v.string()),
    maxToken: v.optional(v.string()),
    maxWebhookUrl: v.optional(v.string()),
    maxWebhookSecret: v.optional(v.string()),
    maxWebhookPath: v.optional(v.string()),
    webhookPort: v.optional(v.number()),
    maxBotUsername: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    settings: v.optional(botSettingsValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const bot = await ctx.db.get(args.botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    if (args.slug && args.slug !== bot.slug) {
      const existing = await ctx.db
        .query("bots")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .unique();
      if (existing) {
        throw new Error(`Bot with slug "${args.slug}" already exists`);
      }
    }

    const platforms = args.platforms ?? bot.platforms;
    if (platforms.includes("max")) {
      const maxToken = args.maxToken ?? bot.maxToken;
      if (!maxToken?.trim()) {
        throw new Error("MAX включён: укажите токен бота (business.max.ru)");
      }

      const maxWebhookSecret = args.maxWebhookSecret ?? bot.maxWebhookSecret;
      if (
        maxWebhookSecret &&
        (maxWebhookSecret.length < 5 || maxWebhookSecret.length > 256)
      ) {
        throw new Error(
          "MAX_WEBHOOK_SECRET: от 5 до 256 символов (латиница, цифры, _ и -)",
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.description !== undefined) updates.description = args.description;
    if (args.platforms !== undefined) updates.platforms = args.platforms;
    if (args.telegramToken !== undefined) updates.telegramToken = args.telegramToken;
    if (args.maxToken !== undefined) updates.maxToken = args.maxToken;
    if (args.maxWebhookUrl !== undefined) updates.maxWebhookUrl = args.maxWebhookUrl;
    if (args.maxWebhookSecret !== undefined) {
      updates.maxWebhookSecret = args.maxWebhookSecret;
    }
    if (args.maxWebhookPath !== undefined) updates.maxWebhookPath = args.maxWebhookPath;
    if (args.webhookPort !== undefined) updates.webhookPort = args.webhookPort;
    if (args.maxBotUsername !== undefined) updates.maxBotUsername = args.maxBotUsername;
    if (args.enabled !== undefined) updates.enabled = args.enabled;
    if (args.settings !== undefined) updates.settings = args.settings;

    await ctx.db.patch(args.botId, updates);
    return null;
  },
});

export const remove = mutation({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    for (const section of sections) {
      await ctx.db.delete(section._id);
    }

    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    for (const button of buttons) {
      await ctx.db.delete(button._id);
    }

    const users = await ctx.db
      .query("botUsers")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    await ctx.db.delete(args.botId);
    return null;
  },
});

export const toggleEnabled = mutation({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const bot = await ctx.db.get(args.botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const enabled = !bot.enabled;
    await ctx.db.patch(args.botId, { enabled, updatedAt: Date.now() });
    return enabled;
  },
});
