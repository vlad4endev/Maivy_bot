import { MAX_API_BASE_URL, MAX_UPDATE_TYPES } from "./constants.js";

export interface MaxSubscription {
  url: string;
  update_types?: string[];
  secret?: string;
}

interface SubscriptionsListResponse {
  subscriptions?: MaxSubscription[];
}

interface SubscriptionActionResponse {
  success?: boolean;
  message?: string;
}

async function maxApiRequest<T>(
  token: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = new URL(path, MAX_API_BASE_URL);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    const detail =
      typeof data.message === "string" ? data.message : response.statusText;
    throw new Error(`MAX API ${method} ${path}: ${response.status} ${detail}`);
  }

  return data;
}

export async function listMaxSubscriptions(
  token: string,
): Promise<MaxSubscription[]> {
  const data = await maxApiRequest<SubscriptionsListResponse>(
    token,
    "GET",
    "/subscriptions",
  );
  return data.subscriptions ?? [];
}

export async function deleteMaxSubscription(
  token: string,
  webhookUrl: string,
): Promise<void> {
  const url = new URL("/subscriptions", MAX_API_BASE_URL);
  url.searchParams.set("url", webhookUrl);

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: token },
  });

  if (!response.ok) {
    const data = (await response.json()) as SubscriptionActionResponse;
    const detail = data.message ?? response.statusText;
    throw new Error(
      `MAX API DELETE /subscriptions: ${response.status} ${detail}`,
    );
  }
}

export async function createMaxWebhookSubscription(
  token: string,
  webhookUrl: string,
  secret?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    url: webhookUrl,
    update_types: [...MAX_UPDATE_TYPES],
  };

  if (secret) {
    body.secret = secret;
  }

  const data = await maxApiRequest<SubscriptionActionResponse>(
    token,
    "POST",
    "/subscriptions",
    body,
  );

  if (data.success === false) {
    throw new Error(data.message ?? "Не удалось создать webhook-подписку MAX");
  }
}

/** Снимает webhook-подписки, чтобы заработал Long Polling (локальная разработка). */
export async function clearMaxWebhookSubscriptions(token: string): Promise<void> {
  const subscriptions = await listMaxSubscriptions(token);
  for (const subscription of subscriptions) {
    await deleteMaxSubscription(token, subscription.url);
    console.log(`MAX: удалена webhook-подписка ${subscription.url}`);
  }
}

/**
 * Регистрирует webhook без «окна тишины»: сначала создаёт целевую подписку,
 * затем удаляет устаревшие. При деплое бот не теряет события.
 */
export async function ensureMaxWebhookSubscription(
  token: string,
  webhookUrl: string,
  secret?: string,
): Promise<void> {
  const subscriptions = await listMaxSubscriptions(token);
  const alreadyActive = subscriptions.some(
    (subscription) => subscription.url === webhookUrl,
  );

  if (!alreadyActive) {
    await createMaxWebhookSubscription(token, webhookUrl, secret);
    console.log(`MAX webhook зарегистрирован: ${webhookUrl}`);
  } else {
    console.log(`MAX webhook уже активен: ${webhookUrl}`);
  }

  for (const subscription of subscriptions) {
    if (subscription.url !== webhookUrl) {
      await deleteMaxSubscription(token, subscription.url);
      console.log(`MAX: удалена устаревшая подписка ${subscription.url}`);
    }
  }
}
