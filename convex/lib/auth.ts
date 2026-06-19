import type { MutationCtx, QueryCtx } from "../_generated/server";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function requireAdminSession(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<void> {
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: invalid or expired session");
  }
}

export function createSessionExpiry(): number {
  return Date.now() + SESSION_DURATION_MS;
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyBotApiSecret(secret: string): Promise<void> {
  const expected = process.env.BOT_API_SECRET;
  if (!expected) {
    throw new Error("BOT_API_SECRET is not configured on the server");
  }
  if (secret !== expected) {
    throw new Error("Unauthorized: invalid bot API secret");
  }
}
