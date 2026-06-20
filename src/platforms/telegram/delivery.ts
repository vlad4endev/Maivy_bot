import type { TelegramDeliveryConfig } from "../../config.js";

export function resolveTelegramWebhookPath(
  config: TelegramDeliveryConfig,
): string {
  if (config.webhookPath) {
    return config.webhookPath.startsWith("/")
      ? config.webhookPath
      : `/${config.webhookPath}`;
  }

  if (config.webhookUrl) {
    try {
      return new URL(config.webhookUrl).pathname || "/telegram/webhook";
    } catch {
      return "/telegram/webhook";
    }
  }

  return "/telegram/webhook";
}
