import { createBotHandlers } from "./core/handlers.js";
import {
  getEnvFallbackContent,
  loadBootstrapConfig,
  loadTelegramDeliveryConfig,
} from "./config.js";
import { resolveMaxDeliveryConfig } from "./lib/max-delivery.js";
import { loadBotRuntime } from "./lib/convex-client.js";
import { buildRuntimeState } from "./lib/platform-tokens.js";
import { getRuntimeState, setRuntimeState } from "./lib/runtime-state.js";
import { startMaxBot } from "./platforms/max/bot.js";
import { startTelegramBot } from "./platforms/telegram/bot.js";

async function applyRuntime(botSlug: string): Promise<boolean> {
  const fallback = getEnvFallbackContent();
  const runtime = await loadBotRuntime(botSlug, fallback);

  if (!runtime) {
    return false;
  }

  if (!runtime.enabled) {
    console.warn(`Бот "${botSlug}" отключён в админ-панели`);
    return false;
  }

  setRuntimeState(
    buildRuntimeState(
      botSlug,
      {
        enabled: runtime.enabled,
        platforms: runtime.platforms,
        telegramToken: runtime.telegramToken,
        maxToken: runtime.maxToken,
        maxWebhookUrl: runtime.maxWebhookUrl,
        maxWebhookSecret: runtime.maxWebhookSecret,
        maxWebhookPath: runtime.maxWebhookPath,
        webhookPort: runtime.webhookPort,
        maxBotUsername: runtime.maxBotUsername,
        settings: runtime.settings,
      },
      runtime,
    ),
  );

  return true;
}

async function main(): Promise<void> {
  const bootstrap = loadBootstrapConfig();

  const loaded = await applyRuntime(bootstrap.botSlug);

  if (loaded) {
    console.log(`Конфигурация загружена из админ-панели (бот: ${bootstrap.botSlug})`);
  } else if (!bootstrap.convexUrl || !bootstrap.botApiSecret) {
    throw new Error(
      "Настройте CONVEX_URL и BOT_API_SECRET в .env, затем создайте бота в админ-панели → Настройки",
    );
  } else {
    throw new Error(
      `Бот "${bootstrap.botSlug}" не найден или отключён. Создайте его в админ-панели.`,
    );
  }

  const handlers = createBotHandlers();
  const botOptions = { botSlug: bootstrap.botSlug };
  const runtime = getRuntimeState();

  if (!runtime) {
    throw new Error("Не удалось загрузить конфигурацию бота");
  }

  let startedPlatforms = 0;

  if (runtime.platforms.includes("telegram")) {
    if (!runtime.telegramToken) {
      console.warn(
        "Telegram включён, но токен не задан (админка → Настройки или TELEGRAM_BOT_TOKEN в .env)",
      );
    } else {
      await startTelegramBot(
        runtime.telegramToken,
        handlers,
        runtime.config,
        {
          ...botOptions,
          delivery: loadTelegramDeliveryConfig(),
        },
      );
      startedPlatforms += 1;
    }
  }

  if (runtime.platforms.includes("max")) {
    if (!runtime.maxToken) {
      console.warn(
        "MAX включён, но токен не задан (админка → Настройки или MAX_BOT_TOKEN в .env)",
      );
    } else {
      await startMaxBot(runtime.maxToken, handlers, runtime.config, {
        ...botOptions,
        delivery: resolveMaxDeliveryConfig(runtime),
      });
      startedPlatforms += 1;
    }
  }

  if (startedPlatforms === 0) {
    throw new Error(
      "Ни одна платформа не запущена: задайте токены в админке → Настройки или в .env (TELEGRAM_BOT_TOKEN / MAX_BOT_TOKEN)",
    );
  }

  setInterval(() => {
    void applyRuntime(bootstrap.botSlug).then((ok) => {
      if (ok) {
        console.log("Конфигурация обновлена из админ-панели");
      }
    });
  }, 60_000);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Ошибка запуска:", message);
  process.exit(1);
});
