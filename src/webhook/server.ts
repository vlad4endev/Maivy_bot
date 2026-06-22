import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

export type WebhookRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

let server: Server | null = null;
let listeningPort: number | null = null;
let serverReady: Promise<void> | null = null;
const routes = new Map<string, WebhookRouteHandler>();

function normalizePath(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  if (withLeading.length > 1 && withLeading.endsWith("/")) {
    return withLeading.slice(0, -1);
  }
  return withLeading;
}

export function registerWebhookRoute(
  path: string,
  handler: WebhookRouteHandler,
): void {
  routes.set(normalizePath(path), handler);
}

export function ensureWebhookServer(port: number): Promise<void> {
  if (server) {
    if (listeningPort !== port) {
      console.warn(
        `Webhook: сервер уже слушает :${listeningPort}, маршрут добавлен (запрошен :${port})`,
      );
    }
    return serverReady ?? Promise.resolve();
  }

  serverReady = new Promise((resolve) => {
    server = createServer((req, res) => {
      void handleRequest(req, res);
    });

    server.listen(port, () => {
      console.log(`Webhook-сервер слушает :${port}`);
      resolve();
    });

    listeningPort = port;
  });

  return serverReady;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const path = normalizePath(req.url?.split("?")[0] ?? "/");
  const handler = routes.get(path);

  if (!handler) {
    res.writeHead(404).end();
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webhook ${path}: ошибка обработки:`, message);
    if (!res.headersSent) {
      res.writeHead(500).end();
    }
  }
}
