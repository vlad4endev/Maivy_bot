import type { IconType } from "react-icons";
import { Bot as LuBot } from "lucide-react";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCpu,
  FiFileText,
  FiGitBranch,
  FiGrid,
  FiLogOut,
  FiMessageCircle,
  FiMousePointer,
  FiSettings,
  FiUsers,
  FiZap,
} from "react-icons/fi";

export const NAV_ICONS = {
  dashboard: FiGrid,
  bots: FiCpu,
  users: FiUsers,
  constructor: FiGitBranch,
  sections: FiFileText,
  buttons: FiMousePointer,
  settings: FiSettings,
  analytics: FiBarChart2,
  events: FiCalendar,
} as const satisfies Record<string, IconType>;

export const APP_ICON = FiZap;

export {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCpu,
  FiFileText,
  FiGitBranch,
  FiGrid,
  FiLogOut,
  FiMessageCircle,
  FiMousePointer,
  FiSettings,
  FiUsers,
  FiZap,
};

export { LuBot };
