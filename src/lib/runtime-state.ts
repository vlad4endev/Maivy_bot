import type { AppContentConfig } from "../config.js";
import type { BotContentSnapshot } from "../lib/convex-client.js";

export interface BotRuntimeState {
  botSlug: string;
  enabled: boolean;
  platforms: Array<"telegram" | "max">;
  telegramToken?: string;
  maxToken?: string;
  maxWebhookUrl?: string;
  maxWebhookSecret?: string;
  maxWebhookPath?: string;
  webhookPort?: number;
  maxBotUsername?: string;
  config: AppContentConfig;
  content: BotContentSnapshot | null;
}

let state: BotRuntimeState | null = null;

export function setRuntimeState(next: BotRuntimeState): void {
  state = next;
}

export function getRuntimeState(): BotRuntimeState | null {
  return state;
}

export function getEffectiveConfig(): AppContentConfig {
  return state?.config ?? getFallbackConfig();
}

export function getEffectiveContent(): BotContentSnapshot | null {
  return state?.content ?? null;
}

function getFallbackConfig(): AppContentConfig {
  return {
    botTagline: "",
    privacyPolicyUrl: "",
    loomVideoUrl: "",
    grosterUrl: "",
    contactUsername: "@daerit",
    contactUrl: "https://t.me/daerit",
  };
}
