import { existsSync } from "node:fs";
import path from "node:path";
import type { BotAction, Keyboard, ParseMode } from "./actions.js";
import { resolveAssetPath } from "../lib/assets.js";

export type SectionMediaType = "none" | "image" | "video" | "video_note";

export interface SectionDisplayInput {
  text: string;
  parseMode?: ParseMode;
  keyboard?: Keyboard;
  mediaType?: SectionMediaType;
  mediaPath?: string;
  messageId?: string;
}

export function resolveSectionMediaPath(mediaPath?: string): string | undefined {
  if (!mediaPath?.trim()) {
    return undefined;
  }

  const trimmed = mediaPath.trim();
  if (path.isAbsolute(trimmed)) {
    return existsSync(trimmed) ? trimmed : undefined;
  }

  if (existsSync(trimmed)) {
    return trimmed;
  }

  return resolveAssetPath(trimmed);
}

export function sectionHasMedia(section: {
  mediaType?: SectionMediaType;
  mediaPath?: string;
}): boolean {
  const mediaType = section.mediaType ?? "none";
  return mediaType !== "none" && Boolean(section.mediaPath?.trim());
}

export function buildSectionDisplayActions(input: SectionDisplayInput): BotAction[] {
  const parseMode = input.parseMode ?? "HTML";
  const keyboard = input.keyboard;
  const mediaType = input.mediaType ?? "none";
  const resolvedMediaPath = resolveSectionMediaPath(input.mediaPath);
  const wantsMedia = mediaType !== "none" && Boolean(input.mediaPath?.trim());
  const hasMedia = wantsMedia && Boolean(resolvedMediaPath);

  if (wantsMedia && !resolvedMediaPath && keyboard?.length) {
    return [
      {
        type: "send_text",
        text: input.text,
        keyboard,
        parseMode,
      },
    ];
  }

  if (input.messageId && !hasMedia && !wantsMedia) {
    return [
      {
        type: "edit_text",
        messageId: input.messageId,
        text: input.text,
        keyboard,
        parseMode,
      },
    ];
  }

  const actions: BotAction[] = [
    {
      type: "send_text",
      text: input.text,
      parseMode,
    },
  ];

  if (!hasMedia) {
    if (keyboard?.length) {
      return [
        {
          type: "send_text",
          text: input.text,
          keyboard,
          parseMode,
        },
      ];
    }
    return actions;
  }

  switch (mediaType) {
    case "image":
      actions.push({
        type: "send_photo",
        source: resolvedMediaPath!,
        keyboard,
        parseMode,
      });
      break;
    case "video":
      actions.push({
        type: "send_video",
        source: resolvedMediaPath!,
        keyboard,
      });
      break;
    case "video_note":
      actions.push({
        type: "send_video_note",
        source: resolvedMediaPath!,
        keyboard,
      });
      break;
  }

  return actions;
}

export function formatSectionBody(section: {
  body: string;
  title?: string;
  sectionType: string;
}): string {
  if (section.sectionType === "about_step" && section.title) {
    return `<b>${section.title}</b>\n\n${section.body}`;
  }
  return section.body;
}
