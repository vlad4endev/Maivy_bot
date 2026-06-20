import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { APP_ICON, LuLogOut, NAV_ICONS } from "./icons";

const NAV_ITEMS = [
  { to: "/", icon: NAV_ICONS.dashboard, label: "Дашборд", end: true },
  { to: "/bots", icon: NAV_ICONS.bots, label: "Боты" },
  { to: "/users", icon: NAV_ICONS.users, label: "Пользователи" },
  { to: "/sections", icon: NAV_ICONS.sections, label: "Разделы" },
  { to: "/buttons", icon: NAV_ICONS.buttons, label: "Кнопки" },
  { to: "/settings", icon: NAV_ICONS.settings, label: "Настройки" },
  { to: "/analytics", icon: NAV_ICONS.analytics, label: "Аналитика" },
  { to: "/events", icon: NAV_ICONS.events, label: "События" },
] as const;

export function Layout() {
  const { logout } = useAuth();
  const BrandIcon = APP_ICON;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <span className="brand-icon" aria-hidden="true">
              <BrandIcon size={22} />
            </span>
            <div>
              <h1>Maivy Admin</h1>
              <p>Панель управления ботами</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn-logout"
            style={{ width: "100%" }}
            onClick={() => void logout()}
          >
            <LuLogOut size={16} strokeWidth={2} />
            Выйти
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
