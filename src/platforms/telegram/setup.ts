import { existsSync } from "node:fs";
import type { Bot } from "grammy";
import { InputFile } from "grammy";
import type { AppContentConfig } from "../../config.js";
import {
  buildBotProfileDescription,
  buildBotShortDescription,
} from "../../core/content.js";
import { isHttpMediaSource } from "../../lib/remote-media.js";

function createProfilePhotoInput(source: string): InputFile {
  if (isHttpMediaSource(source)) {
    return new InputFile({ url: source });
  }
  return new InputFile(source);
}

export async function setupTelegramProfile(
  bot: Bot,
  config: AppContentConfig,
): Promise<void> {
  const description = buildBotProfileDescription(config);
  const shortDescription = config.shortDescription ?? buildBotShortDescription();

  await bot.api.setMyDescription(description);
  await bot.api.setMyShortDescription(shortDescription);

  if (config.welcomeImagePath) {
    const hasLocal = existsSync(config.welcomeImagePath);
    const hasRemote = isHttpMediaSource(config.welcomeImagePath);
    if (hasLocal || hasRemote) {
      await bot.api.setMyProfilePhoto({
        type: "static",
        photo: createProfilePhotoInput(config.welcomeImagePath),
      });
      console.log("Telegram: фото профиля обновлено");
    }
  }

  console.log("Telegram: описание бота обновлено");
}
