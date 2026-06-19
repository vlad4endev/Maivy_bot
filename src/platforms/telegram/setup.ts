import { existsSync } from "node:fs";
import type { Bot } from "grammy";
import { InputFile } from "grammy";
import type { AppContentConfig } from "../../config.js";
import {
  buildBotProfileDescription,
  buildBotShortDescription,
} from "../../core/content.js";

export async function setupTelegramProfile(
  bot: Bot,
  config: AppContentConfig,
): Promise<void> {
  const description = buildBotProfileDescription(config);
  const shortDescription = config.shortDescription ?? buildBotShortDescription();

  await bot.api.setMyDescription(description);
  await bot.api.setMyShortDescription(shortDescription);

  if (config.welcomeImagePath && existsSync(config.welcomeImagePath)) {
    await bot.api.setMyProfilePhoto({
      type: "static",
      photo: new InputFile(config.welcomeImagePath),
    });
    console.log("Telegram: фото профиля обновлено");
  }

  console.log("Telegram: описание бота обновлено");
}
