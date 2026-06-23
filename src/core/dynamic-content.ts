import type { Keyboard } from "./actions.js";
import { Callback } from "./callbacks.js";
import type { BotContentSnapshot, DynamicSection } from "../lib/convex-client.js";

export function resolveSectionKeyboardId(section: DynamicSection & { keyboardId?: string }): string {
  if (section.keyboardId) {
    return section.keyboardId;
  }
  if (section.sectionType === "welcome") {
    return "main_menu";
  }
  if (section.sectionType === "about_step") {
    return "about_step";
  }
  if (section.slug === "menu") {
    return "main_menu";
  }
  return section.slug;
}

export function getSectionBySlug(
  content: BotContentSnapshot | null,
  slug: string,
): DynamicSection | undefined {
  return content?.sections.find((s) => s.slug === slug);
}

export function getAboutSteps(content: BotContentSnapshot | null): DynamicSection[] {
  if (!content) return [];
  return content.sections
    .filter((s) => s.sectionType === "about_step")
    .sort((a, b) => a.order - b.order);
}

export function getAboutStepTextFromContent(
  content: BotContentSnapshot | null,
  step: number,
): string | null {
  const steps = getAboutSteps(content);
  const item = steps[step - 1];
  if (!item) return null;

  if (item.title) {
    return `<b>${item.title}</b>\n\n${item.body}`;
  }
  return item.body;
}

export function getWelcomeText(
  content: BotContentSnapshot | null,
  firstName?: string,
): string | null {
  const section = getSectionBySlug(content, "welcome");
  if (!section) return null;

  const safeName = firstName ? escapeHtml(firstName) : undefined;
  const greeting = safeName ? `${safeName}, доб` : "Доб";
  return section.body.replace(/^Добро пожаловать/, `${greeting}ро пожаловать`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getSectionText(
  content: BotContentSnapshot | null,
  slug: string,
): string | null {
  const section = getSectionBySlug(content, slug);
  return section?.body ?? null;
}

export function getMenuText(content: BotContentSnapshot | null): string | null {
  return getSectionText(content, "menu");
}

export function buildKeyboardFromContent(
  content: BotContentSnapshot | null,
  keyboardId: string,
  context?: { aboutStep?: number; totalAboutSteps?: number },
): Keyboard | null {
  if (!content?.keyboards[keyboardId]) return null;

  const rows = content.keyboards[keyboardId].map((row) =>
    row.map((button) => {
      if (button.action === "about_next" && context?.aboutStep !== undefined) {
        const nextStep = context.aboutStep + 1;
        if (context.totalAboutSteps && nextStep > context.totalAboutSteps) {
          return null;
        }
        return {
          ...button,
          action: Callback.aboutNext(nextStep),
        };
      }
      return button;
    }).filter((b): b is NonNullable<typeof b> => b !== null),
  ).filter((row) => row.length > 0);

  if (keyboardId === "about_step" && context?.aboutStep !== undefined) {
    const total = context.totalAboutSteps ?? 0;
    if (context.aboutStep >= total) {
      return rows.filter((row) =>
        !row.some((b) => b.action?.startsWith("about_next")),
      );
    }
  }

  return rows;
}

export function resolveKeyboard(
  content: BotContentSnapshot | null,
  keyboardId: string,
  fallback: () => Keyboard,
  context?: { aboutStep?: number; totalAboutSteps?: number },
): Keyboard {
  return buildKeyboardFromContent(content, keyboardId, context) ?? fallback();
}
