import type { Keyboard } from "./actions.js";
import { Callback } from "./callbacks.js";

export function mainMenuKeyboard(): Keyboard {
  return [
    [{ text: "Узнать больше о Maivy", action: Callback.ABOUT_MORE }],
    [{ text: "Посмотреть, как работает Maivy", action: Callback.DEMO }],
    [{ text: "Попробовать Maivy на практике", action: Callback.TRY }],
    [{ text: "Хочу внедрить Maivy", action: Callback.IMPL }],
  ];
}

export function aboutStepKeyboard(step: number, totalSteps: number): Keyboard {
  const rows: Keyboard = [];

  if (step < totalSteps) {
    rows.push([{ text: "Далее →", action: Callback.aboutNext(step + 1) }]);
  }

  rows.push([{ text: "← В меню", action: Callback.MENU }]);

  return rows;
}

export function backToMenuKeyboard(): Keyboard {
  return [[{ text: "← В меню", action: Callback.MENU }]];
}

export function demoKeyboard(loomUrl: string): Keyboard {
  return [
    [{ text: "▶️ Смотреть видео в Loom", url: loomUrl }],
    [{ text: "← В меню", action: Callback.MENU }],
  ];
}

export function tryKeyboard(grosterUrl: string): Keyboard {
  return [
    [{ text: "🛒 Открыть Гростер", url: grosterUrl }],
    [{ text: "← В меню", action: Callback.MENU }],
  ];
}

export function implementKeyboard(contactUrl: string): Keyboard {
  return [
    [{ text: "✉️ Написать @daerit", url: contactUrl }],
    [{ text: "← В меню", action: Callback.MENU }],
  ];
}
