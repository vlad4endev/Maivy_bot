import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { formatRelative } from "../lib/utils";

export function DashboardPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);

  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;
  const stats = useQuery(
    api.analytics.getDashboard,
    token ? { token, botId: activeBotId ?? undefined } : "skip",
  );

  const maxFunnel = stats
    ? Math.max(
        stats.funnel.starts,
        stats.funnel.aboutViews,
        stats.funnel.demoViews,
        stats.funnel.tryViews,
        stats.funnel.implViews,
        1,
      )
    : 1;

  const maxDaily = stats
    ? Math.max(...stats.dailyStats.map((d) => d.starts + d.callbacks), 1)
    : 1;

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <div className="page-header">
          <div>
            <h2>Дашборд</h2>
            <p>Обзор ботов, пользователей и активности</p>
          </div>
        </div>

        <BotSelector />

        {!stats ? (
          <div className="loading">Загрузка статистики...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">Боты</div>
                <div className="value">{stats.totalBots}</div>
                <div className="sub">{stats.enabledBots} активных</div>
              </div>
              <div className="stat-card">
                <div className="label">Пользователи</div>
                <div className="value">{stats.totalUsers}</div>
                <div className="sub">
                  TG: {stats.platformBreakdown.telegram} · MAX: {stats.platformBreakdown.max}
                </div>
              </div>
              <div className="stat-card">
                <div className="label">События сегодня</div>
                <div className="value">{stats.eventsToday}</div>
                <div className="sub">За неделю: {stats.eventsWeek}</div>
              </div>
              <div className="stat-card">
                <div className="label">Всего событий</div>
                <div className="value">{stats.totalEvents}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Воронка конверсии</h3>
                {(
                  [
                    ["Старт", stats.funnel.starts],
                    ["О Maivy", stats.funnel.aboutViews],
                    ["Демо", stats.funnel.demoViews],
                    ["Попробовать", stats.funnel.tryViews],
                    ["Внедрение", stats.funnel.implViews],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="funnel-bar">
                    <span className="label">{label}</span>
                    <div className="bar-wrap">
                      <div
                        className="bar"
                        style={{ width: `${(count / maxFunnel) * 100}%` }}
                      />
                    </div>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Активность за 7 дней</h3>
                {stats.dailyStats.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    Пока нет данных
                  </p>
                ) : (
                  <div className="chart-bars">
                    {stats.dailyStats.map((day) => (
                      <div key={day.date} className="chart-bar-col">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${((day.starts + day.callbacks) / maxDaily) * 100}px`,
                          }}
                          title={`${day.starts} стартов, ${day.callbacks} callback`}
                        />
                        <span className="chart-label">{day.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12, fontSize: "1rem" }}>Последняя активность</h3>
              {stats.recentActivity.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Событий пока нет
                </p>
              ) : (
                stats.recentActivity.map((item, i) => (
                  <div key={i} className="activity-item">
                    <span className="activity-time">{formatRelative(item.createdAt)}</span>
                    <span className={`badge badge-info`}>{item.eventType}</span>
                    <span>{item.payload ?? "—"}</span>
                    <span className="badge">{item.platform}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </BotProvider>
  );
}
