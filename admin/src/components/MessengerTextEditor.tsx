import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  FiBold,
  FiCode,
  FiEye,
  FiEyeOff,
  FiItalic,
  FiLink,
  FiType,
  FiUnderline,
} from "react-icons/fi";
import { Strikethrough } from "lucide-react";
import {
  analyzeMessengerText,
  insertTextAtCursor,
  MESSENGER_TEXT_LIMIT,
  renderMessengerPreviewHtml,
  wrapTextSelection,
  type MessengerParseMode,
  type TextSelectionEdit,
} from "../lib/messengerHtml";

interface MessengerTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  parseMode?: MessengerParseMode;
  onParseModeChange?: (mode: MessengerParseMode) => void;
  required?: boolean;
  minRows?: number;
  label?: string;
  showPreview?: boolean;
  previewExtra?: React.ReactNode;
}

type EditorView = "edit" | "split" | "preview";

interface ToolbarAction {
  id: string;
  label: string;
  title: string;
  icon: React.ReactNode;
  shortcut?: string;
  apply: (text: string, start: number, end: number) => TextSelectionEdit;
}

function applyEdit(
  textarea: HTMLTextAreaElement,
  edit: TextSelectionEdit,
  onChange: (value: string) => void,
) {
  onChange(edit.value);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  });
}

export function MessengerTextEditor({
  value,
  onChange,
  parseMode = "HTML",
  onParseModeChange,
  required,
  minRows = 10,
  label = "Текст сообщения",
  showPreview = true,
  previewExtra,
}: MessengerTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<EditorView>("split");

  const analysis = useMemo(
    () => analyzeMessengerText(value, parseMode),
    [value, parseMode],
  );

  const previewHtml = useMemo(
    () => renderMessengerPreviewHtml(value, parseMode),
    [value, parseMode],
  );

  const runToolbarAction = useCallback(
    (apply: ToolbarAction["apply"]) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const edit = apply(textarea.value, textarea.selectionStart, textarea.selectionEnd);
      applyEdit(textarea, edit, onChange);
    },
    [onChange],
  );

  const htmlActions: ToolbarAction[] = [
    {
      id: "bold",
      label: "Жирный",
      title: "Жирный (Ctrl+B)",
      icon: <FiBold />,
      shortcut: "b",
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<b>", "</b>"),
    },
    {
      id: "italic",
      label: "Курсив",
      title: "Курсив (Ctrl+I)",
      icon: <FiItalic />,
      shortcut: "i",
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<i>", "</i>"),
    },
    {
      id: "underline",
      label: "Подчёркивание",
      title: "Подчёркивание (Ctrl+U)",
      icon: <FiUnderline />,
      shortcut: "u",
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<u>", "</u>"),
    },
    {
      id: "strike",
      label: "Зачёркнутый",
      title: "Зачёркнутый",
      icon: <Strikethrough size={15} />,
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<s>", "</s>"),
    },
    {
      id: "link",
      label: "Ссылка",
      title: "Ссылка (Ctrl+K)",
      icon: <FiLink />,
      shortcut: "k",
      apply: (text, start, end) => {
        const selected = text.slice(start, end) || "текст ссылки";
        const url = window.prompt("URL ссылки", "https://");
        if (!url?.trim()) {
          return { value: text, selectionStart: start, selectionEnd: end };
        }
        return wrapTextSelection(
          text,
          start,
          end,
          `<a href="${url.trim()}">`,
          "</a>",
          selected,
        );
      },
    },
    {
      id: "code",
      label: "Код",
      title: "Инлайн-код",
      icon: <FiCode />,
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<code>", "</code>"),
    },
    {
      id: "pre",
      label: "Блок кода",
      title: "Блок кода",
      icon: <FiType />,
      apply: (text, start, end) => wrapTextSelection(text, start, end, "<pre>", "</pre>"),
    },
    {
      id: "spoiler",
      label: "Спойлер",
      title: "Спойлер (только Telegram)",
      icon: <FiEyeOff />,
      apply: (text, start, end) =>
        wrapTextSelection(text, start, end, "<tg-spoiler>", "</tg-spoiler>"),
    },
  ];

  const markdownActions: ToolbarAction[] = [
    {
      id: "bold",
      label: "Жирный",
      title: "Жирный **",
      icon: <FiBold />,
      shortcut: "b",
      apply: (text, start, end) => wrapTextSelection(text, start, end, "**", "**"),
    },
    {
      id: "italic",
      label: "Курсив",
      title: "Курсив _",
      icon: <FiItalic />,
      shortcut: "i",
      apply: (text, start, end) => wrapTextSelection(text, start, end, "_", "_"),
    },
    {
      id: "link",
      label: "Ссылка",
      title: "Ссылка [текст](url)",
      icon: <FiLink />,
      shortcut: "k",
      apply: (text, start, end) => {
        const selected = text.slice(start, end) || "текст";
        const url = window.prompt("URL ссылки", "https://");
        if (!url?.trim()) {
          return { value: text, selectionStart: start, selectionEnd: end };
        }
        return insertTextAtCursor(text, start, end, `[${selected}](${url.trim()})`);
      },
    },
    {
      id: "code",
      label: "Код",
      title: "Инлайн-код",
      icon: <FiCode />,
      apply: (text, start, end) => wrapTextSelection(text, start, end, "`", "`"),
    },
  ];

  const toolbarActions = parseMode === "HTML" ? htmlActions : markdownActions;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const action = toolbarActions.find((item) => item.shortcut === event.key.toLowerCase());
    if (!action) return;
    event.preventDefault();
    runToolbarAction(action.apply);
  };

  const insertTemplate = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const template = "<b>Заголовок</b>\n\nТекст сообщения";
    const edit = insertTextAtCursor(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
      template,
    );
    applyEdit(textarea, edit, onChange);
  };

  const showEditor = view !== "preview";
  const showPreviewPanel = showPreview && view !== "edit";

  return (
    <div className="messenger-editor">
      <div className="messenger-editor-header">
        <label className="messenger-editor-label">{label}</label>
        <div className="messenger-editor-header-actions">
          {onParseModeChange && (
            <div className="messenger-editor-mode" role="group" aria-label="Режим разметки">
              <button
                type="button"
                className={parseMode === "HTML" ? "active" : ""}
                onClick={() => onParseModeChange("HTML")}
              >
                HTML
              </button>
              <button
                type="button"
                className={parseMode === "Markdown" ? "active" : ""}
                onClick={() => onParseModeChange("Markdown")}
              >
                Markdown
              </button>
            </div>
          )}
          {showPreview && (
            <div className="messenger-editor-view" role="group" aria-label="Режим отображения">
              <button
                type="button"
                className={view === "edit" ? "active" : ""}
                onClick={() => setView("edit")}
                title="Только редактор"
              >
                Редактор
              </button>
              <button
                type="button"
                className={view === "split" ? "active" : ""}
                onClick={() => setView("split")}
                title="Редактор и предпросмотр"
              >
                Сплит
              </button>
              <button
                type="button"
                className={view === "preview" ? "active" : ""}
                onClick={() => setView("preview")}
                title="Только предпросмотр"
              >
                <FiEye />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="messenger-editor-toolbar">
        {toolbarActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="messenger-editor-tool"
            title={action.title}
            aria-label={action.label}
            onClick={() => runToolbarAction(action.apply)}
          >
            {action.icon}
          </button>
        ))}
        <span className="messenger-editor-toolbar-divider" />
        <button
          type="button"
          className="messenger-editor-tool messenger-editor-tool-text"
          title="Вставить шаблон заголовка"
          onClick={insertTemplate}
        >
          Шаблон
        </button>
      </div>

      <div
        className={`messenger-editor-body${showEditor && showPreviewPanel ? " split" : ""}${!showEditor ? " preview-only" : ""}`}
      >
        {showEditor && (
          <div className="messenger-editor-pane messenger-editor-pane-edit">
            <textarea
              ref={textareaRef}
              className="messenger-editor-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={minRows}
              required={required}
              spellCheck={false}
              placeholder={
                parseMode === "HTML"
                  ? "<b>Заголовок</b>\n\nТекст для Telegram и MAX…"
                  : "**Заголовок**\n\nТекст в Markdown…"
              }
            />
          </div>
        )}

        {showPreviewPanel && (
          <div className="messenger-editor-pane messenger-editor-pane-preview">
            <div className="messenger-preview-grid">
              <div className="messenger-preview-card telegram">
                <div className="messenger-preview-card-head">
                  <span className="messenger-preview-badge telegram">Telegram</span>
                  {analysis.telegramOk ? (
                    <span className="messenger-preview-status ok">OK</span>
                  ) : (
                    <span className="messenger-preview-status warn">!</span>
                  )}
                </div>
                <div
                  className="messenger-preview-bubble"
                  dangerouslySetInnerHTML={{ __html: previewHtml || "…" }}
                />
              </div>
              <div className="messenger-preview-card max">
                <div className="messenger-preview-card-head">
                  <span className="messenger-preview-badge max">MAX</span>
                  {analysis.maxOk ? (
                    <span className="messenger-preview-status ok">OK</span>
                  ) : (
                    <span className="messenger-preview-status warn">!</span>
                  )}
                </div>
                <div
                  className="messenger-preview-bubble max-bubble"
                  dangerouslySetInnerHTML={{ __html: previewHtml || "…" }}
                />
              </div>
            </div>
            {previewExtra}
          </div>
        )}
      </div>

      <div className="messenger-editor-footer">
        <div className="messenger-editor-stats">
          <span className={analysis.charCount > MESSENGER_TEXT_LIMIT ? "over-limit" : ""}>
            {analysis.charCount} / {MESSENGER_TEXT_LIMIT}
          </span>
          <span>{analysis.lineCount} строк</span>
          <span className="messenger-editor-hint">
            {parseMode === "HTML"
              ? "Общие теги: b, i, u, s, a, code, pre"
              : "Markdown для обеих платформ"}
          </span>
        </div>
        {analysis.issues.length > 0 && (
          <ul className="messenger-editor-issues">
            {analysis.issues.map((issue, index) => (
              <li key={`${issue.message}-${index}`} className={issue.level}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
