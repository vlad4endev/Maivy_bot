import { webhookCallback, type Bot } from "grammy";
import type { TelegramDeliveryConfig } from "../../config.js";
import {
  ensureWebhookServer,
  registerWebhookRoute,
} from "../../webhook/server.js";
import { resolveTelegramWebhookPath } from "./delivery.js";

export async function registerTelegramWebhook(
  bot: Bot,
  delivery: TelegramDeliveryConfig,
): Promise<void> {
  const webhookPath = resolveTelegramWebhookPath(delivery);
  const callback = webhookCallback(bot, "http", {
    secretToken: delivery.webhookSecret,
  });

  registerWebhookRoute(webhookPath, async (req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Telegram webhook OK");
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    try {
      await callback(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Telegram webhook: ошибка обработки update:", message);
      if (!res.headersSent) {
        res.writeHead(500).end();
      }
    }
  });

  await ensureWebhookServer(delivery.webhookPort);
  console.log(
    `Telegram webhook слушает :${delivery.webhookPort}${webhookPath}`,
  );
}
