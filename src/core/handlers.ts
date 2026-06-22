import type { BotAction } from "./actions.js";
import { Callback, parseAboutNext, parseAboutStep, parseSectionGoto } from "./callbacks.js";
import {
  buildWelcomeText,
  getAboutStepCount,
  getAboutStepText,
} from "./content.js";
import {
  getAboutStepTextFromContent,
  getAboutSteps,
  getMenuText,
  getSectionBySlug,
  getWelcomeText,
  resolveKeyboard,
  resolveSectionKeyboardId,
} from "./dynamic-content.js";
import {
  aboutStepKeyboard,
  backToMenuKeyboard,
  demoKeyboard,
  implementKeyboard,
  mainMenuKeyboard,
  tryKeyboard,
} from "./keyboards.js";
import {
  buildSectionDisplayActions,
  formatSectionBody,
  sectionHasMedia,
  type SectionMediaType,
} from "./section-display.js";
import type { DynamicSection } from "../lib/convex-client.js";
import {
  getEffectiveConfig,
  getEffectiveContent,
} from "../lib/runtime-state.js";

export function createBotHandlers() {
  function resolveWelcomeMedia(content: ReturnType<typeof getEffectiveContent>): {
    mediaType: SectionMediaType;
    mediaPath?: string;
  } {
    const config = getEffectiveConfig();
    const welcomeSection = getSectionBySlug(content, "welcome");

    if (welcomeSection && sectionHasMedia(welcomeSection)) {
      return {
        mediaType: welcomeSection.mediaType ?? "none",
        mediaPath: welcomeSection.mediaPath,
      };
    }

    if (config.welcomeVideoPath) {
      return { mediaType: "video_note", mediaPath: config.welcomeVideoPath };
    }
    if (config.welcomeImagePath) {
      return { mediaType: "image", mediaPath: config.welcomeImagePath };
    }

    return { mediaType: "none" };
  }

  function sectionDisplayActions(
    section: DynamicSection,
    keyboard: ReturnType<typeof resolveKeyboard>,
    messageId?: string,
  ): BotAction[] {
    return buildSectionDisplayActions({
      text: formatSectionBody(section),
      parseMode: section.parseMode === "Markdown" ? "Markdown" : "HTML",
      keyboard,
      mediaType: section.mediaType,
      mediaPath: section.mediaPath,
      messageId,
    });
  }

  function handleStart(firstName?: string): BotAction[] {
    const content = getEffectiveContent();
    const welcomeText =
      getWelcomeText(content, firstName) ?? buildWelcomeText(firstName);
    const menuKb = resolveKeyboard(content, "main_menu", mainMenuKeyboard);
    const welcomeMedia = resolveWelcomeMedia(content);

    return buildSectionDisplayActions({
      text: welcomeText,
      parseMode: "HTML",
      keyboard: menuKb,
      mediaType: welcomeMedia.mediaType,
      mediaPath: welcomeMedia.mediaPath,
    });
  }

  function handleCallback(
    payload: string,
    messageId?: string,
  ): BotAction[] {
    const content = getEffectiveContent();

    const aboutSteps = content ? getAboutSteps(content) : null;
    const totalAboutSteps = aboutSteps?.length ?? getAboutStepCount();

    const aboutStep = parseAboutStep(payload);
    if (aboutStep !== undefined) {
      return aboutStepActions(aboutStep, messageId, totalAboutSteps);
    }

    const aboutNext = parseAboutNext(payload);
    if (aboutNext !== undefined) {
      return aboutStepActions(aboutNext, messageId, totalAboutSteps);
    }

    const sectionSlug = parseSectionGoto(payload);
    if (sectionSlug) {
      return navigateToSection(sectionSlug, messageId);
    }

    switch (payload) {
      case Callback.ABOUT_MORE:
        return aboutStepActions(1, messageId, totalAboutSteps);

      case Callback.DEMO:
        return navigateToSection("demo", messageId);

      case Callback.TRY:
        return navigateToSection("try", messageId);

      case Callback.IMPL:
        return navigateToSection("impl", messageId);

      case Callback.MENU: {
        const menuSection = getSectionBySlug(content, "menu");
        if (menuSection) {
          return navigateToSection("menu", messageId);
        }

        const menuText =
          getMenuText(content) ?? "Главное меню Maivy. Выберите действие:";
        const menuKb = resolveKeyboard(content, "main_menu", mainMenuKeyboard);

        if (messageId) {
          return [
            {
              type: "edit_text",
              messageId,
              text: menuText,
              keyboard: menuKb,
            },
          ];
        }

        return [
          {
            type: "send_text",
            text: menuText,
            keyboard: menuKb,
          },
        ];
      }

      default:
        return [
          {
            type: "answer_callback",
            text: "Неизвестная команда",
          },
          {
            type: "send_text",
            text: "Выберите действие в меню:",
            keyboard: resolveKeyboard(content, "main_menu", mainMenuKeyboard),
          },
        ];
    }
  }

  function parseAboutStepFromSlug(slug: string): number | undefined {
    const match = /^about_(\d+)$/.exec(slug);
    if (!match) {
      return undefined;
    }
    const step = Number(match[1]);
    return Number.isFinite(step) ? step : undefined;
  }

  function navigateToSection(slug: string, messageId?: string): BotAction[] {
    const content = getEffectiveContent();
    const section = getSectionBySlug(content, slug);

    if (!section) {
      return [
        {
          type: "send_text",
          text: "Раздел не найден.",
          keyboard: resolveKeyboard(content, "back_menu", backToMenuKeyboard),
        },
      ];
    }

    const keyboardId = resolveSectionKeyboardId(section);
    const aboutSteps = content ? getAboutSteps(content) : null;
    const totalAboutSteps = aboutSteps?.length ?? getAboutStepCount();
    const aboutStep =
      section.sectionType === "about_step"
        ? parseAboutStepFromSlug(section.slug) ?? 1
        : undefined;
    const keyboard = resolveKeyboard(
      content,
      keyboardId,
      keyboardId === "about_step"
        ? () => aboutStepKeyboard(aboutStep ?? 1, totalAboutSteps)
        : keyboardId === "main_menu"
          ? mainMenuKeyboard
          : keyboardId === "demo"
            ? () => demoKeyboard(getEffectiveConfig().loomVideoUrl)
            : keyboardId === "try"
              ? () => tryKeyboard(getEffectiveConfig().grosterUrl)
              : keyboardId === "impl"
                ? () => implementKeyboard(getEffectiveConfig().contactUrl)
                : backToMenuKeyboard,
      keyboardId === "about_step"
        ? { aboutStep: aboutStep ?? 1, totalAboutSteps }
        : undefined,
    );

    return sectionDisplayActions(section, keyboard, messageId);
  }

  function aboutStepActions(
    step: number,
    messageId: string | undefined,
    totalAboutSteps: number,
  ): BotAction[] {
    const content = getEffectiveContent();
    const aboutSteps = content ? getAboutSteps(content) : null;
    const section = aboutSteps?.[step - 1];

    if (section) {
      const keyboard = resolveKeyboard(
        content,
        "about_step",
        () => aboutStepKeyboard(step, totalAboutSteps),
        { aboutStep: step, totalAboutSteps },
      );
      return sectionDisplayActions(section, keyboard, messageId);
    }

    if (step < 1 || step > totalAboutSteps) {
      return [
        {
          type: "send_text",
          text: "Раздел не найден.",
          keyboard: resolveKeyboard(content, "back_menu", backToMenuKeyboard),
        },
      ];
    }

    const text = getAboutStepTextFromContent(content, step) ?? getAboutStepText(step);
    const keyboard = resolveKeyboard(
      content,
      "about_step",
      () => aboutStepKeyboard(step, totalAboutSteps),
      { aboutStep: step, totalAboutSteps },
    );

    if (messageId) {
      return [
        {
          type: "edit_text",
          messageId,
          text,
          keyboard,
          parseMode: "HTML",
        },
      ];
    }

    return [
      {
        type: "send_text",
        text,
        keyboard,
        parseMode: "HTML",
      },
    ];
  }

  return {
    handleStart,
    handleCallback,
  };
}

export type BotHandlers = ReturnType<typeof createBotHandlers>;
