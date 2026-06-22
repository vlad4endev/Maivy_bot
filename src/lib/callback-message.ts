/** Telegram messages with media cannot be edited via editMessageText. */
export function resolveEditableCallbackMessageId(message: {
  message_id?: number;
  text?: string;
  photo?: unknown;
  video?: unknown;
  video_note?: unknown;
  document?: unknown;
  animation?: unknown;
  sticker?: unknown;
} | null | undefined): string | undefined {
  if (!message?.message_id || !message.text) {
    return undefined;
  }

  if (
    message.photo ||
    message.video ||
    message.video_note ||
    message.document ||
    message.animation ||
    message.sticker
  ) {
    return undefined;
  }

  return String(message.message_id);
}
