import { existsSync } from "node:fs";
import { InlineKeyboard, InputFile, type Api, type Context } from "grammy";
import type { BotAction, Keyboard } from "../../core/actions.js";
import type { AppContentConfig } from "../../config.js";
import { downloadToTempFile, isHttpMediaSource } from "../../lib/remote-media.js";

async function sendTelegramText(
  api: Api,
  chatId: number,
  text: string,
  options: {
    parseMode?: "HTML" | "Markdown";
    reply_markup?: InlineKeyboard;
  },
): Promise<void> {
  try {
    await api.sendMessage(chatId, text, {
      parse_mode: options.parseMode,
      reply_markup: options.reply_markup,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      options.parseMode &&
      (message.includes("can't parse entities") || message.includes("parse"))
    ) {
      console.warn("Telegram: HTML/Markdown ошибка, отправка без разметки");
      await api.sendMessage(chatId, text, {
        reply_markup: options.reply_markup,
      });
      return;
    }
    throw error;
  }
}

async function resolveTelegramMediaInput(
  source: string,
): Promise<InputFile | undefined> {
  if (isHttpMediaSource(source)) {
    try {
      const ext = source.includes(".mp4") || source.includes("video") ? ".mp4" : ".jpg";
      const localPath = await downloadToTempFile(source, ext);
      return new InputFile(localPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Telegram: не удалось скачать медиа:", message);
      return undefined;
    }
  }

  if (existsSync(source)) {
    return new InputFile(source);
  }

  return undefined;
}

async function resolveTelegramVideoSource(
  source: string,
  config: AppContentConfig,
): Promise<InputFile | string | undefined> {
  if (config.telegramVideoNoteFileId) {
    return config.telegramVideoNoteFileId;
  }

  return await resolveTelegramMediaInput(source);
}

export function buildTelegramKeyboard(
  keyboard?: Keyboard,
): InlineKeyboard | undefined {
  if (!keyboard || keyboard.length === 0) {
    return undefined;
  }

  const inline = new InlineKeyboard();

  for (const row of keyboard) {
    const buttons = row.map((button) => {
      if (button.url) {
        return InlineKeyboard.url(button.text, button.url);
      }

      return InlineKeyboard.text(button.text, button.action ?? "noop");
    });

    inline.row(...buttons);
  }

  return inline;
}

export async function executeTelegramActions(
  api: Api,
  chatId: number,
  actions: BotAction[],
  config: AppContentConfig,
): Promise<void> {
  for (const action of actions) {
    try {
      await executeTelegramAction(api, chatId, action, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Telegram: не удалось выполнить ${action.type}:`, message);
    }
  }
}

async function executeTelegramAction(
  api: Api,
  chatId: number,
  action: BotAction,
  config: AppContentConfig,
): Promise<void> {
  const keyboard = buildTelegramKeyboard(
    action.type === "answer_callback" ? undefined : action.keyboard,
  );

  switch (action.type) {
    case "send_text":
      await sendTelegramText(api, chatId, action.text, {
        parseMode: action.parseMode,
        reply_markup: keyboard,
      });
      return;

    case "send_photo": {
      const photo = await resolveTelegramMediaInput(action.source);
      if (!photo) {
        await sendTelegramText(api, chatId, action.caption ?? "Maivy", {
          parseMode: action.parseMode,
          reply_markup: keyboard,
        });
        return;
      }

      await api.sendPhoto(chatId, photo, {
        caption: action.caption,
        parse_mode: action.parseMode,
        reply_markup: keyboard,
      });
      return;
    }

    case "send_video_note": {
      const videoSource = await resolveTelegramVideoSource(action.source, config);
      if (!videoSource) {
        await sendTelegramText(api, chatId, "Выберите действие:", {
          reply_markup: keyboard,
        });
        return;
      }

      await api.sendVideoNote(chatId, videoSource, {
        reply_markup: keyboard,
      });
      return;
    }

    case "send_video": {
      const video = await resolveTelegramMediaInput(action.source);
      if (!video) {
        await sendTelegramText(api, chatId, action.caption ?? "Maivy", {
          reply_markup: keyboard,
        });
        return;
      }

      await api.sendVideo(chatId, video, {
        caption: action.caption,
        reply_markup: keyboard,
      });
      return;
    }

    case "edit_text":
      await api.editMessageText(chatId, Number(action.messageId), action.text, {
        parse_mode: action.parseMode,
        reply_markup: keyboard,
      });
      return;

    case "answer_callback":
      return;
  }
}

export async function executeTelegramCallbackActions(
  ctx: Context,
  actions: BotAction[],
  config: AppContentConfig,
): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery) {
    return;
  }

  await ctx.answerCallbackQuery(
    actions.find((action) => action.type === "answer_callback")?.text,
  );

  const chatId =
    callbackQuery.message?.chat.id ??
    ctx.chat?.id;
  if (chatId === undefined) {
    console.warn("Telegram: callback без chat id, payload:", callbackQuery.data);
    return;
  }

  const otherActions = actions.filter((action) => action.type !== "answer_callback");

  for (const action of otherActions) {
    if (action.type === "edit_text" && ctx.callbackQuery?.message) {
      const messageId = ctx.callbackQuery.message.message_id;
      try {
        await ctx.api.editMessageText(chatId, messageId, action.text, {
          parse_mode: action.parseMode,
          reply_markup: buildTelegramKeyboard(action.keyboard),
        });
      } catch {
        await executeTelegramAction(
          ctx.api,
          chatId,
          {
            type: "send_text",
            text: action.text,
            parseMode: action.parseMode,
            keyboard: action.keyboard,
          },
          config,
        );
      }
      continue;
    }

    await executeTelegramAction(ctx.api, chatId, action, config);
  }
}
