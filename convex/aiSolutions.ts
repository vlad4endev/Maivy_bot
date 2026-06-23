import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import {
  AI_SOLUTIONS_BUTTONS,
  AI_SOLUTIONS_SECTIONS,
  AI_SOLUTIONS_SLUG,
  DEFAULT_AI_CATALOG_URL,
  DEFAULT_AI_CONSULTANT_URL,
  DEFAULT_GROSTER_SEARCH_URL,
  MAIN_MENU_AI_SOLUTIONS_BUTTON,
} from "./lib/aiSolutions";

export const ensureAiSolutionsBlock = mutation({
  args: {
    token: v.string(),
    botId: v.id("bots"),
  },
  returns: v.object({
    createdSections: v.number(),
    updatedSections: v.number(),
    createdButtons: v.number(),
    updatedSettings: v.boolean(),
    mainMenuUpdated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const bot = await ctx.db.get(args.botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    const now = Date.now();
    let createdSections = 0;
    let updatedSections = 0;
    let createdButtons = 0;
    let mainMenuUpdated = false;

    const existingSections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const slugToSectionId = new Map(
      existingSections.map((section) => [section.slug, section._id]),
    );

    for (const section of AI_SOLUTIONS_SECTIONS) {
      const existingId = slugToSectionId.get(section.slug);

      if (existingId) {
        await ctx.db.patch(existingId, {
          title: section.title,
          body: section.body,
          keyboardId: section.keyboardId,
          updatedAt: now,
        });
        updatedSections += 1;
        continue;
      }

      const sectionId = await ctx.db.insert("sections", {
        botId: args.botId,
        slug: section.slug,
        title: section.title,
        body: section.body,
        order: section.order,
        sectionType: "section",
        keyboardId: section.keyboardId,
        isPublished: true,
        parseMode: "HTML",
        updatedAt: now,
      });

      slugToSectionId.set(section.slug, sectionId);
      createdSections += 1;
    }

    const existingButtons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const buttonKey = (keyboardId: string, row: number, col: number) =>
      `${keyboardId}:${row}:${col}`;

    const existingButtonKeys = new Set(
      existingButtons.map((button) => buttonKey(button.keyboardId, button.row, button.col)),
    );

    for (const button of AI_SOLUTIONS_BUTTONS) {
      if (existingButtonKeys.has(buttonKey(button.keyboardId, button.row, button.col))) {
        continue;
      }

      const targetSectionId =
        "targetSlug" in button && button.targetSlug
          ? slugToSectionId.get(button.targetSlug)
          : undefined;

      await ctx.db.insert("keyboardButtons", {
        botId: args.botId,
        keyboardId: button.keyboardId,
        row: button.row,
        col: button.col,
        text: button.text,
        buttonType: button.buttonType,
        action:
          targetSectionId && button.targetSlug
            ? `section:${button.targetSlug}`
            : "action" in button
              ? button.action
              : undefined,
        targetSectionId,
        urlSource: "urlSource" in button ? button.urlSource : undefined,
        order: button.order,
        isEnabled: true,
        updatedAt: now,
      });
      createdButtons += 1;
    }

    const hasMainMenuEntry = existingButtons.some(
      (button) =>
        button.keyboardId === "main_menu" &&
        (button.targetSectionId === slugToSectionId.get(AI_SOLUTIONS_SLUG) ||
          button.text === MAIN_MENU_AI_SOLUTIONS_BUTTON.text),
    );

    if (!hasMainMenuEntry && slugToSectionId.has(AI_SOLUTIONS_SLUG)) {
      const mainMenuButtons = existingButtons
        .filter((button) => button.keyboardId === "main_menu")
        .sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.col - b.col;
        });

      for (const button of mainMenuButtons) {
        if (button.row >= MAIN_MENU_AI_SOLUTIONS_BUTTON.row) {
          await ctx.db.patch(button._id, {
            row: button.row + 1,
            updatedAt: now,
          });
        }
      }

      await ctx.db.insert("keyboardButtons", {
        botId: args.botId,
        keyboardId: MAIN_MENU_AI_SOLUTIONS_BUTTON.keyboardId,
        row: MAIN_MENU_AI_SOLUTIONS_BUTTON.row,
        col: MAIN_MENU_AI_SOLUTIONS_BUTTON.col,
        text: MAIN_MENU_AI_SOLUTIONS_BUTTON.text,
        buttonType: MAIN_MENU_AI_SOLUTIONS_BUTTON.buttonType,
        action: `section:${AI_SOLUTIONS_SLUG}`,
        targetSectionId: slugToSectionId.get(AI_SOLUTIONS_SLUG),
        order: MAIN_MENU_AI_SOLUTIONS_BUTTON.order,
        isEnabled: true,
        updatedAt: now,
      });
      mainMenuUpdated = true;
      createdButtons += 1;
    }

    const settings = bot.settings;
    const nextSettings = {
      ...settings,
      grosterUrl: settings.grosterUrl?.trim()
        ? settings.grosterUrl
        : DEFAULT_GROSTER_SEARCH_URL,
      aiConsultantUrl: settings.aiConsultantUrl?.trim()
        ? settings.aiConsultantUrl
        : DEFAULT_AI_CONSULTANT_URL,
      aiCatalogUrl: settings.aiCatalogUrl?.trim()
        ? settings.aiCatalogUrl
        : DEFAULT_AI_CATALOG_URL,
    };

    const updatedSettings =
      nextSettings.grosterUrl !== settings.grosterUrl ||
      nextSettings.aiConsultantUrl !== settings.aiConsultantUrl ||
      nextSettings.aiCatalogUrl !== settings.aiCatalogUrl;

    if (updatedSettings) {
      await ctx.db.patch(args.botId, {
        settings: nextSettings,
        updatedAt: now,
      });
    }

    return {
      createdSections,
      updatedSections,
      createdButtons,
      updatedSettings,
      mainMenuUpdated,
    };
  },
});
