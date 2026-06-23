import { existsSync } from "node:fs";
import { InlineKeyboard, InputFile, type Api, type Context } from "grammy";
import type { BotAction, Keyboard } from "../../core/actions.js";
import type { AppContentConfig } from "../../config.js";
import { isHttpMediaSource } from "../../lib/remote-media.js";

function createTelegramMediaInput(source: string): InputFile {
  if (isHttpMediaSource(source)) {
    return new InputFile({ url: source });
  }
  return new InputFile(source);
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
    await executeTelegramAction(api, chatId, action, config);
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
      await api.sendMessage(chatId, action.text, {
        parse_mode: action.parseMode,
        reply_markup: keyboard,
      });
      return;

    case "send_photo":
      await api.sendPhoto(chatId, createTelegramMediaInput(action.source), {
        caption: action.caption,
        parse_mode: action.parseMode,
        reply_markup: keyboard,
      });
      return;

    case "send_video_note": {
      const videoSource = resolveTelegramVideoSource(action.source, config);
      if (!videoSource) {
        await api.sendMessage(chatId, "Выберите действие:", {
          reply_markup: keyboard,
        });
        return;
      }

      await api.sendVideoNote(chatId, videoSource, {
        reply_markup: keyboard,
      });
      return;
    }

    case "send_video":
      await api.sendVideo(chatId, createTelegramMediaInput(action.source), {
        caption: action.caption,
        reply_markup: keyboard,
      });
      return;

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

function resolveTelegramVideoSource(
  source: string,
  config: AppContentConfig,
): InputFile | string | undefined {
  if (config.telegramVideoNoteFileId) {
    return config.telegramVideoNoteFileId;
  }

  if (isHttpMediaSource(source)) {
    return createTelegramMediaInput(source);
  }

  if (existsSync(source)) {
    return new InputFile(source);
  }

  return undefined;
}
