import type { MaxDeliveryConfig } from "../config.js";
import { resolveWebhookPort } from "../config.js";

export interface MaxDeliverySource {
  maxWebhookUrl?: string;
  maxWebhookSecret?: string;
  maxWebhookPath?: string;
  webhookPort?: number;
}

/** Настройки MAX: админка → приоритет, .env → fallback. */
export function resolveMaxDeliveryConfig(
  source?: MaxDeliverySource,
): MaxDeliveryConfig {
  const webhookUrl =
    source?.maxWebhookUrl?.trim() || process.env.MAX_WEBHOOK_URL?.trim();

  const webhookPort =
    source?.webhookPort ??
    resolveWebhookPort();

  if (webhookUrl) {
    return {
      mode: "webhook",
      webhookUrl,
      webhookSecret:
        source?.maxWebhookSecret?.trim() ||
        process.env.MAX_WEBHOOK_SECRET?.trim() ||
        undefined,
      webhookPort,
      webhookPath:
        source?.maxWebhookPath?.trim() ||
        process.env.MAX_WEBHOOK_PATH?.trim() ||
        undefined,
    };
  }

  return {
    mode: "polling",
    webhookPort,
  };
}
