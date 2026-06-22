import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.CONVEX_URL?.trim();
const secret = process.env.BOT_API_SECRET?.trim();
const botSlug = process.env.BOT_SLUG?.trim() || "maivy";

if (!convexUrl || !secret) {
  console.error("✗ CONVEX_URL и BOT_API_SECRET должны быть заданы в окружении контейнера");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

try {
  const result = await client.query("botApi:getBotContent", { secret, botSlug });

  if (!result) {
    console.error(`✗ Бот "${botSlug}" не найден или отключён`);
    process.exit(1);
  }

  const tg = Boolean(result.telegramToken?.trim());
  const max = Boolean(result.maxToken?.trim());

  console.log(`Бот: ${result.slug} (${result.enabled ? "включён" : "выключен"})`);
  console.log(`Платформы: ${result.platforms.join(", ")}`);
  console.log(tg ? "✓ Telegram token в базе" : "✗ Telegram token в базе: НЕТ");
  console.log(max ? "✓ MAX token в базе" : "✗ MAX token в базе: НЕТ");

  if (result.maxWebhookUrl) {
    console.log(`MAX webhook: ${result.maxWebhookUrl}`);
  }

  process.exit(tg || max ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("✗ Ошибка запроса к Convex:", message);
  process.exit(1);
}
