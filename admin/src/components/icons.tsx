import type { IconType } from "react-icons";
import {
  LuActivity,
  LuBarChart3,
  LuBot,
  LuCalendarDays,
  LuFileText,
  LuKeyboard,
  LuLayoutDashboard,
  LuLogOut,
  LuMessageCircle,
  LuSettings,
  LuSparkles,
  LuUsers,
  LuZap,
} from "react-icons/lu";

export const NAV_ICONS = {
  dashboard: LuLayoutDashboard,
  bots: LuBot,
  users: LuUsers,
  sections: LuFileText,
  buttons: LuKeyboard,
  settings: LuSettings,
  analytics: LuBarChart3,
  events: LuCalendarDays,
} as const satisfies Record<string, IconType>;

export const APP_ICON = LuSparkles;

export {
  LuActivity,
  LuBarChart3,
  LuBot,
  LuCalendarDays,
  LuFileText,
  LuKeyboard,
  LuLayoutDashboard,
  LuLogOut,
  LuMessageCircle,
  LuSettings,
  LuSparkles,
  LuUsers,
  LuZap,
};
