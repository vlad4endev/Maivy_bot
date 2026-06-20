export function resolveSectionKeyboardId(section: {
  slug: string;
  sectionType: string;
  keyboardId?: string;
}): string {
  if (section.keyboardId) {
    return section.keyboardId;
  }
  if (section.sectionType === "welcome") {
    return "main_menu";
  }
  if (section.sectionType === "about_step") {
    return "about_step";
  }
  if (section.slug === "menu") {
    return "main_menu";
  }
  return section.slug;
}

export function actionForTargetSection(slug: string): string {
  return `section:${slug}`;
}
