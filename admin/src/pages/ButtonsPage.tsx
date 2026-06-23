import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { CALLBACK_LABELS, KEYBOARD_LABELS, normalizeUrl } from "../lib/utils";

type ButtonType = "callback" | "url";
type UrlSource = "loomVideoUrl" | "grosterUrl" | "aiConsultantUrl" | "aiCatalogUrl" | "contactUrl" | "";

interface ButtonForm {
  keyboardId: string;
  row: number;
  col: number;
  text: string;
  buttonType: ButtonType;
  action: string;
  url: string;
  urlSource: UrlSource;
  order: number;
  isEnabled: boolean;
}

const EMPTY: ButtonForm = {
  keyboardId: "main_menu",
  row: 0,
  col: 0,
  text: "",
  buttonType: "callback",
  action: "",
  url: "",
  urlSource: "",
  order: 0,
  isEnabled: true,
};

const KEYBOARD_OPTIONS = [
  "main_menu",
  "about_step",
  "back_menu",
  "demo",
  "try",
  "impl",
];

const CALLBACK_OPTIONS = [
  "about_more",
  "about_next",
  "demo",
  "try",
  "impl",
  "menu",
];

export function ButtonsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const [filterKeyboard, setFilterKeyboard] = useState<string>("");

  const buttons = useQuery(
    api.buttons.listByBot,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const createButton = useMutation(api.buttons.create);
  const updateButton = useMutation(api.buttons.update);
  const removeButton = useMutation(api.buttons.remove);
  const toggleEnabled = useMutation(api.buttons.toggleEnabled);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"keyboardButtons"> | null>(null);
  const [form, setForm] = useState<ButtonForm>(EMPTY);
  const [error, setError] = useState("");

  const filtered = filterKeyboard
    ? buttons?.filter((b) => b.keyboardId === filterKeyboard)
    : buttons;

  const grouped = filtered?.reduce<Record<string, typeof filtered>>((acc, btn) => {
    if (!acc[btn.keyboardId]) acc[btn.keyboardId] = [];
    acc[btn.keyboardId].push(btn);
    return acc;
  }, {});

  const openCreate = (keyboardId?: string) => {
    setEditingId(null);
    setForm({
      ...EMPTY,
      keyboardId: keyboardId ?? "main_menu",
      order: buttons?.filter((b) => b.keyboardId === (keyboardId ?? "main_menu")).length ?? 0,
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (btn: NonNullable<typeof buttons>[number]) => {
    setEditingId(btn._id);
    setForm({
      keyboardId: btn.keyboardId,
      row: btn.row,
      col: btn.col,
      text: btn.text,
      buttonType: btn.buttonType,
      action: btn.action ?? "",
      url: btn.url ?? "",
      urlSource: (btn.urlSource ?? "") as UrlSource,
      order: btn.order,
      isEnabled: btn.isEnabled,
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
        await updateButton({
          token,
          buttonId: editingId,
          keyboardId: form.keyboardId,
          row: form.row,
          col: form.col,
          text: form.text,
          buttonType: form.buttonType,
          action: form.action || undefined,
          url: form.url ? normalizeUrl(form.url) : undefined,
          urlSource: form.urlSource || undefined,
          order: form.order,
          isEnabled: form.isEnabled,
        });
      } else {
        await createButton({
          token,
          botId: activeBotId,
          keyboardId: form.keyboardId,
          row: form.row,
          col: form.col,
          text: form.text,
          buttonType: form.buttonType,
          action: form.action || undefined,
          url: form.url ? normalizeUrl(form.url) : undefined,
          urlSource: form.urlSource || undefined,
          order: form.order,
          isEnabled: form.isEnabled,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <PageHeader
          icon={NAV_ICONS.buttons}
          title="Инлайн-кнопки"
          description="Управление клавиатурами и кнопками бота"
          actions={
            <button type="button" className="btn btn-primary" onClick={() => openCreate()} disabled={!activeBotId}>
              + Новая кнопка
            </button>
          }
        />

        <BotSelector />

        <div className="tabs">
          <button
            type="button"
            className={`tab${!filterKeyboard ? " active" : ""}`}
            onClick={() => setFilterKeyboard("")}
          >
            Все
          </button>
          {KEYBOARD_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tab${filterKeyboard === id ? " active" : ""}`}
              onClick={() => setFilterKeyboard(id)}
            >
              {KEYBOARD_LABELS[id] ?? id}
            </button>
          ))}
        </div>

        {!buttons ? (
          <div className="loading">Загрузка...</div>
        ) : !grouped || Object.keys(grouped).length === 0 ? (
          <div className="card empty-state">
            <h3>Нет кнопок</h3>
            <p>Создайте бота по умолчанию на странице «Боты»</p>
          </div>
        ) : (
          Object.entries(grouped).map(([keyboardId, kbButtons]) => (
            <div key={keyboardId} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: "1rem" }}>
                  {KEYBOARD_LABELS[keyboardId] ?? keyboardId}
                  <code style={{ marginLeft: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {keyboardId}
                  </code>
                </h3>
                <button type="button" className="btn btn-sm" onClick={() => openCreate(keyboardId)}>
                  + Добавить
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Строка</th>
                      <th>Кол.</th>
                      <th>Текст</th>
                      <th>Тип</th>
                      <th>Действие / URL</th>
                      <th>Статус</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kbButtons.map((btn) => (
                      <tr key={btn._id}>
                        <td>{btn.row}</td>
                        <td>{btn.col}</td>
                        <td><strong>{btn.text}</strong></td>
                        <td><span className="badge">{btn.buttonType}</span></td>
                        <td>
                          {btn.buttonType === "callback" ? (
                            <code>{CALLBACK_LABELS[btn.action ?? ""] ?? btn.action}</code>
                          ) : (
                            <span style={{ fontSize: "0.8125rem" }}>
                              {btn.urlSource ?? btn.url ?? "—"}
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`toggle${btn.isEnabled ? " on" : ""}`}
                            onClick={() => void toggleEnabled({ token: token!, buttonId: btn._id })}
                          />
                        </td>
                        <td>
                          <div className="btn-group">
                            <button type="button" className="btn btn-sm" onClick={() => openEdit(btn)}>
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (confirm("Удалить кнопку?")) {
                                  void removeButton({ token: token!, buttonId: btn._id });
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
            </div>
          ))
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingId ? "Редактировать кнопку" : "Новая кнопка"}</h3>
                <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="modal-body">
                  {error && <div className="error-msg">{error}</div>}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Клавиатура</label>
                      <select value={form.keyboardId} onChange={(e) => setForm({ ...form, keyboardId: e.target.value })}>
                        {KEYBOARD_OPTIONS.map((id) => (
                          <option key={id} value={id}>{KEYBOARD_LABELS[id] ?? id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Тип кнопки</label>
                      <select value={form.buttonType} onChange={(e) => setForm({ ...form, buttonType: e.target.value as ButtonType })}>
                        <option value="callback">Callback (действие)</option>
                        <option value="url">URL (ссылка)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Текст кнопки</label>
                    <input value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Строка</label>
                      <input type="number" min={0} value={form.row} onChange={(e) => setForm({ ...form, row: Number(e.target.value) })} />
                    </div>
                    <div className="form-group">
                      <label>Колонка</label>
                      <input type="number" min={0} value={form.col} onChange={(e) => setForm({ ...form, col: Number(e.target.value) })} />
                    </div>
                  </div>
                  {form.buttonType === "callback" ? (
                    <div className="form-group">
                      <label>Callback action</label>
                      <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
                        <option value="">— выберите —</option>
                        {CALLBACK_OPTIONS.map((a) => (
                          <option key={a} value={a}>{CALLBACK_LABELS[a] ?? a} ({a})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>URL (прямая ссылка)</label>
                        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                      </div>
                      <div className="form-group">
                        <label>Или источник URL из настроек бота</label>
                        <select value={form.urlSource} onChange={(e) => setForm({ ...form, urlSource: e.target.value as UrlSource })}>
                          <option value="">— не использовать —</option>
                          <option value="loomVideoUrl">Loom Video URL</option>
                          <option value="grosterUrl">Groster URL</option>
                          <option value="aiConsultantUrl">ИИ-консультант URL</option>
                          <option value="aiCatalogUrl">ИИ-каталог URL</option>
                          <option value="contactUrl">Contact URL</option>
                        </select>
                      </div>
                    </>
                  )}
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
