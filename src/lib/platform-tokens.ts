import type { BotRuntimeState } from "./runtime-state.js";

/** Токены из .env — fallback, если в админке не заданы. */
export function resolvePlatformTokens(runtime: {
  telegramToken?: string;
  maxToken?: string;
}): { telegramToken?: string; maxToken?: string } {
  return {
    telegramToken:
      runtime.telegramToken?.trim() ||
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      undefined,
    maxToken:
      runtime.maxToken?.trim() || process.env.MAX_BOT_TOKEN?.trim() || undefined,
  };
}

export function buildRuntimeState(
  botSlug: string,
  runtime: {
    enabled: boolean;
    platforms: Array<"telegram" | "max">;
    telegramToken?: string;
    maxToken?: string;
    maxWebhookUrl?: string;
    maxWebhookSecret?: string;
    maxWebhookPath?: string;
    webhookPort?: number;
    maxBotUsername?: string;
    settings: BotRuntimeState["config"];
  },
  content: BotRuntimeState["content"],
): BotRuntimeState {
  const tokens = resolvePlatformTokens(runtime);

  return {
    botSlug,
    enabled: runtime.enabled,
    platforms: runtime.platforms,
    telegramToken: tokens.telegramToken,
    maxToken: tokens.maxToken,
    maxWebhookUrl: runtime.maxWebhookUrl,
    maxWebhookSecret: runtime.maxWebhookSecret,
    maxWebhookPath: runtime.maxWebhookPath,
    webhookPort: runtime.webhookPort,
    maxBotUsername: runtime.maxBotUsername,
    config: runtime.settings,
    content,
  };
}
