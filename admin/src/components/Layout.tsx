import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/", icon: "📊", label: "Дашборд", end: true },
  { to: "/bots", icon: "🤖", label: "Боты" },
  { to: "/users", icon: "👥", label: "Пользователи" },
  { to: "/sections", icon: "📝", label: "Разделы" },
  { to: "/buttons", icon: "⌨️", label: "Кнопки" },
  { to: "/settings", icon: "⚙️", label: "Настройки" },
  { to: "/analytics", icon: "📈", label: "Аналитика" },
  { to: "/events", icon: "📋", label: "События" },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Maivy Admin</h1>
          <p>Панель управления ботами</p>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => void logout()}>
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
