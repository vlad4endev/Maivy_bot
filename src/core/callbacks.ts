export const Callback = {
  ABOUT_MORE: "about_more",
  aboutStep: (step: number) => `about_${step}`,
  aboutNext: (step: number) => `about_next_${step}`,
  DEMO: "demo",
  AI_SOLUTIONS: "ai_solutions",
  TRY: "try",
  IMPL: "impl",
  MENU: "menu",
} as const;

export function parseAboutStep(payload: string): number | undefined {
  const match = /^about_(\d+)$/.exec(payload);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
}

export function parseAboutNext(payload: string): number | undefined {
  const match = /^about_next_(\d+)$/.exec(payload);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
}

export function parseSectionGoto(payload: string): string | undefined {
  const match = /^section:(.+)$/.exec(payload);
  return match?.[1];
}
