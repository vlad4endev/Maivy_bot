import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyBotApiSecret } from "./lib/auth";
import { resolveMediaRef } from "./lib/mediaPaths";
import { actionForTargetSection } from "./lib/sectionKeyboard";
import {
  DEFAULT_AI_CATALOG_URL,
  DEFAULT_AI_CONSULTANT_URL,
} from "./lib/aiSolutions";
import { normalizeUrl } from "./lib/urls";
import { platformValidator, sectionMediaTypeValidator } from "./lib/validators";

const keyboardRowValidator = v.array(
  v.object({
    text: v.string(),
    action: v.optional(v.string()),
    url: v.optional(v.string()),
  }),
);

const botContentValidator = v.object({
  botId: v.id("bots"),
  slug: v.string(),
  enabled: v.boolean(),
  platforms: v.array(platformValidator),
  telegramToken: v.optional(v.string()),
  maxToken: v.optional(v.string()),
  maxWebhookUrl: v.optional(v.string()),
  maxWebhookSecret: v.optional(v.string()),
  maxWebhookPath: v.optional(v.string()),
  webhookPort: v.optional(v.number()),
  maxBotUsername: v.optional(v.string()),
  settings: v.object({
    botTagline: v.string(),
    privacyPolicyUrl: v.string(),
    loomVideoUrl: v.string(),
    grosterUrl: v.string(),
    aiConsultantUrl: v.optional(v.string()),
    aiCatalogUrl: v.optional(v.string()),
    contactUsername: v.string(),
    contactUrl: v.string(),
    welcomeImagePath: v.optional(v.string()),
    welcomeVideoPath: v.optional(v.string()),
    telegramVideoNoteFileId: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
  }),
  sections: v.array(
    v.object({
      slug: v.string(),
      title: v.optional(v.string()),
      body: v.string(),
      order: v.number(),
      sectionType: v.string(),
      keyboardId: v.optional(v.string()),
      mediaType: v.optional(sectionMediaTypeValidator),
      mediaPath: v.optional(v.string()),
      parseMode: v.string(),
    }),
  ),
  keyboards: v.record(v.string(), v.array(keyboardRowValidator)),
});

function resolveUrl(
  urlSource: string | undefined,
  url: string | undefined,
  settings: {
    loomVideoUrl: string;
    grosterUrl: string;
    aiConsultantUrl?: string;
    aiCatalogUrl?: string;
    contactUrl: string;
  },
): string | undefined {
  if (url) return normalizeUrl(url);
  if (!urlSource) return undefined;
  switch (urlSource) {
    case "loomVideoUrl":
      return normalizeUrl(settings.loomVideoUrl);
    case "grosterUrl":
      return normalizeUrl(settings.grosterUrl);
    case "aiConsultantUrl":
      return normalizeUrl(settings.aiConsultantUrl ?? DEFAULT_AI_CONSULTANT_URL);
    case "aiCatalogUrl":
      return normalizeUrl(settings.aiCatalogUrl ?? DEFAULT_AI_CATALOG_URL);
    case "contactUrl":
      return normalizeUrl(settings.contactUrl);
    default:
      return undefined;
  }
}

export const getBotContent = query({
  args: {
    secret: v.string(),
    botSlug: v.string(),
  },
  returns: v.union(botContentValidator, v.null()),
  handler: async (ctx, args) => {
    await verifyBotApiSecret(args.secret);

    const bot = await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", args.botSlug))
      .unique();

    if (!bot || !bot.enabled) {
      return null;
    }

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .collect();

    const publishedSections = await Promise.all(
      sections
        .filter((s) => s.isPublished)
        .sort((a, b) => a.order - b.order)
        .map(async (s) => ({
          slug: s.slug,
          title: s.title,
          body: s.body,
          order: s.order,
          sectionType: s.sectionType,
          keyboardId: s.keyboardId,
          mediaType: s.mediaType,
          mediaPath: await resolveMediaRef(ctx, s.mediaPath),
          parseMode: s.parseMode,
        })),
    );

    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .collect();

    const enabledButtons = buttons.filter((b) => b.isEnabled);
    const keyboardIds = [...new Set(enabledButtons.map((b) => b.keyboardId))] as string[];

    const keyboards: Record<
      string,
      Array<Array<{ text: string; action?: string; url?: string }>>
    > = {};

    for (const keyboardId of keyboardIds) {
      const kbButtons = enabledButtons
        .filter((b) => b.keyboardId === keyboardId)
        .sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.col - b.col;
        });

      const maxRow = kbButtons.reduce((max, b) => Math.max(max, b.row), 0);
      const rows: Array<Array<{ text: string; action?: string; url?: string }>> =
        [];

      for (let row = 0; row <= maxRow; row++) {
        const rowButtons = (
          await Promise.all(
            kbButtons
              .filter((b) => b.row === row)
              .sort((a, b) => a.col - b.col)
              .map(async (b) => {
                if (b.buttonType !== "callback") {
                  return {
                    text: b.text,
                    url: resolveUrl(b.urlSource, b.url, bot.settings),
                  };
                }

                let action = b.action;
                if (!action && b.targetSectionId) {
                  const target = await ctx.db.get(b.targetSectionId);
                  if (target) {
                    action = actionForTargetSection(target.slug);
                  }
                }

                return {
                  text: b.text,
                  action,
                };
              }),
          )
        ).filter((button) => Boolean(button.url || button.action));
        if (rowButtons.length > 0) {
          rows.push(rowButtons);
        }
      }

      keyboards[keyboardId] = rows;
    }

    return {
      botId: bot._id,
      slug: bot.slug,
      enabled: bot.enabled,
      platforms: bot.platforms,
      telegramToken: bot.telegramToken,
      maxToken: bot.maxToken,
      maxWebhookUrl: bot.maxWebhookUrl,
      maxWebhookSecret: bot.maxWebhookSecret,
      maxWebhookPath: bot.maxWebhookPath,
      webhookPort: bot.webhookPort,
      maxBotUsername: bot.maxBotUsername,
      settings: {
        ...bot.settings,
        welcomeImagePath: await resolveMediaRef(ctx, bot.settings.welcomeImagePath),
        welcomeVideoPath: await resolveMediaRef(ctx, bot.settings.welcomeVideoPath),
      },
      sections: publishedSections,
      keyboards,
    };
  },
});

export const trackStart = mutation({
  args: {
    secret: v.string(),
    botSlug: v.string(),
    platform: platformValidator,
    platformUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    languageCode: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("botUsers"),
    isBlocked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await verifyBotApiSecret(args.secret);

    const bot = await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", args.botSlug))
      .unique();

    if (!bot) {
      throw new Error(`Bot "${args.botSlug}" not found`);
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("botUsers")
      .withIndex("by_bot_platform_user", (q) =>
        q
          .eq("botId", bot._id)
          .eq("platform", args.platform)
          .eq("platformUserId", args.platformUserId),
      )
      .unique();

    let userId;
    let isBlocked = false;

    if (existing) {
      userId = existing._id;
      isBlocked = existing.isBlocked;
      await ctx.db.patch(existing._id, {
        firstName: args.firstName ?? existing.firstName,
        lastName: args.lastName ?? existing.lastName,
        username: args.username ?? existing.username,
        languageCode: args.languageCode ?? existing.languageCode,
        lastSeenAt: now,
        startCount: existing.startCount + 1,
        lastSection: "start",
      });
    } else {
      userId = await ctx.db.insert("botUsers", {
        botId: bot._id,
        platform: args.platform,
        platformUserId: args.platformUserId,
        firstName: args.firstName,
        lastName: args.lastName,
        username: args.username,
        languageCode: args.languageCode,
        firstSeenAt: now,
        lastSeenAt: now,
        startCount: 1,
        lastSection: "start",
        isBlocked: false,
      });
    }

    await ctx.db.insert("events", {
      botId: bot._id,
      userId,
      eventType: "start",
      platform: args.platform,
      createdAt: now,
    });

    return { userId, isBlocked };
  },
});

export const trackEvent = mutation({
  args: {
    secret: v.string(),
    botSlug: v.string(),
    platform: platformValidator,
    platformUserId: v.string(),
    eventType: v.union(
      v.literal("callback"),
      v.literal("section_view"),
    ),
    payload: v.optional(v.string()),
    sectionSlug: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await verifyBotApiSecret(args.secret);

    const bot = await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", args.botSlug))
      .unique();

    if (!bot) {
      throw new Error(`Bot "${args.botSlug}" not found`);
    }

    const user = await ctx.db
      .query("botUsers")
      .withIndex("by_bot_platform_user", (q) =>
        q
          .eq("botId", bot._id)
          .eq("platform", args.platform)
          .eq("platformUserId", args.platformUserId),
      )
      .unique();

    if (user?.isBlocked) {
      return null;
    }

    const now = Date.now();

    if (user) {
      await ctx.db.patch(user._id, {
        lastSeenAt: now,
        lastSection: args.sectionSlug ?? args.payload ?? user.lastSection,
      });
    }

    await ctx.db.insert("events", {
      botId: bot._id,
      userId: user?._id,
      eventType: args.eventType,
      payload: args.payload,
      sectionSlug: args.sectionSlug,
      platform: args.platform,
      createdAt: now,
    });

    return null;
  },
});
