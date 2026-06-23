import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";

dotenv.config();
dotenv.config({ path: ".env.local", override: false });

const convexUrl = process.env.CONVEX_URL?.trim();
const secret = process.env.BOT_API_SECRET?.trim();
const botSlug = process.env.BOT_SLUG?.trim() || "maivy";

if (!convexUrl || !secret) {
  console.error("✗ CONVEX_URL и BOT_API_SECRET должны быть заданы");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
const data = await client.query("botApi:getBotContent", { secret, botSlug });

if (!data) {
  console.error(`✗ Бот "${botSlug}" не найден или отключён`);
  process.exit(1);
}

const publishedSlugs = new Set(data.sections.map((section) => section.slug));
let issues = 0;

console.log(`Бот: ${data.slug}`);
console.log(`Опубликованных разделов: ${publishedSlugs.size}`);
console.log("");

for (const [keyboardId, rows] of Object.entries(data.keyboards)) {
  console.log(`Клавиатура "${keyboardId}":`);
  for (const row of rows) {
    for (const button of row) {
      if (button.url) {
        console.log(`  ✓ [url] ${button.text} → ${button.url}`);
        continue;
      }

      if (!button.action) {
        console.log(`  ✗ [callback] ${button.text} → action не задан`);
        issues += 1;
        continue;
      }

      if (button.action.startsWith("section:")) {
        const slug = button.action.slice(8);
        if (publishedSlugs.has(slug)) {
          console.log(`  ✓ [callback] ${button.text} → ${button.action}`);
        } else {
          console.log(
            `  ✗ [callback] ${button.text} → ${button.action} (раздел не опубликован или отсутствует)`,
          );
          issues += 1;
        }
        continue;
      }

      console.log(`  ✓ [callback] ${button.text} → ${button.action}`);
    }
  }
  console.log("");
}

if (issues > 0) {
  console.error(`Найдено проблем: ${issues}`);
  console.error(
    "Проверьте конструктор: целевой экран, публикация раздела, «Связать переходы с экранами».",
  );
  process.exit(1);
}

console.log("✓ Все кнопки имеют корректные переходы");
