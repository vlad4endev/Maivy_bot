import { Bot } from "grammy";
import type { AppContentConfig } from "../../config.js";
import type { BotHandlers } from "../../core/handlers.js";
import {
  executeTelegramActions,
  executeTelegramCallbackActions,
} from "./actions.js";
import { setupTelegramProfile } from "./setup.js";
import { trackEvent, trackStart, type TrackUserInfo } from "../../lib/convex-client.js";

export interface TelegramBotOptions {
  botSlug: string;
  onBlockedUser?: () => void;
}

export function startTelegramBot(
  token: string,
  handlers: BotHandlers,
  config: AppContentConfig,
  options: TelegramBotOptions,
): Bot {
  const bot = new Bot(token);

  void setupTelegramProfile(bot, config).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Telegram: не удалось обновить профиль:", message);
  });

  const getUserInfo = (ctx: {
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  }): TrackUserInfo => ({
    platform: "telegram",
    platformUserId: String(ctx.from?.id ?? "unknown"),
    firstName: ctx.from?.first_name,
    lastName: ctx.from?.last_name,
    username: ctx.from?.username,
    languageCode: ctx.from?.language_code,
  });

  const runStart = async (ctx: {
    chat: { id: number };
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  }) => {
    const userInfo = getUserInfo(ctx);
    const trackResult = await trackStart(options.botSlug, userInfo);

    if (trackResult?.isBlocked) {
      options.onBlockedUser?.();
      await bot.api.sendMessage(ctx.chat.id, "Доступ ограничен.");
      return;
    }

    await executeTelegramActions(
      bot.api,
      ctx.chat.id,
      handlers.handleStart(ctx.from?.first_name),
      config,
    );
  };

  bot.command("start", runStart);

  bot.on("callback_query:data", async (ctx) => {
    const payload = ctx.callbackQuery.data;
    const userInfo = getUserInfo(ctx);

    void trackEvent(options.botSlug, userInfo, "callback", payload);

    await executeTelegramCallbackActions(
      ctx,
      handlers.handleCallback(payload, String(ctx.callbackQuery.message?.message_id)),
      config,
    );
  });

  void bot.start({
    onStart: () => {
      console.log("Telegram бот запущен");
    },
  });

  return bot;
}
