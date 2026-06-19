import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";

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

  try {
    const runtime = await client.query("botApi:getBotContent" as never, {
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

      for (const platform of runtime.platforms) {
        const token =
          platform === "telegram" ? runtime.telegramToken : runtime.maxToken;
        if (!token) {
          fail(
            `${platform.toUpperCase()} включён, но токен не задан (админка → Настройки)`,
          );
          hasErrors = true;
        } else {
          ok(`${platform.toUpperCase()} токен задан`);
        }
      }

      if (runtime.platforms.length === 0) {
        fail("Не выбрана ни одна платформа");
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

  console.log("Всё готово — можно запускать бота: npm run dev");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Ошибка диагностики:", message);
  process.exit(1);
});
