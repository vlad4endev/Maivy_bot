import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { isStorageRef, resolveMediaRef, storageRefId } from "./lib/mediaPaths";
import type { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMediaUrl = query({
  args: {
    token: v.string(),
    mediaRef: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    if (!isStorageRef(args.mediaRef)) {
      return null;
    }

    return await ctx.storage.getUrl(storageRefId(args.mediaRef) as Id<"_storage">);
  },
});

export const getMediaPreview = query({
  args: {
    token: v.string(),
    mediaRef: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      url: v.string(),
      isStorage: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    if (!args.mediaRef?.trim()) {
      return null;
    }

    const resolved = await resolveMediaRef(ctx, args.mediaRef);
    if (!resolved) {
      return null;
    }

    if (isStorageRef(args.mediaRef)) {
      return { url: resolved, isStorage: true };
    }

    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      return { url: resolved, isStorage: false };
    }

    return null;
  },
});
