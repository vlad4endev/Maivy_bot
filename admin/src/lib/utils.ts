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

  return null;
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

export const CALLBACK_LABELS: Record<string, string> = {
  about_more: "Узнать больше",
  about_next: "Далее (шаблон)",
  demo: "Демо",
  try: "Попробовать",
  impl: "Внедрение",
  menu: "В меню",
};
