import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { MediaUpload, type MediaUploadKind } from "../components/MediaUpload";
import { MessengerTextEditor } from "../components/MessengerTextEditor";
import {
  buttonNeedsTargetLink,
  normalizeUrl,
  resolveTargetLabel,
  SECTION_MEDIA_LABELS,
  SECTION_TYPE_LABELS,
  SPECIAL_ACTIONS,
} from "../lib/utils";

type SectionType = "welcome" | "about_step" | "section" | "system";
type SectionMediaType = "none" | "image" | "video" | "video_note";
type ButtonType = "callback" | "url";
type UrlSource = "loomVideoUrl" | "grosterUrl" | "aiConsultantUrl" | "aiCatalogUrl" | "contactUrl" | "";

interface SectionForm {
  slug: string;
  title: string;
  body: string;
  order: number;
  sectionType: SectionType;
  keyboardId: string;
  mediaType: SectionMediaType;
  mediaPath: string;
  isPublished: boolean;
  parseMode: "HTML" | "Markdown";
}

interface ButtonForm {
  text: string;
  buttonType: ButtonType;
  row: number;
  col: number;
  transition: string;
  url: string;
  urlSource: UrlSource;
  isEnabled: boolean;
}

const EMPTY_SECTION: SectionForm = {
  slug: "",
  title: "",
  body: "",
  order: 0,
  sectionType: "section",
  keyboardId: "",
  mediaType: "none",
  mediaPath: "",
  isPublished: true,
  parseMode: "HTML",
};

const EMPTY_BUTTON: ButtonForm = {
  text: "",
  buttonType: "callback",
  row: 0,
  col: 0,
  transition: "",
  url: "",
  urlSource: "",
  isEnabled: true,
};

function sectionMediaUploadKind(mediaType: SectionMediaType): MediaUploadKind {
  if (mediaType === "image") return "image";
  if (mediaType === "video") return "video";
  return "video_note";
}

function sectionToForm(section: {
  slug: string;
  title?: string;
  body: string;
  order: number;
  sectionType: SectionType;
  keyboardId?: string;
  mediaType?: SectionMediaType;
  mediaPath?: string;
  isPublished: boolean;
  parseMode: "HTML" | "Markdown";
}): SectionForm {
  return {
    slug: section.slug,
    title: section.title ?? "",
    body: section.body,
    order: section.order,
    sectionType: section.sectionType,
    keyboardId: section.keyboardId ?? "",
    mediaType: section.mediaType ?? "none",
    mediaPath: section.mediaPath ?? "",
    isPublished: section.isPublished,
    parseMode: section.parseMode,
  };
}

function buttonTransitionValue(button: {
  buttonType: ButtonType;
  action?: string;
  targetSectionId?: Id<"sections">;
}): string {
  if (button.buttonType === "url") return "url";
  if (button.targetSectionId) return `section:${button.targetSectionId}`;
  return button.action ?? "";
}

export function ConstructorPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const flow = useQuery(
    api.constructor.getFlow,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const createSection = useMutation(api.sections.create);
  const updateSection = useMutation(api.sections.update);
  const removeSection = useMutation(api.sections.remove);
  const togglePublished = useMutation(api.sections.togglePublished);
  const createButton = useMutation(api.buttons.create);
  const updateButton = useMutation(api.buttons.update);
  const removeButton = useMutation(api.buttons.remove);
  const toggleEnabled = useMutation(api.buttons.toggleEnabled);
  const linkButtonTargets = useMutation(api.constructor.linkButtonTargets);

  const [selectedSectionId, setSelectedSectionId] = useState<Id<"sections"> | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(EMPTY_SECTION);
  const [sectionDirty, setSectionDirty] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  const [editingButtonId, setEditingButtonId] = useState<Id<"keyboardButtons"> | null>(null);
  const [buttonForm, setButtonForm] = useState<ButtonForm>(EMPTY_BUTTON);
  const [showButtonModal, setShowButtonModal] = useState(false);

  const [error, setError] = useState("");
  const [linkMessage, setLinkMessage] = useState("");

  const menuSectionId = useMemo(
    () => flow?.sections.find((section) => section.slug === "menu")?._id ?? null,
    [flow?.sections],
  );

  const selectedSection = flow?.sections.find((s) => s._id === selectedSectionId);

  useEffect(() => {
    if (!flow) return;
    if (selectedSectionId && flow.sections.some((s) => s._id === selectedSectionId)) {
      return;
    }
    setSelectedSectionId(flow.entrySectionId ?? flow.sections[0]?._id ?? null);
  }, [flow, selectedSectionId]);

  useEffect(() => {
    if (!selectedSection) return;
    setSectionForm(sectionToForm(selectedSection));
    setSectionDirty(false);
  }, [selectedSection?._id]);

  const sectionOptions = useMemo(
    () =>
      flow?.sections.map((section) => ({
        id: section._id,
        label: section.title ?? section.slug,
        slug: section.slug,
      })) ?? [],
    [flow?.sections],
  );

  const openCreateSection = () => {
    setSectionForm({
      ...EMPTY_SECTION,
      order: (flow?.sections.length ?? 0) + 1,
    });
    setError("");
    setShowSectionModal(true);
  };

  const saveSection = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!token || !selectedSection) return;
    setError("");

    try {
      await updateSection({
        token,
        sectionId: selectedSection._id,
        slug: sectionForm.slug,
        title: sectionForm.title || undefined,
        body: sectionForm.body,
        order: sectionForm.order,
        sectionType: sectionForm.sectionType,
        keyboardId: sectionForm.keyboardId || undefined,
        mediaType: sectionForm.mediaType,
        mediaPath: sectionForm.mediaPath.trim() || undefined,
        isPublished: sectionForm.isPublished,
        parseMode: sectionForm.parseMode,
      });
      setSectionDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const submitNewSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !activeBotId) return;
    setError("");

    try {
      const sectionId = await createSection({
        token,
        botId: activeBotId,
        slug: sectionForm.slug,
        title: sectionForm.title || undefined,
        body: sectionForm.body,
        order: sectionForm.order,
        sectionType: sectionForm.sectionType,
        keyboardId: sectionForm.keyboardId || undefined,
        mediaType: sectionForm.mediaType,
        mediaPath: sectionForm.mediaPath.trim() || undefined,
        isPublished: sectionForm.isPublished,
        parseMode: sectionForm.parseMode,
      });
      setShowSectionModal(false);
      setSelectedSectionId(sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    }
  };

  const parseTransition = (transition: string) => {
    if (transition === "url") {
      return { action: undefined, targetSectionId: undefined };
    }
    if (transition.startsWith("section:")) {
      return {
        action: undefined,
        targetSectionId: transition.slice(8) as Id<"sections">,
      };
    }
    return { action: transition, targetSectionId: undefined };
  };

  const openCreateButton = () => {
    if (!selectedSection) return;
    const nextRow =
      selectedSection.buttons.reduce((max, btn) => Math.max(max, btn.row), -1) + 1;
    setEditingButtonId(null);
    setButtonForm({
      ...EMPTY_BUTTON,
      row: nextRow,
      col: 0,
    });
    setError("");
    setShowButtonModal(true);
  };

  const openEditButton = (button: NonNullable<typeof selectedSection>["buttons"][number]) => {
    setEditingButtonId(button._id);
    setButtonForm({
      text: button.text,
      buttonType: button.buttonType,
      row: button.row,
      col: button.col,
      transition: buttonTransitionValue(button),
      url: button.url ?? "",
      urlSource: (button.urlSource ?? "") as UrlSource,
      isEnabled: button.isEnabled,
    });
    setError("");
    setShowButtonModal(true);
  };

  const saveButton = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !activeBotId || !selectedSection) return;
    setError("");

    const { action, targetSectionId } = parseTransition(buttonForm.transition);
    const keyboardId = selectedSection.resolvedKeyboardId;

    try {
      if (editingButtonId) {
        await updateButton({
          token,
          buttonId: editingButtonId,
          text: buttonForm.text,
          buttonType: buttonForm.buttonType,
          row: buttonForm.row,
          col: buttonForm.col,
          action: buttonForm.buttonType === "callback" ? action : undefined,
          targetSectionId:
            buttonForm.buttonType === "callback" ? targetSectionId : undefined,
          url: buttonForm.url ? normalizeUrl(buttonForm.url) : undefined,
          urlSource: buttonForm.urlSource || undefined,
          isEnabled: buttonForm.isEnabled,
        });
      } else {
        await createButton({
          token,
          botId: activeBotId,
          keyboardId,
          row: buttonForm.row,
          col: buttonForm.col,
          text: buttonForm.text,
          buttonType: buttonForm.buttonType,
          action: buttonForm.buttonType === "callback" ? action : undefined,
          targetSectionId:
            buttonForm.buttonType === "callback" ? targetSectionId : undefined,
          url: buttonForm.url ? normalizeUrl(buttonForm.url) : undefined,
          urlSource: buttonForm.urlSource || undefined,
          order: selectedSection.buttons.length,
          isEnabled: buttonForm.isEnabled,
        });
      }
      setShowButtonModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения кнопки");
    }
  };

  const needsLinking = useMemo(() => {
    if (!flow) return false;
    return flow.sections.some((section) =>
      section.buttons.some((button) => buttonNeedsTargetLink(button)),
    );
  }, [flow]);

  const linkAllButtonTargets = async () => {
    if (!token || !activeBotId) return;
    setLinkMessage("");
    setError("");
    try {
      const updated = await linkButtonTargets({ token, botId: activeBotId });
      setLinkMessage(
        updated > 0
          ? `Связано переходов: ${updated}. Изменения появятся в боте в течение минуты.`
          : "Все переходы уже связаны с экранами.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось связать переходы");
    }
  };

  const keyboardPreview = useMemo(() => {
    if (!selectedSection) return [];
    const rows = new Map<number, typeof selectedSection.buttons>();
    for (const button of selectedSection.buttons.filter((b) => b.isEnabled)) {
      const list = rows.get(button.row) ?? [];
      list.push(button);
      rows.set(button.row, list);
    }
    return [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([row, buttons]) => ({
        row,
        buttons: buttons.sort((a, b) => a.col - b.col),
      }));
  }, [selectedSection]);

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page constructor-page">
        <PageHeader
          icon={NAV_ICONS.constructor}
          title="Конструктор сценария"
          description="Собирайте сценарий бота: тексты экранов, кнопки и переходы между ними"
          actions={
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateSection}
              disabled={!activeBotId}
            >
              + Новый экран
            </button>
          }
        />

        <BotSelector />

        <div className="card constructor-help" style={{ marginBottom: 16, padding: "12px 16px" }}>
          <h4 style={{ marginBottom: 8 }}>Как работает сценарий</h4>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            <li>
              <strong>Старт</strong> — экран «Приветствие» (текст и видео после /start).
            </li>
            <li>
              <strong>Главное меню</strong> — 4 кнопки под приветствием; редактируются на экране «Главное меню» или «Приветствие».
            </li>
            <li>
              Для каждой кнопки в блоке «Кнопки и переходы» выберите <strong>куда ведёт нажатие</strong> → целевой экран.
            </li>
            <li>
              <strong>Медиа</strong> — фото, видео или кружок отправляются отдельным сообщением после текста.
            </li>
            <li>
              Нажмите <strong>Опубликовать</strong>, чтобы экран был виден в боте.
            </li>
          </ol>
          {menuSectionId && (
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setSelectedSectionId(menuSectionId)}
            >
              Перейти к главному меню
            </button>
          )}
        </div>

        {needsLinking && (
          <div className="card constructor-link-banner-wrap" style={{ marginBottom: 16, padding: "12px 16px" }}>
            <div className="constructor-link-banner">
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                У части кнопок переходы ещё не привязаны к экранам — в боте они могут не работать или вести не туда.
                Нажмите «Связать переходы», затем при необходимости отредактируйте кнопки вручную.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void linkAllButtonTargets()}
              >
                Связать переходы
              </button>
            </div>
          </div>
        )}

        {linkMessage && (
          <div className="card" style={{ marginBottom: 16, padding: "12px 16px", color: "var(--success)" }}>
            {linkMessage}
          </div>
        )}

        {!flow ? (
          <div className="loading">Загрузка сценария...</div>
        ) : flow.sections.length === 0 ? (
          <div className="card empty-state">
            <h3>Сценарий пуст</h3>
            <p>Создайте бота по умолчанию на странице «Боты» или добавьте первый экран</p>
          </div>
        ) : (
          <div className="constructor-layout">
            <aside className="constructor-flow card">
              <div className="constructor-flow-header">
                <h3>Карта сценария</h3>
                <span className="badge badge-info">{flow.sections.length} экранов</span>
              </div>
              <div className="constructor-flow-list">
                {flow.sections.map((section) => {
                  const isActive = section._id === selectedSectionId;
                  const isEntry = section._id === flow.entrySectionId;
                  return (
                    <button
                      key={section._id}
                      type="button"
                      className={`flow-node${isActive ? " active" : ""}${!section.isPublished ? " draft" : ""}`}
                      onClick={() => setSelectedSectionId(section._id)}
                    >
                      <div className="flow-node-top">
                        <span className="flow-node-title">
                          {section.title ?? section.slug}
                        </span>
                        {isEntry && <span className="badge badge-success">Старт</span>}
                      </div>
                      <div className="flow-node-meta">
                        <code>{section.slug}</code>
                        <span>{SECTION_TYPE_LABELS[section.sectionType]}</span>
                        {section.mediaType && section.mediaType !== "none" && (
                          <span className="badge badge-info">
                            {SECTION_MEDIA_LABELS[section.mediaType]}
                          </span>
                        )}
                      </div>
                      {section.buttons.length > 0 && (
                        <div className="flow-node-transitions">
                          {section.buttons
                            .filter((b) => b.isEnabled && b.buttonType === "callback")
                            .slice(0, 3)
                            .map((button) => (
                              <span key={button._id} className="flow-transition-chip">
                                {button.text} → {resolveTargetLabel(button, sectionOptions)}
                              </span>
                            ))}
                        </div>
                      )}
                      {section.incomingFrom.length > 0 && (
                        <div className="flow-node-incoming">
                          ← {section.incomingFrom.length} переход(ов)
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="constructor-editor">
              {selectedSection ? (
                <>
                  <div className="constructor-editor-header card">
                    <div>
                      <h3>{selectedSection.title ?? selectedSection.slug}</h3>
                      <p>
                        Клавиатура: <code>{selectedSection.resolvedKeyboardId}</code>
                        {selectedSection.resolvedKeyboardId === "main_menu" && (
                          <span style={{ display: "block", marginTop: 4, fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            Эти кнопки показываются после /start под приветственным сообщением.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() =>
                          void togglePublished({
                            token: token!,
                            sectionId: selectedSection._id,
                          })
                        }
                      >
                        {selectedSection.isPublished ? "Снять с публикации" : "Опубликовать"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm("Удалить экран?")) {
                            void removeSection({ token: token!, sectionId: selectedSection._id });
                          }
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  <form
                    className="card constructor-section-form"
                    onSubmit={(e) => void saveSection(e)}
                  >
                    {error && !showButtonModal && !showSectionModal && (
                      <div className="error-msg">{error}</div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Slug</label>
                        <input
                          value={sectionForm.slug}
                          onChange={(e) => {
                            setSectionForm({ ...sectionForm, slug: e.target.value });
                            setSectionDirty(true);
                          }}
                          required
                          pattern="[a-z0-9_]+"
                        />
                      </div>
                      <div className="form-group">
                        <label>Заголовок</label>
                        <input
                          value={sectionForm.title}
                          onChange={(e) => {
                            setSectionForm({ ...sectionForm, title: e.target.value });
                            setSectionDirty(true);
                          }}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Тип экрана</label>
                        <select
                          value={sectionForm.sectionType}
                          onChange={(e) => {
                            setSectionForm({
                              ...sectionForm,
                              sectionType: e.target.value as SectionType,
                            });
                            setSectionDirty(true);
                          }}
                        >
                          <option value="welcome">Приветствие (старт)</option>
                          <option value="about_step">Шаг «О продукте»</option>
                          <option value="section">Обычный экран</option>
                          <option value="system">Системный</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>ID клавиатуры (необязательно)</label>
                        <input
                          value={sectionForm.keyboardId}
                          onChange={(e) => {
                            setSectionForm({ ...sectionForm, keyboardId: e.target.value });
                            setSectionDirty(true);
                          }}
                          placeholder={selectedSection.resolvedKeyboardId}
                        />
                      </div>
                    </div>
                    <MessengerTextEditor
                      value={sectionForm.body}
                      onChange={(body) => {
                        setSectionForm({ ...sectionForm, body });
                        setSectionDirty(true);
                      }}
                      parseMode={sectionForm.parseMode}
                      onParseModeChange={(parseMode) => {
                        setSectionForm({ ...sectionForm, parseMode });
                        setSectionDirty(true);
                      }}
                      required
                      previewExtra={
                        <>
                          {sectionForm.mediaType !== "none" && (
                            <div className="tg-preview-media">
                              {SECTION_MEDIA_LABELS[sectionForm.mediaType]}
                              {sectionForm.mediaPath ? `: ${sectionForm.mediaPath}` : ""}
                            </div>
                          )}
                          <div className="tg-preview-keyboard">
                            {keyboardPreview.map(({ row, buttons }) => (
                              <div key={row} className="tg-preview-row">
                                {buttons.map((button) => (
                                  <span key={button._id} className="tg-preview-btn">
                                    {button.text}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </>
                      }
                    />
                    <div className="form-row">
                      <div className="form-group">
                        <label>Медиа после текста</label>
                        <select
                          value={sectionForm.mediaType}
                          onChange={(e) => {
                            setSectionForm({
                              ...sectionForm,
                              mediaType: e.target.value as SectionMediaType,
                              mediaPath:
                                e.target.value === "none" ? "" : sectionForm.mediaPath,
                            });
                            setSectionDirty(true);
                          }}
                        >
                          {Object.entries(SECTION_MEDIA_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                          Текст и медиа отправляются отдельными сообщениями. Кнопки — под медиа
                          (или под текстом, если медиа нет).
                        </p>
                      </div>
                      {sectionForm.mediaType !== "none" && (
                        <MediaUpload
                          label="Медиафайл"
                          kind={sectionMediaUploadKind(sectionForm.mediaType)}
                          value={sectionForm.mediaPath}
                          onChange={(value) => {
                            setSectionForm({ ...sectionForm, mediaPath: value });
                            setSectionDirty(true);
                          }}
                          pathPlaceholder={
                            sectionForm.mediaType === "video_note"
                              ? "assets/welcome-video.mp4"
                              : sectionForm.mediaType === "image"
                                ? "assets/welcome.jpg"
                                : "assets/demo.mp4"
                          }
                        />
                      )}
                    </div>
                    {sectionDirty && (
                      <div className="constructor-save-bar">
                        <button type="submit" className="btn btn-primary">
                          Сохранить экран
                        </button>
                      </div>
                    )}
                  </form>

                  <div className="card constructor-buttons">
                    <div className="constructor-buttons-header">
                      <div>
                        <h3>Кнопки и переходы</h3>
                        <p>Укажите, куда ведёт нажатие каждой кнопки</p>
                      </div>
                      <button type="button" className="btn btn-sm btn-primary" onClick={openCreateButton}>
                        + Кнопка
                      </button>
                    </div>

                    {selectedSection.buttons.length === 0 ? (
                      <p className="constructor-empty-buttons">
                        Нет кнопок на этом экране. Добавьте кнопку и выберите целевой экран.
                      </p>
                    ) : (
                      <div className="constructor-button-list">
                        {selectedSection.buttons.map((button) => {
                          const targetLabel = resolveTargetLabel(button, sectionOptions);
                          const missingTarget =
                            button.buttonType === "callback" &&
                            !button.action &&
                            !button.targetSectionSlug &&
                            !button.targetSectionId;
                          return (
                          <div
                            key={button._id}
                            className={`constructor-button-item${button.isEnabled ? "" : " disabled"}${missingTarget ? " constructor-button-item-warning" : ""}`}
                          >
                            <div className="constructor-button-main">
                              <span className="constructor-button-label">{button.text}</span>
                              <span className="constructor-button-pos">
                                строка {button.row + 1}, кол. {button.col + 1}
                              </span>
                            </div>
                            <div className="constructor-button-target">
                              {button.buttonType === "url" ? (
                                <span className="badge">Ссылка</span>
                              ) : (
                                <>
                                  <span className="flow-arrow">→</span>
                                  <span className={missingTarget ? "constructor-target-missing" : undefined}>
                                    {targetLabel}
                                  </span>
                                  {missingTarget && (
                                    <span className="badge badge-warning">Задайте переход</span>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="btn-group">
                              <button
                                type="button"
                                className={`toggle${button.isEnabled ? " on" : ""}`}
                                onClick={() =>
                                  void toggleEnabled({ token: token!, buttonId: button._id })
                                }
                                title={button.isEnabled ? "Выключить" : "Включить"}
                              />
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => openEditButton(button)}
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  if (confirm("Удалить кнопку?")) {
                                    void removeButton({ token: token!, buttonId: button._id });
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="card empty-state">
                  <h3>Выберите экран</h3>
                  <p>Нажмите на экран в карте сценария слева</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showSectionModal && (
          <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Новый экран</h3>
                <button type="button" className="btn btn-sm" onClick={() => setShowSectionModal(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={(e) => void submitNewSection(e)}>
                <div className="modal-body">
                  {error && <div className="error-msg">{error}</div>}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Slug</label>
                      <input
                        value={sectionForm.slug}
                        onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })}
                        required
                        pattern="[a-z0-9_]+"
                      />
                    </div>
                    <div className="form-group">
                      <label>Заголовок</label>
                      <input
                        value={sectionForm.title}
                        onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Тип</label>
                    <select
                      value={sectionForm.sectionType}
                      onChange={(e) =>
                        setSectionForm({
                          ...sectionForm,
                          sectionType: e.target.value as SectionType,
                        })
                      }
                    >
                      <option value="section">Обычный экран</option>
                      <option value="welcome">Приветствие</option>
                      <option value="about_step">Шаг «О продукте»</option>
                      <option value="system">Системный</option>
                    </select>
                  </div>
                  <MessengerTextEditor
                    value={sectionForm.body}
                    onChange={(body) => setSectionForm({ ...sectionForm, body })}
                    parseMode={sectionForm.parseMode}
                    onParseModeChange={(parseMode) =>
                      setSectionForm({ ...sectionForm, parseMode })
                    }
                    label="Текст"
                    minRows={8}
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setShowSectionModal(false)}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showButtonModal && selectedSection && (
          <div className="modal-overlay" onClick={() => setShowButtonModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingButtonId ? "Редактировать кнопку" : "Новая кнопка"}</h3>
                <button type="button" className="btn btn-sm" onClick={() => setShowButtonModal(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={(e) => void saveButton(e)}>
                <div className="modal-body">
                  {error && <div className="error-msg">{error}</div>}
                  <div className="form-group">
                    <label>Текст на кнопке</label>
                    <input
                      value={buttonForm.text}
                      onChange={(e) => setButtonForm({ ...buttonForm, text: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Тип</label>
                      <select
                        value={buttonForm.buttonType}
                        onChange={(e) =>
                          setButtonForm({
                            ...buttonForm,
                            buttonType: e.target.value as ButtonType,
                            transition: e.target.value === "url" ? "url" : "",
                          })
                        }
                      >
                        <option value="callback">Переход (callback)</option>
                        <option value="url">Ссылка (URL)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Позиция: строка / колонка</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="number"
                          min={0}
                          value={buttonForm.row}
                          onChange={(e) =>
                            setButtonForm({ ...buttonForm, row: Number(e.target.value) })
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          value={buttonForm.col}
                          onChange={(e) =>
                            setButtonForm({ ...buttonForm, col: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {buttonForm.buttonType === "callback" ? (
                    <div className="form-group">
                      <label>Куда ведёт нажатие</label>
                      <select
                        value={buttonForm.transition}
                        onChange={(e) =>
                          setButtonForm({ ...buttonForm, transition: e.target.value })
                        }
                        required
                      >
                        <option value="">— выберите экран или действие —</option>
                        <optgroup label="Экраны сценария">
                          {sectionOptions.map((option) => (
                            <option key={option.id} value={`section:${option.id}`}>
                              {option.label} ({option.slug})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Специальные действия">
                          {SPECIAL_ACTIONS.map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>URL</label>
                        <input
                          value={buttonForm.url}
                          onChange={(e) => setButtonForm({ ...buttonForm, url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Или URL из настроек бота</label>
                        <select
                          value={buttonForm.urlSource}
                          onChange={(e) =>
                            setButtonForm({
                              ...buttonForm,
                              urlSource: e.target.value as UrlSource,
                            })
                          }
                        >
                          <option value="">— не использовать —</option>
                          <option value="loomVideoUrl">Loom Video</option>
                          <option value="grosterUrl">Groster</option>
                          <option value="aiConsultantUrl">ИИ-консультант</option>
                          <option value="aiCatalogUrl">ИИ-каталог</option>
                          <option value="contactUrl">Контакт</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setShowButtonModal(false)}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BotProvider>
  );
}
