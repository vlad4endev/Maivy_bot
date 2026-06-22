import { Bot } from "grammy";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import type { AppContentConfig, TelegramDeliveryConfig } from "../../config.js";
import type { BotHandlers } from "../../core/handlers.js";
import {
  executeTelegramActions,
  executeTelegramCallbackActions,
} from "./actions.js";
import { setupTelegramProfile } from "./setup.js";
import { registerTelegramWebhook } from "./webhook-server.js";
import { resolveEditableCallbackMessageId } from "../../lib/callback-message.js";
import { trackEvent, trackStart, type TrackUserInfo } from "../../lib/convex-client.js";

const TELEGRAM_ALLOWED_UPDATES = ["message", "callback_query"] as const;

function createTelegramBot(token: string): Bot {
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.TELEGRAM_PROXY_URL;

  if (proxyUrl) {
    const agent = proxyUrl.startsWith("socks")
      ? new SocksProxyAgent(proxyUrl)
      : new HttpsProxyAgent(proxyUrl);

    return new Bot(token, {
      client: {
        baseFetchConfig: {
          agent,
          compress: true,
        },
      },
    });
  }

  return new Bot(token);
}

export interface TelegramBotOptions {
  botSlug: string;
  delivery: TelegramDeliveryConfig;
  onBlockedUser?: () => void;
}

function attachTelegramErrorHandler(bot: Bot): void {
  bot.catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Telegram: ошибка обработки:", message);
  });
}

function registerTelegramHandlers(
  bot: Bot,
  handlers: BotHandlers,
  config: AppContentConfig,
  options: TelegramBotOptions,
): void {
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
    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Telegram: ошибка /start:", message);
      try {
        await bot.api.sendMessage(
          ctx.chat.id,
          "Не удалось обработать команду. Попробуйте ещё раз.",
        );
      } catch {
        // ignore secondary failure
      }
    }
  };

  bot.command("start", runStart);

  bot.on("callback_query:data", async (ctx) => {
    const payload = ctx.callbackQuery.data;

    try {
      const userInfo = getUserInfo(ctx);
      void trackEvent(options.botSlug, userInfo, "callback", payload);

      await executeTelegramCallbackActions(
        ctx,
        handlers.handleCallback(
          payload,
          resolveEditableCallbackMessageId(ctx.callbackQuery.message),
        ),
        config,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Telegram: ошибка callback:", payload, message);
      try {
        await ctx.answerCallbackQuery("Не удалось выполнить действие");
      } catch {
        // ignore secondary failure
      }
    }
  });
}

export async function startTelegramBot(
  token: string,
  handlers: BotHandlers,
  config: AppContentConfig,
  options: TelegramBotOptions,
): Promise<Bot> {
  const bot = createTelegramBot(token);
  attachTelegramErrorHandler(bot);
  registerTelegramHandlers(bot, handlers, config, options);

  const me = await bot.api.getMe();
  console.log(`Telegram: авторизация OK (@${me.username ?? me.first_name})`);

  if (options.delivery.mode === "webhook") {
    if (!options.delivery.webhookUrl?.startsWith("https://")) {
      throw new Error(
        "TELEGRAM_WEBHOOK_URL должен начинаться с https:// (требование Telegram Bot API)",
      );
    }

    await registerTelegramWebhook(bot, options.delivery);

    await bot.api.setWebhook(options.delivery.webhookUrl, {
      secret_token: options.delivery.webhookSecret,
      allowed_updates: [...TELEGRAM_ALLOWED_UPDATES],
    });

    console.log(`Telegram webhook зарегистрирован: ${options.delivery.webhookUrl}`);
    return bot;
  }

  await bot.api.deleteWebhook({ drop_pending_updates: false });
  void bot.start({
    onStart: () => {
      console.log("Telegram бот запущен (Long Polling)");
    },
  });

  return bot;
}
