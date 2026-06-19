import type { MaxDeliveryConfig } from "../../config.js";

export function resolveMaxWebhookPath(
  config: MaxDeliveryConfig,
): string {
  if (config.webhookPath) {
    return config.webhookPath.startsWith("/")
      ? config.webhookPath
      : `/${config.webhookPath}`;
  }

  if (config.webhookUrl) {
    try {
      return new URL(config.webhookUrl).pathname || "/max/webhook";
    } catch {
      return "/max/webhook";
    }
  }

  return "/max/webhook";
}
