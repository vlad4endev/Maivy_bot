import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Bot, Context } from "@maxhub/max-bot-api";
import type { Update } from "@maxhub/max-bot-api/types";
import type { MaxDeliveryConfig } from "../../config.js";
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

export function startMaxWebhookServer(
  bot: Bot,
  delivery: MaxDeliveryConfig,
): void {
  const webhookPath = resolveMaxWebhookPath(delivery);
  const expectedSecret = delivery.webhookSecret;

  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method === "GET" && req.url?.split("?")[0] === webhookPath) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("MAX webhook OK");
      return;
    }

    if (req.method !== "POST" || req.url?.split("?")[0] !== webhookPath) {
      res.writeHead(404).end();
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

    try {
      const body = await readJsonBody(req);
      if (!isUpdate(body)) {
        res.writeHead(400).end();
        return;
      }

      await processMaxUpdate(bot, body);
      res.writeHead(200).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("MAX webhook: ошибка обработки:", message);
      res.writeHead(500).end();
    }
  }

  server.listen(delivery.webhookPort, () => {
    console.log(
      `MAX webhook слушает :${delivery.webhookPort}${webhookPath}`,
    );
  });
}
