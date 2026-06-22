import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const STORAGE_PREFIX = "storage:";

export function isStorageRef(value: string): boolean {
  return value.startsWith(STORAGE_PREFIX);
}

export function toStorageRef(storageId: string): string {
  return `${STORAGE_PREFIX}${storageId}`;
}

export function storageRefId(ref: string): string {
  return ref.slice(STORAGE_PREFIX.length);
}

export async function resolveMediaRef(
  ctx: Pick<QueryCtx, "storage">,
  mediaRef: string | undefined,
): Promise<string | undefined> {
  if (!mediaRef?.trim()) {
    return undefined;
  }

  const trimmed = mediaRef.trim();
  if (isStorageRef(trimmed)) {
    const url = await ctx.storage.getUrl(storageRefId(trimmed) as Id<"_storage">);
    return url ?? undefined;
  }

  return trimmed;
}
