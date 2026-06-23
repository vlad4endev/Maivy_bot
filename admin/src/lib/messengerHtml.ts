export const MESSENGER_TEXT_LIMIT = 4096;

export type MessengerParseMode = "HTML" | "Markdown";

export interface MessengerHtmlIssue {
  level: "warning" | "error";
  message: string;
}

export interface MessengerHtmlAnalysis {
  charCount: number;
  lineCount: number;
  issues: MessengerHtmlIssue[];
  telegramOk: boolean;
  maxOk: boolean;
}

const TELEGRAM_ONLY_TAGS = ["tg-spoiler"];

const ALLOWED_HTML_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "a",
  "code",
  "pre",
  "tg-spoiler",
]);

const DISALLOWED_HTML_TAGS = [
  "div",
  "span",
  "p",
  "br",
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "blockquote",
  "hr",
];

export function analyzeMessengerText(
  text: string,
  parseMode: MessengerParseMode,
): MessengerHtmlAnalysis {
  const issues: MessengerHtmlIssue[] = [];
  const charCount = text.length;
  const lineCount = text ? text.split("\n").length : 0;

  if (charCount > MESSENGER_TEXT_LIMIT) {
    issues.push({
      level: "error",
      message: `Превышен лимит ${MESSENGER_TEXT_LIMIT} символов (${charCount})`,
    });
  }

  if (parseMode === "HTML") {
    for (const tag of DISALLOWED_HTML_TAGS) {
      const pattern = new RegExp(`<${tag}(\\s|>|/)`, "gi");
      if (pattern.test(text)) {
        issues.push({
          level: "warning",
          message: `Тег <${tag}> не поддерживается — используйте переносы строк и разрешённые теги`,
        });
      }
    }

    for (const tag of TELEGRAM_ONLY_TAGS) {
      const pattern = new RegExp(`<${tag}(\\s|>|/)`, "gi");
      if (pattern.test(text)) {
        issues.push({
          level: "warning",
          message: `<${tag}> работает в Telegram; в MAX может отображаться как обычный текст`,
        });
      }
    }

    const openTags = [...text.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*(?<!\/)>/gi)];
    const closeTags = [...text.matchAll(/<\/([a-z][a-z0-9-]*)>/gi)];
    const stack: string[] = [];

    for (const match of openTags) {
      const tag = match[1]!.toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(tag)) continue;
      stack.push(tag);
    }

    for (const match of closeTags) {
      const tag = match[1]!.toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(tag)) continue;
      const last = stack.pop();
      if (last !== tag) {
        issues.push({
          level: "error",
          message: `Несовпадение тегов: ожидался </${last ?? "?"}>, найден </${tag}>`,
        });
        break;
      }
    }

    if (stack.length > 0) {
      issues.push({
        level: "error",
        message: `Незакрытый тег: <${stack[stack.length - 1]}>`,
      });
    }

    if (/<a\s+[^>]*href\s*=\s*["']?\s*["']/i.test(text)) {
      issues.push({
        level: "error",
        message: "Ссылка без URL — укажите href",
      });
    }
  }

  const hasErrors = issues.some((issue) => issue.level === "error");
  const telegramOk = !hasErrors;
  const maxOk =
    !hasErrors &&
    !TELEGRAM_ONLY_TAGS.some((tag) => new RegExp(`<${tag}(\\s|>|/)`, "i").test(text));

  return { charCount, lineCount, issues, telegramOk, maxOk };
}

export function renderMessengerPreviewHtml(
  text: string,
  parseMode: MessengerParseMode,
): string {
  if (parseMode === "HTML") {
    return sanitizePreviewHtml(text);
  }
  return markdownToPreviewHtml(text);
}

function sanitizePreviewHtml(html: string): string {
  return html
    .replace(/</g, "&lt;")
    .replace(
      /&lt;(\/?)(b|strong|i|em|u|ins|s|strike|del|code|pre)\b([^&]*?)>/gi,
      "<$1$2$3>",
    )
    .replace(/&lt;tg-spoiler&gt;/gi, '<span class="tg-spoiler">')
    .replace(/&lt;\/tg-spoiler&gt;/gi, "</span>")
    .replace(
      /&lt;a\s+href=(["'])(.*?)\1\s*&gt;([\s\S]*?)&lt;\/a&gt;/gi,
      '<a href="$2" target="_blank" rel="noreferrer">$3</a>',
    )
    .replace(/\n/g, "<br>");
}

function markdownToPreviewHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_\n]+)__/g, "<b>$1</b>")
    .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
    .replace(/_([^_\n]+)_/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n/g, "<br>");
}

export interface TextSelectionEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function wrapTextSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder = "текст",
): TextSelectionEdit {
  const selected = text.slice(selectionStart, selectionEnd) || placeholder;
  const value =
    text.slice(0, selectionStart) + before + selected + after + text.slice(selectionEnd);
  const cursorStart = selectionStart + before.length;
  const cursorEnd = cursorStart + selected.length;
  return { value, selectionStart: cursorStart, selectionEnd: cursorEnd };
}

export function insertTextAtCursor(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
): TextSelectionEdit {
  const value = text.slice(0, selectionStart) + insert + text.slice(selectionEnd);
  const pos = selectionStart + insert.length;
  return { value, selectionStart: pos, selectionEnd: pos };
}
