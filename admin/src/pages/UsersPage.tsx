import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { FiMessageCircle, NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import {
  buildContactUrl,
  buildMaxContactUrl,
  downloadCsv,
  formatDate,
  getUserChatUrl,
} from "../lib/utils";

export function UsersPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"" | "telegram" | "max">("");

  const userStats = useQuery(
    api.botUsers.getStats,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.botUsers.listByBot,
    token && activeBotId
      ? {
          token,
          botId: activeBotId,
          platform: platform || undefined,
          search: search || undefined,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  const exportData = useQuery(
    api.botUsers.exportUsers,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const toggleBlocked = useMutation(api.botUsers.toggleBlocked);
  const removeUser = useMutation(api.botUsers.remove);

  const handleExport = () => {
    if (!exportData) return;
    const rows = [
      [
        "platform",
        "platformUserId",
        "firstName",
        "username",
        "chatUrl",
        "firstSeenAt",
        "lastSeenAt",
        "startCount",
        "lastSection",
        "isBlocked",
      ],
      ...exportData.map((u) => [
        u.platform,
        u.platformUserId,
        u.firstName ?? "",
        u.username ?? "",
        getUserChatUrl(u) ?? "",
        formatDate(u.firstSeenAt),
        formatDate(u.lastSeenAt),
        String(u.startCount),
        u.lastSection ?? "",
        u.isBlocked ? "yes" : "no",
      ]),
    ];
    downloadCsv(`users-${activeBotId}-${Date.now()}.csv`, rows);
  };

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <PageHeader
          icon={NAV_ICONS.users}
          title="Пользователи"
          description="Все пользователи, нажавшие /start в боте"
          actions={
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={!exportData?.length}
            >
              Экспорт CSV
            </button>
          }
        />

        <BotSelector />

        {userStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Всего</div>
              <div className="value">{userStats.total}</div>
            </div>
            <div className="stat-card">
              <div className="label">Telegram</div>
              <div className="value">{userStats.telegram}</div>
            </div>
            <div className="stat-card">
              <div className="label">MAX</div>
              <div className="value">{userStats.max}</div>
            </div>
            <div className="stat-card">
              <div className="label">Сегодня</div>
              <div className="value">{userStats.today}</div>
              <div className="sub">За неделю: {userStats.week}</div>
            </div>
          </div>
        )}

        <div className="filters-bar">
          <input
            className="search-input"
            placeholder="Поиск по имени, username, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as "" | "telegram" | "max")}
          >
            <option value="">Все платформы</option>
            <option value="telegram">Telegram</option>
            <option value="max">MAX</option>
          </select>
        </div>

        {status === "LoadingFirstPage" ? (
          <div className="loading">Загрузка...</div>
        ) : !results?.length ? (
          <div className="card empty-state">
            <h3>Нет пользователей</h3>
            <p>Пользователи появятся после первого /start в боте</p>
          </div>
        ) : (
          <>
            <div className="card table-wrap responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Username</th>
                    <th>ID</th>
                    <th>Платформа</th>
                    <th>Стартов</th>
                    <th>Последний раздел</th>
                    <th>Первый визит</th>
                    <th>Последний визит</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((user) => {
                    const chatUrl = getUserChatUrl(user);
                    const profileUrl =
                      user.username && user.platform === "telegram"
                        ? buildContactUrl(user.username)
                        : user.username && user.platform === "max"
                          ? buildMaxContactUrl(user.username)
                          : null;

                    return (
                      <tr key={user._id}>
                        <td data-label="Имя">{user.firstName ?? "—"}</td>
                        <td data-label="Username">
                          {profileUrl ? (
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              @{user.username}
                            </a>
                          ) : user.username ? (
                            `@${user.username}`
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label="ID">
                          <code>{user.platformUserId}</code>
                        </td>
                        <td data-label="Платформа">
                          <span className="badge badge-info">{user.platform}</span>
                        </td>
                        <td data-label="Стартов">{user.startCount}</td>
                        <td data-label="Раздел">{user.lastSection ?? "—"}</td>
                        <td data-label="Первый визит">{formatDate(user.firstSeenAt)}</td>
                        <td data-label="Последний визит">{formatDate(user.lastSeenAt)}</td>
                        <td data-label="Статус">
                          {user.isBlocked ? (
                            <span className="badge badge-danger">Заблокирован</span>
                          ) : (
                            <span className="badge badge-success">Активен</span>
                          )}
                        </td>
                        <td data-label="Действия" className="td-actions">
                          <div className="btn-group">
                            {chatUrl && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => window.open(chatUrl, "_blank")}
                                title={
                                  user.platform === "max"
                                    ? "Открыть чат в MAX"
                                    : user.username
                                      ? "Открыть чат в Telegram"
                                      : "Открыть чат по ID (нужен Telegram)"
                                }
                              >
                                <FiMessageCircle size={14} />
                                Открыть чат
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() =>
                                void toggleBlocked({ token: token!, userId: user._id })
                              }
                            >
                              {user.isBlocked ? "Разблок." : "Блок."}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (confirm("Удалить пользователя?")) {
                                  void removeUser({ token: token!, userId: user._id });
                                }
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {status === "CanLoadMore" && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => loadMore(50)}
                >
                  Загрузить ещё
                </button>
              </div>
            )}

            {status === "LoadingMore" && (
              <div className="loading" style={{ marginTop: 16 }}>
                Загрузка...
              </div>
            )}
          </>
        )}
      </div>
    </BotProvider>
  );
}
