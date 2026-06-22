import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { APP_ICON, FiLogOut, FiMenu, FiX, NAV_ICONS } from "./icons";

const NAV_ITEMS = [
  { to: "/", icon: NAV_ICONS.dashboard, label: "Дашборд", end: true },
  { to: "/bots", icon: NAV_ICONS.bots, label: "Боты" },
  { to: "/users", icon: NAV_ICONS.users, label: "Пользователи" },
  { to: "/constructor", icon: NAV_ICONS.constructor, label: "Конструктор" },
  { to: "/settings", icon: NAV_ICONS.settings, label: "Настройки" },
  { to: "/analytics", icon: NAV_ICONS.analytics, label: "Аналитика" },
  { to: "/events", icon: NAV_ICONS.events, label: "События" },
] as const;

export function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const BrandIcon = APP_ICON;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className={`layout${sidebarOpen ? " sidebar-open" : ""}`}>
      <header className="mobile-header">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
        <span className="mobile-header-title">Maivy Admin</span>
        <button
          type="button"
          className="mobile-logout-btn"
          onClick={() => void logout()}
          aria-label="Выйти"
        >
          <FiLogOut size={20} />
        </button>
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

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
                end={"end" in item ? item.end : undefined}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} />
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
            <FiLogOut size={16} />
            Выйти
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Навигация">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : undefined}
              className={({ isActive }) =>
                `mobile-nav-item${isActive ? " active" : ""}`
              }
            >
              <span className="mobile-nav-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
