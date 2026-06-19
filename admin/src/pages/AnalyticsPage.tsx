import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { CALLBACK_LABELS } from "../lib/utils";

export function AnalyticsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const dashboard = useQuery(
    api.analytics.getDashboard,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const heatmap = useQuery(
    api.analytics.getCallbackHeatmap,
    token && activeBotId ? { token, botId: activeBotId } : "skip",
  );

  const maxHeat = heatmap ? Math.max(...heatmap.map((h) => h.count), 1) : 1;
  const maxFunnel = dashboard
    ? Math.max(
        dashboard.funnel.starts,
        dashboard.funnel.aboutViews,
        dashboard.funnel.demoViews,
        dashboard.funnel.tryViews,
        dashboard.funnel.implViews,
        1,
      )
    : 1;

  const conversionRate =
    dashboard && dashboard.funnel.starts > 0
      ? Math.round((dashboard.funnel.implViews / dashboard.funnel.starts) * 100)
      : 0;

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <div className="page-header">
          <div>
            <h2>Аналитика</h2>
            <p>Воронка, конверсии и популярность кнопок</p>
          </div>
        </div>

        <BotSelector />

        {!dashboard ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">Конверсия в «Внедрение»</div>
                <div className="value">{conversionRate}%</div>
                <div className="sub">
                  {dashboard.funnel.implViews} из {dashboard.funnel.starts} стартов
                </div>
              </div>
              <div className="stat-card">
                <div className="label">События за неделю</div>
                <div className="value">{dashboard.eventsWeek}</div>
              </div>
              <div className="stat-card">
                <div className="label">Пользователи TG / MAX</div>
                <div className="value">
                  {dashboard.platformBreakdown.telegram} / {dashboard.platformBreakdown.max}
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Воронка</h3>
                {(
                  [
                    ["Старт (/start)", dashboard.funnel.starts],
                    ["О Maivy", dashboard.funnel.aboutViews],
                    ["Демо", dashboard.funnel.demoViews],
                    ["Попробовать", dashboard.funnel.tryViews],
                    ["Внедрение", dashboard.funnel.implViews],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="funnel-bar">
                    <span className="label">{label}</span>
                    <div className="bar-wrap">
                      <div className="bar" style={{ width: `${(count / maxFunnel) * 100}%` }} />
                    </div>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Тепловая карта кнопок</h3>
                {!heatmap || heatmap.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Нет данных</p>
                ) : (
                  heatmap.map((item) => (
                    <div key={item.payload} className="funnel-bar">
                      <span className="label" style={{ width: 160 }}>
                        {CALLBACK_LABELS[item.payload] ?? item.payload}
                      </span>
                      <div className="bar-wrap">
                        <div
                          className="bar"
                          style={{
                            width: `${(item.count / maxHeat) * 100}%`,
                            background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                          }}
                        />
                      </div>
                      <span className="count">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </BotProvider>
  );
}
