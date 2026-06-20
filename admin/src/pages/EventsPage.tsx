import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";
import { BotProvider, BotSelector } from "../components/BotSelector";
import { NAV_ICONS } from "../components/icons";
import { PageHeader } from "../components/PageHeader";
import { formatDate } from "../lib/utils";

export function EventsPage() {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");
  const [selectedBotId, setSelectedBotId] = useState<Id<"bots"> | null>(null);
  const activeBotId = selectedBotId ?? bots?.[0]?._id ?? null;

  const [eventType, setEventType] = useState<"" | "start" | "callback" | "section_view">("");

  const events = useQuery(
    api.events.listByBot,
    token && activeBotId
      ? {
          token,
          botId: activeBotId,
          paginationOpts: { numItems: 100, cursor: null },
          eventType: eventType || undefined,
        }
      : "skip",
  );

  return (
    <BotProvider selectedBotId={activeBotId} setSelectedBotId={setSelectedBotId}>
      <div className="page">
        <PageHeader
          icon={NAV_ICONS.events}
          title="События"
          description="Журнал всех действий пользователей в боте"
        />

        <BotSelector />

        <div style={{ marginBottom: 16 }}>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as typeof eventType)}
            style={{
              padding: "8px 12px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
          >
            <option value="">Все типы</option>
            <option value="start">Старт</option>
            <option value="callback">Callback</option>
            <option value="section_view">Просмотр раздела</option>
          </select>
        </div>

        {!events ? (
          <div className="loading">Загрузка...</div>
        ) : events.page.length === 0 ? (
          <div className="card empty-state">
            <h3>Нет событий</h3>
            <p>События появятся после активности пользователей</p>
          </div>
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Тип</th>
                  <th>Payload</th>
                  <th>Раздел</th>
                  <th>Платформа</th>
                </tr>
              </thead>
              <tbody>
                {events.page.map((event) => (
                  <tr key={event._id}>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>
                      <span className={`badge badge-${event.eventType === "start" ? "success" : "info"}`}>
                        {event.eventType}
                      </span>
                    </td>
                    <td><code>{event.payload ?? "—"}</code></td>
                    <td>{event.sectionSlug ?? "—"}</td>
                    <td><span className="badge">{event.platform}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BotProvider>
  );
}
