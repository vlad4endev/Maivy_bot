import { existsSync } from "node:fs";
import {
  Bot,
  Keyboard,
  type Context,
} from "@maxhub/max-bot-api";
import type { BotAction, Keyboard as BotKeyboard } from "../../core/actions.js";
import type { AppContentConfig } from "../../config.js";
import type { BotHandlers } from "../../core/handlers.js";
import { setupMaxProfile } from "./setup.js";
import { trackEvent, trackStart, type TrackUserInfo } from "../../lib/convex-client.js";

type MaxAttachment = NonNullable<
  Parameters<Context["reply"]>[1]
>["attachments"] extends Array<infer T> | null | undefined
  ? T
  : never;

export interface MaxBotOptions {
  botSlug: string;
  onBlockedUser?: () => void;
}

function buildMaxKeyboard(keyboard?: BotKeyboard): MaxAttachment | undefined {
  if (!keyboard || keyboard.length === 0) {
    return undefined;
  }

  const buttons = keyboard.map((row) =>
    row.map((button) => {
      if (button.url) {
        return Keyboard.button.link(button.text, button.url);
      }

      return Keyboard.button.callback(button.text, button.action ?? "noop");
    }),
  );

  return Keyboard.inlineKeyboard(buttons);
}

export function startMaxBot(
  token: string,
  handlers: BotHandlers,
  config: AppContentConfig,
  options: MaxBotOptions,
): Bot {
  const bot = new Bot(token);

  void bot.api.setMyCommands([
    { name: "start", description: "Начать работу с ботом" },
  ]);

  void setupMaxProfile(bot, config).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("MAX: не удалось обновить профиль:", message);
  });

  const getUserInfo = (ctx: Context): TrackUserInfo => ({
    platform: "max",
    platformUserId: String(ctx.user?.user_id ?? ctx.message?.sender?.user_id ?? "unknown"),
    firstName: ctx.user?.name ?? ctx.message?.sender?.name ?? undefined,
    username: ctx.user?.username ?? ctx.message?.sender?.username ?? undefined,
  });

  const runStart = async (ctx: Context) => {
    const userInfo = getUserInfo(ctx);
    const trackResult = await trackStart(options.botSlug, userInfo);

    if (trackResult?.isBlocked) {
      options.onBlockedUser?.();
      await ctx.reply("Доступ ограничен.");
      return;
    }

    const firstName = ctx.user?.name ?? ctx.message?.sender?.name ?? undefined;
    await executeMaxActions(ctx, handlers.handleStart(firstName), config);
  };

  bot.on("bot_started", runStart);
  bot.command("start", runStart);

  bot.on("message_callback", async (ctx) => {
    const payload = ctx.callback?.payload;
    if (!payload) {
      return;
    }

    void trackEvent(options.botSlug, getUserInfo(ctx), "callback", payload);

    await executeMaxCallbackActions(
      ctx,
      handlers.handleCallback(payload, ctx.messageId),
      config,
    );
  });

  void bot.start();
  console.log("MAX бот запущен");

  return bot;
}

async function executeMaxActions(
  ctx: Context,
  actions: BotAction[],
  config: AppContentConfig,
): Promise<void> {
  for (const action of actions) {
    await executeMaxAction(ctx, action, config);
  }
}

async function executeMaxCallbackActions(
  ctx: Context,
  actions: BotAction[],
  config: AppContentConfig,
): Promise<void> {
  const callbackId = ctx.callback?.callback_id;
  if (callbackId) {
    const notification = actions.find((action) => action.type === "answer_callback")
      ?.text;
    await ctx.answerOnCallback({ notification: notification ?? null });
  }

  const otherActions = actions.filter((action) => action.type !== "answer_callback");

  for (const action of otherActions) {
    if (action.type === "edit_text" && ctx.messageId) {
      await ctx.editMessage({
        text: action.text,
        format: action.parseMode === "HTML" ? "html" : "markdown",
        attachments: buildMaxKeyboard(action.keyboard)
          ? [buildMaxKeyboard(action.keyboard)!]
          : null,
      });
      continue;
    }

    await executeMaxAction(ctx, action, config);
  }
}

async function executeMaxAction(
  ctx: Context,
  action: BotAction,
  _config: AppContentConfig,
): Promise<void> {
  const keyboardAttachment = buildMaxKeyboard(
    action.type === "answer_callback" ? undefined : action.keyboard,
  );

  const attachments: MaxAttachment[] = keyboardAttachment ? [keyboardAttachment] : [];
  const format =
    action.type === "send_text" || action.type === "edit_text"
      ? action.parseMode === "HTML"
        ? "html"
        : "markdown"
      : undefined;

  switch (action.type) {
    case "send_text":
      await ctx.reply(action.text, {
        format,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      return;

    case "send_photo": {
      const image = await uploadImageIfExists(ctx, action.source);
      const photoAttachments: MaxAttachment[] = image ? [image] : [];
      if (keyboardAttachment) {
        photoAttachments.push(keyboardAttachment);
      }

      await ctx.reply(action.caption ?? "Maivy", {
        format: action.parseMode === "HTML" ? "html" : "markdown",
        attachments: photoAttachments.length > 0 ? photoAttachments : attachments,
      });
      return;
    }

    case "send_video_note":
    case "send_video": {
      const video = await uploadVideoIfExists(ctx, action.source);
      const videoAttachments: MaxAttachment[] = video ? [video] : [];
      if (keyboardAttachment) {
        videoAttachments.push(keyboardAttachment);
      }

      const caption =
        action.type === "send_video" ? action.caption ?? "Maivy" : "Maivy";

      await ctx.reply(caption, {
        attachments: videoAttachments.length > 0 ? videoAttachments : attachments,
      });
      return;
    }

    case "edit_text":
      if (ctx.messageId) {
        await ctx.editMessage({
          text: action.text,
          format,
          attachments: attachments.length > 0 ? attachments : null,
        });
      } else {
        await ctx.reply(action.text, { format, attachments });
      }
      return;

    case "answer_callback":
      return;
  }
}

async function uploadImageIfExists(
  ctx: Context,
  source: string,
): Promise<MaxAttachment | undefined> {
  if (!existsSync(source)) {
    return undefined;
  }

  const uploaded = await ctx.api.uploadImage({ source });

  if ("url" in uploaded && uploaded.url) {
    return {
      type: "image",
      payload: { url: uploaded.url },
    };
  }

  if ("photos" in uploaded && uploaded.photos) {
    return {
      type: "image",
      payload: { photos: uploaded.photos },
    };
  }

  return undefined;
}

async function uploadVideoIfExists(
  ctx: Context,
  source: string,
): Promise<MaxAttachment | undefined> {
  if (!existsSync(source)) {
    return undefined;
  }

  const uploaded = await ctx.api.uploadVideo({ source });
  return {
    type: "video",
    payload: { token: uploaded.token },
  };
}
