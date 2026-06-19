/** Типы событий MAX, которые обрабатывает бот (см. dev.max.ru/docs-api) */
export const MAX_UPDATE_TYPES = [
  "bot_started",
  "message_created",
  "message_callback",
] as const;

export type MaxUpdateType = (typeof MAX_UPDATE_TYPES)[number];

export const MAX_API_BASE_URL = "https://platform-api.max.ru";
