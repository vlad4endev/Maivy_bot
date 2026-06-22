import type { Bot } from "@maxhub/max-bot-api";
import type { AppContentConfig } from "../../config.js";
import {
  buildBotProfileDescription,
  buildBotShortDescription,
} from "../../core/content.js";
import { resolveLocalMediaSource } from "../../lib/remote-media.js";

export async function setupMaxProfile(
  bot: Bot,
  config: AppContentConfig,
): Promise<void> {
  const description = [
    config.shortDescription ?? buildBotShortDescription(),
    "",
    buildBotProfileDescription(config),
  ].join("\n");

  const extra: {
    description: string;
    photo?: { url: string };
  } = { description };

  const localImagePath = config.welcomeImagePath
    ? await resolveLocalMediaSource(config.welcomeImagePath)
    : undefined;

  if (localImagePath) {
    const uploaded = await bot.api.uploadImage({
      source: localImagePath,
    });

    if ("url" in uploaded && uploaded.url) {
      extra.photo = { url: uploaded.url };
    } else if ("photos" in uploaded && uploaded.photos) {
      const firstPhoto = Object.values(uploaded.photos)[0];
      if (firstPhoto?.token) {
        await bot.api.editMyInfo({
          description,
          photo: { token: firstPhoto.token },
        });
        console.log("MAX: описание и фото профиля обновлены");
        return;
      }
    }
  }

  await bot.api.editMyInfo(extra);
  console.log("MAX: описание бота обновлено");
}
