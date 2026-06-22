import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { sectionMediaTypeValidator, sectionTypeValidator } from "./lib/validators";

const sectionDocValidator = v.object({
  _id: v.id("sections"),
  _creationTime: v.number(),
  botId: v.id("bots"),
  slug: v.string(),
  title: v.optional(v.string()),
  body: v.string(),
  order: v.number(),
  sectionType: sectionTypeValidator,
  keyboardId: v.optional(v.string()),
  mediaType: v.optional(sectionMediaTypeValidator),
  mediaPath: v.optional(v.string()),
  isPublished: v.boolean(),
  parseMode: v.union(v.literal("HTML"), v.literal("Markdown")),
  updatedAt: v.number(),
});

export const listByBot = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.array(sectionDocValidator),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    return sections.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { token: v.string(), sectionId: v.id("sections") },
  returns: v.union(sectionDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    return await ctx.db.get(args.sectionId);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    slug: v.string(),
    title: v.optional(v.string()),
    body: v.string(),
    order: v.number(),
    sectionType: sectionTypeValidator,
    isPublished: v.boolean(),
    keyboardId: v.optional(v.string()),
    mediaType: v.optional(sectionMediaTypeValidator),
    mediaPath: v.optional(v.string()),
    parseMode: v.optional(v.union(v.literal("HTML"), v.literal("Markdown"))),
  },
  returns: v.id("sections"),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const existing = await ctx.db
      .query("sections")
      .withIndex("by_bot_slug", (q) =>
        q.eq("botId", args.botId).eq("slug", args.slug),
      )
      .unique();

    if (existing) {
      throw new Error(`Section with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("sections", {
      botId: args.botId,
      slug: args.slug,
      title: args.title,
      body: args.body,
      order: args.order,
      sectionType: args.sectionType,
      keyboardId: args.keyboardId,
      mediaType: args.mediaType ?? "none",
      mediaPath: args.mediaPath,
      isPublished: args.isPublished,
      parseMode: args.parseMode ?? "HTML",
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    sectionId: v.id("sections"),
    slug: v.optional(v.string()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    order: v.optional(v.number()),
    sectionType: v.optional(sectionTypeValidator),
    keyboardId: v.optional(v.string()),
    mediaType: v.optional(sectionMediaTypeValidator),
    mediaPath: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    parseMode: v.optional(v.union(v.literal("HTML"), v.literal("Markdown"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.slug !== undefined) updates.slug = args.slug;
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;
    if (args.order !== undefined) updates.order = args.order;
    if (args.sectionType !== undefined) updates.sectionType = args.sectionType;
    if (args.keyboardId !== undefined) updates.keyboardId = args.keyboardId;
    if (args.mediaType !== undefined) updates.mediaType = args.mediaType;
    if (args.mediaPath !== undefined) {
      updates.mediaPath = args.mediaPath.trim() ? args.mediaPath.trim() : undefined;
    }
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.parseMode !== undefined) updates.parseMode = args.parseMode;

    await ctx.db.patch(args.sectionId, updates);
    return null;
  },
});

export const remove = mutation({
  args: { token: v.string(), sectionId: v.id("sections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }
    await ctx.db.delete(args.sectionId);
    return null;
  },
});

export const reorder = mutation({
  args: {
    token: v.string(),
    sectionIds: v.array(v.id("sections")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    for (let i = 0; i < args.sectionIds.length; i++) {
      await ctx.db.patch(args.sectionIds[i], {
        order: i + 1,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const togglePublished = mutation({
  args: { token: v.string(), sectionId: v.id("sections") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }
    const isPublished = !section.isPublished;
    await ctx.db.patch(args.sectionId, {
      isPublished,
      updatedAt: Date.now(),
    });
    return isPublished;
  },
});

export const duplicate = mutation({
  args: { token: v.string(), sectionId: v.id("sections") },
  returns: v.id("sections"),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const allSections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", section.botId))
      .collect();

    const maxOrder = allSections.reduce((max, s) => Math.max(max, s.order), 0);
    const newSlug = `${section.slug}_copy_${Date.now()}`;

    return await ctx.db.insert("sections", {
      botId: section.botId,
      slug: newSlug,
      title: section.title ? `${section.title} (копия)` : undefined,
      body: section.body,
      order: maxOrder + 1,
      sectionType: section.sectionType,
      keyboardId: section.keyboardId,
      mediaType: section.mediaType,
      mediaPath: section.mediaPath,
      isPublished: false,
      parseMode: section.parseMode,
      updatedAt: Date.now(),
    });
  },
});
