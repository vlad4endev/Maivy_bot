import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const platformValidator = v.union(v.literal("telegram"), v.literal("max"));

const botSettingsValidator = v.object({
  botTagline: v.string(),
  privacyPolicyUrl: v.string(),
  loomVideoUrl: v.string(),
  grosterUrl: v.string(),
  contactUsername: v.string(),
  contactUrl: v.string(),
  welcomeImagePath: v.optional(v.string()),
  welcomeVideoPath: v.optional(v.string()),
  telegramVideoNoteFileId: v.optional(v.string()),
  shortDescription: v.optional(v.string()),
});

export default defineSchema({
  bots: defineTable({
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
  })
    .index("by_slug", ["slug"])
    .index("by_enabled", ["enabled"]),

  sections: defineTable({
    botId: v.id("bots"),
    slug: v.string(),
    title: v.optional(v.string()),
    body: v.string(),
    order: v.number(),
    sectionType: v.union(
      v.literal("welcome"),
      v.literal("about_step"),
      v.literal("section"),
      v.literal("system"),
    ),
    keyboardId: v.optional(v.string()),
    isPublished: v.boolean(),
    parseMode: v.union(v.literal("HTML"), v.literal("Markdown")),
    updatedAt: v.number(),
  })
    .index("by_bot", ["botId"])
    .index("by_bot_slug", ["botId", "slug"])
    .index("by_bot_order", ["botId", "order"]),

  keyboardButtons: defineTable({
    botId: v.id("bots"),
    keyboardId: v.string(),
    row: v.number(),
    col: v.number(),
    text: v.string(),
    buttonType: v.union(v.literal("callback"), v.literal("url")),
    action: v.optional(v.string()),
    targetSectionId: v.optional(v.id("sections")),
    url: v.optional(v.string()),
    urlSource: v.optional(
      v.union(
        v.literal("loomVideoUrl"),
        v.literal("grosterUrl"),
        v.literal("contactUrl"),
      ),
    ),
    order: v.number(),
    isEnabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_bot", ["botId"])
    .index("by_bot_keyboard", ["botId", "keyboardId"]),

  botUsers: defineTable({
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
  })
    .index("by_bot", ["botId"])
    .index("by_bot_platform_user", ["botId", "platform", "platformUserId"])
    .index("by_bot_last_seen", ["botId", "lastSeenAt"]),

  events: defineTable({
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
  })
    .index("by_bot", ["botId"])
    .index("by_bot_created", ["botId", "createdAt"])
    .index("by_user", ["userId"]),

  adminSessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
});
