import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";
import { resolveSectionKeyboardId } from "./lib/sectionKeyboard";
import { buttonTypeValidator, sectionMediaTypeValidator, sectionTypeValidator } from "./lib/validators";

const flowButtonValidator = v.object({
  _id: v.id("keyboardButtons"),
  row: v.number(),
  col: v.number(),
  text: v.string(),
  buttonType: buttonTypeValidator,
  action: v.optional(v.string()),
  targetSectionId: v.optional(v.id("sections")),
  targetSectionSlug: v.optional(v.string()),
  targetSectionTitle: v.optional(v.string()),
  url: v.optional(v.string()),
  urlSource: v.optional(
    v.union(
      v.literal("loomVideoUrl"),
      v.literal("grosterUrl"),
      v.literal("contactUrl"),
    ),
  ),
  isEnabled: v.boolean(),
});

const flowSectionValidator = v.object({
  _id: v.id("sections"),
  slug: v.string(),
  title: v.optional(v.string()),
  body: v.string(),
  order: v.number(),
  sectionType: sectionTypeValidator,
  keyboardId: v.optional(v.string()),
  mediaType: v.optional(sectionMediaTypeValidator),
  mediaPath: v.optional(v.string()),
  resolvedKeyboardId: v.string(),
  isPublished: v.boolean(),
  parseMode: v.union(v.literal("HTML"), v.literal("Markdown")),
  buttons: v.array(flowButtonValidator),
  incomingFrom: v.array(
    v.object({
      sectionId: v.id("sections"),
      sectionTitle: v.optional(v.string()),
      buttonText: v.string(),
    }),
  ),
});

export const getFlow = query({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.object({
    sections: v.array(flowSectionValidator),
    entrySectionId: v.union(v.id("sections"), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const sectionById = new Map(sections.map((section) => [section._id, section]));
    const sortedSections = sections.sort((a, b) => a.order - b.order);

    const incomingFrom = new Map<
      string,
      Array<{ sectionId: typeof sections[number]["_id"]; sectionTitle?: string; buttonText: string }>
    >();

    for (const button of buttons) {
      if (!button.targetSectionId || button.buttonType !== "callback") {
        continue;
      }

      const sourceSection = sortedSections.find(
        (section) =>
          resolveSectionKeyboardId(section) === button.keyboardId,
      );
      if (!sourceSection) {
        continue;
      }

      const list = incomingFrom.get(button.targetSectionId) ?? [];
      list.push({
        sectionId: sourceSection._id,
        sectionTitle: sourceSection.title,
        buttonText: button.text,
      });
      incomingFrom.set(button.targetSectionId, list);
    }

    const flowSections = sortedSections.map((section) => {
      const resolvedKeyboardId = resolveSectionKeyboardId(section);
      const sectionButtons = buttons
        .filter((button) => button.keyboardId === resolvedKeyboardId)
        .sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.col - b.col;
        })
        .map((button) => {
          const target = button.targetSectionId
            ? sectionById.get(button.targetSectionId)
            : undefined;
          return {
            _id: button._id,
            row: button.row,
            col: button.col,
            text: button.text,
            buttonType: button.buttonType,
            action: button.action,
            targetSectionId: button.targetSectionId,
            targetSectionSlug: target?.slug,
            targetSectionTitle: target?.title,
            url: button.url,
            urlSource: button.urlSource,
            isEnabled: button.isEnabled,
          };
        });

      return {
        _id: section._id,
        slug: section.slug,
        title: section.title,
        body: section.body,
        order: section.order,
        sectionType: section.sectionType,
        keyboardId: section.keyboardId,
        mediaType: section.mediaType,
        mediaPath: section.mediaPath,
        resolvedKeyboardId,
        isPublished: section.isPublished,
        parseMode: section.parseMode,
        buttons: sectionButtons,
        incomingFrom: incomingFrom.get(section._id) ?? [],
      };
    });

    const entrySection =
      sortedSections.find((section) => section.sectionType === "welcome") ??
      sortedSections[0] ??
      null;

    return {
      sections: flowSections,
      entrySectionId: entrySection?._id ?? null,
    };
  },
});

const ACTION_TO_SLUG: Record<string, string> = {
  demo: "demo",
  try: "try",
  impl: "impl",
  menu: "menu",
};

export const linkButtonTargets = mutation({
  args: { token: v.string(), botId: v.id("bots") },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    const slugToId = new Map(sections.map((section) => [section.slug, section._id]));
    const aboutSteps = sections
      .filter((section) => section.sectionType === "about_step")
      .sort((a, b) => a.order - b.order);

    const buttons = await ctx.db
      .query("keyboardButtons")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();

    let updated = 0;

    for (const button of buttons) {
      if (button.buttonType !== "callback" || button.targetSectionId || !button.action) {
        continue;
      }

      let targetSectionId;
      if (button.action === "about_more") {
        targetSectionId = aboutSteps[0]?._id;
      } else {
        const slug = ACTION_TO_SLUG[button.action];
        targetSectionId = slug ? slugToId.get(slug) : undefined;
      }

      if (!targetSectionId) {
        continue;
      }

      const target = sections.find((section) => section._id === targetSectionId);
      if (!target) {
        continue;
      }

      await ctx.db.patch(button._id, {
        targetSectionId,
        action: `section:${target.slug}`,
        updatedAt: Date.now(),
      });
      updated += 1;
    }

    return updated;
  },
});
