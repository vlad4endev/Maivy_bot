import type { BotAction } from "./actions.js";
import { Callback, parseAboutNext, parseAboutStep, parseSectionGoto } from "./callbacks.js";
import {
  buildDemoText,
  buildImplementText,
  buildTryText,
  buildWelcomeText,
  getAboutStepCount,
  getAboutStepText,
} from "./content.js";
import {
  getAboutStepTextFromContent,
  getAboutSteps,
  getMenuText,
  getSectionBySlug,
  getSectionText,
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
  getEffectiveConfig,
  getEffectiveContent,
} from "../lib/runtime-state.js";

export function createBotHandlers() {
  function handleStart(firstName?: string): BotAction[] {
    const config = getEffectiveConfig();
    const content = getEffectiveContent();

    const welcomeText =
      getWelcomeText(content, firstName) ?? buildWelcomeText(firstName);

    const actions: BotAction[] = [
      {
        type: "send_text",
        text: welcomeText,
        parseMode: "HTML",
      },
    ];

    const menuKb = resolveKeyboard(content, "main_menu", mainMenuKeyboard);

    if (config.welcomeVideoPath) {
      actions.push({
        type: "send_video_note",
        source: config.welcomeVideoPath,
        keyboard: menuKb,
      });
    } else if (config.welcomeImagePath) {
      actions.push({
        type: "send_photo",
        source: config.welcomeImagePath,
        keyboard: menuKb,
      });
    } else {
      actions.push({
        type: "send_text",
        text: "Выберите действие:",
        keyboard: menuKb,
      });
    }

    return actions;
  }

  function handleCallback(
    payload: string,
    messageId?: string,
  ): BotAction[] {
    const config = getEffectiveConfig();
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
        return [
          {
            type: "send_text",
            text: getSectionText(content, "demo") ?? buildDemoText(),
            keyboard: resolveKeyboard(content, "demo", () =>
              demoKeyboard(config.loomVideoUrl),
            ),
            parseMode: "HTML",
          },
        ];

      case Callback.TRY:
        return [
          {
            type: "send_text",
            text: getSectionText(content, "try") ?? buildTryText(config),
            keyboard: resolveKeyboard(content, "try", () =>
              tryKeyboard(config.grosterUrl),
            ),
            parseMode: "HTML",
          },
        ];

      case Callback.IMPL:
        return [
          {
            type: "send_text",
            text: getSectionText(content, "impl") ?? buildImplementText(config),
            keyboard: resolveKeyboard(content, "impl", () =>
              implementKeyboard(config.contactUrl),
            ),
            parseMode: "HTML",
          },
        ];

      case Callback.MENU: {
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
          : backToMenuKeyboard,
      keyboardId === "about_step"
        ? { aboutStep: aboutStep ?? 1, totalAboutSteps }
        : undefined,
    );

    let text = section.body;
    if (section.sectionType === "about_step" && section.title) {
      text = `<b>${section.title}</b>\n\n${section.body}`;
    }

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

  function aboutStepActions(
    step: number,
    messageId: string | undefined,
    totalAboutSteps: number,
  ): BotAction[] {
    const content = getEffectiveContent();

    if (step < 1 || step > totalAboutSteps) {
      return [
        {
          type: "send_text",
          text: "Раздел не найден.",
          keyboard: resolveKeyboard(content, "back_menu", backToMenuKeyboard),
        },
      ];
    }

    const text =
      getAboutStepTextFromContent(content, step) ?? getAboutStepText(step);

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
