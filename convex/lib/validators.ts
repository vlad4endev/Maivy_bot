import { v } from "convex/values";

export const platformValidator = v.union(
  v.literal("telegram"),
  v.literal("max"),
);

export const botSettingsValidator = v.object({
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

export const sectionTypeValidator = v.union(
  v.literal("welcome"),
  v.literal("about_step"),
  v.literal("section"),
  v.literal("system"),
);

export const buttonTypeValidator = v.union(
  v.literal("callback"),
  v.literal("url"),
);

export const urlSourceValidator = v.optional(
  v.union(
    v.literal("loomVideoUrl"),
    v.literal("grosterUrl"),
    v.literal("contactUrl"),
  ),
);

/** Поля доставки событий MAX (см. dev.max.ru/docs-api). */
export const maxDeliveryValidator = v.object({
  maxWebhookUrl: v.optional(v.string()),
  maxWebhookSecret: v.optional(v.string()),
  maxWebhookPath: v.optional(v.string()),
  webhookPort: v.optional(v.number()),
  maxBotUsername: v.optional(v.string()),
});
