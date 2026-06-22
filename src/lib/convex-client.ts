import { ConvexHttpClient } from "convex/browser";
import type { AppContentConfig } from "../config.js";
import { resolveMediaPaths } from "../config.js";
import type { Keyboard } from "../core/actions.js";

export interface DynamicSection {
  slug: string;
  title?: string;
  body: string;
  order: number;
  sectionType: string;
  keyboardId?: string;
  mediaType?: "none" | "image" | "video" | "video_note";
  mediaPath?: string;
  parseMode: string;
}

export interface BotContentSnapshot {
  botId: string;
  slug: string;
  enabled: boolean;
  platforms: Array<"telegram" | "max">;
  telegramToken?: string;
  maxToken?: string;
  maxWebhookUrl?: string;
  maxWebhookSecret?: string;
  maxWebhookPath?: string;
  webhookPort?: number;
  maxBotUsername?: string;
  settings: AppContentConfig;
  sections: DynamicSection[];
  keyboards: Record<string, Keyboard>;
  loadedAt: number;
}

let cachedContent: BotContentSnapshot | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function isConvexEnabled(): boolean {
  return Boolean(
    process.env.CONVEX_URL?.trim() && process.env.BOT_API_SECRET?.trim(),
  );
}

function getClient(): ConvexHttpClient | null {
  const url = process.env.CONVEX_URL?.trim();
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export async function loadBotRuntime(
  botSlug: string,
  fallbackConfig: AppContentConfig,
  forceRefresh = false,
): Promise<BotContentSnapshot | null> {
  if (!isConvexEnabled()) {
    return null;
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedContent &&
    cachedContent.slug === botSlug &&
    cacheExpiresAt > now
  ) {
    return cachedContent;
  }

  const client = getClient();
  const secret = process.env.BOT_API_SECRET!.trim();
  if (!client) return null;

  try {
    const result = await client.query("botApi:getBotContent" as never, {
      secret,
      botSlug,
    } as never);

    if (!result) {
      return null;
    }

    const data = result as {
      botId: string;
      slug: string;
      enabled: boolean;
      platforms: Array<"telegram" | "max">;
      telegramToken?: string;
      maxToken?: string;
      maxWebhookUrl?: string;
      maxWebhookSecret?: string;
      maxWebhookPath?: string;
      webhookPort?: number;
      maxBotUsername?: string;
      settings: AppContentConfig;
      sections: DynamicSection[];
      keyboards: Record<string, Keyboard>;
    };

    const settings = resolveMediaPaths({
      botTagline: data.settings.botTagline,
      privacyPolicyUrl: data.settings.privacyPolicyUrl,
      loomVideoUrl: data.settings.loomVideoUrl,
      grosterUrl: data.settings.grosterUrl,
      contactUsername: data.settings.contactUsername,
      contactUrl: data.settings.contactUrl,
      welcomeImagePath:
        data.settings.welcomeImagePath ?? fallbackConfig.welcomeImagePath,
      welcomeVideoPath:
        data.settings.welcomeVideoPath ?? fallbackConfig.welcomeVideoPath,
      telegramVideoNoteFileId:
        data.settings.telegramVideoNoteFileId ??
        fallbackConfig.telegramVideoNoteFileId,
      shortDescription:
        data.settings.shortDescription ?? fallbackConfig.shortDescription,
    });

    cachedContent = {
      botId: data.botId,
      slug: data.slug,
      enabled: data.enabled,
      platforms: data.platforms,
      telegramToken: data.telegramToken,
      maxToken: data.maxToken,
      maxWebhookUrl: data.maxWebhookUrl,
      maxWebhookSecret: data.maxWebhookSecret,
      maxWebhookPath: data.maxWebhookPath,
      webhookPort: data.webhookPort,
      maxBotUsername: data.maxBotUsername,
      settings,
      sections: data.sections,
      keyboards: data.keyboards,
      loadedAt: now,
    };
    cacheExpiresAt = now + CACHE_TTL_MS;

    return cachedContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Convex: не удалось загрузить конфигурацию:", message);
    return null;
  }
}

/** @deprecated use loadBotRuntime */
export const loadBotContent = loadBotRuntime;

export interface TrackUserInfo {
  platform: "telegram" | "max";
  platformUserId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export async function trackStart(
  botSlug: string,
  user: TrackUserInfo,
): Promise<{ isBlocked: boolean } | null> {
  if (!isConvexEnabled()) return null;

  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.mutation("botApi:trackStart" as never, {
      secret: process.env.BOT_API_SECRET!.trim(),
      botSlug,
      ...user,
    } as never);

    return result as { isBlocked: boolean };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Convex: trackStart failed:", message);
    return null;
  }
}

export async function trackEvent(
  botSlug: string,
  user: TrackUserInfo,
  eventType: "callback" | "section_view",
  payload?: string,
  sectionSlug?: string,
): Promise<void> {
  if (!isConvexEnabled()) return;

  const client = getClient();
  if (!client) return;

  try {
    await client.mutation("botApi:trackEvent" as never, {
      secret: process.env.BOT_API_SECRET!.trim(),
      botSlug,
      platform: user.platform,
      platformUserId: user.platformUserId,
      eventType,
      payload,
      sectionSlug,
    } as never);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Convex: trackEvent failed:", message);
  }
}

export function invalidateContentCache(): void {
  cachedContent = null;
  cacheExpiresAt = 0;
}
