import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import {
  loadTelegramDeliveryConfig,
} from "../src/config.js";
import { resolvePlatformTokens } from "../src/lib/platform-tokens.js";
import { resolveMaxDeliveryConfig } from "../src/lib/max-delivery.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: false });

const convexUrl = process.env.CONVEX_URL?.trim();
const botApiSecret = process.env.BOT_API_SECRET?.trim();
const botSlug = process.env.BOT_SLUG?.trim() ?? "maivy";

function ok(message: string): void {
  console.log(`✓ ${message}`);
}

function fail(message: string): void {
  console.log(`✗ ${message}`);
}

async function main(): Promise<void> {
  console.log("Maivy Bot — диагностика\n");

  let hasErrors = false;

  if (!convexUrl) {
    fail("CONVEX_URL не задан (.env или .env.local)");
    hasErrors = true;
  } else {
    ok(`CONVEX_URL = ${convexUrl}`);
  }

  if (!botApiSecret) {
    fail("BOT_API_SECRET не задан (должен совпадать с Convex env)");
    hasErrors = true;
  } else {
    ok("BOT_API_SECRET задан");
  }

  ok(`BOT_SLUG = ${botSlug}`);

  if (!convexUrl || !botApiSecret) {
    console.log(
      "\nСоздайте .env:\n  CONVEX_URL=...\n  BOT_API_SECRET=...\n  BOT_SLUG=maivy",
    );
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  let runtime: {
    slug: string;
    platforms: Array<"telegram" | "max">;
    telegramToken?: string;
    maxToken?: string;
    maxWebhookUrl?: string;
    maxWebhookSecret?: string;
    maxWebhookPath?: string;
    webhookPort?: number;
  } | null = null;
  let tokens = { telegramToken: undefined as string | undefined, maxToken: undefined as string | undefined };

  try {
    runtime = await client.query("botApi:getBotContent" as never, {
      secret: botApiSecret,
      botSlug,
    } as never);

    if (!runtime) {
      fail(`Бот "${botSlug}" не найден или отключён в админ-панели`);
      console.log(
        "\nОткройте админку → Боты → «Создать Maivy по умолчанию»",
      );
      hasErrors = true;
    } else {
      ok(`Бот "${runtime.slug}" найден и включён`);

      tokens = resolvePlatformTokens(runtime);
      let runnablePlatforms = 0;

      for (const platform of runtime.platforms) {
        const token =
          platform === "telegram" ? tokens.telegramToken : tokens.maxToken;
        const envKey =
          platform === "telegram" ? "TELEGRAM_BOT_TOKEN" : "MAX_BOT_TOKEN";

        if (!token) {
          fail(
            `${platform.toUpperCase()} включён, но токен не задан (админка → Настройки или ${envKey} в .env)`,
          );
          hasErrors = true;
        } else {
          ok(`${platform.toUpperCase()} токен задан`);
          runnablePlatforms += 1;
        }
      }

      if (runtime.platforms.length === 0) {
        fail("Не выбрана ни одна платформа");
        hasErrors = true;
      } else if (runnablePlatforms === 0) {
        fail("Нет платформ с токенами — сценарий не запустится");
        hasErrors = true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Не удалось подключиться к Convex: ${message}`);
    if (message.includes("invalid bot API secret")) {
      console.log(
        "\nBOT_API_SECRET на сервере бота не совпадает с Convex env.",
      );
      console.log("Проверьте: npx convex env get BOT_API_SECRET");
    }
    hasErrors = true;
  }

  console.log("");
  if (hasErrors) {
    console.log("Исправьте ошибки выше и перезапустите бота: npm run dev");
    process.exit(1);
  }

  const telegramDelivery = loadTelegramDeliveryConfig();
  if (runtime?.platforms.includes("telegram")) {
    console.log("");
    if (telegramDelivery.mode === "webhook") {
      ok(`Telegram webhook: ${telegramDelivery.webhookUrl}`);
      if (!telegramDelivery.webhookSecret) {
        console.log(
          "  Рекомендуется задать TELEGRAM_WEBHOOK_SECRET (заголовок X-Telegram-Bot-Api-Secret-Token)",
        );
      }
    } else {
      console.log(
        "ℹ Telegram: Long Polling (режим разработки). Для production задайте TELEGRAM_WEBHOOK_URL=https://...",
      );
    }
  }

  const maxDelivery = resolveMaxDeliveryConfig(runtime ?? undefined);
  if (runtime?.platforms.includes("max") && tokens.maxToken) {
    console.log("");
    if (maxDelivery.mode === "webhook") {
      ok(`MAX webhook: ${maxDelivery.webhookUrl}`);
      if (!maxDelivery.webhookSecret) {
        console.log(
          "  Рекомендуется задать MAX_WEBHOOK_SECRET (заголовок X-Max-Bot-Api-Secret)",
        );
      }
    } else {
      console.log(
        "ℹ MAX: Long Polling (режим разработки). Для production задайте MAX_WEBHOOK_URL в админке или .env",
      );
    }
  }

  console.log("");
  console.log("Всё готово — можно запускать бота: npm run dev");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Ошибка диагностики:", message);
  process.exit(1);
});
