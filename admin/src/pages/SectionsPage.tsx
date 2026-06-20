import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { SECTION_TYPE_LABELS } from "../lib/utils";

type SectionType = "welcome" | "about_step" | "section" | "system";

interface SectionForm {
  slug: string;
  title: string;
  body: string;
  order: number;
  sectionType: SectionType;
  isPublished: boolean;
  parseMode: "HTML" | "Markdown";
}

const EMPTY: SectionForm = {
  slug: "",
  title: "",
  body: "",
  order: 0,
  sectionType: "section",
  isPublished: true,
  parseMode: "HTML",
};

export function SectionsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const sections = useQuery(
    api.sections.listByBot,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const createSection = useMutation(api.sections.create);
  const updateSection = useMutation(api.sections.update);
  const removeSection = useMutation(api.sections.remove);
  const togglePublished = useMutation(api.sections.togglePublished);
  const duplicateSection = useMutation(api.sections.duplicate);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"sections"> | null>(null);
  const [form, setForm] = useState<SectionForm>(EMPTY);
  const [previewId, setPreviewId] = useState<Id<"sections"> | null>(null);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY,
      order: (sections?.length ?? 0) + 1,
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (section: NonNullable<typeof sections>[number]) => {
    setEditingId(section._id);
    setForm({
      slug: section.slug,
      title: section.title ?? "",
      body: section.body,
      order: section.order,
      sectionType: section.sectionType,
      isPublished: section.isPublished,
      parseMode: section.parseMode,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !activeBotId) return;
    setError("");

    try {
      if (editingId) {
        await updateSection({
          token,
          sectionId: editingId,
          slug: form.slug,
          title: form.title || undefined,
          body: form.body,
          order: form.order,
          sectionType: form.sectionType,
          isPublished: form.isPublished,
          parseMode: form.parseMode,
        });
      } else {
        await createSection({
          token,
          botId: activeBotId,
          slug: form.slug,
          title: form.title || undefined,
          body: form.body,
          order: form.order,
          sectionType: form.sectionType,
          isPublished: form.isPublished,
          parseMode: form.parseMode,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const previewSection = sections?.find((s) => s._id === previewId);

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <PageHeader
          icon={NAV_ICONS.sections}
          title="Разделы"
          description='Тексты разделов бота: приветствие, «О Maivy», демо и др.'
          actions={
            <button type="button" className="btn btn-primary" onClick={openCreate} disabled={!activeBotId}>
              + Новый раздел
            </button>
          }
        />

        <BotSelector />

        <div className="grid-2">
          <div>
            {!sections ? (
              <div className="loading">Загрузка...</div>
            ) : sections.length === 0 ? (
              <div className="card empty-state">
                <h3>Нет разделов</h3>
                <p>Создайте бота по умолчанию на странице «Боты»</p>
              </div>
            ) : (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Slug</th>
                      <th>Заголовок</th>
                      <th>Тип</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <tr
                        key={section._id}
                        onClick={() => setPreviewId(section._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{section.order}</td>
                        <td><code>{section.slug}</code></td>
                        <td>{section.title ?? "—"}</td>
                        <td>
                          <span className="badge">
                            {SECTION_TYPE_LABELS[section.sectionType] ?? section.sectionType}
                          </span>
                        </td>
                        <td>
                          {section.isPublished ? (
                            <span className="badge badge-success">Опубликован</span>
                          ) : (
                            <span className="badge badge-warning">Черновик</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="btn-group">
                            <button type="button" className="btn btn-sm" onClick={() => openEdit(section)}>
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() =>
                                void togglePublished({ token: token!, sectionId: section._id })
                              }
                            >
                              {section.isPublished ? "Снять" : "Опубл."}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => void duplicateSection({ token: token!, sectionId: section._id })}
                            >
                              Копия
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (confirm("Удалить раздел?")) {
                                  void removeSection({ token: token!, sectionId: section._id });
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: "1rem" }}>Предпросмотр</h3>
            {!previewSection ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Выберите раздел для предпросмотра
              </p>
            ) : (
              <>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  {previewSection.slug} · {previewSection.parseMode}
                </p>
                <div
                  style={{
                    background: "var(--bg)",
                    padding: 16,
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    lineHeight: 1.6,
                  }}
                  dangerouslySetInnerHTML={{ __html: previewSection.body }}
                />
              </>
            )}
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h3>{editingId ? "Редактировать раздел" : "Новый раздел"}</h3>
                <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="modal-body">
                  {error && <div className="error-msg">{error}</div>}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Slug (уникальный ключ)</label>
                      <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required pattern="[a-z0-9_]+" />
                    </div>
                    <div className="form-group">
                      <label>Порядок</label>
                      <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Заголовок</label>
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Тип</label>
                      <select value={form.sectionType} onChange={(e) => setForm({ ...form, sectionType: e.target.value as SectionType })}>
                        <option value="welcome">Приветствие</option>
                        <option value="about_step">Шаг «О Maivy»</option>
                        <option value="section">Раздел</option>
                        <option value="system">Системный</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Текст (HTML)</label>
                    <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={12} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Формат</label>
                      <select value={form.parseMode} onChange={(e) => setForm({ ...form, parseMode: e.target.value as "HTML" | "Markdown" })}>
                        <option value="HTML">HTML</option>
                        <option value="Markdown">Markdown</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Опубликован</label>
                      <select value={form.isPublished ? "yes" : "no"} onChange={(e) => setForm({ ...form, isPublished: e.target.value === "yes" })}>
                        <option value="yes">Да</option>
                        <option value="no">Нет (черновик)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Отмена</button>
                  <button type="submit" className="btn btn-primary">Сохранить</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BotProvider>
  );
}
