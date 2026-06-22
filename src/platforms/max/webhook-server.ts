import { type IncomingMessage } from "node:http";
import { Bot, Context } from "@maxhub/max-bot-api";
import type { Update } from "@maxhub/max-bot-api/types";
import type { MaxDeliveryConfig } from "../../config.js";
import {
  ensureWebhookServer,
  registerWebhookRoute,
} from "../../webhook/server.js";
import { resolveMaxWebhookPath } from "./delivery.js";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function isUpdate(value: unknown): value is Update {
  return (
    typeof value === "object" &&
    value !== null &&
    "update_type" in value &&
    typeof (value as Update).update_type === "string"
  );
}

export async function processMaxUpdate(bot: Bot, update: Update): Promise<void> {
  bot.botInfo ??= await bot.api.getMyInfo();
  const ctx = new Context(update, bot.api, bot.botInfo);
  await bot.middleware()(ctx, () => Promise.resolve(undefined));
}

export async function registerMaxWebhook(
  bot: Bot,
  delivery: MaxDeliveryConfig,
): Promise<void> {
  const webhookPath = resolveMaxWebhookPath(delivery);
  const expectedSecret = delivery.webhookSecret;

  registerWebhookRoute(webhookPath, async (req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("MAX webhook OK");
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    if (expectedSecret) {
      const headerSecret = req.headers["x-max-bot-api-secret"];
      const received =
        typeof headerSecret === "string" ? headerSecret : headerSecret?.[0];
      if (received !== expectedSecret) {
        res.writeHead(401).end();
        return;
      }
    }

    const body = await readJsonBody(req);
    if (!isUpdate(body)) {
      res.writeHead(400).end();
      return;
    }

    await processMaxUpdate(bot, body);
    res.writeHead(200).end();
  });

  await ensureWebhookServer(delivery.webhookPort);
  console.log(`MAX webhook слушает :${delivery.webhookPort}${webhookPath}`);
}

/** @deprecated Используйте registerMaxWebhook — оставлено для совместимости. */
export async function startMaxWebhookServer(
  bot: Bot,
  delivery: MaxDeliveryConfig,
): Promise<void> {
  await registerMaxWebhook(bot, delivery);
}
