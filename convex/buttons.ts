import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { normalizeUrl } from "./lib/urls";
import { buttonTypeValidator, urlSourceValidator } from "./lib/validators";

const buttonDocValidator = v.object({
  _id: v.id("keyboardButtons"),
  _creationTime: v.number(),
  botId: v.id("bots"),
  keyboardId: v.string(),
  row: v.number(),
  col: v.number(),
  text: v.string(),
  buttonType: buttonTypeValidator,
  action: v.optional(v.string()),
  url: v.optional(v.string()),
  urlSource: urlSourceValidator,
  order: v.number(),
  isEnabled: v.boolean(),
  updatedAt: v.number(),
});

export const listByBot = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.array(buttonDocValidator),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    return buttons.sort((a, b) => {
      if (a.keyboardId !== b.keyboardId) {
        return a.keyboardId.localeCompare(b.keyboardId);
      }
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  },
});

export const listByKeyboard = query({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    keyboardId: v.string(),
  },
  returns: v.array(buttonDocValidator),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot_keyboard", (q) =>
        q.eq("botId", args.botId).eq("keyboardId", args.keyboardId),
      )
      .collect();
    return buttons.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    botId: v.id("bots"),
    keyboardId: v.string(),
    row: v.number(),
    col: v.number(),
    text: v.string(),
    buttonType: buttonTypeValidator,
    action: v.optional(v.string()),
    url: v.optional(v.string()),
    urlSource: urlSourceValidator,
    order: v.number(),
    isEnabled: v.optional(v.boolean()),
  },
  returns: v.id("keyboardButtons"),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    if (args.buttonType === "callback" && !args.action) {
      throw new Error("Callback buttons require an action");
    }
    if (args.buttonType === "url" && !args.url && !args.urlSource) {
      throw new Error("URL buttons require a url or urlSource");
    }

    return await ctx.db.insert("keyboardButtons", {
      botId: args.botId,
      keyboardId: args.keyboardId,
      row: args.row,
      col: args.col,
      text: args.text,
      buttonType: args.buttonType,
      action: args.action,
      url: args.url ? normalizeUrl(args.url) : undefined,
      urlSource: args.urlSource,
      order: args.order,
      isEnabled: args.isEnabled ?? true,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    buttonId: v.id("keyboardButtons"),
    keyboardId: v.optional(v.string()),
    row: v.optional(v.number()),
    col: v.optional(v.number()),
    text: v.optional(v.string()),
    buttonType: v.optional(buttonTypeValidator),
    action: v.optional(v.string()),
    url: v.optional(v.string()),
    urlSource: urlSourceValidator,
    order: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const button = await ctx.db.get(args.buttonId);
    if (!button) {
      throw new Error("Button not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.keyboardId !== undefined) updates.keyboardId = args.keyboardId;
    if (args.row !== undefined) updates.row = args.row;
    if (args.col !== undefined) updates.col = args.col;
    if (args.text !== undefined) updates.text = args.text;
    if (args.buttonType !== undefined) updates.buttonType = args.buttonType;
    if (args.action !== undefined) updates.action = args.action;
    if (args.url !== undefined) {
      updates.url = args.url ? normalizeUrl(args.url) : undefined;
    }
    if (args.urlSource !== undefined) updates.urlSource = args.urlSource;
    if (args.order !== undefined) updates.order = args.order;
    if (args.isEnabled !== undefined) updates.isEnabled = args.isEnabled;

    await ctx.db.patch(args.buttonId, updates);
    return null;
  },
});

export const remove = mutation({
  args: { token: v.string(), buttonId: v.id("keyboardButtons") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const button = await ctx.db.get(args.buttonId);
    if (!button) {
      throw new Error("Button not found");
    }
    await ctx.db.delete(args.buttonId);
    return null;
  },
});

export const toggleEnabled = mutation({
  args: { token: v.string(), buttonId: v.id("keyboardButtons") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const button = await ctx.db.get(args.buttonId);
    if (!button) {
      throw new Error("Button not found");
    }
    const isEnabled = !button.isEnabled;
    await ctx.db.patch(args.buttonId, { isEnabled, updatedAt: Date.now() });
    return isEnabled;
  },
});

export const listKeyboardIds = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    const ids = new Set(buttons.map((b) => b.keyboardId));
    return Array.from(ids).sort();
  },
});
