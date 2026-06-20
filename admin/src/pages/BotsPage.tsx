import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { formatDate } from "../lib/utils";

interface BotFormData {
  name: string;
  slug: string;
  description: string;
}

const EMPTY_FORM: BotFormData = {
  name: "",
  slug: "",
  description: "",
};

const DEFAULT_SETTINGS = {
  botTagline:
    "Maivy — умный поиск и трансформация B2B-продаж. Находите товары за секунды, а не часы.",
  privacyPolicyUrl: "https://example.com/privacy-policy",
  loomVideoUrl: "https://www.loom.com/share/example",
  grosterUrl: "https://groster.me/",
  contactUsername: "@daerit",
  contactUrl: "https://t.me/daerit",
  welcomeImagePath: "assets/welcome.jpg",
  welcomeVideoPath: "assets/welcome-video.mp4",
  shortDescription: "Умный поиск и трансформация B2B-продаж",
};

export function BotsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const createBot = useMutation(api.bots.create);
  const updateBot = useMutation(api.bots.update);
  const removeBot = useMutation(api.bots.remove);
  const toggleEnabled = useMutation(api.bots.toggleEnabled);
  const seedBot = useMutation(api.seed.seedDefaultBot);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"bots"> | null>(null);
  const [form, setForm] = useState<BotFormData>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const openEdit = (bot: NonNullable<typeof bots>[number]) => {
    setEditingId(bot._id);
    setForm({
      name: bot.name,
      slug: bot.slug,
      description: bot.description ?? "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    try {
      if (editingId) {
        await updateBot({
          token,
          botId: editingId,
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
        });
      } else {
        await createBot({
          token,
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
          platforms: ["telegram"],
          enabled: true,
          settings: DEFAULT_SETTINGS,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const handleSeed = async () => {
    if (!token) return;
    setSeeding(true);
    try {
      await seedBot({ token });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (botId: Id<"bots">, name: string) => {
    if (!token) return;
    if (!confirm(`Удалить бота «${name}» и все связанные данные?`)) return;
    await removeBot({ token, botId });
  };

  return (
    <div className="page">
      <PageHeader
        icon={NAV_ICONS.bots}
        title="Боты"
        description={
          <>
            Список ботов. Токены и .env-параметры — в разделе{" "}
            <Link to="/settings" style={{ color: "var(--accent-hover)" }}>
              Настройки
            </Link>
          </>
        }
        actions={
          <div className="btn-group">
            <button type="button" className="btn" onClick={() => void handleSeed()} disabled={seeding}>
              {seeding ? "Создание..." : "Создать Maivy по умолчанию"}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Новый бот
            </button>
          </div>
        }
      />

      {!bots ? (
        <div className="loading">Загрузка...</div>
      ) : bots.length === 0 ? (
        <div className="card empty-state">
          <h3>Нет ботов</h3>
          <p>Создайте бота по умолчанию или добавьте новый, затем настройте его в разделе «Настройки»</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Slug (BOT_SLUG)</th>
                <th>Платформы</th>
                <th>Статус</th>
                <th>Обновлён</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot) => (
                <tr key={bot._id}>
                  <td><strong>{bot.name}</strong></td>
                  <td><code>{bot.slug}</code></td>
                  <td>{bot.platforms.join(", ") || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className={`toggle${bot.enabled ? " on" : ""}`}
                      onClick={() => void toggleEnabled({ token: token!, botId: bot._id })}
                      title={bot.enabled ? "Выключить" : "Включить"}
                    />
                  </td>
                  <td>{formatDate(bot.updatedAt)}</td>
                  <td>
                    <div className="btn-group">
                      <Link to="/settings" className="btn btn-sm">Настройки</Link>
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(bot)}>
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => void handleDelete(bot._id, bot.name)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Редактировать бота" : "Новый бот"}</h3>
              <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="modal-body">
                {error && <div className="error-msg">{error}</div>}
                <div className="form-group">
                  <label>Название</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Slug (значение BOT_SLUG в .env сервера)</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                    pattern="[a-z0-9_-]+"
                    placeholder="maivy"
                  />
                </div>
                <div className="form-group">
                  <label>Описание</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                {!editingId && (
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    После создания перейдите в «Настройки» для указания токенов, ссылок и медиа.
                  </p>
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
  );
}
