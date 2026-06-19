import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { buildContactUrl, formatDate, normalizeUrl } from "../lib/utils";

type Tab = "platforms" | "content" | "media";

interface SettingsForm {
  platforms: Array<"telegram" | "max">;
  telegramToken: string;
  maxToken: string;
  enabled: boolean;
  botTagline: string;
  shortDescription: string;
  privacyPolicyUrl: string;
  loomVideoUrl: string;
  grosterUrl: string;
  contactUsername: string;
  welcomeImagePath: string;
  welcomeVideoPath: string;
  telegramVideoNoteFileId: string;
}

const ENV_FIELDS = [
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram Token", tab: "platforms" },
  { key: "MAX_BOT_TOKEN", label: "MAX Token", tab: "platforms" },
  { key: "ENABLED_PLATFORMS", label: "Платформы", tab: "platforms" },
  { key: "BOT_TAGLINE", label: "Tagline профиля", tab: "content" },
  { key: "BOT_SHORT_DESCRIPTION", label: "Краткое описание", tab: "content" },
  { key: "PRIVACY_POLICY_URL", label: "Privacy Policy URL", tab: "content" },
  { key: "LOOM_VIDEO_URL", label: "Loom Video URL", tab: "content" },
  { key: "GROSTER_URL", label: "Groster URL", tab: "content" },
  { key: "CONTACT_USERNAME", label: "Contact Username", tab: "content" },
  { key: "WELCOME_IMAGE_PATH", label: "Welcome Image", tab: "media" },
  { key: "WELCOME_VIDEO_PATH", label: "Welcome Video", tab: "media" },
  { key: "TELEGRAM_VIDEO_NOTE_FILE_ID", label: "TG Video file_id", tab: "media" },
] as const;

function botToForm(bot: {
  platforms: Array<"telegram" | "max">;
  telegramToken?: string;
  maxToken?: string;
  enabled: boolean;
  settings: {
    botTagline: string;
    shortDescription?: string;
    privacyPolicyUrl: string;
    loomVideoUrl: string;
    grosterUrl: string;
    contactUsername: string;
    welcomeImagePath?: string;
    welcomeVideoPath?: string;
    telegramVideoNoteFileId?: string;
  };
}): SettingsForm {
  return {
    platforms: bot.platforms,
    telegramToken: bot.telegramToken ?? "",
    maxToken: bot.maxToken ?? "",
    enabled: bot.enabled,
    botTagline: bot.settings.botTagline,
    shortDescription: bot.settings.shortDescription ?? "",
    privacyPolicyUrl: bot.settings.privacyPolicyUrl,
    loomVideoUrl: bot.settings.loomVideoUrl,
    grosterUrl: bot.settings.grosterUrl,
    contactUsername: bot.settings.contactUsername,
    welcomeImagePath: bot.settings.welcomeImagePath ?? "assets/welcome.jpg",
    welcomeVideoPath: bot.settings.welcomeVideoPath ?? "assets/welcome-video.mp4",
    telegramVideoNoteFileId: bot.settings.telegramVideoNoteFileId ?? "",
  };
}

export function SettingsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const bot = useQuery(
    api.bots.get,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const updateBot = useMutation(api.bots.update);
  const [tab, setTab] = useState<Tab>("platforms");
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bot) {
      setForm(botToForm(bot));
      setSaved(false);
    }
  }, [bot]);

  const togglePlatform = (platform: "telegram" | "max") => {
    if (!form) return;
    setForm({
      ...form,
      platforms: form.platforms.includes(platform)
        ? form.platforms.filter((p) => p !== platform)
        : [...form.platforms, platform],
    });
    setSaved(false);
  };

  const updateField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setSaved(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !activeBotId || !form) return;

    if (form.platforms.length === 0) {
      setError("Выберите хотя бы одну платформу");
      return;
    }

    setError("");
    setSaving(true);

    const contactUsername = form.contactUsername.startsWith("@")
      ? form.contactUsername
      : `@${form.contactUsername}`;
    const contactUrl = buildContactUrl(contactUsername);

    try {
      await updateBot({
        token,
        botId: activeBotId,
        platforms: form.platforms,
        telegramToken: form.telegramToken || undefined,
        maxToken: form.maxToken || undefined,
        enabled: form.enabled,
        settings: {
          botTagline: form.botTagline,
          shortDescription: form.shortDescription || undefined,
          privacyPolicyUrl: normalizeUrl(form.privacyPolicyUrl),
          loomVideoUrl: normalizeUrl(form.loomVideoUrl),
          grosterUrl: normalizeUrl(form.grosterUrl),
          contactUsername,
          contactUrl,
          welcomeImagePath: form.welcomeImagePath || undefined,
          welcomeVideoPath: form.welcomeVideoPath || undefined,
          telegramVideoNoteFileId: form.telegramVideoNoteFileId || undefined,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const tabFields = ENV_FIELDS.filter((f) => f.tab === tab);

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <div className="page-header">
          <div>
            <h2>Настройки</h2>
            <p>Все параметры бота — вместо .env файла</p>
          </div>
          {saved && (
            <span className="badge badge-success" style={{ fontSize: "0.875rem", padding: "6px 12px" }}>
              ✓ Сохранено
            </span>
          )}
        </div>

        <BotSelector />

        <div className="card" style={{ marginBottom: 20, background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.3)" }}>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
            <strong>В .env на сервере</strong> остаются только 3 переменные для подключения к Convex:
            <code style={{ margin: "0 4px" }}>CONVEX_URL</code>,
            <code style={{ margin: "0 4px" }}>BOT_API_SECRET</code>,
            <code style={{ margin: "0 4px" }}>BOT_SLUG</code>.
            Все остальные настройки — здесь. Бот подхватывает изменения автоматически (~60 сек).
            Изменение токенов и платформ требует перезапуска процесса бота.
          </p>
        </div>

        {!bot || !form ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="tabs">
              <button
                type="button"
                className={`tab${tab === "platforms" ? " active" : ""}`}
                onClick={() => setTab("platforms")}
              >
                Платформы и токены
              </button>
              <button
                type="button"
                className={`tab${tab === "content" ? " active" : ""}`}
                onClick={() => setTab("content")}
              >
                Контент и ссылки
              </button>
              <button
                type="button"
                className={`tab${tab === "media" ? " active" : ""}`}
                onClick={() => setTab("media")}
              >
                Медиа
              </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="card">
              {tab === "platforms" && (
                <>
                  <div className="form-group">
                    <label>Статус бота</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        type="button"
                        className={`toggle${form.enabled ? " on" : ""}`}
                        onClick={() => updateField("enabled", !form.enabled)}
                      />
                      <span>{form.enabled ? "Включён" : "Выключен"}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Платформы (ENABLED_PLATFORMS)</label>
                    <div className="btn-group">
                      <button
                        type="button"
                        className={`btn${form.platforms.includes("telegram") ? " btn-primary" : ""}`}
                        onClick={() => togglePlatform("telegram")}
                      >
                        Telegram
                      </button>
                      <button
                        type="button"
                        className={`btn${form.platforms.includes("max") ? " btn-primary" : ""}`}
                        onClick={() => togglePlatform("max")}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="telegramToken">TELEGRAM_BOT_TOKEN</label>
                    <input
                      id="telegramToken"
                      type="password"
                      value={form.telegramToken}
                      onChange={(e) => updateField("telegramToken", e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxToken">MAX_BOT_TOKEN</label>
                    <input
                      id="maxToken"
                      type="password"
                      value={form.maxToken}
                      onChange={(e) => updateField("maxToken", e.target.value)}
                      placeholder="Токен из business.max.ru"
                      autoComplete="off"
                    />
                  </div>
                </>
              )}

              {tab === "content" && (
                <>
                  <div className="form-group">
                    <label htmlFor="botTagline">BOT_TAGLINE</label>
                    <textarea
                      id="botTagline"
                      value={form.botTagline}
                      onChange={(e) => updateField("botTagline", e.target.value)}
                      rows={3}
                      placeholder="Описание для профиля бота до нажатия «Начать»"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="shortDescription">BOT_SHORT_DESCRIPTION</label>
                    <input
                      id="shortDescription"
                      value={form.shortDescription}
                      onChange={(e) => updateField("shortDescription", e.target.value)}
                      placeholder="Краткое описание профиля"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="privacyPolicyUrl">PRIVACY_POLICY_URL</label>
                    <input
                      id="privacyPolicyUrl"
                      type="url"
                      value={form.privacyPolicyUrl}
                      onChange={(e) => updateField("privacyPolicyUrl", e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="loomVideoUrl">LOOM_VIDEO_URL</label>
                      <input
                        id="loomVideoUrl"
                        type="url"
                        value={form.loomVideoUrl}
                        onChange={(e) => updateField("loomVideoUrl", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="grosterUrl">GROSTER_URL</label>
                      <input
                        id="grosterUrl"
                        type="url"
                        value={form.grosterUrl}
                        onChange={(e) => updateField("grosterUrl", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactUsername">CONTACT_USERNAME</label>
                    <input
                      id="contactUsername"
                      value={form.contactUsername}
                      onChange={(e) => updateField("contactUsername", e.target.value)}
                      placeholder="@daerit"
                    />
                  </div>
                </>
              )}

              {tab === "media" && (
                <>
                  <div className="form-group">
                    <label htmlFor="welcomeImagePath">WELCOME_IMAGE_PATH</label>
                    <input
                      id="welcomeImagePath"
                      value={form.welcomeImagePath}
                      onChange={(e) => updateField("welcomeImagePath", e.target.value)}
                      placeholder="assets/welcome.jpg"
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Путь относительно корня проекта на сервере, где запущен бот
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="welcomeVideoPath">WELCOME_VIDEO_PATH</label>
                    <input
                      id="welcomeVideoPath"
                      value={form.welcomeVideoPath}
                      onChange={(e) => updateField("welcomeVideoPath", e.target.value)}
                      placeholder="assets/welcome-video.mp4"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="telegramVideoNoteFileId">TELEGRAM_VIDEO_NOTE_FILE_ID</label>
                    <input
                      id="telegramVideoNoteFileId"
                      value={form.telegramVideoNoteFileId}
                      onChange={(e) => updateField("telegramVideoNoteFileId", e.target.value)}
                      placeholder="Опционально — после первой загрузки видео"
                    />
                  </div>
                </>
              )}

              <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Поля на этой вкладке соответствуют переменным .env:
                  {tabFields.map((f) => f.key).join(", ")}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    Обновлено: {formatDate(bot.updatedAt)}
                  </span>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Сохранение..." : "Сохранить настройки"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </BotProvider>
  );
}
