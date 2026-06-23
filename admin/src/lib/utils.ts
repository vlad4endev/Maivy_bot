const TOKEN_KEY = "maivy_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

export type MessengerPlatform = "telegram" | "max";

export function normalizeUrl(
  value: string,
  platform: MessengerPlatform = "telegram",
): string {
  let url = value.trim();
  if (!url) return url;

  if (/^t\.me\//i.test(url)) {
    return `https://${url}`;
  }

  if (/^telegram\.me\//i.test(url)) {
    return `https://t.me/${url.replace(/^telegram\.me\//i, "")}`;
  }

  if (/^max\.ru\//i.test(url)) {
    return `https://${url}`;
  }

  if (/^@[\w]+$/i.test(url)) {
    const username = url.slice(1);
    return platform === "max"
      ? `https://max.ru/${username}`
      : `https://t.me/${username}`;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url
    .replace(/^http:\/\//i, "https://")
    .replace(/^https:\/\/telegram\.me\//i, "https://t.me/")
    .replace(/^https:\/\/t\.me\//i, "https://t.me/")
    .replace(/^https:\/\/max\.ru\//i, "https://max.ru/");
}

export function buildTelegramContactUrl(username: string): string {
  const clean = username.trim().replace(/^@+/, "");
  return `https://t.me/${clean}`;
}

export function buildMaxContactUrl(username: string): string {
  const clean = username.trim().replace(/^@+/, "");
  return `https://max.ru/${clean}`;
}

export function buildMaxChatUrl(platformUserId: string): string {
  const clean = platformUserId.trim();
  if (clean.startsWith("u/")) {
    return normalizeUrl(`max.ru/${clean}`, "max");
  }
  return `https://max.ru/chat/${clean}`;
}

export function buildContactUrl(username: string): string {
  return buildTelegramContactUrl(username);
}

export function getUserChatUrl(user: {
  platform: MessengerPlatform;
  platformUserId: string;
  username?: string;
}): string | null {
  if (user.platform === "telegram") {
    if (user.username) {
      return buildTelegramContactUrl(user.username);
    }
    return `tg://user?id=${user.platformUserId}`;
  }

  if (user.username) {
    return buildMaxContactUrl(user.username);
  }

  if (/^https?:\/\//i.test(user.platformUserId)) {
    return normalizeUrl(user.platformUserId, "max");
  }

  if (user.platformUserId.startsWith("u/")) {
    return normalizeUrl(`max.ru/${user.platformUserId}`, "max");
  }

  return buildMaxChatUrl(user.platformUserId);
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const KEYBOARD_LABELS: Record<string, string> = {
  main_menu: "Главное меню",
  about_step: "Шаги «О Maivy»",
  back_menu: "Кнопка «Назад»",
  demo: "Раздел «Демо»",
  try: "Раздел «Попробовать»",
  impl: "Раздел «Внедрение»",
};

export const SECTION_TYPE_LABELS: Record<string, string> = {
  welcome: "Приветствие",
  about_step: "Шаг «О Maivy»",
  section: "Раздел",
  system: "Системный",
};

export const SECTION_MEDIA_LABELS: Record<string, string> = {
  none: "Без медиа",
  image: "Фото",
  video: "Видео",
  video_note: "Видео-кружок",
};

export const CALLBACK_LABELS: Record<string, string> = {
  about_more: "Узнать больше (первый шаг)",
  about_next: "Следующий шаг (шаблон)",
  demo: "Демо",
  ai_solutions: "ИИ-решения",
  try: "Попробовать",
  impl: "Внедрение",
  menu: "В главное меню",
};

export const SPECIAL_ACTIONS = [
  { value: "about_more", label: CALLBACK_LABELS.about_more },
  { value: "about_next", label: CALLBACK_LABELS.about_next },
  { value: "menu", label: CALLBACK_LABELS.menu },
] as const;

/** Legacy callback actions mapped to default section slugs from seed data. */
export const LEGACY_ACTION_SECTION_SLUGS: Record<string, string> = {
  about_more: "about_1",
  demo: "demo",
  ai_solutions: "ai_solutions",
  try: "try",
  impl: "impl",
  menu: "menu",
};

export function resolveTargetLabel(
  button: {
    buttonType: string;
    action?: string;
    targetSectionSlug?: string;
    targetSectionTitle?: string;
    urlSource?: string;
    url?: string;
  },
  sections: Array<{ id: string; label: string; slug: string }>,
): string {
  if (button.buttonType === "url") {
    return button.urlSource ?? button.url ?? "Внешняя ссылка";
  }
  if (button.targetSectionTitle || button.targetSectionSlug) {
    return button.targetSectionTitle ?? button.targetSectionSlug ?? "Экран";
  }
  if (button.action?.startsWith("section:")) {
    const slug = button.action.slice(8);
    const match = sections.find((s) => s.slug === slug);
    return match?.label ?? slug;
  }
  if (button.action) {
    const legacySlug = LEGACY_ACTION_SECTION_SLUGS[button.action];
    if (legacySlug) {
      const match = sections.find((s) => s.slug === legacySlug);
      if (match) {
        return match.label;
      }
    }
    if (button.action === "about_next") {
      return "Следующий шаг «О Maivy»";
    }
    return CALLBACK_LABELS[button.action] ?? button.action;
  }
  return "— не задан —";
}

export function buttonNeedsTargetLink(button: {
  buttonType: string;
  action?: string;
  targetSectionId?: string;
  targetSectionSlug?: string;
}): boolean {
  if (button.buttonType !== "callback") {
    return false;
  }
  if (button.targetSectionSlug || button.targetSectionId) {
    return false;
  }
  if (button.action?.startsWith("section:")) {
    return false;
  }
  if (!button.action || button.action === "about_next") {
    return false;
  }
  return Boolean(LEGACY_ACTION_SECTION_SLUGS[button.action]);
}
