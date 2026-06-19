import { createBotHandlers } from "./core/handlers.js";
import {
  getEnvFallbackContent,
  loadBootstrapConfig,
  loadMaxDeliveryConfig,
} from "./config.js";
import { loadBotRuntime } from "./lib/convex-client.js";
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

  setRuntimeState({
    botSlug,
    enabled: runtime.enabled,
    platforms: runtime.platforms,
    telegramToken: runtime.telegramToken,
    maxToken: runtime.maxToken,
    config: runtime.settings,
    content: runtime,
  });

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

  if (runtime.platforms.includes("telegram")) {
    if (!runtime.telegramToken) {
      throw new Error(
        "Telegram включён, но токен не задан. Укажите его в админ-панели → Настройки",
      );
    }
    startTelegramBot(
      runtime.telegramToken,
      handlers,
      runtime.config,
      botOptions,
    );
  }

  if (runtime.platforms.includes("max")) {
    if (!runtime.maxToken) {
      throw new Error(
        "MAX включён, но токен не задан. Укажите его в админ-панели → Настройки",
      );
    }
    await startMaxBot(runtime.maxToken, handlers, runtime.config, {
      ...botOptions,
      delivery: loadMaxDeliveryConfig(),
    });
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
