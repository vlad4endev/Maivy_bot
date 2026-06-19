import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../lib/auth";

interface BotContextValue {
  bots: Array<{
    _id: Id<"bots">;
    name: string;
    slug: string;
    enabled: boolean;
  }>;
  selectedBotId: Id<"bots"> | null;
  setSelectedBotId: (id: Id<"bots">) => void;
  isLoading: boolean;
}

const BotContext = createContext<BotContextValue | null>(null);

export function BotProvider({
  children,
  selectedBotId,
  setSelectedBotId,
}: {
  children: ReactNode;
  selectedBotId: Id<"bots"> | null;
  setSelectedBotId: (id: Id<"bots">) => void;
}) {
  const { token } = useAuth();
  const bots = useQuery(api.bots.list, token ? { token } : "skip");

  const value = useMemo(
    () => ({
      bots: bots ?? [],
      selectedBotId,
      setSelectedBotId,
      isLoading: bots === undefined,
    }),
    [bots, selectedBotId, setSelectedBotId],
  );

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

export function useBotContext(): BotContextValue {
  const ctx = useContext(BotContext);
  if (!ctx) {
    throw new Error("useBotContext must be used within BotProvider");
  }
  return ctx;
}

export function BotSelector() {
  const { bots, selectedBotId, setSelectedBotId, isLoading } = useBotContext();

  if (isLoading) {
    return <div className="bot-selector">Загрузка ботов...</div>;
  }

  if (bots.length === 0) {
    return (
      <div className="bot-selector">
        <span style={{ color: "var(--text-muted)" }}>
          Нет ботов. Создайте бота на странице «Боты».
        </span>
      </div>
    );
  }

  return (
    <div className="bot-selector">
      <label htmlFor="bot-select" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
        Бот:
      </label>
      <select
        id="bot-select"
        value={selectedBotId ?? ""}
        onChange={(e) => setSelectedBotId(e.target.value as Id<"bots">)}
      >
        {bots.map((bot) => (
          <option key={bot._id} value={bot._id}>
            {bot.name} ({bot.slug}){bot.enabled ? "" : " [выкл]"}
          </option>
        ))}
      </select>
    </div>
  );
}
