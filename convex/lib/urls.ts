export type MessengerPlatform = "telegram" | "max";

/** Нормализует URL для кнопок бота, настроек и ссылок мессенджеров. */
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

/** @deprecated use buildTelegramContactUrl */
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

export function getTelegramChatUrl(user: {
  platformUserId: string;
  username?: string;
}): string {
  return getUserChatUrl({ ...user, platform: "telegram" }) ?? `tg://user?id=${user.platformUserId}`;
}
