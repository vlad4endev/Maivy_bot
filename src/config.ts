import dotenv from "dotenv";
import { resolveAssetPath } from "./lib/assets.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: false });

/** Минимальная конфигурация процесса — только подключение к Convex */
export interface BootstrapConfig {
  botSlug: string;
  convexUrl?: string;
  botApiSecret?: string;
}

export interface AppContentConfig {
  botTagline: string;
  privacyPolicyUrl: string;
  loomVideoUrl: string;
  grosterUrl: string;
  contactUsername: string;
  contactUrl: string;
  welcomeImagePath?: string;
  welcomeVideoPath?: string;
  telegramVideoNoteFileId?: string;
  shortDescription?: string;
}

/** Fallback-контент, если Convex недоступен при первом запуске */
export function getEnvFallbackContent(): AppContentConfig {
  const contactUsername = normalizeUsername(
    process.env.CONTACT_USERNAME ?? "daerit",
  );

  return {
    botTagline:
      process.env.BOT_TAGLINE?.trim() ??
      "Maivy — умный поиск и трансформация B2B-продаж. Находите товары за секунды, а не часы.",
    privacyPolicyUrl:
      process.env.PRIVACY_POLICY_URL?.trim() ??
      "https://example.com/privacy-policy",
    loomVideoUrl:
      process.env.LOOM_VIDEO_URL?.trim() ??
      "https://www.loom.com/share/example",
    grosterUrl: process.env.GROSTER_URL?.trim() ?? "https://groster.me/",
    contactUsername,
    contactUrl: buildContactUrl(contactUsername),
    welcomeImagePath: resolveAssetPath(
      process.env.WELCOME_IMAGE_PATH ?? "assets/welcome.jpg",
    ),
    welcomeVideoPath: resolveAssetPath(
      process.env.WELCOME_VIDEO_PATH ?? "assets/welcome-video.mp4",
    ),
    telegramVideoNoteFileId:
      process.env.TELEGRAM_VIDEO_NOTE_FILE_ID?.trim() || undefined,
    shortDescription:
      process.env.BOT_SHORT_DESCRIPTION?.trim() ||
      "Умный поиск и трансформация B2B-продаж",
  };
}

export function loadBootstrapConfig(): BootstrapConfig {
  return {
    botSlug: process.env.BOT_SLUG?.trim() ?? "maivy",
    convexUrl: process.env.CONVEX_URL?.trim() || undefined,
    botApiSecret: process.env.BOT_API_SECRET?.trim() || undefined,
  };
}

export function normalizeUsername(value: string): string {
  return value.startsWith("@") ? value : `@${value}`;
}

export function buildContactUrl(username: string): string {
  const clean = username.replace(/^@+/, "").trim();
  return `https://t.me/${clean}`;
}

export function resolveMediaPaths(settings: AppContentConfig): AppContentConfig {
  return {
    ...settings,
    welcomeImagePath: settings.welcomeImagePath
      ? resolveAssetPath(settings.welcomeImagePath)
      : undefined,
    welcomeVideoPath: settings.welcomeVideoPath
      ? resolveAssetPath(settings.welcomeVideoPath)
      : undefined,
  };
}
